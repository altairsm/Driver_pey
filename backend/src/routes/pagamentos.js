import { Router } from 'express';
import { pool } from '../db/index.js';
import { enviarWebhookDriverPix, decidirStatus, chaveEstavel } from '../services/webhookService.js';

const router = Router();

router.get('/pagamentos-historico', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT pq.*, m.nome_completo
      FROM pagamentos_quinzena pq
      JOIN matriculos_jad m ON m."OperadorMatricula"::bigint = pq.matricula
      ORDER BY pq.criado_em DESC
      LIMIT 100
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
});

router.get('/pagamentos-pendentes', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT pq.*, m.nome_completo
      FROM pagamentos_quinzena pq
      JOIN matriculos_jad m ON m."OperadorMatricula"::bigint = pq.matricula
      WHERE pq.status IN ('processando', 'erro_webhook', 'rejeitado')
      ORDER BY pq.criado_em DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar pagamentos pendentes' });
  }
});

router.post('/pagamentos-reverificar/:id', async (req, res) => {
  try {
    const { rows: pg } = await pool.query(`
      SELECT pq.*, m.nome_completo
      FROM pagamentos_quinzena pq
      JOIN matriculos_jad m ON m."OperadorMatricula"::bigint = pq.matricula
      WHERE pq.id = $1
    `, [req.params.id]);
    if (pg.length === 0) return res.status(404).json({ error: 'Pagamento não encontrado' });
    if (pg[0].status === 'confirmado') return res.status(400).json({ error: 'Este pagamento já foi confirmado via Pix' });
    const rev = pg[0].status;
    if (rev !== 'processando' && rev !== 'erro_webhook' && rev !== 'rejeitado') {
      return res.status(400).json({ error: 'Só é possível reverificar/reenviar pagamentos em processamento, com erro de webhook ou rejeitados' });
    }

    const p = pg[0];
    const payload = {
      matricula: Number(p.matricula),
      nome: p.nome_completo || '',
      quinzena_inicio: p.quinzena_inicio,
      quinzena_fim: p.quinzena_fim,
      total_entregas: p.total_entregas,
      total_pagar: Number(p.total_pagar),
      total_quinzena: Number(p.total_quinzena),
      total_bonus_d0: Number(p.total_bonus_d0),
      total_multa: Number(p.total_multa),
      total_adiantado: Number(p.total_adiantado),
      total_cobrancas: Number(p.total_cobrancas),
      data_pagamento: new Date().toISOString().slice(0, 10),
    };

    await pool.query(`
      UPDATE pagamentos_quinzena
      SET pix_enviado_em = CURRENT_TIMESTAMP,
          webhook_tentativas = COALESCE(webhook_tentativas, 0) + 1,
          ultimo_webhook_em = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [p.id]);

    const resultadoIncerto = rev !== 'rejeitado';

    const webhook = await enviarWebhookDriverPix({
      tipo: 'pagamento',
      entidade: 'pagamento',
      entidade_id: Number(p.id),
      idempotency_key: resultadoIncerto
        ? chaveEstavel('pagamento', 'quinzenal', `${p.matricula}-${p.quinzena_inicio}-${p.quinzena_fim}`)
        : undefined,
      payload,
    });

    const pixEstado = webhook.estado;
    const pixEndToEndId = webhook.data?.endToEndId || null;
    const pixHorario = webhook.data?.horario || null;
    const pixOrigem = webhook.data?.origem || null;
    const pixDestino = webhook.data?.destino || null;
    const decisao = decidirStatus({ ok: webhook.ok, estado: pixEstado });
    const novoStatus = decisao.status === 'aprovado' ? 'confirmado'
                     : decisao.status === 'processando_pix' ? 'processando'
                     : decisao.status === 'erro_webhook' ? 'erro_webhook'
                     : 'rejeitado';

    await pool.query(`
      UPDATE pagamentos_quinzena
      SET pix_end_to_end_id = $1, pix_estado = ($2)::varchar(30), pix_horario = $3,
          pix_origem = $4, pix_destino = $5, status = ($6)::varchar(20),
          webhook_http_status = $7, webhook_erro = $8,
          confirmado_em = CASE WHEN ($6)::varchar(20) = 'confirmado' THEN CURRENT_TIMESTAMP ELSE confirmado_em END
      WHERE id = $9
    `, [pixEndToEndId, pixEstado, pixHorario,
        pixOrigem || null,
        pixDestino || null,
        novoStatus,
        webhook.httpStatus ?? null,
        webhook.erro ?? null,
        p.id]);

    if (pixEstado === 'FINALIZADO') {
      const { rows: cobrancasAtivas } = await pool.query(`
        SELECT id, valor_total, valor_restante, parcelas, parcelas_pagas
        FROM cobrancas
        WHERE matricula = $1 AND ativo = true
        ORDER BY criado_em ASC
      `, [p.matricula]);

      let total_cobrancas = 0;
      for (const cob of cobrancasAtivas) {
        const parcelasRestantes = cob.parcelas - cob.parcelas_pagas;
        const deducao = Math.min(
          cob.valor_restante / Math.max(parcelasRestantes, 1),
          cob.valor_restante,
          Math.max(Number(p.total_pagar) + total_cobrancas, 0)
        );
        if (deducao <= 0) continue;
        total_cobrancas += deducao;
        await pool.query(`
          UPDATE cobrancas
          SET valor_restante = ROUND((valor_restante - $1)::numeric, 2),
              parcelas_pagas = parcelas_pagas + 1,
              ativo = CASE WHEN ROUND((valor_restante - $1)::numeric, 2) <= 0 THEN false ELSE ativo END
          WHERE id = $2
        `, [deducao, cob.id]);
      }

      await pool.query(`
        UPDATE lista_entregas le
        SET pago = true
        FROM relatorioentrega_export re
        WHERE le."Número"::text = re."Lista"
          AND re."OperadorMatricula"::bigint = $1
          AND LOWER(re."Evento") = 'entrega'
          AND le.status = 'Finalizado'
          AND (le.pago IS NULL OR le.pago = false)
          AND le."Data Baixa"::date BETWEEN $2 AND $3
      `, [p.matricula, p.quinzena_inicio, p.quinzena_fim]);
    }

    if (!decisao.sucesso) {
      return res.status(400).json({
        error: decisao.mensagem,
        success: false,
        status: novoStatus,
        pix_estado: pixEstado,
        webhook_erro: webhook.erro ?? null,
        webhook_http_status: webhook.httpStatus ?? null,
      });
    }

    res.json({
      success: true,
      motivo: decisao.mensagem,
      status: novoStatus,
      pix_estado: pixEstado,
      pix_end_to_end_id: pixEndToEndId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao reverificar pagamento' });
  }
});

export default router;

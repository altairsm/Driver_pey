import { Router } from 'express';
import { pool } from '../db/index.js';
import { enviarWebhookDriverPix, decidirStatus, chaveEstavel } from '../services/webhookService.js';
import { calcularValoresQuinzena, registrarQuitacaoQuinzena } from '../services/paymentService.js';
import { getConfig } from '../services/configuracaoService.js';
import { notaDaQuinzena, notaAtende } from '../services/nfseService.js';

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

    // Recalcula pela mesma fórmula do "Confirmar" (fonte única da verdade).
    // Valores gravados podem estar defasados (ex.: regra de cálculo mudou depois).
    const {
      total_entregas, total_quinzena, total_bonus_d0,
      total_multa, total_adiantado, total_cobrancas, deducoes, total_pagar,
    } = await calcularValoresQuinzena(p.matricula, p.quinzena_inicio, p.quinzena_fim);

    if (total_pagar <= 0) {
      return res.status(400).json({
        error: total_adiantado > total_quinzena + total_bonus_d0
          ? `Sem valor a pagar: adiantamentos (R$ ${Number(total_adiantado).toFixed(2)}) ultrapassam a produção da quinzena (R$ ${Number(total_quinzena).toFixed(2)})`
          : 'Sem valor a pagar nesta quinzena',
        success: false,
        status: 'sem_valor',
        total_pagar: 0,
      });
    }

    // Reenviar/reverificar também dispara Pix: a NF do saldo precisa continuar válida.
    const config = await getConfig();
    if (config.exigir_nfse_quinzena) {
      const nota = await notaDaQuinzena(p.matricula, p.quinzena_inicio, p.quinzena_fim);
      if (!nota || !notaAtende(nota)) {
        return res.status(400).json({
          error: !nota
            ? 'O pagamento exige NFS-e do motorista e a nota do saldo ainda não foi apresentada.'
            : `NFS-e apresentada não é válida: ${nota.motivo || 'sem detalhes'}. O administrador pode liberar com justificativa.`,
          success: false,
          status: 'sem_nf',
          nf_pendente: true,
        });
      }
    }

    const payload = {
      matricula: Number(p.matricula),
      nome: p.nome_completo || '',
      quinzena_inicio: p.quinzena_inicio,
      quinzena_fim: p.quinzena_fim,
      total_entregas,
      total_pagar,
      total_quinzena,
      total_bonus_d0,
      total_multa,
      total_adiantado,
      total_cobrancas,
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
          total_entregas = $10, total_quinzena = $11, total_bonus_d0 = $12,
          total_multa = $13, total_adiantado = $14, total_cobrancas = $15,
          total_pagar = $16,
          webhook_http_status = $7, webhook_erro = $8,
          confirmado_em = CASE WHEN ($6)::varchar(20) = 'confirmado' THEN CURRENT_TIMESTAMP ELSE confirmado_em END
      WHERE id = $9
    `, [pixEndToEndId, pixEstado, pixHorario,
        pixOrigem || null,
        pixDestino || null,
        novoStatus,
        webhook.httpStatus ?? null,
        webhook.erro ?? null,
        p.id,
        total_entregas,
        total_quinzena,
        total_bonus_d0,
        total_multa,
        total_adiantado,
        total_cobrancas,
        total_pagar]);

    if (pixEstado === 'FINALIZADO') {
      await registrarQuitacaoQuinzena({
        matricula: p.matricula,
        inicio: p.quinzena_inicio,
        fim: p.quinzena_fim,
        deducoes,
      });
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

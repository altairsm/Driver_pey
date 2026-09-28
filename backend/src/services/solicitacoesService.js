import { pool } from '../db/index.js';
import { enviarWebhookDriverPix, decidirStatus, chaveEstavel } from './webhookService.js';

const STATUS_FINAIS = ['aprovado', 'recusado'];
const STATUS_REENVIOS = ['processando_pix', 'pix_rejeitado', 'erro_webhook'];

export async function listarSolicitacoes(status = null) {
  const where = status ? `WHERE sp.status = $1` : ``;
  const params = status ? [status] : [];
  const { rows } = await pool.query(`
    SELECT
      sp.id,
      sp.matricula,
      m.nome_completo,
      sp.lista_numero,
      sp.valor_solicitado,
      sp.taxa_aplicada,
      sp.status,
      sp.criado_em,
      sp.aprovado_em,
      sp.recusado_em,
      sp.pix_end_to_end_id,
      sp.pix_estado,
      sp.pix_horario,
      sp.webhook_http_status,
      sp.webhook_erro,
      sp.webhook_tentativas,
      sp.ultimo_webhook_em,
      sp.pix_enviado_em
    FROM solicitacoes_pagamento sp
    JOIN matriculas_jad m ON m."OperadorMatricula"::bigint = sp.matricula
    ${where}
    ORDER BY sp.criado_em DESC
  `, params);
  return rows;
}

async function marcarPagamentoInFlight(id) {
  const { rows } = await pool.query(`
    UPDATE solicitacoes_pagamento
    SET pix_enviado_em = CURRENT_TIMESTAMP,
        webhook_tentativas = COALESCE(webhook_tentativas, 0) + 1,
        ultimo_webhook_em = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING pix_enviado_em, webhook_tentativas
  `, [id]);
  return rows[0] || null;
}

async function listaJaPaga(listaNumero) {
  const { rows } = await pool.query(`SELECT pago FROM lista_entregas WHERE "Número" = $1`, [listaNumero]);
  return rows[0]?.pago === true;
}

async function registrarResultado(id, sol, webhook) {
  const pixEstado = webhook.ok ? webhook.estado : null;
  const pixEndToEndId = webhook.data?.endToEndId || null;
  const pixHorario = webhook.data?.horario || null;
  const decisao = decidirStatus({ ok: webhook.ok, estado: pixEstado });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      UPDATE solicitacoes_pagamento
      SET status = $1,
          aprovado_em = CASE WHEN $1 = 'aprovado' THEN CURRENT_TIMESTAMP ELSE aprovado_em END,
          pix_end_to_end_id = $2,
          pix_estado = $3,
          pix_horario = $4,
          webhook_http_status = $5,
          webhook_erro = $6
      WHERE id = $7
    `, [decisao.status, pixEndToEndId, pixEstado, pixHorario,
        webhook.httpStatus ?? null,
        webhook.erro ?? null,
        id]);

    if (decisao.status === 'aprovado') {
      await client.query(`UPDATE lista_entregas SET pago = true WHERE "Número" = $1`, [sol.lista_numero]);
    }

    await client.query('COMMIT');

    return {
      success: decisao.sucesso,
      motivo: decisao.mensagem,
      status: decisao.status,
      pix_estado: pixEstado,
      pix_end_to_end_id: pixEndToEndId,
      webhook_erro: webhook.erro ?? null,
      webhook_http_status: webhook.httpStatus ?? null,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function executarEnvio(id, { preAprovado, aprovadoPor }) {
  const { rows: sol } = await pool.query(`
    SELECT sp.id, sp.matricula, sp.lista_numero, sp.status, sp.valor_solicitado, sp.taxa_aplicada, sp.pix_enviado_em
    FROM solicitacoes_pagamento sp
    WHERE sp.id = $1
  `, [id]);
  if (sol.length === 0) return { success: false, motivo: 'Solicitação não encontrada' };

  const s = sol[0];

  if (STATUS_FINAIS.includes(s.status)) {
    return { success: false, motivo: s.status === 'aprovado' ? 'Solicitação já foi aprovada' : 'Solicitação já foi recusada' };
  }

  // Trava anti-PIX-duplicado (v3.4.8): pedido pre-aprovado já teve o webhook disparado
  // automaticamente. Apenas "Reverificar"/"Reenviar" podem consultar/reenviar, nunca "Aprovar".
  if (s.status === 'pre_aprovado' && aprovadoPor === 'admin') {
    return { success: false, motivo: 'Solicitação pré-aprovada: o Pix já foi disparado automaticamente. Use "Conferir" ou "Reenviar"' };
  }

  const { rows: motorista } = await pool.query(`
    SELECT nome_completo FROM matriculas_jad WHERE "OperadorMatricula" = $1
  `, [s.matricula]);

  if (await listaJaPaga(s.lista_numero)) {
    return { success: false, motivo: 'Esta lista já foi paga' };
  }

  await marcarPagamentoInFlight(id);

  const valorLiquido = Number(s.valor_solicitado) * (1 - (Number(s.taxa_aplicada) || 0) / 100);

  // Resultado incerto (erro de webhook / em processamento): reaproveita a mesma chave de
  // idempotencia para que o n8n deduplique e NAO dispare um segundo Pix.
  // Resultado definitivo (REJEITADO): chave nova, pois nenhum Pix saiu.
  const incerto = s.status !== 'pix_rejeitado';

  const webhook = await enviarWebhookDriverPix({
    tipo: 'adiantamento',
    entidade: 'solicitacao',
    entidade_id: Number(id),
    idempotency_key: incerto ? chaveEstavel('adiantamento', 'solicitacao', id) : undefined,
    payload: {
      matricula: s.matricula,
      nome: motorista[0]?.nome_completo || '',
      lista_numero: s.lista_numero,
      valor_solicitado: Number(s.valor_solicitado),
      taxa_aplicada: Number(s.taxa_aplicada),
      valor_liquido: Number(valorLiquido),
      data_pagamento: new Date().toISOString().slice(0, 10),
      pre_aprovado: preAprovado,
      aprovado_por: aprovadoPor,
    },
  });

  return registrarResultado(id, s, webhook);
}

export async function aprovarSolicitacao(id) {
  return executarEnvio(id, { preAprovado: false, aprovadoPor: 'admin' });
}

export async function reenviarSolicitacao(id) {
  const { rows } = await pool.query(`SELECT status FROM solicitacoes_pagamento WHERE id = $1`, [id]);
  if (rows.length === 0) return { success: false, motivo: 'Solicitação não encontrada' };
  if (!STATUS_REENVIOS.includes(rows[0].status)) {
    return { success: false, motivo: 'Somente solicitações com falha de webhook, em processamento ou rejeitadas podem ser reenviadas' };
  }
  return executarEnvio(id, { preAprovado: false, aprovadoPor: 'admin_reenvio' });
}

export async function recusarSolicitacao(id) {
  const { rows: sol } = await pool.query(`
    SELECT status FROM solicitacoes_pagamento
    WHERE id = $1
  `, [id]);
  if (sol.length === 0) return { success: false, motivo: 'Solicitação não encontrada' };

  const st = sol[0].status;
  const podeRecusar = ['pendente', 'erro_webhook', 'pre_aprovado', 'pix_rejeitado'].includes(st);
  if (!podeRecusar) {
    return { success: false, motivo: 'Solicitação já foi processada e não pode ser recusada' };
  }

  const { rows: lista } = await pool.query(`
    SELECT sp.lista_numero, le.pago
    FROM solicitacoes_pagamento sp
    LEFT JOIN lista_entregas le ON le."Número" = sp.lista_numero
    WHERE sp.id = $1
  `, [id]);
  if (lista[0]?.pago) {
    return { success: false, motivo: 'Esta lista já foi paga — o Pix não pode ser recusado' };
  }

  await pool.query(`
    UPDATE solicitacoes_pagamento
    SET status = 'recusado', recusado_em = CURRENT_TIMESTAMP
    WHERE id = $1
  `, [id]);
  return { success: true, motivo: 'Solicitação recusada' };
}

export async function reverificarSolicitacao(id) {
  const { rows } = await pool.query(`SELECT status FROM solicitacoes_pagamento WHERE id = $1`, [id]);
  if (rows.length === 0) return { success: false, motivo: 'Solicitação não encontrada' };
  const st = rows[0].status;
  if (st !== 'processando_pix' && st !== 'erro_webhook' && st !== 'pre_aprovado') {
    return { success: false, motivo: 'Só é possível reverificar pagamentos em processamento ou com falha de webhook' };
  }
  return executarEnvio(id, { preAprovado: false, aprovadoPor: 'admin_reverificar' });
}

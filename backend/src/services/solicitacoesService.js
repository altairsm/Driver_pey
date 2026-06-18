import { pool } from '../db/index.js';

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
      sp.recusado_em
    FROM solicitacoes_pagamento sp
    JOIN matriculos_jad m ON m."OperadorMatricula"::bigint = sp.matricula
    ${where}
    ORDER BY sp.criado_em DESC
  `, params);
  return rows;
}

async function enviarWebhookAdiantamento(payload) {
  try {
    const res = await fetch('https://webhook.sactudo.com.br/webhook/Driver_Pix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'adiantamento', ...payload }),
    });
    if (!res.ok) {
      console.error(`Webhook adiantamento responded with ${res.status}: ${await res.text().catch(() => '')}`);
    }
  } catch (err) {
    console.error('Webhook adiantamento error:', err.message);
  }
}

export async function aprovarSolicitacao(id) {
  const { rows: sol } = await pool.query(`
    SELECT sp.matricula, sp.lista_numero, sp.status, sp.valor_solicitado, sp.taxa_aplicada
    FROM solicitacoes_pagamento sp
    WHERE sp.id = $1
  `, [id]);
  if (sol.length === 0) return { success: false, motivo: 'Solicitação não encontrada' };
  if (sol[0].status === 'aprovado') return { success: false, motivo: 'Solicitação já foi aprovada' };
  if (sol[0].status === 'recusado') return { success: false, motivo: 'Solicitação já foi recusada' };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      UPDATE solicitacoes_pagamento
      SET status = 'aprovado', aprovado_em = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);
    await client.query(`
      UPDATE lista_entregas
      SET pago = true
      WHERE "Número" = $1
    `, [sol[0].lista_numero]);
    await client.query('COMMIT');

    const { rows: motorista } = await pool.query(`
      SELECT nome_completo FROM matriculos_jad WHERE "OperadorMatricula" = $1
    `, [sol[0].matricula]);
    const valorLiquido = Number(sol[0].valor_solicitado) * (1 - (Number(sol[0].taxa_aplicada) || 0) / 100);
    enviarWebhookAdiantamento({
      matricula: sol[0].matricula,
      nome: motorista[0]?.nome_completo || '',
      lista_numero: sol[0].lista_numero,
      valor_solicitado: Number(sol[0].valor_solicitado).toFixed(2),
      taxa_aplicada: Number(sol[0].taxa_aplicada).toFixed(2),
      valor_liquido: Number(valorLiquido).toFixed(2),
      pre_aprovado: false,
      aprovado_por: 'admin',
    });

    return { success: true, motivo: 'Solicitação aprovada e lista marcada como paga' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function recusarSolicitacao(id) {
  const { rows: sol } = await pool.query(`
    SELECT status FROM solicitacoes_pagamento
    WHERE id = $1
  `, [id]);
  if (sol.length === 0) return { success: false, motivo: 'Solicitação não encontrada' };
  if (sol[0].status !== 'pendente') return { success: false, motivo: 'Solicitação já foi processada' };

  await pool.query(`
    UPDATE solicitacoes_pagamento
    SET status = 'recusado', recusado_em = CURRENT_TIMESTAMP
    WHERE id = $1
  `, [id]);
  return { success: true, motivo: 'Solicitação recusada' };
}

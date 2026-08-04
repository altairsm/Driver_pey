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
      sp.recusado_em,
      sp.pix_end_to_end_id,
      sp.pix_estado,
      sp.pix_horario
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
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch {}
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error('Webhook adiantamento error:', err.message);
    return { ok: false, status: 0, data: null, error: err.message };
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

  const { rows: motorista } = await pool.query(`
    SELECT nome_completo FROM matriculos_jad WHERE "OperadorMatricula" = $1
  `, [sol[0].matricula]);
  const valorLiquido = Number(sol[0].valor_solicitado) * (1 - (Number(sol[0].taxa_aplicada) || 0) / 100);

  const webhookResult = await enviarWebhookAdiantamento({
    matricula: sol[0].matricula,
    nome: motorista[0]?.nome_completo || '',
    lista_numero: sol[0].lista_numero,
    valor_solicitado: Number(sol[0].valor_solicitado),
    taxa_aplicada: Number(sol[0].taxa_aplicada),
    valor_liquido: Number(valorLiquido),
    data_pagamento: new Date().toISOString().slice(0, 10),
    pre_aprovado: false,
    aprovado_por: 'admin',
  });

  const webhookData = Array.isArray(webhookResult.data) ? webhookResult.data[0] : webhookResult.data;
  const pixEstado = webhookData?.estado || null;
  const pixEndToEndId = webhookData?.endToEndId || null;
  const pixHorario = webhookData?.horario || null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const novoStatus = pixEstado === 'FINALIZADO' ? 'aprovado'
                     : pixEstado === 'EM_PROCESSAMENTO' ? 'processando_pix'
                     : 'pix_rejeitado';

    await client.query(`
      UPDATE solicitacoes_pagamento
      SET status = $1,
          aprovado_em = CURRENT_TIMESTAMP,
          pix_end_to_end_id = $2,
          pix_estado = $3,
          pix_horario = $4
      WHERE id = $5
    `, [novoStatus, pixEndToEndId, pixEstado, pixHorario, id]);

    if (pixEstado === 'FINALIZADO') {
      await client.query(`
        UPDATE lista_entregas SET pago = true WHERE "Número" = $1
      `, [sol[0].lista_numero]);
    }

    await client.query('COMMIT');

    const msg = pixEstado === 'FINALIZADO' ? 'Pagamento confirmado via Pix'
              : pixEstado === 'EM_PROCESSAMENTO' ? 'Pagamento em processamento — aguarde confirmação'
              : pixEstado === 'REJEITADO' ? 'Pagamento rejeitado pelo Pix'
              : 'Solicitação processada (estado desconhecido do Pix)';

    return {
      success: pixEstado === 'FINALIZADO' || pixEstado === 'EM_PROCESSAMENTO',
      motivo: msg,
      pix_estado: pixEstado,
      pix_end_to_end_id: pixEndToEndId,
    };
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

export async function reverificarSolicitacao(id) {
  const { rows: sol } = await pool.query(`
    SELECT sp.matricula, sp.lista_numero, sp.status, sp.valor_solicitado, sp.taxa_aplicada
    FROM solicitacoes_pagamento sp
    WHERE sp.id = $1
  `, [id]);
  if (sol.length === 0) return { success: false, motivo: 'Solicitação não encontrada' };
  if (sol[0].status !== 'processando_pix') return { success: false, motivo: 'Só é possível reverificar pagamentos em processamento' };

  const { rows: motorista } = await pool.query(`
    SELECT nome_completo FROM matriculos_jad WHERE "OperadorMatricula" = $1
  `, [sol[0].matricula]);
  const valorLiquido = Number(sol[0].valor_solicitado) * (1 - (Number(sol[0].taxa_aplicada) || 0) / 100);

  const webhookResult = await enviarWebhookAdiantamento({
    matricula: sol[0].matricula,
    nome: motorista[0]?.nome_completo || '',
    lista_numero: sol[0].lista_numero,
    valor_solicitado: Number(sol[0].valor_solicitado),
    taxa_aplicada: Number(sol[0].taxa_aplicada),
    valor_liquido: Number(valorLiquido),
    data_pagamento: new Date().toISOString().slice(0, 10),
    pre_aprovado: false,
    aprovado_por: 'admin',
  });

  const webhookData = Array.isArray(webhookResult.data) ? webhookResult.data[0] : webhookResult.data;
  const pixEstado = webhookData?.estado || null;
  const pixEndToEndId = webhookData?.endToEndId || null;
  const pixHorario = webhookData?.horario || null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const novoStatus = pixEstado === 'FINALIZADO' ? 'aprovado'
                     : pixEstado === 'EM_PROCESSAMENTO' ? 'processando_pix'
                     : 'pix_rejeitado';

    await client.query(`
      UPDATE solicitacoes_pagamento
      SET status = $1,
          pix_end_to_end_id = $2,
          pix_estado = $3,
          pix_horario = $4
      WHERE id = $5
    `, [novoStatus, pixEndToEndId, pixEstado, pixHorario, id]);

    if (pixEstado === 'FINALIZADO') {
      await client.query(`
        UPDATE lista_entregas SET pago = true WHERE "Número" = $1
      `, [sol[0].lista_numero]);
    }

    await client.query('COMMIT');

    const msg = pixEstado === 'FINALIZADO' ? 'Pagamento confirmado via Pix'
              : pixEstado === 'EM_PROCESSAMENTO' ? 'Pagamento ainda em processamento'
              : 'Pagamento rejeitado pelo Pix';

    return {
      success: true,
      motivo: msg,
      pix_estado: pixEstado,
      pix_end_to_end_id: pixEndToEndId,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

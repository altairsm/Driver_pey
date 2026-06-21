import { pool } from '../db/index.js';

export async function listarSolicitacoes(status = null) {
  const where = status ? `WHERE sp.status = $1` : ``;
  const params = status ? [status] : [];
  const { rows } = await pool.query(`
    SELECT
      sp.id,
      sp.motorista_cpf,
      m.nome,
      sp.id_romaneio,
      sp.valor_solicitado,
      sp.taxa_aplicada,
      sp.status,
      sp.criado_em,
      sp.aprovado_em,
      sp.recusado_em
    FROM solicitacoes_pagamento sp
    JOIN motoristas m ON m.cpf = sp.motorista_cpf
    ${where}
    ORDER BY sp.criado_em DESC
  `, params);
  return rows;
}

export async function aprovarSolicitacao(id) {
  const { rows: sol } = await pool.query(`
    SELECT motorista_cpf, id_romaneio, status
    FROM solicitacoes_pagamento
    WHERE id = $1
  `, [id]);
  if (sol.length === 0) return { success: false, motivo: 'Solicitação não encontrada' };
  if (sol[0].status !== 'pendente') return { success: false, motivo: 'Solicitação já foi processada' };

  await pool.query(`
    UPDATE solicitacoes_pagamento
    SET status = 'aprovado', aprovado_em = CURRENT_TIMESTAMP
    WHERE id = $1
  `, [id]);
  return { success: true, motivo: 'Solicitação aprovada' };
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

import { pool } from '../db/index.js';

export async function buscarMotoristaPorCTE(ncte) {
  const { rows } = await pool.query(`
    SELECT
      re."OperadorMatricula"::bigint AS matricula,
      re."OperadorNome" AS nome
    FROM relatorioentrega_export re
    WHERE re."NCTE" = $1
      AND LOWER(re."Evento") = 'entrega'
    LIMIT 1
  `, [ncte]);
  return rows[0] || null;
}

export async function criarCobranca({ ncte, matricula, valor_total, parcelas, observacao }) {
  const { rows } = await pool.query(`
    INSERT INTO cobrancas (ncte, matricula, valor_total, valor_restante, parcelas, observacao)
    VALUES ($1, $2, $3, $3, $4, $5)
    RETURNING *
  `, [ncte, matricula, valor_total, parcelas, observacao || null]);
  return rows[0];
}

export async function listarCobrancas() {
  const { rows } = await pool.query(`
    SELECT
      c.*,
      m.nome_completo AS motorista_nome
    FROM cobrancas c
    LEFT JOIN matriculos_jad m ON m."OperadorMatricula"::bigint = c.matricula
    ORDER BY c.criado_em DESC
  `);
  return rows;
}

export async function getCobrancasDriver(matricula) {
  const { rows } = await pool.query(`
    SELECT
      c.*,
      re."Data"::date AS data_entrega,
      re."Cep" AS cep
    FROM cobrancas c
    LEFT JOIN relatorioentrega_export re ON re."NCTE" = c.ncte AND LOWER(re."Evento") = 'entrega'
    WHERE c.matricula = $1 AND c.ativo = true
    ORDER BY c.criado_em DESC
  `, [matricula]);
  return rows;
}

export async function desativarCobranca(id) {
  const { rows } = await pool.query(`
    UPDATE cobrancas SET ativo = false WHERE id = $1 RETURNING *
  `, [id]);
  return rows[0] || null;
}

export async function getCobrancasAtivasPorMotorista(matricula) {
  const { rows } = await pool.query(`
    SELECT *
    FROM cobrancas
    WHERE matricula = $1 AND ativo = true
    ORDER BY criado_em ASC
  `, [matricula]);
  return rows;
}

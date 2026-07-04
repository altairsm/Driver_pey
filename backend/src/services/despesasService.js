import { pool } from '../db/index.js';

export async function listarDespesas(inicio, fim, categoria) {
  let query = `
    SELECT id, descricao, valor, categoria, data, observacao, criado_em
    FROM despesas
    WHERE data::date BETWEEN $1 AND $2
  `;
  const params = [inicio, fim];
  if (categoria) {
    query += ` AND categoria = $3`;
    params.push(categoria);
  }
  query += ` ORDER BY data DESC, id DESC`;
  const result = await pool.query(query, params);
  return result.rows;
}

export async function criarDespesa(dados) {
  const { descricao, valor, categoria, data, observacao } = dados;
  const result = await pool.query(`
    INSERT INTO despesas (descricao, valor, categoria, data, observacao)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, descricao, valor, categoria, data, observacao, criado_em
  `, [descricao, valor, categoria, data || new Date().toISOString().slice(0, 10), observacao || null]);
  return result.rows[0];
}

export async function atualizarDespesa(id, dados) {
  const { descricao, valor, categoria, data, observacao } = dados;
  const result = await pool.query(`
    UPDATE despesas
    SET descricao = $1, valor = $2, categoria = $3, data = $4, observacao = $5, atualizado_em = CURRENT_TIMESTAMP
    WHERE id = $6
    RETURNING id, descricao, valor, categoria, data, observacao, criado_em
  `, [descricao, valor, categoria, data, observacao || null, id]);
  return result.rows[0] || null;
}

export async function deletarDespesa(id) {
  const result = await pool.query(`DELETE FROM despesas WHERE id = $1 RETURNING id`, [id]);
  return result.rowCount > 0;
}

export async function resumoDespesas(inicio, fim) {
  const result = await pool.query(`
    SELECT
      categoria,
      COUNT(*)::int AS qtd,
      ROUND(SUM(valor)::numeric, 2) AS total
    FROM despesas
    WHERE data::date BETWEEN $1 AND $2
    GROUP BY categoria
    ORDER BY total DESC
  `, [inicio, fim]);
  const rows = result.rows;
  const totalGeral = rows.reduce((s, r) => s + Number(r.total), 0);
  return {
    categorias: rows,
    total: Math.round(totalGeral * 100) / 100,
  };
}

import { pool } from '../db/index.js';

export async function listarTabelas() {
  const result = await pool.query(`
    SELECT * FROM faixas_peso_entrega_bairro
    ORDER BY nome_tabela, peso_de
  `);
  const agrupadas = {};
  for (const row of result.rows) {
    if (!agrupadas[row.nome_tabela]) agrupadas[row.nome_tabela] = [];
    agrupadas[row.nome_tabela].push(row);
  }
  return agrupadas;
}

export async function criarTabela(nome, faixas) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const f of faixas) {
      await client.query(`
        INSERT INTO faixas_peso_entrega_bairro (peso_de, peso_ate, faixas, valor_peso, nome_tabela)
        VALUES ($1, $2, $3, $4, $5)
      `, [f.peso_de, f.peso_ate, f.faixas || null, f.valor_peso, nome]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function atualizarFaixa(id, dados) {
  const { peso_de, peso_ate, faixas, valor_peso } = dados;
  const result = await pool.query(`
    UPDATE faixas_peso_entrega_bairro
    SET peso_de = COALESCE($1, peso_de),
        peso_ate = COALESCE($2, peso_ate),
        faixas = COALESCE($3, faixas),
        valor_peso = COALESCE($4, valor_peso)
    WHERE id = $5
  `, [peso_de, peso_ate, faixas, valor_peso, id]);
  return result.rowCount > 0;
}

export async function deletarFaixa(id) {
  const result = await pool.query('DELETE FROM faixas_peso_entrega_bairro WHERE id = $1', [id]);
  return result.rowCount > 0;
}

export async function deletarTabela(nome) {
  const result = await pool.query('DELETE FROM faixas_peso_entrega_bairro WHERE nome_tabela = $1', [nome]);
  return result.rowCount > 0;
}

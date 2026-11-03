import { pool } from '../db/index.js';

export async function listarTabelas() {
  const result = await pool.query(`
    SELECT fb.*, COALESCE(te.valor_excedente_kg, 0) AS valor_excedente_kg
    FROM faixas_peso_entrega_bairro fb
    LEFT JOIN tabela_peso_excedente te ON te.nome_tabela = fb.nome_tabela
    ORDER BY fb.nome_tabela, fb.peso_de
  `);
  const agrupadas = {};
  for (const row of result.rows) {
    if (!agrupadas[row.nome_tabela]) agrupadas[row.nome_tabela] = [];
    agrupadas[row.nome_tabela].push(row);
  }
  return agrupadas;
}

export function normalizaValorExcedente(valor) {
  if (valor === undefined || valor === null || valor === '') return 0;
  const num = Number(String(valor).replace(',', '.'));
  if (!Number.isFinite(num) || num < 0) {
    throw new Error('Adicional por kg deve ser um valor numérico maior ou igual a zero');
  }
  return num;
}

export async function criarTabela(nome, faixas, valorExcedenteKg = 0) {
  const excedente = normalizaValorExcedente(valorExcedenteKg);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const f of faixas) {
      await client.query(`
        INSERT INTO faixas_peso_entrega_bairro (peso_de, peso_ate, faixas, valor_peso, nome_tabela)
        VALUES ($1, $2, $3, $4, $5)
      `, [f.peso_de, f.peso_ate, f.faixas || null, f.valor_peso, nome]);
    }
    // DO NOTHING: criarTabela também é usada para acrescentar uma faixa a uma
    // tabela existente; nesse caso o adicional já configurado é preservado.
    await client.query(`
      INSERT INTO tabela_peso_excedente (nome_tabela, valor_excedente_kg)
      VALUES ($1, $2)
      ON CONFLICT (nome_tabela) DO NOTHING
    `, [nome, excedente]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function atualizarExcedente(nome, valor) {
  const excedente = normalizaValorExcedente(valor);
  const { rows } = await pool.query(
    'SELECT 1 FROM faixas_peso_entrega_bairro WHERE nome_tabela = $1 LIMIT 1',
    [nome]
  );
  if (rows.length === 0) return false;
  await pool.query(`
    INSERT INTO tabela_peso_excedente (nome_tabela, valor_excedente_kg, atualizado_em)
    VALUES ($1, $2, CURRENT_TIMESTAMP)
    ON CONFLICT (nome_tabela) DO UPDATE
      SET valor_excedente_kg = EXCLUDED.valor_excedente_kg,
          atualizado_em = CURRENT_TIMESTAMP
  `, [nome, excedente]);
  return true;
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
  if (result.rowCount > 0) {
    await pool.query('DELETE FROM tabela_peso_excedente WHERE nome_tabela = $1', [nome]);
  }
  return result.rowCount > 0;
}

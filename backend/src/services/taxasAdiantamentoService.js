import { pool } from '../db/index.js';

export async function listarTaxas() {
  const { rows } = await pool.query(
    'SELECT dias_ate_fechamento, taxa FROM taxas_adiantamento ORDER BY dias_ate_fechamento'
  );
  return rows;
}

export async function atualizarTaxas(dados) {
  for (const [dias, taxa] of Object.entries(dados)) {
    await pool.query(`
      INSERT INTO taxas_adiantamento (dias_ate_fechamento, taxa)
      VALUES ($1, $2)
      ON CONFLICT (dias_ate_fechamento) DO UPDATE SET taxa = $2
    `, [Number(dias), Number(taxa)]);
  }
  return listarTaxas();
}

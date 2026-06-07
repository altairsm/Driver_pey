import { pool } from '../db/index.js';

let configCache = null;

export async function getConfig() {
  if (configCache) return configCache;
  const { rows } = await pool.query('SELECT * FROM configuracoes WHERE id = 1');
  if (rows.length === 0) {
    await pool.query(`
      INSERT INTO configuracoes (id, dias_uteis_pagamento, eficiencia_minima_adiantamento, taxa_adiantamento)
      VALUES (1, 4, 98.00, 0.00)
      ON CONFLICT (id) DO NOTHING
    `);
    return getConfig();
  }
  configCache = rows[0];
  return rows[0];
}

export function clearConfigCache() {
  configCache = null;
}

export async function atualizarConfig(dados) {
  const { dias_uteis_pagamento, eficiencia_minima_adiantamento, taxa_adiantamento } = dados;
  await pool.query(`
    UPDATE configuracoes
    SET dias_uteis_pagamento = $1,
        eficiencia_minima_adiantamento = $2,
        taxa_adiantamento = $3,
        atualizado_em = CURRENT_TIMESTAMP
    WHERE id = 1
  `, [dias_uteis_pagamento, eficiencia_minima_adiantamento, taxa_adiantamento]);
  clearConfigCache();
  return getConfig();
}

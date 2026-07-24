import { pool } from '../db/index.js';

let configCache = null;

export async function getConfig() {
  if (configCache) return configCache;
  const { rows } = await pool.query('SELECT * FROM configuracoes WHERE id = 1');
  if (rows.length === 0) {
    await pool.query(`
      INSERT INTO configuracoes (id, dias_uteis_pagamento, eficiencia_minima_adiantamento, valor_maximo_adiantamento)
      VALUES (1, 4, 98.00, 400.00)
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
  const {
    dias_uteis_pagamento,
    eficiencia_minima_adiantamento,
    valor_maximo_adiantamento,
    smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, smtp_secure
  } = dados;
  await pool.query(`
    UPDATE configuracoes
    SET dias_uteis_pagamento = $1,
        eficiencia_minima_adiantamento = $2,
        valor_maximo_adiantamento = $3,
        smtp_host = $4,
        smtp_port = $5,
        smtp_user = $6,
        smtp_pass = $7,
        smtp_from = $8,
        smtp_secure = $9,
        atualizado_em = CURRENT_TIMESTAMP
    WHERE id = 1
  `, [
    dias_uteis_pagamento, eficiencia_minima_adiantamento, valor_maximo_adiantamento,
    smtp_host || null, smtp_port || 587, smtp_user || null,
    smtp_pass || null, smtp_from || null, smtp_secure || false
  ]);
  clearConfigCache();
  return getConfig();
}

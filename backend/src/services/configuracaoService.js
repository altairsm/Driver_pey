import { pool } from '../db/index.js';

let configCache = null;

export async function getConfig() {
  if (configCache) return configCache;
  const { rows } = await pool.query('SELECT * FROM configuracoes WHERE id = 1');
  if (rows.length === 0) {
    await pool.query(`
      INSERT INTO configuracoes (id, dias_uteis_pagamento, eficiencia_minima_adiantamento, multa_reclamacao, valor_maximo_adiantamento)
      VALUES (1, 4, 98.00, 0.00, 400.00)
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
    dias_uteis_pagamento, eficiencia_minima_adiantamento, multa_reclamacao, valor_maximo_adiantamento,
    exigir_nfse_adiantamento, exigir_nfse_quinzena, nfse_cnpj_tomador,
    nfse_tolerancia_dias, nfse_tolerancia_valor, nfse_ambiente,
  } = dados;
  await pool.query(`
    UPDATE configuracoes
    SET dias_uteis_pagamento = $1,
        eficiencia_minima_adiantamento = $2,
        multa_reclamacao = $3,
        valor_maximo_adiantamento = $4,
        exigir_nfse_adiantamento = $5,
        exigir_nfse_quinzena = $6,
        nfse_cnpj_tomador = NULLIF($7, ''),
        nfse_tolerancia_dias = $8,
        nfse_tolerancia_valor = $9,
        nfse_ambiente = $10,
        atualizado_em = CURRENT_TIMESTAMP
    WHERE id = 1
  `, [
    dias_uteis_pagamento, eficiencia_minima_adiantamento, multa_reclamacao, valor_maximo_adiantamento,
    exigir_nfse_adiantamento === true || exigir_nfse_adiantamento === 'true',
    exigir_nfse_quinzena === true || exigir_nfse_quinzena === 'true',
    (nfse_cnpj_tomador || '').replace(/\D/g, '') || null,
    nfse_tolerancia_dias, nfse_tolerancia_valor,
    nfse_ambiente === 'producao' ? 'producao' : 'producao_restrita',
  ]);
  clearConfigCache();
  return getConfig();
}

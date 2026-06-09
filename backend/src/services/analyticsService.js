import { pool } from '../db/index.js';

export async function getAnalyticsBairros(inicio, fim) {
  const query = `
    WITH entregas_periodo AS (
      SELECT DISTINCT ON (re."NCTE", re."Lista")
        COALESCE(ce.bairro, 'SEM CADASTRO') AS bairro,
        ce.nome_tabela,
        COALESCE(fb.faixas, 'SEM FAIXA') AS faixa_peso_desc,
        re."Peso"::numeric AS peso,
        COALESCE(fb.valor_peso, 0) AS valor_peso,
        COALESCE(tf.valor_fixo + GREATEST(re."Peso"::numeric - 15, 0) * tf.valor_excedente_kg, 0) AS valor_faturamento
      FROM relatorioentrega_export re
      LEFT JOIN ceps_especificos ce
        ON ce.cep = NULLIF(REGEXP_REPLACE(COALESCE(re."Cep", '0'), '[^0-9]', '', 'g'), '')
      LEFT JOIN faixas_peso_entrega_bairro fb
        ON re."Peso"::numeric BETWEEN fb.peso_de AND fb.peso_ate
        AND fb.nome_tabela = ce.nome_tabela
      LEFT JOIN tabela_faturamento tf
        ON re."Peso"::numeric BETWEEN tf.peso_de AND tf.peso_ate
      WHERE LOWER(re."Evento") = 'entrega'
        AND re."Data"::date BETWEEN $1 AND $2
      ORDER BY re."NCTE", re."Lista",
        CASE WHEN fb.valor_peso > 0 THEN 0 ELSE 1 END,
        fb.valor_peso ASC
    )
    SELECT
      bairro,
      nome_tabela,
      faixa_peso_desc,
      COUNT(*) AS total_ctes,
      ROUND(SUM(valor_peso)::numeric, 2) AS total_receita_motorista,
      ROUND(SUM(valor_faturamento)::numeric, 2) AS total_faturamento
    FROM entregas_periodo
    GROUP BY bairro, nome_tabela, faixa_peso_desc
    ORDER BY bairro, nome_tabela, faixa_peso_desc
  `;

  const result = await pool.query(query, [inicio, fim]);
  return result.rows;
}

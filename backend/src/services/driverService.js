import { pool } from '../db/index.js';

export async function getDriverData(matricula) {
  const result = await pool.query(`
    SELECT "OperadorMatricula"::bigint AS matricula, nome_completo, cpf, telefone
    FROM matriculos_jad
    WHERE "OperadorMatricula"::bigint = $1
  `, [matricula]);
  return result.rows[0] || null;
}

export async function getDriverDashboard(matricula) {
  const query = `
    WITH entregas_motorista AS (
      SELECT
        re."Lista" AS lista,
        re."Peso"::numeric AS peso_cte,
        COALESCE(fp.valor_peso, 0) AS valor_faixa,
        CASE WHEN re."Peso"::numeric > 15 THEN (re."Peso"::numeric - 15) * 0.80 ELSE 0 END AS valor_excedente,
        COALESCE(
          NULLIF(TRIM(le.metrica_da_lista), ''),
          NULLIF(TRIM(m.pgro), '')
        ) AS metrica,
        COALESCE(tf.valor_frete::numeric, 0) AS valor_frete_unitario
      FROM relatorioentrega_export re
      LEFT JOIN faixas_peso fp ON re."Peso"::numeric BETWEEN fp.peso_de AND fp.peso_ate
      LEFT JOIN lista_entregas le ON le."Número"::text = re."Lista"
      LEFT JOIN matriculos_jad m ON m."OperadorMatricula"::bigint = re."OperadorMatricula"::bigint
      LEFT JOIN tabela_frete_motorista tf
        ON tf.matricula::bigint = re."OperadorMatricula"::bigint
        AND LOWER(TRIM(tf.metrica)) = LOWER(TRIM(COALESCE(NULLIF(TRIM(le.metrica_da_lista), ''), NULLIF(TRIM(m.pgro), ''))))
      WHERE re."OperadorMatricula"::bigint = $1
        AND LOWER(re."Evento") = 'entrega'
    ),
    resumo AS (
      SELECT
        COUNT(*) AS total_ctes,
        SUM(peso_cte) AS peso_total,
        SUM(valor_faixa + valor_excedente) AS receita_total,
        SUM(ctes_entregues * valor_frete_unitario) AS custo_total
      FROM (
        SELECT lista, COUNT(*) AS ctes_entregues, SUM(peso_cte) AS peso_total,
               SUM(valor_faixa + valor_excedente) AS receita_total_lista,
               MIN(valor_frete_unitario) AS valor_frete_unitario
        FROM entregas_motorista
        GROUP BY lista
      ) sub
    )
    SELECT * FROM resumo;
  `;

  const result = await pool.query(query, [matricula]);
  return result.rows[0] || { total_ctes: 0, peso_total: 0, receita_total: 0, custo_total: 0 };
}

export async function getDriverTrips(matricula) {
  const result = await pool.query(`
    SELECT
      le."Número" AS numero_lista,
      le."Data Emissão" AS data_emissao,
      le."Data Baixa" AS data_baixa,
      le."Qtd" AS qtd,
      le.status,
      le.pago,
      le.ok_motorista,
      le.revisao_motorista,
      le.metrica_da_lista,
      le.obs,
      le.qtd_ctes,
      (SELECT COUNT(*) FROM relatorioentrega_export re2
       WHERE re2."Lista" = le."Número"::text AND re2."OperadorMatricula"::bigint = $1) AS ctes_vinculados
    FROM lista_entregas le
    WHERE le.matricula_motorista::bigint = $1
    ORDER BY le."Data Emissão" DESC NULLS LAST
  `, [matricula]);

  return result.rows;
}

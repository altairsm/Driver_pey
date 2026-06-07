import { pool } from '../db/index.js';

export async function calcularPagamentos(inicio, fim) {
  const query = `
    WITH quinzena_params AS (
      SELECT $1::date AS inicio, $2::date AS fim
    ),
    entregas_raw AS (
      SELECT
        re."OperadorMatricula"::bigint AS matricula,
        re."OperadorNome"              AS nome_entrega,
        re."NCTE"                      AS ncte,
        re."Lista"                     AS lista,
        re."Peso"::numeric             AS peso_cte,
        re."Cep",
        COALESCE(fb.valor_peso, 0)     AS valor_peso,
        COALESCE(tf.valor_fixo + GREATEST(re."Peso"::numeric - 15, 0) * tf.valor_excedente_kg, 0) AS valor_faturamento,
        le.pago AS pago_raw
      FROM relatorioentrega_export re
      CROSS JOIN quinzena_params qp
      LEFT JOIN ceps_bairros cb
        ON CAST(NULLIF(REGEXP_REPLACE(COALESCE(re."Cep", '0'), '[^0-9]', '', 'g'), '') AS BIGINT)
           BETWEEN CAST(cb.cep_ini AS BIGINT) AND CAST(cb.cep_fim AS BIGINT)
      LEFT JOIN faixas_peso_entrega_bairro fb
        ON re."Peso"::numeric BETWEEN fb.peso_de AND fb.peso_ate
        AND fb.nome_tabela = cb.tabela_motorista
      LEFT JOIN tabela_faturamento tf
        ON re."Peso"::numeric BETWEEN tf.peso_de AND tf.peso_ate
      JOIN lista_entregas le ON le."Número"::text = re."Lista"
      WHERE LOWER(re."Evento") = 'entrega'
        AND le.status = 'Finalizado'
        AND re."Data"::date BETWEEN qp.inicio AND qp.fim
    ),
    entregas_base AS (
      SELECT DISTINCT ON (ncte, lista) *
      FROM entregas_raw
      ORDER BY ncte, lista,
        CASE WHEN valor_peso > 0 THEN 0 ELSE 1 END,
        valor_peso ASC
    ),
    resumo_motorista AS (
      SELECT
        matricula,
        nome_entrega,
        COUNT(*)              AS total_ctes,
        COUNT(DISTINCT lista) AS total_listas,
        SUM(peso_cte)         AS peso_total,
        SUM(valor_peso)       AS total_quinzena,
        SUM(valor_faturamento) AS total_faturamento,
        BOOL_AND(COALESCE(pago_raw, false)) AS pago
      FROM entregas_base
      GROUP BY matricula, nome_entrega
    )
    SELECT
      m."OperadorMatricula"::bigint AS matricula,
      m.nome_completo,
      m.cpf,
      m.telefone,
      m.pgro,
      COALESCE(rm.total_ctes, 0)   AS total_ctes,
      COALESCE(rm.total_listas, 0) AS total_listas,
      COALESCE(rm.peso_total, 0)   AS peso_total,
      COALESCE(rm.total_quinzena, 0)::numeric(10,2) AS total_quinzena,
      COALESCE(rm.total_faturamento, 0)::numeric(10,2) AS receita_total,
      COALESCE(rm.total_faturamento - rm.total_quinzena, 0)::numeric(10,2) AS margem_bruta,
      COALESCE(rm.pago, false) AS pago
    FROM matriculos_jad m
    LEFT JOIN resumo_motorista rm ON rm.matricula = m."OperadorMatricula"::bigint
    WHERE COALESCE(rm.total_quinzena, 0) > 0
    ORDER BY m.nome_completo;
  `;

  const result = await pool.query(query, [inicio, fim]);
  return result.rows;
}

export async function confirmarPagamento(matricula, periodo) {
  const query = `
    UPDATE lista_entregas le
    SET pago = true
    FROM relatorioentrega_export re
    WHERE le."Número"::text = re."Lista"
      AND re."OperadorMatricula"::bigint = $1
      AND LOWER(re."Evento") = 'entrega'
      AND (le.pago IS NULL OR le.pago = false)
      AND re."Data"::date BETWEEN $2 AND $3
  `;
  await pool.query(query, [matricula, periodo.inicio, periodo.fim]);
}

export async function listarMotoristas() {
  const result = await pool.query(`
    SELECT
      "OperadorMatricula"::bigint AS matricula,
      "OperadorMatricula"::bigint AS "OperadorMatricula",
      nome_completo,
      cpf,
      telefone,
      pgro
    FROM matriculos_jad
    ORDER BY nome_completo
  `);
  return result.rows;
}

export async function getQuinzenasAdmin() {
  const result = await pool.query(`
    SELECT DISTINCT
      CASE
        WHEN EXTRACT(DAY FROM re."Data"::date) <= 15 THEN
          date_trunc('month', re."Data"::date)::date
        ELSE
          (date_trunc('month', re."Data"::date) + INTERVAL '15 days')::date
      END AS inicio,
      CASE
        WHEN EXTRACT(DAY FROM re."Data"::date) <= 15 THEN
          (date_trunc('month', re."Data"::date) + INTERVAL '14 days')::date
        ELSE
          (date_trunc('month', re."Data"::date) + INTERVAL '1 month' - INTERVAL '1 day')::date
      END AS fim
    FROM relatorioentrega_export re
    WHERE re."Data" IS NOT NULL
    ORDER BY inicio DESC
  `);
  return result.rows;
}

export async function criarMotorista(dados) {
  const { matricula, nome_completo, cpf, telefone, pgro } = dados;
  await pool.query(`
    INSERT INTO matriculos_jad ("OperadorMatricula", nome_completo, cpf, telefone, pgro)
    VALUES ($1, $2, $3, $4, $5)
  `, [matricula, nome_completo, cpf, telefone || null, pgro || null]);
  return { matricula, nome_completo, cpf, telefone, pgro };
}

export async function atualizarMotorista(matricula, dados) {
  const { nome_completo, cpf, telefone, pgro } = dados;
  const result = await pool.query(`
    UPDATE matriculos_jad
    SET nome_completo = $1, cpf = $2, telefone = $3, pgro = $4
    WHERE "OperadorMatricula" = $5
  `, [nome_completo, cpf, telefone || null, pgro || null, matricula]);
  return result.rowCount > 0;
}

export async function deletarMotorista(matricula) {
  await pool.query(
    `DELETE FROM relatorioentrega_export WHERE "OperadorMatricula" = $1`,
    [matricula]
  );
  await pool.query(
    `UPDATE lista_entregas SET matricula_motorista = NULL WHERE matricula_motorista = $1`,
    [String(matricula)]
  );
  const result = await pool.query(
    `DELETE FROM matriculos_jad WHERE "OperadorMatricula" = $1`,
    [matricula]
  );
  return result.rowCount > 0;
}

import { pool } from '../db/index.js';

export async function calcularPagamentos(inicio, fim) {
  const query = `
    WITH quinzena_params AS (
      SELECT $1::date AS inicio, $2::date AS fim
    ),
    entregas_base AS (
      SELECT
        re."OperadorMatricula"::bigint AS matricula,
        re."OperadorNome"              AS nome_entrega,
        re."Lista"                     AS lista,
        re."Peso"::numeric             AS peso_cte,
        COALESCE(fp.valor_peso, 0)     AS valor_faixa,
        CASE
          WHEN re."Peso"::numeric > 15 THEN (re."Peso"::numeric - 15) * 0.80
          ELSE 0
        END AS valor_excedente
      FROM "relatorioentrega_export" re
      CROSS JOIN quinzena_params qp
      LEFT JOIN faixas_peso fp
        ON re."Peso"::numeric BETWEEN fp.peso_de AND fp.peso_ate
      WHERE LOWER(re."Evento") = 'entrega'
        AND re."Data"::date BETWEEN qp.inicio AND qp.fim
    ),
    entregas_quinzena AS (
      SELECT
        matricula, nome_entrega, lista,
        COUNT(*) AS ctes_entregues,
        SUM(peso_cte) AS peso_total,
        SUM(valor_faixa + valor_excedente) AS receita_total_lista
      FROM entregas_base
      GROUP BY matricula, nome_entrega, lista
    ),
    entregas_com_metrica AS (
      SELECT
        eq.*,
        COALESCE(
          NULLIF(TRIM(le.metrica_da_lista), ''),
          NULLIF(TRIM(m.pgro), '')
        ) AS metrica
      FROM entregas_quinzena eq
      LEFT JOIN lista_entregas le ON le."Número"::text = eq.lista::text
      LEFT JOIN matriculos_jad m ON m."OperadorMatricula"::bigint = eq.matricula
    ),
    entregas_com_valor AS (
      SELECT
        em.*,
        COALESCE(tf.valor_frete::numeric, 0) AS valor_frete_unitario,
        (em.ctes_entregues * COALESCE(tf.valor_frete::numeric, 0)) AS custo_total_lista
      FROM entregas_com_metrica em
      LEFT JOIN tabela_frete_motorista tf
        ON tf.matricula::bigint = em.matricula
        AND LOWER(TRIM(tf.metrica)) = LOWER(TRIM(em.metrica))
    ),
    por_motorista_metrica AS (
      SELECT
        matricula, metrica,
        SUM(ctes_entregues) AS ctes_metrica,
        MIN(valor_frete_unitario) AS valor_frete,
        SUM(custo_total_lista) AS custo_metrica,
        SUM(receita_total_lista) AS receita_metrica
      FROM entregas_com_valor
      GROUP BY matricula, metrica
    ),
    status_listas AS (
      SELECT
        eq.matricula,
        SUM(eq.receita_total_lista) AS receita_total,
        SUM(ecv.custo_total_lista) AS custo_total,
        SUM(eq.ctes_entregues) AS total_ctes,
        BOOL_OR(COALESCE(le.ok_motorista, false)) AS ok_motorista,
        BOOL_OR(COALESCE(le.revisao_motorista, false)) AS revisao_motorista
      FROM entregas_quinzena eq
      JOIN entregas_com_valor ecv ON ecv.lista = eq.lista AND ecv.matricula = eq.matricula
      LEFT JOIN lista_entregas le ON le."Número"::text = eq.lista::text
      GROUP BY eq.matricula
    )
    SELECT
      m."OperadorMatricula"::bigint AS matricula,
      m.nome_completo,
      m.cpf,
      m.telefone,
      sl.receita_total,
      sl.custo_total AS total_quinzena,
      (sl.receita_total - sl.custo_total) AS margem_bruta,
      sl.total_ctes,
      COALESCE(
        json_agg(
          json_build_object(
            'metrica',     pmm.metrica,
            'ctes',        pmm.ctes_metrica,
            'valor_frete', pmm.valor_frete,
            'valor_total', pmm.custo_metrica,
            'receita',     pmm.receita_metrica
          )
          ORDER BY pmm.custo_metrica DESC
        ) FILTER (WHERE pmm.metrica IS NOT NULL),
        '[]'::json
      ) AS metricas,
      sl.ok_motorista,
      sl.revisao_motorista
    FROM matriculos_jad m
    INNER JOIN status_listas sl ON sl.matricula = m."OperadorMatricula"::bigint
    LEFT JOIN por_motorista_metrica pmm ON pmm.matricula = m."OperadorMatricula"::bigint
    WHERE sl.custo_total > 0
    GROUP BY
      m."OperadorMatricula", m.nome_completo, m.cpf, m.telefone,
      sl.receita_total, sl.custo_total, sl.total_ctes, sl.ok_motorista, sl.revisao_motorista
    ORDER BY sl.custo_total DESC;
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
      AND re."Data"::date BETWEEN $2 AND $3
  `;
  await pool.query(query, [matricula, periodo.inicio, periodo.fim]);
}

export async function listarMotoristas() {
  const result = await pool.query(`
    SELECT "OperadorMatricula"::bigint AS matricula, nome_completo, cpf, telefone
    FROM matriculos_jad
    WHERE telefone IS NOT NULL
    ORDER BY nome_completo
  `);
  return result.rows;
}

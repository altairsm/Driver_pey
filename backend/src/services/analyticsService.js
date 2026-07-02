import { pool } from '../db/index.js';

export async function getAnalyticsBairros(inicio, fim, matricula) {
  const query = `
    WITH entregas_periodo AS (
      SELECT DISTINCT ON (re."NCTE", re."Lista")
        COALESCE(ce.bairro, 'SEM CADASTRO') AS bairro,
        ce.nome_tabela,
        COALESCE(fb.faixas, 'SEM FAIXA') AS faixa_peso_desc,
        re."Peso"::numeric AS peso,
        COALESCE(fb.valor_peso, 0) AS valor_peso,
        COALESCE(tf.valor_fixo + GREATEST(re."Peso"::numeric - 15, 0) * tf.valor_excedente_kg, 0) AS valor_faturamento,
        mj.nome_completo AS nome_motorista
      FROM relatorioentrega_export re
      LEFT JOIN ceps_especificos ce
        ON ce.cep = NULLIF(REGEXP_REPLACE(COALESCE(re."Cep", '0'), '[^0-9]', '', 'g'), '')
      LEFT JOIN faixas_peso_entrega_bairro fb
        ON re."Peso"::numeric BETWEEN fb.peso_de AND fb.peso_ate
        AND fb.nome_tabela = ce.nome_tabela
      LEFT JOIN tabela_faturamento tf
        ON re."Peso"::numeric BETWEEN tf.peso_de AND tf.peso_ate
      JOIN matriculos_jad mj
        ON mj."OperadorMatricula"::bigint = re."OperadorMatricula"::bigint
      WHERE LOWER(re."Evento") = 'entrega'
        AND re."Data"::date BETWEEN $1 AND $2
        AND ($3::bigint IS NULL OR re."OperadorMatricula"::bigint = $3)
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

  const result = await pool.query(query, [inicio, fim, matricula || null]);
  return result.rows;
}

export async function getDistribuicaoRotas(inicio, fim) {
  const query = `
    WITH entregas_dedup AS (
      SELECT DISTINCT ON (re."NCTE", re."Lista")
        le."Rota",
        COALESCE(fb.valor_peso, 0) AS valor_peso
      FROM relatorioentrega_export re
      JOIN lista_entregas le ON le."Número"::text = re."Lista"
      LEFT JOIN ceps_especificos ce
        ON ce.cep = NULLIF(REGEXP_REPLACE(COALESCE(re."Cep", '0'), '[^0-9]', '', 'g'), '')
      LEFT JOIN faixas_peso_entrega_bairro fb
        ON re."Peso"::numeric BETWEEN fb.peso_de AND fb.peso_ate
        AND fb.nome_tabela = ce.nome_tabela
      WHERE LOWER(re."Evento") = 'entrega'
        AND le.status = 'Finalizado'
        AND le."Data Baixa"::date BETWEEN $1 AND $2
      ORDER BY re."NCTE", re."Lista",
        CASE WHEN fb.valor_peso > 0 THEN 0 ELSE 1 END
    )
    SELECT
      COALESCE(NULLIF("Rota", ''), 'SEM ROTA') AS rota,
      COUNT(*) AS total_ctes,
      ROUND(SUM(valor_peso)::numeric, 2) AS total_receita
    FROM entregas_dedup
    GROUP BY "Rota"
    ORDER BY total_ctes DESC
  `;

  const result = await pool.query(query, [inicio, fim]);
  return result.rows;
}

export async function getEvolucaoQuinzenal(ultimasN = 12) {
  const query = `
    WITH quinzenas AS (
      SELECT DISTINCT
        CASE WHEN EXTRACT(DAY FROM le."Data Baixa"::date) <= 15 THEN
          date_trunc('month', le."Data Baixa"::date)::date
        ELSE
          (date_trunc('month', le."Data Baixa"::date) + INTERVAL '15 days')::date
        END AS inicio,
        CASE WHEN EXTRACT(DAY FROM le."Data Baixa"::date) <= 15 THEN
          (date_trunc('month', le."Data Baixa"::date) + INTERVAL '14 days')::date
        ELSE
          (date_trunc('month', le."Data Baixa"::date) + INTERVAL '1 month' - INTERVAL '1 day')::date
        END AS fim
      FROM lista_entregas le
      WHERE le."Data Baixa" IS NOT NULL
    ),
    ranked AS (
      SELECT *, ROW_NUMBER() OVER (ORDER BY inicio DESC) AS rn
      FROM quinzenas
    ),
    entregas_por_quinzena AS (
      SELECT DISTINCT ON (re."NCTE", re."Lista", rq.inicio)
        rq.inicio, rq.fim,
        COALESCE(fb.valor_peso, 0) AS valor_peso,
        COALESCE(tf.valor_fixo + GREATEST(re."Peso"::numeric - 15, 0) * tf.valor_excedente_kg, 0) AS valor_faturamento
      FROM ranked rq
      JOIN lista_entregas le ON le."Data Baixa"::date BETWEEN rq.inicio AND rq.fim
      JOIN relatorioentrega_export re ON le."Número"::text = re."Lista"
      LEFT JOIN ceps_especificos ce
        ON ce.cep = NULLIF(REGEXP_REPLACE(COALESCE(re."Cep", '0'), '[^0-9]', '', 'g'), '')
      LEFT JOIN faixas_peso_entrega_bairro fb
        ON re."Peso"::numeric BETWEEN fb.peso_de AND fb.peso_ate
        AND fb.nome_tabela = ce.nome_tabela
      LEFT JOIN tabela_faturamento tf
        ON re."Peso"::numeric BETWEEN tf.peso_de AND tf.peso_ate
      WHERE LOWER(re."Evento") = 'entrega'
        AND le.status = 'Finalizado'
        AND rq.rn <= $1
      ORDER BY re."NCTE", re."Lista", rq.inicio,
        CASE WHEN fb.valor_peso > 0 THEN 0 ELSE 1 END
    )
    SELECT
      inicio, fim,
      COUNT(*)::int AS total_ctes,
      ROUND(SUM(valor_peso)::numeric, 2) AS total_receita,
      ROUND(SUM(valor_faturamento)::numeric, 2) AS total_faturamento
    FROM entregas_por_quinzena
    GROUP BY inicio, fim
    ORDER BY inicio ASC
  `;

  const result = await pool.query(query, [ultimasN]);
  return result.rows;
}

export async function getComparativoMotoristas(inicio, fim) {
  const query = `
    WITH quinzena_params AS (
      SELECT $1::date AS inicio, $2::date AS fim
    ),
    entregas_raw AS (
      SELECT
        re."OperadorMatricula"::bigint AS matricula,
        re."NCTE" AS ncte,
        re."Lista" AS lista,
        COALESCE(fb.valor_peso, 0) AS valor_peso,
        COALESCE(tf.valor_fixo + GREATEST(re."Peso"::numeric - 15, 0) * tf.valor_excedente_kg, 0) AS valor_faturamento
      FROM relatorioentrega_export re
      CROSS JOIN quinzena_params qp
      LEFT JOIN ceps_especificos ce
        ON ce.cep = NULLIF(REGEXP_REPLACE(COALESCE(re."Cep", '0'), '[^0-9]', '', 'g'), '')
      LEFT JOIN faixas_peso_entrega_bairro fb
        ON re."Peso"::numeric BETWEEN fb.peso_de AND fb.peso_ate
        AND fb.nome_tabela = ce.nome_tabela
      LEFT JOIN tabela_faturamento tf
        ON re."Peso"::numeric BETWEEN tf.peso_de AND tf.peso_ate
      JOIN lista_entregas le ON le."Número"::text = re."Lista"
      WHERE LOWER(re."Evento") = 'entrega'
        AND le.status = 'Finalizado'
        AND le."Data Baixa"::date BETWEEN qp.inicio AND qp.fim
    ),
    entregas_base AS (
      SELECT DISTINCT ON (ncte, lista) *
      FROM entregas_raw
      ORDER BY ncte, lista,
        CASE WHEN valor_peso > 0 THEN 0 ELSE 1 END,
        valor_peso ASC
    ),
    multas AS (
      SELECT
        e."OperadorMatricula"::bigint AS matricula,
        COUNT(*)::int AS qtd_reclamacoes
      FROM acareacaojad r
      JOIN relatorioentrega_export e ON e."NCTE" = r."NCTE" AND LOWER(e."Evento") = 'entrega'
      JOIN solicitacoes_pagamento sp ON sp.lista_numero = NULLIF(e."Lista", '')::bigint
        AND sp.matricula = e."OperadorMatricula"::bigint
        AND sp.status = 'aprovado'
        AND sp.aprovado_em < r.data_criacao::timestamp
      CROSS JOIN quinzena_params qp
      WHERE r.data_criacao BETWEEN qp.inicio AND qp.fim
        AND r."NCTE" IS NOT NULL
        AND e."OperadorMatricula" IS NOT NULL
      GROUP BY e."OperadorMatricula"::bigint
    ),
    bonus_d0 AS (
      SELECT DISTINCT ON (re."NCTE", re."Lista")
        re."NCTE" AS ncte,
        re."Lista" AS lista,
        COALESCE(br.bonus_d0, 0) AS bonus
      FROM relatorioentrega_export re
      JOIN lista_entregas le ON le."Número"::text = re."Lista"
      LEFT JOIN ceps_bairros cb
        ON NULLIF(REGEXP_REPLACE(COALESCE(re."Cep", '0'), '[^0-9]', '', 'g'), '')
           BETWEEN cb.cep_ini AND cb.cep_fim
      LEFT JOIN bairros_rotas br ON LOWER(br.bairro) = LOWER(cb.bairro)
      CROSS JOIN quinzena_params qp
      WHERE LOWER(re."Evento") = 'entrega'
        AND le.status = 'Finalizado'
        AND le."Data Baixa"::date BETWEEN qp.inicio AND qp.fim
        AND re."Data"::date = le."Data Emissão"
        AND COALESCE(br.bonus_d0, 0) > 0
      ORDER BY re."NCTE", re."Lista"
    ),
    resumo_motorista AS (
      SELECT
        eb.matricula,
        COUNT(*)::int AS total_ctes,
        ROUND(SUM(eb.valor_peso)::numeric, 2) AS total_receita,
        ROUND(SUM(eb.valor_faturamento)::numeric, 2) AS total_faturamento,
        COALESCE(SUM(bd.bonus), 0)::numeric(10,2) AS total_bonus_d0
      FROM entregas_base eb
      LEFT JOIN bonus_d0 bd ON bd.ncte = eb.ncte AND bd.lista = eb.lista
      GROUP BY eb.matricula
    )
    SELECT
      m."OperadorMatricula"::bigint AS matricula,
      m.nome_completo,
      COALESCE(rm.total_ctes, 0)::int AS total_ctes,
      COALESCE(rm.total_receita, 0)::numeric(10,2) AS total_receita,
      COALESCE(rm.total_receita - COALESCE(mu.qtd_reclamacoes, 0) * (SELECT COALESCE(multa_reclamacao, 0) FROM configuracoes WHERE id = 1), 0)::numeric(10,2) AS total_quinzena,
      COALESCE(rm.total_bonus_d0, 0)::numeric(10,2) AS total_bonus_d0,
      COALESCE(rm.total_faturamento, 0)::numeric(10,2) AS total_faturamento,
      COALESCE(rm.total_faturamento - rm.total_receita + COALESCE(mu.qtd_reclamacoes, 0) * (SELECT COALESCE(multa_reclamacao, 0) FROM configuracoes WHERE id = 1), 0)::numeric(10,2) AS margem_bruta,
      COALESCE(mu.qtd_reclamacoes, 0)::int AS qtd_reclamacoes,
      CASE WHEN COALESCE(rm.total_ctes, 0) > 0
        THEN ROUND((COALESCE(mu.qtd_reclamacoes, 0)::numeric / rm.total_ctes) * 100, 2)
        ELSE 0
      END AS pct_reclamacao
    FROM matriculos_jad m
    LEFT JOIN resumo_motorista rm ON rm.matricula = m."OperadorMatricula"::bigint
    LEFT JOIN multas mu ON mu.matricula = m."OperadorMatricula"::bigint
    WHERE rm.matricula IS NOT NULL
    ORDER BY rm.total_ctes DESC
  `;

  const result = await pool.query(query, [inicio, fim]);
  const rows = result.rows;

  if (rows.length === 0) return [];

  const avg = {
    ctes: rows.reduce((s, r) => s + Number(r.total_ctes), 0) / rows.length,
    receita: rows.reduce((s, r) => s + Number(r.total_receita), 0) / rows.length,
    margem: rows.reduce((s, r) => s + Number(r.margem_bruta), 0) / rows.length,
    reclamacoes: rows.reduce((s, r) => s + Number(r.qtd_reclamacoes), 0) / rows.length,
    pct_reclamacao: rows.reduce((s, r) => s + Number(r.pct_reclamacao), 0) / rows.length,
  };

  return {
    media_frota: {
      media_ctes: Math.round(avg.ctes * 100) / 100,
      media_receita: Math.round(avg.receita * 100) / 100,
      media_margem: Math.round(avg.margem * 100) / 100,
      media_reclamacoes: Math.round(avg.reclamacoes * 100) / 100,
      media_pct_reclamacao: Math.round(avg.pct_reclamacao * 100) / 100,
    },
    motoristas: rows.map((r) => ({
      ...r,
      diff_ctes_pct: avg.ctes > 0
        ? Math.round(((Number(r.total_ctes) - avg.ctes) / avg.ctes) * 10000) / 100
        : 0,
      diff_margem_pct: avg.margem !== 0
        ? Math.round(((Number(r.margem_bruta) - avg.margem) / Math.abs(avg.margem)) * 10000) / 100
        : 0,
    })),
  };
}

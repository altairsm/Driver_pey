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
        COUNT(*)::int AS qtd_reclamacoes,
        COUNT(*)::int * (SELECT COALESCE(multa_reclamacao, 0) FROM configuracoes WHERE id = 1) AS total_multa
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
        eb.nome_entrega,
        COUNT(CASE WHEN COALESCE(eb.pago_raw, false) = false THEN 1 END) AS total_ctes,
        COUNT(DISTINCT CASE WHEN COALESCE(eb.pago_raw, false) = false THEN eb.lista END) AS total_listas,
        SUM(CASE WHEN COALESCE(eb.pago_raw, false) = false THEN eb.peso_cte ELSE 0 END) AS peso_total,
        SUM(CASE WHEN COALESCE(eb.pago_raw, false) = false THEN eb.valor_peso ELSE 0 END) AS total_quinzena,
        SUM(CASE WHEN COALESCE(eb.pago_raw, false) = false THEN eb.valor_faturamento ELSE 0 END) AS total_faturamento,
        COALESCE(SUM(bd.bonus), 0)::numeric(10,2) AS total_bonus_d0,
        BOOL_AND(COALESCE(eb.pago_raw, false)) AS pago
      FROM entregas_base eb
      LEFT JOIN bonus_d0 bd ON bd.ncte = eb.ncte AND bd.lista = eb.lista
      GROUP BY eb.matricula, eb.nome_entrega
    )
    SELECT
      m."OperadorMatricula"::bigint AS matricula,
      m.nome_completo,
      m.cpf,
      m.telefone,
      m.pgto,
      COALESCE(rm.total_ctes, 0)   AS total_ctes,
      COALESCE(rm.total_listas, 0) AS total_listas,
      COALESCE(rm.peso_total, 0)   AS peso_total,
      COALESCE(rm.total_quinzena - COALESCE(mu.total_multa, 0), 0)::numeric(10,2) AS total_quinzena,
      COALESCE(rm.total_bonus_d0, 0)::numeric(10,2) AS total_bonus_d0,
      COALESCE(rm.total_faturamento, 0)::numeric(10,2) AS receita_total,
      COALESCE(rm.total_faturamento - rm.total_quinzena + COALESCE(mu.total_multa, 0), 0)::numeric(10,2) AS margem_bruta,
      COALESCE(mu.total_multa, 0)::numeric(10,2) AS total_multa,
      COALESCE(mu.qtd_reclamacoes, 0) AS qtd_reclamacoes,
      COALESCE(rm.pago, false) AS pago
    FROM matriculos_jad m
    LEFT JOIN resumo_motorista rm ON rm.matricula = m."OperadorMatricula"::bigint
    LEFT JOIN multas mu ON mu.matricula = m."OperadorMatricula"::bigint
    WHERE rm.matricula IS NOT NULL
    ORDER BY m.nome_completo;
  `;

  const result = await pool.query(query, [inicio, fim]);
  return result.rows;
}

export async function confirmarPagamento(matricula, periodo, pagamento) {
  const { inicio, fim } = periodo;

  const { rows: [driver] } = await pool.query(
    `SELECT nome_completo FROM matriculos_jad WHERE "OperadorMatricula" = $1`,
    [matricula]
  );

  const { rows: [entregas] } = await pool.query(`
    SELECT COUNT(DISTINCT (re."NCTE", re."Lista"))::int AS total_entregas
    FROM relatorioentrega_export re
    JOIN lista_entregas le ON le."Número"::text = re."Lista"
    WHERE re."OperadorMatricula"::bigint = $1
      AND LOWER(re."Evento") = 'entrega'
      AND le.status = 'Finalizado'
      AND (le.pago IS NULL OR le.pago = false)
      AND le."Data Baixa"::date BETWEEN $2 AND $3
  `, [matricula, inicio, fim]);

  const { rows: [gross] } = await pool.query(`
    SELECT COALESCE(SUM(sub.valor_peso), 0)::numeric(10,2) AS total_quinzena
    FROM (
      SELECT DISTINCT ON (re."NCTE", re."Lista")
        re."NCTE", re."Lista",
        COALESCE(fb.valor_peso, 0) AS valor_peso
      FROM relatorioentrega_export re
      LEFT JOIN ceps_especificos ce ON ce.cep = NULLIF(REGEXP_REPLACE(COALESCE(re."Cep", '0'), '[^0-9]', '', 'g'), '')
      LEFT JOIN faixas_peso_entrega_bairro fb
        ON re."Peso"::numeric BETWEEN fb.peso_de AND fb.peso_ate
        AND fb.nome_tabela = ce.nome_tabela
      JOIN lista_entregas le ON le."Número"::text = re."Lista"
      WHERE re."OperadorMatricula"::bigint = $1
        AND LOWER(re."Evento") = 'entrega'
        AND le.status = 'Finalizado'
        AND (le.pago IS NULL OR le.pago = false)
        AND le."Data Baixa"::date BETWEEN $2 AND $3
      ORDER BY re."NCTE", re."Lista",
        CASE WHEN fb.valor_peso > 0 THEN 0 ELSE 1 END,
        fb.valor_peso ASC
    ) sub
  `, [matricula, inicio, fim]);

  const { rows: [multaRow] } = await pool.query(`
    SELECT COALESCE(COUNT(*)::int * (SELECT COALESCE(multa_reclamacao, 0) FROM configuracoes WHERE id = 1), 0)::numeric(10,2) AS total_multa
    FROM acareacaojad r
    JOIN relatorioentrega_export e ON e."NCTE" = r."NCTE" AND LOWER(e."Evento") = 'entrega'
    JOIN solicitacoes_pagamento sp ON sp.lista_numero = NULLIF(e."Lista", '')::bigint
      AND sp.matricula = e."OperadorMatricula"::bigint
      AND sp.status = 'aprovado'
      AND sp.aprovado_em < r.data_criacao::timestamp
    WHERE r.data_criacao BETWEEN $2 AND $3
      AND r."NCTE" IS NOT NULL
      AND e."OperadorMatricula"::bigint = $1
  `, [matricula, inicio, fim]);

  const { rows: [adiantadoRow] } = await pool.query(`
    SELECT COALESCE(SUM(valor_solicitado), 0)::numeric(10,2) AS total_adiantado
    FROM solicitacoes_pagamento
    WHERE matricula = $1
      AND status = 'aprovado'
      AND aprovado_em::date BETWEEN $2 AND $3
  `, [matricula, inicio, fim]);

  const { rows: [bonusRow] } = await pool.query(`
    SELECT COALESCE(SUM(sub.bonus), 0)::numeric(10,2) AS total_bonus_d0
    FROM (
      SELECT DISTINCT ON (re."NCTE", re."Lista")
        COALESCE(br.bonus_d0, 0) AS bonus
      FROM relatorioentrega_export re
      JOIN lista_entregas le ON le."Número"::text = re."Lista"
      LEFT JOIN ceps_bairros cb
        ON NULLIF(REGEXP_REPLACE(COALESCE(re."Cep", '0'), '[^0-9]', '', 'g'), '')
           BETWEEN cb.cep_ini AND cb.cep_fim
      LEFT JOIN bairros_rotas br ON LOWER(br.bairro) = LOWER(cb.bairro)
      WHERE re."OperadorMatricula"::bigint = $1
        AND LOWER(re."Evento") = 'entrega'
        AND le.status = 'Finalizado'
        AND (le.pago IS NULL OR le.pago = false)
        AND le."Data Baixa"::date BETWEEN $2 AND $3
        AND re."Data"::date = le."Data Emissão"
        AND COALESCE(br.bonus_d0, 0) > 0
      ORDER BY re."NCTE", re."Lista"
    ) sub
  `, [matricula, inicio, fim]);

  const total_quinzena = parseFloat(gross?.total_quinzena) || 0;
  const total_multa = parseFloat(multaRow?.total_multa) || 0;
  const total_adiantado = parseFloat(adiantadoRow?.total_adiantado) || 0;
  const total_bonus_d0 = parseFloat(bonusRow?.total_bonus_d0) || 0;
  const total_pagar = total_quinzena + total_bonus_d0 - total_multa - total_adiantado;

  const payload = {
    matricula: Number(matricula),
    nome: driver?.nome_completo || '',
    quinzena_inicio: inicio,
    quinzena_fim: fim,
    total_entregas: entregas?.total_entregas || 0,
    total_pagar: total_pagar < 0 ? 0 : total_pagar,
    total_quinzena,
    total_bonus_d0,
    total_multa,
    total_adiantado,
    data_pagamento: new Date().toISOString().slice(0, 10),
  };

  try {
    const res = await fetch('https://webhook.sactudo.com.br/webhook/Driver_Pix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(`Webhook responded with ${res.status}: ${await res.text().catch(() => '')}`);
    }
  } catch (err) {
    console.error('Webhook error:', err.message);
  }

  const query = `
    UPDATE lista_entregas le
    SET pago = true
    FROM relatorioentrega_export re
    WHERE le."Número"::text = re."Lista"
      AND re."OperadorMatricula"::bigint = $1
      AND LOWER(re."Evento") = 'entrega'
      AND le.status = 'Finalizado'
      AND (le.pago IS NULL OR le.pago = false)
      AND le."Data Baixa"::date BETWEEN $2 AND $3
  `;
  await pool.query(query, [matricula, inicio, fim]);
}

export async function listarMotoristas() {
  const result = await pool.query(`
    SELECT
      "OperadorMatricula"::bigint AS matricula,
      "OperadorMatricula"::bigint AS "OperadorMatricula",
      nome_completo,
      cpf,
      telefone,
      pgto,
      auto_aprovado
    FROM matriculos_jad
    ORDER BY nome_completo
  `);
  return result.rows;
}

export async function getQuinzenasAdmin() {
  const result = await pool.query(`
    SELECT DISTINCT
      CASE
        WHEN EXTRACT(DAY FROM le."Data Baixa"::date) <= 15 THEN
          date_trunc('month', le."Data Baixa"::date)::date
        ELSE
          (date_trunc('month', le."Data Baixa"::date) + INTERVAL '15 days')::date
      END AS inicio,
      CASE
        WHEN EXTRACT(DAY FROM le."Data Baixa"::date) <= 15 THEN
          (date_trunc('month', le."Data Baixa"::date) + INTERVAL '14 days')::date
        ELSE
          (date_trunc('month', le."Data Baixa"::date) + INTERVAL '1 month' - INTERVAL '1 day')::date
      END AS fim
    FROM lista_entregas le
    WHERE le."Data Baixa" IS NOT NULL
    ORDER BY inicio DESC
  `);
  return result.rows;
}

export async function getListasPendentes(matricula, inicio, fim) {
  const result = await pool.query(`
    WITH entregas_dedup AS (
      SELECT DISTINCT ON (re."NCTE", re."Lista")
        re."NCTE",
        re."Lista" AS lista,
        COALESCE(fb.valor_peso, 0) AS valor_peso
      FROM relatorioentrega_export re
      LEFT JOIN ceps_especificos ce
        ON ce.cep = NULLIF(REGEXP_REPLACE(COALESCE(re."Cep", '0'), '[^0-9]', '', 'g'), '')
      LEFT JOIN faixas_peso_entrega_bairro fb
        ON re."Peso"::numeric BETWEEN fb.peso_de AND fb.peso_ate
        AND fb.nome_tabela = ce.nome_tabela
      JOIN lista_entregas le ON le."Número"::text = re."Lista"
      WHERE re."OperadorMatricula"::bigint = $1
        AND LOWER(re."Evento") = 'entrega'
        AND le.status = 'Finalizado'
        AND le."Data Baixa"::date BETWEEN $2 AND $3
      ORDER BY re."NCTE", re."Lista",
        CASE WHEN fb.valor_peso > 0 THEN 0 ELSE 1 END,
        fb.valor_peso ASC
    )
    SELECT
      le."Número",
      le."Data Baixa",
      le."Rota",
      le.pago,
      COUNT(*)::int AS qtd_ctes,
      COALESCE(SUM(ed.valor_peso), 0)::numeric(10,2) AS valor_total
    FROM entregas_dedup ed
    JOIN lista_entregas le ON le."Número"::text = ed.lista
    GROUP BY le."Número", le."Data Baixa", le."Rota", le.pago
    ORDER BY le."Número"
  `, [matricula, inicio, fim]);
  return result.rows;
}

export async function criarMotorista(dados) {
  const { matricula, nome_completo, cpf, telefone, pgto, auto_aprovado } = dados;
  await pool.query(`
    INSERT INTO matriculos_jad ("OperadorMatricula", nome_completo, cpf, telefone, pgto, auto_aprovado)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [matricula, nome_completo, cpf, telefone || null, pgto || null, auto_aprovado === true]);
  return { matricula, nome_completo, cpf, telefone, pgto, auto_aprovado };
}

export async function atualizarMotorista(matricula, dados) {
  const { nome_completo, cpf, telefone, pgto, auto_aprovado } = dados;
  const result = await pool.query(`
    UPDATE matriculos_jad
    SET nome_completo = $1, cpf = $2, telefone = $3, pgto = $4, auto_aprovado = $5
    WHERE "OperadorMatricula" = $6
  `, [nome_completo, cpf, telefone || null, pgto || null, auto_aprovado === true, matricula]);
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

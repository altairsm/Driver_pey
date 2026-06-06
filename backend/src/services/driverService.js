import { pool } from '../db/index.js';

export async function getDriverData(matricula) {
  const result = await pool.query(`
    SELECT "OperadorMatricula"::bigint AS matricula, nome_completo, cpf, telefone
    FROM matriculos_jad
    WHERE "OperadorMatricula"::bigint = $1
  `, [matricula]);
  return result.rows[0] || null;
}

export async function getDriverDashboard(matricula, inicio = null, fim = null) {
  const query = `
    WITH entregas_raw AS (
      SELECT
        re."NCTE" AS ncte,
        re."Lista" AS lista,
        re."Peso"::numeric AS peso_cte,
        COALESCE(fb.valor_peso, 0) AS valor_peso
      FROM relatorioentrega_export re
      LEFT JOIN ceps_bairros cb
        ON CAST(NULLIF(REGEXP_REPLACE(COALESCE(re."Cep", '0'), '[^0-9]', '', 'g'), '') AS BIGINT)
           BETWEEN CAST(cb.cep_ini AS BIGINT) AND CAST(cb.cep_fim AS BIGINT)
      LEFT JOIN faixas_peso_entrega_bairro fb
        ON re."Peso"::numeric BETWEEN fb.peso_de AND fb.peso_ate
        AND fb.nome_tabela = cb.tabela_motorista
      JOIN lista_entregas le ON le."Número"::text = re."Lista"
      WHERE re."OperadorMatricula"::bigint = $1
        AND LOWER(re."Evento") = 'entrega'
        AND le.status = 'Finalizado'
        AND (le.pago IS NULL OR le.pago = false)
        AND ($2::date IS NULL OR le."Data Baixa" >= $2)
        AND ($3::date IS NULL OR le."Data Baixa" <= $3)
    ),
    entregas_dedup AS (
      SELECT DISTINCT ON (ncte, lista) *
      FROM entregas_raw
      ORDER BY ncte, lista,
        CASE WHEN valor_peso > 0 THEN 0 ELSE 1 END,
        valor_peso ASC
    ),
    resumo AS (
      SELECT
        COUNT(*) AS total_ctes,
        COUNT(DISTINCT lista) AS total_listas,
        SUM(peso_cte) AS peso_total,
        SUM(valor_peso) AS receita_total
      FROM entregas_dedup
    )
    SELECT * FROM resumo;
  `;

  const result = await pool.query(query, [matricula, inicio, fim]);
  return result.rows[0] || { total_ctes: 0, total_listas: 0, peso_total: 0, receita_total: 0 };
}

export async function getDriverTrips(matricula, inicio = null, fim = null) {
  const result = await pool.query(`
    SELECT
      re."Lista" AS numero_lista,
      MAX(le."Data Emissão") AS data_emissao,
      MAX(le."Data Baixa") AS data_baixa,
      MAX(le."Qtd") AS qtd,
      COALESCE(MAX(le.status), 'Em aberto') AS status,
      BOOL_OR(le.pago) AS pago,
      BOOL_OR(le.ok_motorista) AS ok_motorista,
      BOOL_OR(le.revisao_motorista) AS revisao_motorista,
      MAX(le.obs) AS obs,
      COUNT(*) AS ctes_vinculados,
      EXISTS (
        SELECT 1 FROM acareacaojad a
        JOIN relatorioentrega_export re2 ON re2."NCTE" = a."NCTE"
        WHERE re2."Lista" = re."Lista"
          AND re2."OperadorMatricula"::bigint = $1
      ) AS tem_reclamacao_aberta,
      (SELECT sp.status FROM solicitacoes_pagamento sp
       WHERE sp.matricula = $1 AND sp.lista_numero = CAST(REPLACE(re."Lista", '"', '') AS BIGINT)
       LIMIT 1) AS solicitacao_status
    FROM relatorioentrega_export re
    LEFT JOIN lista_entregas le ON le."Número"::text = re."Lista"
    WHERE re."OperadorMatricula"::bigint = $1
      AND LOWER(re."Evento") = 'entrega'
      AND ($2::date IS NULL OR le."Data Baixa" >= $2)
      AND ($3::date IS NULL OR le."Data Baixa" <= $3)
    GROUP BY re."Lista"
    ORDER BY MAX(le."Data Emissão") DESC NULLS LAST
  `, [matricula, inicio, fim]);

  return result.rows;
}

export async function getDriverTripsFaixas(matricula, inicio = null, fim = null) {
  const result = await pool.query(`
    WITH faixas_raw AS (
      SELECT
        re."NCTE" AS ncte,
        re."Lista" AS lista,
        re."Peso"::numeric AS peso_cte,
        COALESCE(cb.bairro, 'Sem bairro') AS bairro,
        COALESCE(fb.faixas, 'Sem faixa') AS faixa_desc,
        COALESCE(fb.valor_peso, 0) AS valor_peso,
        fb.peso_de
      FROM relatorioentrega_export re
      LEFT JOIN ceps_bairros cb
        ON CAST(NULLIF(REGEXP_REPLACE(COALESCE(re."Cep", '0'), '[^0-9]', '', 'g'), '') AS BIGINT)
           BETWEEN CAST(cb.cep_ini AS BIGINT) AND CAST(cb.cep_fim AS BIGINT)
      LEFT JOIN faixas_peso_entrega_bairro fb
        ON re."Peso"::numeric BETWEEN fb.peso_de AND fb.peso_ate
        AND fb.nome_tabela = cb.tabela_motorista
      JOIN lista_entregas le ON le."Número"::text = re."Lista"
      WHERE re."OperadorMatricula"::bigint = $1
        AND LOWER(re."Evento") = 'entrega'
        AND le.status = 'Finalizado'
        AND ($2::date IS NULL OR le."Data Baixa" >= $2)
        AND ($3::date IS NULL OR le."Data Baixa" <= $3)
    ),
    faixas_dedup AS (
      SELECT DISTINCT ON (ncte, lista) *
      FROM faixas_raw
      ORDER BY ncte, lista,
        CASE WHEN valor_peso > 0 THEN 0 ELSE 1 END,
        valor_peso ASC
    )
    SELECT
      lista,
      bairro,
      faixa_desc,
      COUNT(*) AS entregas,
      SUM(valor_peso) AS total_valor
    FROM faixas_dedup
    GROUP BY lista, bairro, faixa_desc, peso_de
    ORDER BY lista DESC, bairro, peso_de
  `, [matricula, inicio, fim]);
  return result.rows;
}

export async function getQuinzenasDisponiveis(matricula) {
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
    WHERE re."OperadorMatricula"::bigint = $1
      AND re."Data" IS NOT NULL
    ORDER BY inicio DESC
  `, [matricula]);
  return result.rows;
}

export async function getProdutividade(matricula, inicio, fim) {
  const result = await pool.query(`
    WITH entregas_raw AS (
      SELECT
        re."NCTE" AS ncte,
        re."Lista" AS lista,
        re."Data"::date AS data,
        COALESCE(re."QPacotes"::int, 0) AS pacotes,
        re."Peso"::numeric AS peso,
        COALESCE(fb.valor_peso, 0) AS valor_peso
      FROM relatorioentrega_export re
      LEFT JOIN ceps_bairros cb
        ON CAST(NULLIF(REGEXP_REPLACE(COALESCE(re."Cep", '0'), '[^0-9]', '', 'g'), '') AS BIGINT)
           BETWEEN CAST(cb.cep_ini AS BIGINT) AND CAST(cb.cep_fim AS BIGINT)
      LEFT JOIN faixas_peso_entrega_bairro fb
        ON re."Peso"::numeric BETWEEN fb.peso_de AND fb.peso_ate
        AND fb.nome_tabela = cb.tabela_motorista
      JOIN lista_entregas le ON le."Número"::text = re."Lista"
      WHERE re."OperadorMatricula"::bigint = $1
        AND LOWER(re."Evento") = 'entrega'
        AND le.status = 'Finalizado'
        AND re."Data"::date >= $2::date
        AND re."Data"::date <= $3::date
    ),
    entregas_dedup AS (
      SELECT DISTINCT ON (ncte, lista) *
      FROM entregas_raw
      ORDER BY ncte, lista,
        CASE WHEN valor_peso > 0 THEN 0 ELSE 1 END,
        valor_peso ASC
    )
    SELECT
      data,
      COUNT(*) AS ctes,
      SUM(pacotes) AS pacotes,
      SUM(peso) AS peso_total,
      SUM(valor_peso) AS valor_total
    FROM entregas_dedup
    GROUP BY data
    ORDER BY data
  `, [matricula, inicio, fim]);
  return result.rows;
}

export async function getEficiencia(matricula, inicio, fim) {
  const result = await pool.query(`
    SELECT
      LOWER(re."Evento") AS evento,
      COUNT(*) AS quantidade
    FROM relatorioentrega_export re
    WHERE re."OperadorMatricula"::bigint = $1
      AND re."Data"::date >= $2::date
      AND re."Data"::date <= $3::date
    GROUP BY LOWER(re."Evento")
    ORDER BY quantidade DESC
  `, [matricula, inicio, fim]);
  return result.rows;
}

export async function getReclamacoes(matricula, inicio, fim) {
  const result = await pool.query(`
    SELECT
      a.id,
      a."NCTE" AS ncte,
      a.motivo,
      a.data_criacao,
      re."Lista" AS lista,
      re."Data"::date AS data_entrega
    FROM acareacaojad a
    JOIN relatorioentrega_export re ON re."NCTE" = a."NCTE"
    WHERE re."OperadorMatricula"::bigint = $1
      AND LOWER(re."Evento") = 'entrega'
      AND re."Data"::date >= $2::date
      AND re."Data"::date <= $3::date
    ORDER BY a.data_criacao DESC
  `, [matricula, inicio, fim]);
  return result.rows;
}

export async function getUltimaImportacao() {
  const { rows } = await pool.query(`SELECT MAX(importado_em) AS ultima_importacao FROM acareacaojad`);
  return rows[0]?.ultima_importacao || null;
}

function calcQuinzenaFim(data) {
  const d = new Date(data);
  const dia = d.getUTCDate();
  if (dia <= 15) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 14));
  }
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
}

function addDiasUteis(data, n) {
  const d = new Date(data);
  let uteis = 0;
  while (uteis < n) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) uteis++;
  }
  return d;
}

function emPeriodoSuspensao(dataBaixa) {
  const quinzenaFim = calcQuinzenaFim(dataBaixa);
  const pagamentoDate = addDiasUteis(quinzenaFim, 4);
  const hoje = new Date();
  hoje.setUTCHours(0, 0, 0, 0);
  const qf = new Date(quinzenaFim);
  qf.setUTCHours(0, 0, 0, 0);
  const pd = new Date(pagamentoDate);
  pd.setUTCHours(0, 0, 0, 0);
  return hoje >= qf && hoje <= pd;
}

export async function solicitarPagamento(matricula, listaNumero, valorSolicitado) {
  const { rows: lista } = await pool.query(`
    SELECT le."Número", le."Data Baixa", le.status, le.pago
    FROM lista_entregas le
    WHERE le."Número" = $1
  `, [listaNumero]);

  if (lista.length === 0) {
    return { success: false, motivo: 'Lista não encontrada' };
  }

  const l = lista[0];

  if (l.pago) {
    return { success: false, motivo: 'Esta lista já foi paga' };
  }

  const { rows: solicitacaoExistente } = await pool.query(`
    SELECT status FROM solicitacoes_pagamento
    WHERE matricula = $1 AND lista_numero = $2
  `, [matricula, listaNumero]);

  if (solicitacaoExistente.length > 0) {
    const st = solicitacaoExistente[0].status;
    if (st === 'aprovado') {
      return { success: false, motivo: 'Esta lista já teve o adiantamento aprovado' };
    }
    if (st === 'pendente') {
      return { success: false, motivo: 'Já existe uma solicitação pendente para esta lista' };
    }
    if (st === 'recusado') {
      return { success: false, motivo: 'Solicitação anterior para esta lista foi recusada' };
    }
  }

  const dataBaixa = l['Data Baixa'] ? new Date(l['Data Baixa']) : null;
  if (dataBaixa && emPeriodoSuspensao(dataBaixa)) {
    return { success: false, motivo: 'Período de pagamento da quinzena em processamento — adiantamentos suspensos' };
  }

  const { rows: ctes } = await pool.query(`
    SELECT 1 FROM relatorioentrega_export re
    WHERE re."Lista" = $1::text
      AND re."OperadorMatricula"::bigint = $2
      AND LOWER(re."Evento") = 'entrega'
    LIMIT 1
  `, [listaNumero, matricula]);

  if (ctes.length === 0) {
    return { success: false, motivo: 'Lista não pertence a este motorista' };
  }

  const { rows: eficienciaData } = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE LOWER(re."Evento") = 'entrega') AS entregas,
      COUNT(*) AS total
    FROM relatorioentrega_export re
    WHERE re."OperadorMatricula"::bigint = $1
      AND re."Data"::date >= (CURRENT_DATE - INTERVAL '30 days')::date
  `, [matricula]);

  const ef = eficienciaData[0];
  const pctEf = ef.total > 0 ? Math.round((Number(ef.entregas) / Number(ef.total)) * 100) : 0;

  const { rows: ultimaImport } = await pool.query(`SELECT MAX(importado_em) AS ultima FROM acareacaojad`);
  const ultima = ultimaImport[0]?.ultima;
  if (!ultima) {
    return { success: false, motivo: 'Nenhuma reclamação importada ainda' };
  }
  const horasDesdeImport = (Date.now() - new Date(ultima).getTime()) / (1000 * 60 * 60);
  if (horasDesdeImport > 4) {
    return { success: false, motivo: 'Reclamações desatualizadas — última importação há mais de 4 horas' };
  }

  if (pctEf < 98) {
    return { success: false, motivo: 'Eficiência abaixo de 98% nos últimos 30 dias' };
  }

  if (l.status !== 'Finalizado') {
    return { success: false, motivo: 'Lista não está finalizada' };
  }

  if (!dataBaixa || dataBaixa.toDateString() === new Date().toDateString()) {
    return { success: false, motivo: 'Data Baixa deve ser anterior ao dia de hoje' };
  }

  const { rows: reclamacoes } = await pool.query(`
    SELECT 1 FROM acareacaojad a
    JOIN relatorioentrega_export re ON re."NCTE" = a."NCTE"
    WHERE re."Lista" = $1::text
      AND re."OperadorMatricula"::bigint = $2
    LIMIT 1
  `, [listaNumero, matricula]);

  if (reclamacoes.length > 0) {
    return { success: false, motivo: 'Lista possui reclamações abertas' };
  }

  if (valorSolicitado <= 0 || valorSolicitado > 400) {
    return { success: false, motivo: 'Valor da lista deve ser entre R$ 0,01 e R$ 400,00' };
  }

  try {
    await pool.query(`
      INSERT INTO solicitacoes_pagamento (matricula, lista_numero, valor_solicitado, status)
      VALUES ($1, $2, $3, 'pendente')
    `, [matricula, listaNumero, valorSolicitado]);
    return { success: true, motivo: 'Solicitação registrada com sucesso' };
  } catch (err) {
    if (err.code === '23505') {
      return { success: false, motivo: 'Solicitação já existe para esta lista' };
    }
    throw err;
  }
}
import { pool } from '../db/index.js';

export async function buscarBairros(termo) {
  const result = await pool.query(`
    SELECT DISTINCT bairro FROM ceps_bairros
    WHERE bairro ILIKE $1
    ORDER BY bairro
  `, [`%${termo}%`]);
  return result.rows.map(r => r.bairro);
}

export async function listarCepsPorBairro(bairro) {
  const result = await pool.query(`
    SELECT * FROM ceps_bairros
    WHERE bairro = $1
    ORDER BY cep_ini
  `, [bairro]);
  return result.rows;
}

export async function atribuirTabela(bairro, tabela_motorista) {
  const result = await pool.query(`
    UPDATE ceps_bairros
    SET tabela_motorista = $1
    WHERE bairro = $2
  `, [tabela_motorista, bairro]);
  return result.rowCount;
}

export async function listarCepsSemRange() {
  const result = await pool.query(`
    SELECT
      re."Cep",
      COUNT(*) AS total_ctes,
      MIN(re."BairroDestino") AS bairro_exemplo,
      MIN(re."CidadeDestino") AS cidade_exemplo
    FROM relatorioentrega_export re
    LEFT JOIN ceps_bairros cb
      ON CAST(NULLIF(REGEXP_REPLACE(COALESCE(re."Cep", '0'), '[^0-9]', '', 'g'), '') AS BIGINT)
         BETWEEN CAST(cb.cep_ini AS BIGINT) AND CAST(cb.cep_fim AS BIGINT)
    WHERE cb.id IS NULL
      AND re."Cep" IS NOT NULL
      AND re."Cep" != ''
    GROUP BY re."Cep"
    ORDER BY total_ctes DESC
  `);
  return result.rows;
}

export async function adicionarRange(dados) {
  const { cep_ini, cep_fim, bairro, cidade, tabela_motorista } = dados;
  const result = await pool.query(`
    INSERT INTO ceps_bairros (cidade, cep_ini, cep_fim, bairro, tabela_motorista)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT DO NOTHING
  `, [cidade, cep_ini, cep_fim, bairro, tabela_motorista || null]);
  return result;
}

export async function listarCtesSemFaixa() {
  const result = await pool.query(`
    WITH ctes_raw AS (
      SELECT
        re."NCTE" AS ncte,
        re."Lista" AS lista,
        re."Peso"::numeric AS peso,
        re."Cep",
        cb.bairro,
        cb.tabela_motorista,
        CASE WHEN cb.id IS NULL THEN 'CEP sem range' ELSE 'Peso sem faixa na tabela' END AS motivo
      FROM relatorioentrega_export re
      LEFT JOIN ceps_bairros cb
        ON CAST(NULLIF(REGEXP_REPLACE(COALESCE(re."Cep", '0'), '[^0-9]', '', 'g'), '') AS BIGINT)
           BETWEEN CAST(cb.cep_ini AS BIGINT) AND CAST(cb.cep_fim AS BIGINT)
      LEFT JOIN faixas_peso_entrega_bairro fb
        ON re."Peso"::numeric BETWEEN fb.peso_de AND fb.peso_ate
        AND fb.nome_tabela = cb.tabela_motorista
      WHERE LOWER(re."Evento") = 'entrega'
        AND (fb.id IS NULL)
        AND re."NCTE" IS NOT NULL
    )
    SELECT DISTINCT ON (ncte, lista) *
    FROM ctes_raw
    ORDER BY ncte, lista, bairro NULLS LAST
  `);
  return result.rows;
}

export async function listarConflitosCeps() {
  const result = await pool.query(`
    SELECT
      a.id AS id_a, a.cep_ini AS ini_a, a.cep_fim AS fim_a,
      a.bairro AS bairro_a, a.cidade AS cidade_a, a.tabela_motorista AS tab_a,
      b.id AS id_b, b.cep_ini AS ini_b, b.cep_fim AS fim_b,
      b.bairro AS bairro_b, b.cidade AS cidade_b, b.tabela_motorista AS tab_b
    FROM ceps_bairros a
    JOIN ceps_bairros b ON a.id < b.id
      AND CAST(a.cep_ini AS BIGINT) <= CAST(b.cep_fim AS BIGINT)
      AND CAST(a.cep_fim AS BIGINT) >= CAST(b.cep_ini AS BIGINT)
    ORDER BY a.cep_ini, b.cep_ini
  `);
  return result.rows;
}

export async function listarRangesSemTabela() {
  const result = await pool.query(`
    SELECT * FROM ceps_bairros
    WHERE tabela_motorista IS NULL
    ORDER BY bairro, cep_ini
  `);
  return result.rows;
}

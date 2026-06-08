import { pool } from '../db/index.js';

// ==================== BAIRROS / ROTAS ====================

export async function buscarBairros(termo) {
  const result = await pool.query(`
    SELECT DISTINCT bairro FROM bairros_rotas
    WHERE bairro ILIKE $1
    ORDER BY bairro
  `, [`%${termo}%`]);
  return result.rows.map(r => r.bairro);
}

export async function listarBairrosRotas() {
  const result = await pool.query(`
    SELECT * FROM bairros_rotas
    ORDER BY bairro, rota
  `);
  return result.rows;
}

export async function atualizarBairroRota(id, nome_tabela) {
  const result = await pool.query(`
    UPDATE bairros_rotas
    SET nome_tabela = $1
    WHERE id = $2
  `, [nome_tabela, id]);
  return result.rowCount > 0;
}

// ==================== CEPS ESPECÍFICOS ====================

export async function listarCeps() {
  const result = await pool.query(`
    SELECT * FROM ceps_especificos
    ORDER BY cep
  `);
  return result.rows;
}

export async function listarCepsPorBairro(bairro) {
  const result = await pool.query(`
    SELECT * FROM ceps_especificos
    WHERE bairro = $1
    ORDER BY cep
  `, [bairro]);
  return result.rows;
}

export async function buscarCep(cep) {
  const cepLimpo = cep.replace(/\D/g, '');
  const result = await pool.query(`
    SELECT * FROM ceps_especificos
    WHERE cep = $1
  `, [cepLimpo]);
  return result.rows[0] || null;
}

export async function adicionarCep(cep, bairro, rota, nome_tabela) {
  const cepLimpo = cep.replace(/\D/g, '');
  const result = await pool.query(`
    INSERT INTO ceps_especificos (cep, bairro, rota, nome_tabela)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (cep) DO UPDATE SET
      bairro = EXCLUDED.bairro,
      rota = EXCLUDED.rota,
      nome_tabela = EXCLUDED.nome_tabela
    RETURNING *
  `, [cepLimpo, bairro, rota, nome_tabela]);
  return result.rows[0];
}

export async function deletarCep(id) {
  const result = await pool.query('DELETE FROM ceps_especificos WHERE id = $1', [id]);
  return result.rowCount > 0;
}

// ==================== CEPS NOVOS (SEM CADASTRO) ====================

export async function listarCepsSemCadastro() {
  const result = await pool.query(`
    SELECT
      re."Cep",
      COUNT(*) AS total_ctes,
      MIN(re."BairroDestino") AS bairro_exemplo,
      MIN(re."CidadeDestino") AS cidade_exemplo
    FROM relatorioentrega_export re
    LEFT JOIN ceps_especificos ce
      ON ce.cep = NULLIF(REGEXP_REPLACE(COALESCE(re."Cep", '0'), '[^0-9]', '', 'g'), '')
    WHERE ce.id IS NULL
      AND re."Cep" IS NOT NULL
      AND re."Cep" != ''
    GROUP BY re."Cep"
    ORDER BY total_ctes DESC
  `);
  return result.rows;
}

export async function importarCepsDaPlanilha(rows) {
  const client = await pool.connect();
  let importados = 0;
  try {
    await client.query('BEGIN');

    for (const row of rows) {
      const cep = String(row.CEP || row.cep || '').replace(/\D/g, '');
      const bairro = row.BAIRRO || row.bairro || '';
      const rota = row.Rota || row.rota || null;
      const nome_tabela = row['Nome Tabela'] || row.nome_tabela || row.tabela_motorista || '';

      if (!cep || !bairro || !nome_tabela) continue;

      await client.query(`
        INSERT INTO ceps_especificos (cep, bairro, rota, nome_tabela)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (cep) DO UPDATE SET
          bairro = EXCLUDED.bairro,
          rota = EXCLUDED.rota,
          nome_tabela = EXCLUDED.nome_tabela
      `, [cep, bairro, rota, nome_tabela]);

      await client.query(`
        INSERT INTO bairros_rotas (bairro, rota, nome_tabela)
        VALUES ($1, $2, $3)
        ON CONFLICT (bairro, rota) DO UPDATE SET
          nome_tabela = EXCLUDED.nome_tabela
      `, [bairro, rota || '', nome_tabela]);

      importados++;
    }

    await client.query('COMMIT');
    return { importados };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ==================== INTEGRAÇÃO VIACEP ====================

export async function consultarViaCep(cep) {
  const cepLimpo = cep.replace(/\D/g, '');
  if (cepLimpo.length !== 8) return null;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    if (!response.ok) return null;
    const data = await response.json();
    if (data.erro) return null;
    return {
      cep: cepLimpo,
      logradouro: data.logradouro || '',
      bairro: data.bairro || '',
      cidade: data.localidade || '',
      uf: data.uf || '',
    };
  } catch {
    return null;
  }
}

export async function autoDescobrirCeps() {
  const cepsNovos = await listarCepsSemCadastro();
  const resultados = { sucesso: 0, falha: 0, ignorados: 0, detalhes: [] };

  for (const item of cepsNovos) {
    const cep = item.Cep.replace(/\D/g, '');
    if (cep.length !== 8) {
      resultados.ignorados++;
      continue;
    }

    const viaCepData = await consultarViaCep(cep);
    if (!viaCepData || !viaCepData.bairro) {
      resultados.falha++;
      resultados.detalhes.push({ cep, status: 'falha', motivo: 'ViaCEP sem bairro' });
      continue;
    }

    const bairro = viaCepData.bairro;
    const cidade = viaCepData.cidade;

    const bairroRota = await pool.query(`
      SELECT * FROM bairros_rotas
      WHERE bairro ILIKE $1
      LIMIT 1
    `, [bairro]);

    let nome_tabela = null;
    let rota = null;

    if (bairroRota.rows[0]) {
      nome_tabela = bairroRota.rows[0].nome_tabela;
      rota = bairroRota.rows[0].rota;
    } else {
      const cepSimilar = await pool.query(`
        SELECT ce.* FROM ceps_especificos ce
        WHERE ce.bairro ILIKE $1
        LIMIT 1
      `, [`%${bairro}%`]);
      if (cepSimilar.rows[0]) {
        nome_tabela = cepSimilar.rows[0].nome_tabela;
        rota = cepSimilar.rows[0].rota;
      } else {
        resultados.falha++;
        resultados.detalhes.push({ cep, status: 'falha', motivo: `Bairro "${bairro}" sem tabela definida` });
        continue;
      }
    }

    await adicionarCep(cep, bairro, rota, nome_tabela);
    resultados.sucesso++;
    resultados.detalhes.push({ cep, status: 'sucesso', bairro, rota, nome_tabela });
  }

  return resultados;
}

// ==================== CTES SEM FAIXA DE PESO ====================

export async function listarCtesSemFaixa() {
  const result = await pool.query(`
    WITH ctes_raw AS (
      SELECT
        re."NCTE" AS ncte,
        re."Lista" AS lista,
        re."Peso"::numeric AS peso,
        re."Cep",
        ce.bairro,
        ce.nome_tabela,
        CASE WHEN ce.id IS NULL THEN 'CEP sem cadastro' ELSE 'Peso sem faixa na tabela' END AS motivo
      FROM relatorioentrega_export re
      LEFT JOIN ceps_especificos ce
        ON ce.cep = NULLIF(REGEXP_REPLACE(COALESCE(re."Cep", '0'), '[^0-9]', '', 'g'), '')
      LEFT JOIN faixas_peso_entrega_bairro fb
        ON re."Peso"::numeric BETWEEN fb.peso_de AND fb.peso_ate
        AND fb.nome_tabela = ce.nome_tabela
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

// ==================== MIGRAÇÃO LEGADO → NOVO ====================

export async function migrarCepsDeRanges() {
  const result = await pool.query(`
    INSERT INTO ceps_especificos (cep, bairro, rota, nome_tabela)
    SELECT DISTINCT ON (re."Cep")
      NULLIF(REGEXP_REPLACE(COALESCE(re."Cep", '0'), '[^0-9]', '', 'g'), '') AS cep,
      cb.bairro,
      NULL AS rota,
      cb.tabela_motorista
    FROM relatorioentrega_export re
    JOIN ceps_bairros cb
      ON CAST(NULLIF(REGEXP_REPLACE(COALESCE(re."Cep", '0'), '[^0-9]', '', 'g'), '') AS BIGINT)
         BETWEEN CAST(cb.cep_ini AS BIGINT) AND CAST(cb.cep_fim AS BIGINT)
    ON CONFLICT (cep) DO NOTHING
  `);
  return result.rowCount;
}

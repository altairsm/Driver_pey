import { pool } from '../db/index.js';
import XLSX from 'xlsx';

const ASSUNTOS_FILTRO = ['acareacao', 'comprovante de entrega'];

function normalizarAssunto(a) {
  return String(a || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function limparCte(v) {
  const s = String(v || '').trim();
  if (!s || s === '-' || s === 'CTE -' || s === 'CTE-') return null;
  return s;
}

export async function uploadReclamacoes(fileBuffer, fileName) {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer', raw: true });
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

  const resultado = {
    total_lidas: rows.length,
    filtradas: 0,
    importadas: 0,
    duplicatas: 0,
    com_motorista: 0,
    cte_pendente: 0,
    cte_nao_encontrado: 0,
    erros: [],
  };

  for (const row of rows) {
    const assuntoRaw = String(row['ASSUNTO'] || row['Assunto'] || '').trim();
    const assuntoNorm = normalizarAssunto(assuntoRaw);

    if (!ASSUNTOS_FILTRO.includes(assuntoNorm)) continue;
    resultado.filtradas++;

    const ticketId = String(row['TICKET ID'] || row['Ticket ID'] || row['ticket_id'] || '').trim();
    const dataCriacao = String(row['DATA CRIAÇÃO DO TICKET'] || row['Data Criação'] || row['data_criacao'] || '').trim();
    const statusOrig = String(row['STATUS'] || row['Status'] || row['status'] || '').trim();
    const cteRaw = String(row['CTE'] || row['Cte'] || row['cte'] || '').trim();

    const cte = limparCte(cteRaw);
    const dataParsed = parseDataBr(dataCriacao);

    try {
      let matricula = null;

      if (cte) {
        const match = await pool.query(`
          SELECT "OperadorMatricula"::bigint AS matricula
          FROM relatorioentrega_export
          WHERE "NCTE" = $1
            AND LOWER("Evento") = 'entrega'
          LIMIT 1
        `, [cte]);

        if (match.rows.length > 0) {
          matricula = match.rows[0].matricula;
        }
      }

      const insertResult = await pool.query(`
        INSERT INTO acareacaojad (ticket_id, "OperadorMatricula", "NCTE", assunto, motivo, status_original, data_criacao)
        SELECT $1::varchar, $2, $3, $4, $5, $6, $7::date
        WHERE NOT EXISTS (
          SELECT 1 FROM acareacaojad WHERE ticket_id IS NOT DISTINCT FROM $1::varchar
        )
      `, [
        ticketId || null,
        matricula,
        cte,
        assuntoRaw,
        `Ticket ${ticketId} - ${assuntoRaw}`,
        statusOrig,
        dataParsed,
      ]);

      if (insertResult.rowCount === 0) {
        resultado.duplicatas++;
        continue;
      }

      resultado.importadas++;

      if (cte && matricula) {
        resultado.com_motorista++;
      } else if (!cte) {
        resultado.cte_pendente++;
      } else {
        resultado.cte_nao_encontrado++;
      }
    } catch (err) {
      resultado.erros.push(`Ticket ${ticketId}: ${err.message}`);
    }
  }

  return resultado;
}

function parseDataBr(str) {
  if (!str) return new Date().toISOString().split('T')[0];
  const match = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return str.slice(0, 10);
}

export async function listarReclamacoes() {
  const result = await pool.query(`
    SELECT
      a.id,
      a.ticket_id,
      a."NCTE" AS cte,
      a.assunto,
      a.status_original,
      a.data_criacao,
      a."OperadorMatricula"::bigint AS matricula,
      m.nome_completo AS motorista_nome
    FROM acareacaojad a
    LEFT JOIN matriculos_jad m ON m."OperadorMatricula"::bigint = a."OperadorMatricula"
    ORDER BY a.data_criacao DESC, a.id DESC
  `);
  return result.rows;
}

export async function atualizarCte(id, cte) {
  const cteLimpo = limparCte(cte);
  let matricula = null;

  if (cteLimpo) {
    const match = await pool.query(`
      SELECT "OperadorMatricula"::bigint AS matricula
      FROM relatorioentrega_export
      WHERE "NCTE" = $1
        AND LOWER("Evento") = 'entrega'
      LIMIT 1
    `, [cteLimpo]);
    if (match.rows.length > 0) {
      matricula = match.rows[0].matricula;
    }
  }

  await pool.query(`
    UPDATE acareacaojad
    SET "NCTE" = $1, "OperadorMatricula" = $2
    WHERE id = $3
  `, [cteLimpo, matricula, id]);

  return { id, cte: cteLimpo, matricula };
}

export async function deletarReclamacao(id) {
  const result = await pool.query(`DELETE FROM acareacaojad WHERE id = $1`, [id]);
  return result.rowCount > 0;
}

export async function listarReclamacoesSemMotorista() {
  const result = await pool.query(`
    SELECT
      a.id,
      a.ticket_id,
      a."NCTE" AS cte,
      a.assunto,
      a.status_original,
      a.data_criacao,
      CASE
        WHEN a."NCTE" IS NULL THEN 'CTE pendente'
        WHEN a."OperadorMatricula" IS NULL THEN 'CTE não encontrado'
        ELSE 'ok'
      END AS situacao
    FROM acareacaojad a
    WHERE a."OperadorMatricula" IS NULL
    ORDER BY a.data_criacao DESC
  `);
  return result.rows;
}
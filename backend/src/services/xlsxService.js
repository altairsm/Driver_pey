import XLSX from 'xlsx';
import { pool } from '../db/index.js';

export function parseXLSX(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { defval: null });

  return data.map(row => ({
    OperadorMatricula: row[' OperadorMatricula'] ?? row.OperadorMatricula ?? row['Matrícula'] ?? null,
    OperadorNome: row[' OperadorNome'] ?? row.OperadorNome ?? row['Nome'] ?? null,
    NCTE: row[' NCTE'] ?? row.NCTE ?? row['CT-e'] ?? null,
    Lista: row[' Lista'] ?? row.Lista?.toString() ?? null,
    Peso: parseFloat(row[' Peso'] ?? row.Peso ?? 0) || 0,
    Cep: row[' Cep'] ?? row.Cep ?? null,
    Evento: row[' Evento'] ?? row.Evento ?? null,
    Data: row[' Data'] ?? row.Data ?? null,
    Hora: row[' Hora'] ?? row.Hora ?? null,
    TaxaEntrega: parseFloat(row[' TaxaEntrega'] ?? row.TaxaEntrega ?? 0) || 0,
    TaxaInterior: parseFloat(row[' TaxaInterior'] ?? row.TaxaInterior ?? 0) || 0,
    Expedidor: row[' Expedidor'] ?? row.Expedidor ?? null,
    Tarifa: row[' Tarifa'] ?? row.Tarifa ?? null,
    BairroDestino: row[' BairroDestino'] ?? row.BairroDestino ?? null,
    CidadeDestino: row[' CidadeDestino'] ?? row.CidadeDestino ?? null,
    Modalidade: row[' Modalidade'] ?? row.Modalidade ?? null,
    NomePonto: row[' NomePonto'] ?? row.NomePonto ?? null,
    RazaoPonto: row[' RazaoPonto'] ?? row.RazaoPonto ?? null,
    QPacotes: parseInt(row[' QPacotes'] ?? row.QPacotes ?? 0) || 0,
  }));
}

export async function importarEntregas(rows) {
  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.NCTE || !row.OperadorMatricula) {
      skipped++;
      continue;
    }

    const controleDuplicidade = `${row.OperadorMatricula}${row.Lista ?? ''}${row.NCTE}`;
    const dataStr = row.Data ? formatDate(row.Data) : null;

    await pool.query(`
      INSERT INTO relatorioentrega_export (
        "OperadorMatricula", "OperadorNome", "NCTE", "Lista", "Peso",
        "Cep", "Evento", "Data", "Hora", "TaxaEntrega", "TaxaInterior",
        "Expedidor", "Tarifa", "BairroDestino", "CidadeDestino",
        "Modalidade", "NomePonto", "RazaoPonto", "QPacotes",
        "controle_duplicidade"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      ON CONFLICT ("controle_duplicidade")
      DO UPDATE SET
        "Peso" = EXCLUDED."Peso",
        "Evento" = EXCLUDED."Evento",
        "Data" = EXCLUDED."Data",
        "Hora" = EXCLUDED."Hora"
    `, [
      row.OperadorMatricula, row.OperadorNome, row.NCTE, row.Lista, row.Peso,
      row.Cep, row.Evento, dataStr, row.Hora, row.TaxaEntrega, row.TaxaInterior,
      row.Expedidor, row.Tarifa, row.BairroDestino, row.CidadeDestino,
      row.Modalidade, row.NomePonto, row.RazaoPonto, row.QPacotes,
      controleDuplicidade,
    ]);

    imported++;
  }

  return { imported, skipped };
}

function formatDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (typeof value === 'number') {
    const d = XLSX.SSF.parse_date_code(value);
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const str = String(value).replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1');
  return str;
}

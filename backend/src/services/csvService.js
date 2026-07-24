import { pool } from '../db/index.js';
import { parse } from 'csv-parse/sync';
import fs from 'fs';

function parseBrDate(str) {
  if (!str || typeof str !== 'string') return null;
  const s = str.trim();
  if (!s) return null;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : s;
}

export function parseCSV(filePath, fromLine = 1) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const normalized = raw.replace(/^\uFEFF/, '');
  const records = parse(normalized, {
    delimiter: ';',
    columns: true,
    skip_empty_lines: true,
    relaxColumnCount: true,
    bom: true,
    from_line: fromLine,
  });
  return records;
}

export async function importarSsw036(rows) {
  let motoristas = 0;
  let romaneios = 0;
  let ctrcs = 0;
  let erros = 0;

  const motoristaCache = new Map();
  const romaneioSet = new Set();
  const fretePorRomaneio = new Map();

  for (const row of rows) {
    try {
      const cpf = String(row['CPF DO MOTORISTA'] || '').replace(/\D/g, '').slice(0, 11);
      const nomeMotorista = (row['MOTORISTA'] || '').trim();
      const idRomaneio = (row['ROMANEIO'] || '').trim();
      const ctrc = (row['CTRC'] || '').trim();
      const ocorrencia = (row['DESC OCORR CTRC'] || '').trim();
      const ocorrenciaData = parseBrDate(row['DATA OCORR CTRC']);
      const ocorrenciaHora = row['HORA OCORR CTRC'] || null;

      if (!cpf || !idRomaneio || !ctrc) {
        erros++;
        continue;
      }

      if (!motoristaCache.has(cpf)) {
        await pool.query(`
          INSERT INTO motoristas (cpf, nome)
          VALUES ($1, $2)
          ON CONFLICT (cpf) DO UPDATE SET nome = EXCLUDED.nome
        `, [cpf, nomeMotorista]);
        motoristaCache.set(cpf, true);
        motoristas++;
      }

      const id = `${idRomaneio}|${ctrc}`;

      await pool.query(`
        INSERT INTO ssw_romaneios (id_romaneio, motorista_cpf, motorista_nome, data_emissao, situacao, placa)
        VALUES ($1, $2, $3,
          NULLIF($4, '')::date,
          NULLIF($5, ''),
          NULLIF($6, ''))
        ON CONFLICT (id_romaneio) DO UPDATE SET
          situacao = EXCLUDED.situacao,
          placa = EXCLUDED.placa
      `, [
        idRomaneio, cpf, nomeMotorista,
        parseBrDate(row['DATA EMISSAO']),
        row['SITUACAO'] || null,
        row['PLACA'] || null,
      ]);

      if (!romaneioSet.has(idRomaneio)) {
        romaneioSet.add(idRomaneio);
        romaneios++;
      }

      const freteStr = (row['FRETE CTRC'] || '0').replace(/\./g, '').replace(',', '.');
      const freteVal = parseFloat(freteStr) || 0;
      fretePorRomaneio.set(idRomaneio, (fretePorRomaneio.get(idRomaneio) || 0) + freteVal);

      const pesoSStr = (row['PESO CALCULO'] || '0').replace(/\./g, '').replace(',', '.');
      const qtdeStr = (row['QTDE VOL'] || '0').replace(/\D/g, '') || '0';

      const cep = (row['CEP ENTREGA'] || '').replace(/\D/g, '');

      await pool.query(`
        INSERT INTO ssw_ctrcs (
          id, ctrc, id_romaneio, cidade_entrega, cep, bairro, local_entrega,
          peso_calculo, frete_ctrc, qtde_vol, data_emissao,
          ocorrencia, ocorrencia_data, ocorrencia_hora
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          NULLIF($11, '')::date, $12,
          NULLIF($13, '')::date,
          NULLIF($14, ''))
        ON CONFLICT (id) DO UPDATE SET
          cidade_entrega = COALESCE(EXCLUDED.cidade_entrega, ssw_ctrcs.cidade_entrega),
          cep = COALESCE(EXCLUDED.cep, ssw_ctrcs.cep),
          bairro = COALESCE(EXCLUDED.bairro, ssw_ctrcs.bairro),
          ocorrencia = EXCLUDED.ocorrencia,
          ocorrencia_data = EXCLUDED.ocorrencia_data,
          ocorrencia_hora = EXCLUDED.ocorrencia_hora
      `, [
        id, ctrc, idRomaneio,
        (row['CIDADE_ENTREGA'] || '').trim(),
        cep,
        (row['BAIRRO'] || '').trim(),
        (row['LOCAL DE ENTREGA'] || '').trim(),
        parseFloat(pesoSStr) || 0,
        parseFloat(freteStr) || 0,
        parseInt(qtdeStr) || 0,
        parseBrDate(row['DATA EMISSAO']),
        ocorrencia,
        ocorrenciaData,
        ocorrenciaHora,
      ]);
      ctrcs++;
    } catch (err) {
      console.error('Erro ao processar linha SSW 036:', err.message, JSON.stringify(row).slice(0, 200));
      erros++;
    }
  }

  for (const [romId, total] of fretePorRomaneio) {
    await pool.query(
      'UPDATE ssw_romaneios SET total_frete = $1 WHERE id_romaneio = $2',
      [total, romId]
    );
  }

  return { motoristas, romaneios, ctrcs, erros };
}

function detectarOrigem(complemento) {
  if (!complemento || typeof complemento !== 'string') return null;
  const txt = complemento.toUpperCase();
  if (txt.includes('SSWMOBILE')) return 'APP';
  if (txt.includes('OPC 038')) return 'BASE';
  return null;
}

export async function importarSsw031(rows) {
  let importados = 0;
  let erros = 0;

  for (const row of rows) {
    try {
      const ctrc = (row['CTRC'] || '').trim();
      if (!ctrc) {
        erros++;
        continue;
      }

      const ctrcNorm = ctrc.replace(/\s+/g, '');
      const complemento = (row['COMPLEMENTO OCOR BUSCA'] || '').trim();
      const origem = detectarOrigem(complemento);

      let idRomaneio = null;
      let motoristaCpf = null;

      const match = await pool.query(`
        SELECT s.id_romaneio, r.motorista_cpf
        FROM ssw_ctrcs s
        JOIN ssw_romaneios r ON r.id_romaneio = s.id_romaneio
        WHERE REPLACE(s.ctrc, ' ', '') = $1
        LIMIT 1
      `, [ctrcNorm]);

      if (match.rows.length > 0) {
        idRomaneio = match.rows[0].id_romaneio;
        motoristaCpf = match.rows[0].motorista_cpf;
      }

      await pool.query(`
        INSERT INTO ssw_ocorrencias (
          ctrc, ctrc_normalizado, id_romaneio, motorista_cpf,
          emissao, cnpj_remetente, nome_remetente,
          cnpj_pagador, nome_pagador, destino,
          valfrete, valmercadoria, peso_real, peso_cubado,
          cod_ultima_ocorrencia, data_ultima_ocorrencia,
          ultima_ocorrencia, comple_ultima_ocorrencia,
          nro_nf, cnpj_destinatario, nome_destinatario,
          cidade_destino, uf_destino, origem_ocorrencia
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
      `, [
        ctrc, ctrcNorm, idRomaneio, motoristaCpf,
        parseBrDate(row['EMISS']),
        (row['CNPJ REMETENTE'] || '').replace(/\D/g, ''),
        (row['NOME REMETENTE'] || '').trim(),
        (row['CNPJ PAGADOR'] || '').replace(/\D/g, ''),
        (row['NOME PAGADOR'] || '').trim(),
        (row['DESTINO'] || '').trim(),
        parseFloat((row['VALFRETE'] || '0').trim().replace(/\./g, '').replace(',', '.')) || 0,
        parseFloat((row['VALMERCAD'] || '0').trim().replace(/\./g, '').replace(',', '.')) || 0,
        parseFloat((row['PESO REAL'] || '0').trim().replace(/\./g, '').replace(',', '.')) || 0,
        parseFloat((row['PESO CUBADO'] || '0').trim().replace(/\./g, '').replace(',', '.')) || 0,
        (row['COD ULT OCOR'] || '').trim(),
        parseBrDate(row['DATA ULT OCOR']),
        (row['ULTIMA OCORRENCIA'] || '').trim(),
        (row['COMPLE ULT OCORRENCIA'] || '').trim(),
        (row['NRO NF'] || '').trim(),
        (row['CNPJ DESTINATARIO'] || '').replace(/\D/g, ''),
        (row['NOME DESTINATARIO'] || '').trim(),
        (row['CIDADE DE DESTINO'] || '').trim(),
        (row['UF DE DESTINO'] || '').trim(),
        origem,
      ]);
      importados++;
    } catch (err) {
      console.error('Erro ao processar linha SSW 031:', err.message, JSON.stringify(row).slice(0, 200));
      erros++;
    }
  }

  return { importados, erros };
}

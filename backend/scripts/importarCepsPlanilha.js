import 'dotenv/config';
import XLSX from 'xlsx';
import { pool } from '../src/db/index.js';

const PLANILHA_PATH = process.argv[2];
if (!PLANILHA_PATH) {
  console.error('Uso: node scripts/importarCepsPlanilha.js <caminho_da_planilha.xlsx>');
  process.exit(1);
}

async function importar() {
  console.log(`📂 Lendo planilha: ${PLANILHA_PATH}`);
  const workbook = XLSX.readFile(PLANILHA_PATH);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

  console.log(`📄 Total de linhas: ${rows.length}`);
  console.log(`📋 Colunas encontradas: ${Object.keys(rows[0] || {}).join(', ')}`);

  const client = await pool.connect();
  let importadosCeps = 0;
  let importadosBairros = 0;
  let ignorados = 0;

  try {
    await client.query('BEGIN');

    for (const row of rows) {
      const cep = String(row.CEP || row.cep || '').replace(/\D/g, '');
      const bairro = row.BAIRRO || row.bairro || '';
      const rota = row.Rota || row.rota || null;
      const nome_tabela = row['Nome Tabela'] || row.nome_tabela || row.tabela_motorista || '';

      if (!cep || !bairro || !nome_tabela) {
        ignorados++;
        continue;
      }

      await client.query(`
        INSERT INTO ceps_especificos (cep, bairro, rota, nome_tabela)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (cep) DO UPDATE SET
          bairro = EXCLUDED.bairro,
          rota = EXCLUDED.rota,
          nome_tabela = EXCLUDED.nome_tabela
      `, [cep, bairro, rota, nome_tabela]);
      importadosCeps++;

      await client.query(`
        INSERT INTO bairros_rotas (bairro, rota, nome_tabela, bonus_d0)
        VALUES ($1, $2, $3, 0.00)
        ON CONFLICT (bairro, rota) DO UPDATE SET
          nome_tabela = EXCLUDED.nome_tabela
      `, [bairro, rota || '', nome_tabela]);
      importadosBairros++;
    }

    await client.query('COMMIT');
    console.log(`✅ Importação concluída!`);
    console.log(`   CEPs específicos: ${importadosCeps}`);
    console.log(`   Bairros/Rotas:   ${importadosBairros}`);
    console.log(`   Ignorados:       ${ignorados}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro durante importação:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

importar();

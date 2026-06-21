import bcrypt from 'bcrypt';
import { pool } from './index.js';

async function seedIfEmpty(table, sql) {
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS cnt FROM ${table}`);
  if (rows[0].cnt === 0) {
    await pool.query(sql);
    console.log(`  Seed data inserted into ${table}`);
  } else {
    console.log(`  ${table} already has data, skipping seed`);
  }
}

export async function runMigrations() {
  try {
    console.log('Migrations: creating/verifying tables...');

    await pool.query(`CREATE TABLE IF NOT EXISTS motoristas (
      cpf VARCHAR(11) PRIMARY KEY,
      nome VARCHAR(200) NOT NULL,
      telefone VARCHAR(20),
      pix_tipo VARCHAR(3) DEFAULT 'CPF',
      cnpj_mei VARCHAR(18),
      bonus_d0 NUMERIC(10,2) DEFAULT 0.00,
      leu_regras BOOLEAN DEFAULT false,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('  -> motoristas');

    await pool.query(`CREATE TABLE IF NOT EXISTS ssw_romaneios (
      id_romaneio VARCHAR(30) PRIMARY KEY,
      motorista_cpf VARCHAR(11) NOT NULL REFERENCES motoristas(cpf),
      motorista_nome VARCHAR(200) NOT NULL,
      data_emissao DATE,
      situacao VARCHAR(30),
      placa VARCHAR(10),
      total_frete NUMERIC(10,2) DEFAULT 0.00,
      importado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('  -> ssw_romaneios');

    await pool.query(`CREATE TABLE IF NOT EXISTS ssw_ctrcs (
      id VARCHAR(50) PRIMARY KEY,
      ctrc VARCHAR(30) NOT NULL,
      id_romaneio VARCHAR(30) NOT NULL REFERENCES ssw_romaneios(id_romaneio),
      cidade_entrega VARCHAR(100),
      cep VARCHAR(10),
      bairro VARCHAR(100),
      local_entrega VARCHAR(200),
      peso_calculo NUMERIC(10,3) DEFAULT 0,
      frete_ctrc NUMERIC(10,2) DEFAULT 0.00,
      qtde_vol INTEGER DEFAULT 0,
      data_emissao DATE,
      data_entrega DATE,
      ocorrencia VARCHAR(200),
      ocorrencia_data DATE,
      ocorrencia_hora VARCHAR(10),
      valfrete NUMERIC(10,2) DEFAULT 0.00,
      peso_real NUMERIC(10,3) DEFAULT 0,
      nf VARCHAR(50),
      remetente VARCHAR(200),
      destinatario VARCHAR(200),
      cidade_destino VARCHAR(100),
      ultima_ocorrencia VARCHAR(200),
      importado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('  -> ssw_ctrcs');

    const { rows: [{ has_id }] } = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ssw_ctrcs' AND column_name = 'id'
      ) AS has_id
    `);
    if (!has_id) {
      await pool.query(`ALTER TABLE ssw_ctrcs DROP CONSTRAINT IF EXISTS ssw_ctrcs_pkey`);
      await pool.query(`ALTER TABLE ssw_ctrcs ADD COLUMN id VARCHAR(50)`);
      await pool.query(`UPDATE ssw_ctrcs SET id = id_romaneio || '|' || ctrc`);
      await pool.query(`ALTER TABLE ssw_ctrcs ALTER COLUMN id SET NOT NULL`);
      await pool.query(`ALTER TABLE ssw_ctrcs ADD PRIMARY KEY (id)`);
      console.log('  -> ssw_ctrcs migrated to composite PK');
    }

    await pool.query(`CREATE TABLE IF NOT EXISTS tabela_preco_cidade (
      cidade VARCHAR(100) PRIMARY KEY,
      valor_entrega NUMERIC(10,2) NOT NULL,
      atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('  -> tabela_preco_cidade');

    await pool.query(`CREATE TABLE IF NOT EXISTS solicitacoes_pagamento (
      id SERIAL PRIMARY KEY,
      motorista_cpf VARCHAR(11) NOT NULL REFERENCES motoristas(cpf),
      id_romaneio VARCHAR(30) NOT NULL REFERENCES ssw_romaneios(id_romaneio),
      valor_solicitado NUMERIC(10,2) NOT NULL,
      taxa_aplicada NUMERIC(5,2) DEFAULT 0.00,
      status VARCHAR(20) DEFAULT 'pendente',
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      aprovado_em TIMESTAMP,
      recusado_em TIMESTAMP,
      UNIQUE (motorista_cpf, id_romaneio)
    )`);
    console.log('  -> solicitacoes_pagamento');

    await pool.query(`CREATE TABLE IF NOT EXISTS configuracoes (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      dias_uteis_pagamento INTEGER NOT NULL DEFAULT 4,
      eficiencia_minima_adiantamento NUMERIC(5,2) NOT NULL DEFAULT 98.00,
      taxa_adiantamento NUMERIC(5,2) NOT NULL DEFAULT 0.00,
      valor_maximo_adiantamento NUMERIC(10,2) NOT NULL DEFAULT 400.00,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('  -> configuracoes');

    await pool.query(`CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      nome VARCHAR(200) NOT NULL,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('  -> admin_users');

    await pool.query(`CREATE TABLE IF NOT EXISTS fcm_tokens (
      cpf VARCHAR(11) PRIMARY KEY,
      token TEXT NOT NULL,
      atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('  -> fcm_tokens');

    await pool.query(`CREATE TABLE IF NOT EXISTS ssw_ocorrencias (
      id SERIAL PRIMARY KEY,
      ctrc VARCHAR(30) NOT NULL,
      ctrc_normalizado VARCHAR(30),
      id_romaneio VARCHAR(30) REFERENCES ssw_romaneios(id_romaneio),
      motorista_cpf VARCHAR(11) REFERENCES motoristas(cpf),
      emissao DATE,
      cnpj_remetente VARCHAR(20),
      nome_remetente VARCHAR(200),
      cnpj_pagador VARCHAR(20),
      nome_pagador VARCHAR(200),
      destino VARCHAR(200),
      valfrete NUMERIC(10,2),
      valmercadoria NUMERIC(10,2),
      peso_real NUMERIC(10,3),
      peso_cubado NUMERIC(10,3),
      cod_ultima_ocorrencia VARCHAR(10),
      data_ultima_ocorrencia DATE,
      ultima_ocorrencia VARCHAR(500),
      comple_ultima_ocorrencia VARCHAR(500),
      nro_nf VARCHAR(50),
      cnpj_destinatario VARCHAR(20),
      nome_destinatario VARCHAR(200),
      cidade_destino VARCHAR(100),
      uf_destino VARCHAR(2),
      origem_ocorrencia VARCHAR(4),
      importado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('  -> ssw_ocorrencias');

    await pool.query('CREATE INDEX IF NOT EXISTS idx_ssw_ctrcs_romaneio ON ssw_ctrcs (id_romaneio)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_ssw_ctrcs_cidade ON ssw_ctrcs (cidade_entrega)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_ssw_ctrcs_data ON ssw_ctrcs (data_entrega)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_ssw_ocorrencias_ctrc ON ssw_ocorrencias (ctrc_normalizado)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_ssw_ocorrencias_romaneio ON ssw_ocorrencias (id_romaneio)');
    try { await pool.query('CREATE INDEX IF NOT EXISTS idx_ssw_romaneios_cpf ON ssw_romaneios (motorista_cpf)'); } catch {}
    try { await pool.query('CREATE INDEX IF NOT EXISTS idx_solicitacoes_cpf ON solicitacoes_pagamento (motorista_cpf)'); } catch {}
    console.log('  indexes created');

    await pool.query(`CREATE TABLE IF NOT EXISTS taxas_adiantamento (
      dias_ate_fechamento INTEGER PRIMARY KEY,
      taxa NUMERIC(5,2) NOT NULL DEFAULT 0.00
    )`);
    console.log('  -> taxas_adiantamento');

    const { rows: taxaCount } = await pool.query('SELECT COUNT(*)::int AS cnt FROM taxas_adiantamento');
    if (taxaCount[0].cnt === 0) {
      const inserts = [];
      for (let i = 1; i <= 14; i++) {
        inserts.push(`(${i}, 0.00)`);
      }
      await pool.query(`INSERT INTO taxas_adiantamento (dias_ate_fechamento, taxa) VALUES ${inserts.join(', ')}`);
      console.log('  taxas_adiantamento seeded (14 rows)');
    } else {
      console.log('  taxas_adiantamento already has data, skipping seed');
    }

    console.log('Migrations: checking seed data...');

    await seedIfEmpty('tabela_preco_cidade', `
      INSERT INTO tabela_preco_cidade (cidade, valor_entrega) VALUES
      ('SALVADOR', 5.00),
      ('LAURO DE FREITAS', 7.00),
      ('CAMAÇARI', 7.00),
      ('SIMÕES FILHO', 6.00),
      ('DIAS D''ÁVILA', 8.00),
      ('MATA DE SÃO JOÃO', 9.00),
      ('FEIRA DE SANTANA', 10.00)
    `);

    await pool.query(`
      INSERT INTO configuracoes (id, dias_uteis_pagamento, eficiencia_minima_adiantamento, taxa_adiantamento, valor_maximo_adiantamento)
      VALUES (1, 4, 98.00, 0.00, 400.00)
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('  Configuracoes seeded');

    const { rows: adminCount } = await pool.query('SELECT COUNT(*)::int AS cnt FROM admin_users');
    if (adminCount[0].cnt === 0) {
      const hash = await bcrypt.hash('501578', 10);
      await pool.query(`
        INSERT INTO admin_users (username, password_hash, nome)
        VALUES ($1, $2, $3)
        ON CONFLICT (username) DO NOTHING
      `, ['125281', hash, 'Administrador']);
      console.log('  Admin user seeded (125281)');
    } else {
      console.log('  admin_users already has data, skipping seed');
    }

    console.log('Migrations: all seed data done');
  } catch (err) {
    console.error('Migration error:', err);
    throw err;
  }
}

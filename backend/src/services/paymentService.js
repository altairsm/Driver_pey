import { pool } from '../db/index.js';

export async function calcularPagamentos(inicio, fim) {
  const query = `
    WITH entregas_periodo AS (
      SELECT
        r.motorista_cpf,
        r.motorista_nome,
        c.ctrc,
        c.cidade_entrega,
        c.id_romaneio,
        COALESCE(c.frete_ctrc, 0) AS frete_ctrc,
        COALESCE(pc.valor_entrega, 0) AS valor_despesa
      FROM ssw_ctrcs c
      JOIN ssw_romaneios r ON r.id_romaneio = c.id_romaneio
      LEFT JOIN tabela_preco_cidade pc
        ON LOWER(pc.cidade) = LOWER(TRIM(SPLIT_PART(c.cidade_entrega, '/', 1)))
        OR LOWER(pc.cidade) = LOWER(TRIM(c.cidade_entrega))
      WHERE c.ocorrencia_data BETWEEN $1::date AND $2::date
        AND LOWER(c.ocorrencia) LIKE '%entregue%'
    ),
    resumo_motorista AS (
      SELECT
        motorista_cpf,
        motorista_nome,
        COUNT(*) AS total_ctrcs,
        COUNT(DISTINCT id_romaneio) AS total_romaneios,
        SUM(frete_ctrc) AS receita_total,
        SUM(valor_despesa) AS despesa_total
      FROM entregas_periodo
      GROUP BY motorista_cpf, motorista_nome
    ),
    adiantamentos AS (
      SELECT
        motorista_cpf,
        COALESCE(SUM(valor_solicitado), 0)::numeric(10,2) AS total_adiantado
      FROM solicitacoes_pagamento
      WHERE status = 'aprovado'
        AND aprovado_em::date BETWEEN $1::date AND $2::date
      GROUP BY motorista_cpf
    )
    SELECT
      m.cpf,
      m.nome,
      COALESCE(rm.total_ctrcs, 0) AS total_ctrcs,
      COALESCE(rm.total_romaneios, 0) AS total_romaneios,
      COALESCE(rm.receita_total, 0)::numeric(10,2) AS receita_total,
      COALESCE(rm.despesa_total, 0)::numeric(10,2) AS despesa_total,
      GREATEST(COALESCE(rm.despesa_total, 0) - COALESCE(a.total_adiantado, 0), 0)::numeric(10,2) AS total_pagar,
      COALESCE(a.total_adiantado, 0)::numeric(10,2) AS total_adiantado
    FROM motoristas m
    LEFT JOIN resumo_motorista rm ON rm.motorista_cpf = m.cpf
    LEFT JOIN adiantamentos a ON a.motorista_cpf = m.cpf
    WHERE rm.motorista_cpf IS NOT NULL
    ORDER BY m.nome;
  `;

  const result = await pool.query(query, [inicio, fim]);
  return result.rows;
}

export async function confirmarPagamento(cpf, periodo) {
  const { inicio, fim } = periodo;

  const { rows: [driver] } = await pool.query(
    `SELECT nome FROM motoristas WHERE cpf = $1`,
    [cpf]
  );

  const { rows: [totalRow] } = await pool.query(`
    SELECT COUNT(*)::int AS total_ctrcs,
           COALESCE(SUM(c.frete_ctrc), 0)::numeric(10,2) AS receita,
           COALESCE(SUM(pc.valor_entrega), 0)::numeric(10,2) AS despesa
    FROM ssw_ctrcs c
    JOIN ssw_romaneios r ON r.id_romaneio = c.id_romaneio
    LEFT JOIN tabela_preco_cidade pc
      ON LOWER(pc.cidade) = LOWER(TRIM(SPLIT_PART(c.cidade_entrega, '/', 1)))
      OR LOWER(pc.cidade) = LOWER(TRIM(c.cidade_entrega))
    WHERE r.motorista_cpf = $1
      AND c.ocorrencia_data BETWEEN $2::date AND $3::date
      AND LOWER(c.ocorrencia) LIKE '%entregue%'
  `, [cpf, inicio, fim]);

  const { rows: [adiantadoRow] } = await pool.query(`
    SELECT COALESCE(SUM(valor_solicitado), 0)::numeric(10,2) AS total_adiantado
    FROM solicitacoes_pagamento
    WHERE motorista_cpf = $1
      AND status = 'aprovado'
      AND aprovado_em::date BETWEEN $2::date AND $3::date
  `, [cpf, inicio, fim]);

  const receita = parseFloat(totalRow?.receita) || 0;
  const despesa = parseFloat(totalRow?.despesa) || 0;
  const adiantado = parseFloat(adiantadoRow?.total_adiantado) || 0;
  const totalPagar = Math.max(despesa - adiantado, 0);

  const payload = {
    cpf,
    nome: driver?.nome || '',
    quinzena_inicio: inicio,
    quinzena_fim: fim,
    total_ctrcs: totalRow?.total_ctrcs || 0,
    receita,
    despesa,
    total_pagar: totalPagar,
    total_adiantado: adiantado,
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

  return payload;
}

export async function listarMotoristas() {
  const result = await pool.query(`
    SELECT cpf, nome, telefone, pix_tipo, cnpj_mei, bonus_d0, leu_regras
    FROM motoristas
    ORDER BY nome
  `);
  return result.rows;
}

export async function getQuinzenasAdmin() {
  const result = await pool.query(`
    SELECT DISTINCT
      CASE
        WHEN EXTRACT(DAY FROM c.ocorrencia_data) <= 15 THEN
          date_trunc('month', c.ocorrencia_data)::date
        ELSE
          (date_trunc('month', c.ocorrencia_data) + INTERVAL '15 days')::date
      END AS inicio,
      CASE
        WHEN EXTRACT(DAY FROM c.ocorrencia_data) <= 15 THEN
          (date_trunc('month', c.ocorrencia_data) + INTERVAL '14 days')::date
        ELSE
          (date_trunc('month', c.ocorrencia_data) + INTERVAL '1 month' - INTERVAL '1 day')::date
      END AS fim
    FROM ssw_ctrcs c
    WHERE c.ocorrencia_data IS NOT NULL
    ORDER BY inicio DESC
  `);
  return result.rows;
}

export async function criarMotorista(dados) {
  const { cpf, nome, telefone, pix_tipo, cnpj_mei, bonus_d0 } = dados;
  await pool.query(`
    INSERT INTO motoristas (cpf, nome, telefone, pix_tipo, cnpj_mei, bonus_d0)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (cpf) DO UPDATE SET
      nome = EXCLUDED.nome,
      telefone = EXCLUDED.telefone,
      pix_tipo = EXCLUDED.pix_tipo,
      cnpj_mei = EXCLUDED.cnpj_mei,
      bonus_d0 = EXCLUDED.bonus_d0
  `, [cpf, nome, telefone || null, pix_tipo || 'CPF', cnpj_mei || null, bonus_d0 ?? 0]);
  return { cpf, nome, telefone, pix_tipo, cnpj_mei, bonus_d0 };
}

export async function atualizarMotorista(cpf, dados) {
  const { nome, telefone, pix_tipo, cnpj_mei, bonus_d0 } = dados;
  const result = await pool.query(`
    UPDATE motoristas
    SET nome = $1, telefone = $2, pix_tipo = $3, cnpj_mei = $4, bonus_d0 = $5
    WHERE cpf = $6
  `, [nome, telefone || null, pix_tipo || 'CPF', cnpj_mei || null, bonus_d0 ?? 0, cpf]);
  return result.rowCount > 0;
}

export async function deletarMotorista(cpf) {
  await pool.query(`DELETE FROM ssw_romaneios WHERE motorista_cpf = $1`, [cpf]);
  const result = await pool.query(`DELETE FROM motoristas WHERE cpf = $1`, [cpf]);
  return result.rowCount > 0;
}

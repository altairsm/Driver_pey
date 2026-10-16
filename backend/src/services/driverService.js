import { pool } from '../db/index.js';
import { getConfig } from './configuracaoService.js';
import { enviarWebhookDriverPix, decidirStatus, chaveEstavel } from './webhookService.js';
import { validarEregistrar, notaAtende, mensagemParaMotorista } from './nfseService.js';
import { normalizaCnpjMei, eficienciaMinimaEfetiva } from './paymentService.js';

export async function getDriverData(matricula) {
  const result = await pool.query(`
    SELECT "OperadorMatricula"::bigint AS matricula, nome_completo, cpf, telefone,
           leu_regras, cnpj_mei, pix_tipo, pix_chave,
           eficiencia_minima_adiantamento
    FROM matriculos_jad
    WHERE "OperadorMatricula"::bigint = $1
  `, [matricula]);
  const driver = result.rows[0] || null;
  if (!driver) return null;
  // O app precisa do limiar que vale para este motorista, já resolvido: o seu
  // próprio quando definido, o padrão global quando não.
  driver.eficiencia_minima_efetiva = eficienciaMinimaEfetiva(
    driver.eficiencia_minima_adiantamento,
    await getConfig()
  );
  return driver;
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
      LEFT JOIN ceps_especificos ce
        ON ce.cep = NULLIF(REGEXP_REPLACE(COALESCE(re."Cep", '0'), '[^0-9]', '', 'g'), '')
      LEFT JOIN faixas_peso_entrega_bairro fb
        ON re."Peso"::numeric BETWEEN fb.peso_de AND fb.peso_ate
        AND fb.nome_tabela = ce.nome_tabela
      JOIN lista_entregas le ON le."Número"::text = re."Lista"
      WHERE re."OperadorMatricula"::bigint = $1
        AND LOWER(re."Evento") = 'entrega'
        AND le.status = 'Finalizado'
        AND ($2::date IS NULL OR le."Data Baixa" >= $2)
        AND ($3::date IS NULL OR le."Data Baixa" <= $3)
        AND NOT EXISTS (SELECT 1 FROM acareacaojad a WHERE a."NCTE" = re."NCTE" AND LOWER(a.assunto) IN ('acareação', 'comprovante de entrega'))
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
      (SELECT COUNT(*) FROM relatorioentrega_export re3
       WHERE re3."Lista" = re."Lista"
         AND re3."OperadorMatricula"::bigint = $1
      ) AS ctes_total,
      (SELECT COUNT(*) FROM relatorioentrega_export re3
       JOIN lista_entregas le3 ON le3."Número"::text = re3."Lista"
       WHERE re3."Lista" = re."Lista"
         AND re3."OperadorMatricula"::bigint = $1
         AND LOWER(re3."Evento") = 'entrega'
         AND re3."Data"::date = le3."Data Emissão"
      ) AS ctes_d0,
      EXISTS (
        SELECT 1 FROM acareacaojad a
        JOIN relatorioentrega_export re2 ON re2."NCTE" = a."NCTE"
        WHERE re2."Lista" = re."Lista"
          AND re2."OperadorMatricula"::bigint = $1
      ) AS tem_reclamacao_aberta,
      (SELECT sp.status FROM solicitacoes_pagamento sp
       WHERE sp.matricula = $1 AND sp.lista_numero = CAST(REPLACE(re."Lista", '"', '') AS BIGINT)
       LIMIT 1) AS solicitacao_status,
      (SELECT sp.pix_estado FROM solicitacoes_pagamento sp
       WHERE sp.matricula = $1 AND sp.lista_numero = CAST(REPLACE(re."Lista", '"', '') AS BIGINT)
       LIMIT 1) AS solicitacao_pix_estado,
      (SELECT sp.webhook_erro FROM solicitacoes_pagamento sp
       WHERE sp.matricula = $1 AND sp.lista_numero = CAST(REPLACE(re."Lista", '"', '') AS BIGINT)
       LIMIT 1) AS solicitacao_webhook_erro
    FROM relatorioentrega_export re
    LEFT JOIN lista_entregas le ON le."Número"::text = re."Lista"
    WHERE re."OperadorMatricula"::bigint = $1
      AND LOWER(re."Evento") = 'entrega'
      AND ($2::date IS NULL OR le."Data Baixa" >= $2)
      AND ($3::date IS NULL OR le."Data Baixa" <= $3)
      AND NOT EXISTS (SELECT 1 FROM acareacaojad a WHERE a."NCTE" = re."NCTE" AND LOWER(a.assunto) IN ('acareação', 'comprovante de entrega'))
    GROUP BY re."Lista"
    ORDER BY MAX(le."Data Emissão") DESC NULLS LAST
  `, [matricula, inicio, fim]);

  // Enriquece cada lista com a elegibilidade calculada no servidor (fonte
  // única). O painel só renderiza estes campos; ele não recalcula regra
  // nenhuma, então o botão nunca mente sobre o que o servidor aceita.
  const ctx = await montarContextoAdiantamento(matricula);
  const valores = await getValorListas(matricula);

  for (const t of result.rows) {
    const dataBaixa = t.data_baixa ? new Date(t.data_baixa) : null;
    const suspensao = dataBaixa
      ? emPeriodoSuspensao(dataBaixa, ctx.config.dias_uteis_pagamento)
      : false;
    const avaliacao = avaliarElegibilidade({
      dataBaixa,
      status: t.status,
      pago: t.pago,
      solicitacaoStatus: t.solicitacao_status,
      temReclamacao: t.tem_reclamacao_aberta,
      valorLista: valores.get(String(t.numero_lista)) ?? 0,
      ctx: { ...ctx, suspensao },
    });
    t.valor_lista = valores.get(String(t.numero_lista)) ?? 0;
    t.em_suspensao = avaliacao.em_suspensao;
    t.elegivel = avaliacao.elegivel;
    t.motivos = avaliacao.motivos;
    // Dias até o fechamento da quinzena (para a faixa de taxa exibida).
    t.dias_ate_fechamento = dataBaixa ? calcDiasAteFechamento(dataBaixa) : MAX_DIAS_TAXA;
  }

  return result.rows;
}

export async function getDriverTripsFaixas(matricula, inicio = null, fim = null) {
  const result = await pool.query(`
    WITH faixas_raw AS (
      SELECT
        re."NCTE" AS ncte,
        re."Lista" AS lista,
        re."Peso"::numeric AS peso_cte,
        COALESCE(ce.bairro, 'Sem bairro') AS bairro,
        COALESCE(fb.faixas, 'Sem faixa') AS faixa_desc,
        COALESCE(fb.valor_peso, 0) AS valor_peso,
        fb.peso_de
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
        AND ($2::date IS NULL OR le."Data Baixa" >= $2)
        AND ($3::date IS NULL OR le."Data Baixa" <= $3)
        AND NOT EXISTS (SELECT 1 FROM acareacaojad a WHERE a."NCTE" = re."NCTE" AND LOWER(a.assunto) IN ('acareação', 'comprovante de entrega'))
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
      LEFT JOIN ceps_especificos ce
        ON ce.cep = NULLIF(REGEXP_REPLACE(COALESCE(re."Cep", '0'), '[^0-9]', '', 'g'), '')
      LEFT JOIN faixas_peso_entrega_bairro fb
        ON re."Peso"::numeric BETWEEN fb.peso_de AND fb.peso_ate
        AND fb.nome_tabela = ce.nome_tabela
      JOIN lista_entregas le ON le."Número"::text = re."Lista"
      WHERE re."OperadorMatricula"::bigint = $1
        AND LOWER(re."Evento") = 'entrega'
        AND le.status = 'Finalizado'
        AND re."Data"::date >= $2::date
        AND re."Data"::date <= $3::date
        AND NOT EXISTS (SELECT 1 FROM acareacaojad a WHERE a."NCTE" = re."NCTE" AND LOWER(a.assunto) IN ('acareação', 'comprovante de entrega'))
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
    SELECT DISTINCT ON (a."NCTE")
      a.id,
      a."NCTE" AS ncte,
      a.motivo,
      a.data_criacao,
      a.status_original,
      a.assunto,
      re."Lista" AS lista,
      re."Data"::date AS data_entrega,
      re."Cep" AS cep
    FROM acareacaojad a
    JOIN relatorioentrega_export re ON re."NCTE" = a."NCTE"
    WHERE re."OperadorMatricula"::bigint = $1
      AND LOWER(re."Evento") = 'entrega'
      AND a.data_criacao >= $2::date
      AND a.data_criacao <= $3::date
      AND LOWER(a.assunto) IN ('acareação', 'comprovante de entrega')
    ORDER BY
      a."NCTE",
      a.data_criacao DESC
  `, [matricula, inicio, fim]);
  return result.rows;
}

export async function getEficiencia30dias(matricula) {
  const result = await pool.query(`
    SELECT
      LOWER(re."Evento") AS evento,
      COUNT(*) AS quantidade
    FROM relatorioentrega_export re
    WHERE re."OperadorMatricula"::bigint = $1
      AND re."Data"::date >= (CURRENT_DATE - INTERVAL '30 days')::date
    GROUP BY LOWER(re."Evento")
    ORDER BY quantidade DESC
  `, [matricula]);
  return result.rows;
}

export async function getUltimaImportacao() {
  const { rows } = await pool.query(`SELECT MAX(importado_em) AS ultima_importacao FROM acareacaojad`);
  return rows[0]?.ultima_importacao || null;
}

// Coluna DATE chega do Postgres como Date em meia-noite local, e string
// 'YYYY-MM-DD' seria interpretada como UTC. Normalizamos para o dia civil
// 'YYYY-MM-DD' e só então montamos em UTC: assim a conta não depende de como
// o valor chegou nem do fuso do processo.
function civilDate(valor) {
  if (!valor) return null;
  if (typeof valor === 'string') return valor.slice(0, 10);
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return null;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Fim da quinzena a que a lista pertence. A 1ª quinzena vai do dia 1 ao 15
// (como em getQuinzenasDisponiveis/getQuinzenasAdmin no SQL); a 2ª vai do 16
// ao último dia do mês. Precisa bater com o SQL: é daqui que saem a janela
// de suspensão (regra 05) e a faixa de taxa.
function calcQuinzenaFim(data) {
  const civil = civilDate(data);
  if (!civil) return null;
  const d = new Date(`${civil}T00:00:00Z`);
  const dia = d.getUTCDate();
  if (dia <= 15) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 15));
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

// Regra 05: o adiantamento é bloqueado entre o fim da quinzena da lista e a
// data de pagamento (N dias úteis depois do fim da quinzena). Fora desse
// intervalo a lista segue o fluxo normal. Exportada para os testes de virada.
export function emPeriodoSuspensao(dataBaixa, diasUteis, hojeRef = null) {
  const quinzenaFim = calcQuinzenaFim(dataBaixa);
  if (!quinzenaFim) return false;
  const pagamentoDate = addDiasUteis(quinzenaFim, diasUteis);
  const hoje = hojeRef ? new Date(hojeRef) : new Date();
  hoje.setUTCHours(0, 0, 0, 0);
  const qf = new Date(quinzenaFim);
  qf.setUTCHours(0, 0, 0, 0);
  const pd = new Date(pagamentoDate);
  pd.setUTCHours(0, 0, 0, 0);
  return hoje >= qf && hoje <= pd;
}

// Mesma data civil (ignora hora e fuso) — base da regra "Aguarde 24h após a
// última baixa". Trabalha com datas em UTC para não depender do fuso.
function mesmaDataCivil(a, b) {
  const ca = civilDate(a);
  const cb = civilDate(b);
  return ca !== null && cb !== null && ca === cb;
}

// Quantos dias faltam (mínimo 1) até o fechamento da quinzena da lista.
function calcDiasAteFechamento(dataBaixa) {
  const fechamento = calcQuinzenaFim(dataBaixa);
  if (!fechamento) return 14;
  const hoje = new Date();
  hoje.setUTCHours(0, 0, 0, 0);
  const diffMs = fechamento.getTime() - hoje.getTime();
  return Math.max(1, Math.min(14, Math.ceil(diffMs / (1000 * 60 * 60 * 24))));
}

function normalizarStatusSolicitacao(st) {
  return String(st || '').trim().toLowerCase();
}

// ── Fonte única de elegibilidade do adiantamento ────────────────────────────
// Regras 01–08. O painel (getDriverTrips) e o pedido real (solicitarPagamento)
// passam TODOS por avaliarElegibilidade, para que o botão do motorista nunca
// divirja do que o servidor aceita. Cada regra vira um motivo legível; a
// lista é elegível quando não há nenhum motivo.

const JANELA_RECLAMACOES_HORAS = 4;
const MAX_DIAS_TAXA = 14;

// Eficiência dos últimos 30 dias: entregas ÷ eventos × 100 (sem arredondar,
// como a tela mostra) e o limiar efetivo do motorista (override ou global).
async function getEficiencia30d(matricula, config) {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE LOWER(re."Evento") = 'entrega') AS entregas,
      COUNT(*) AS total,
      (SELECT m.eficiencia_minima_adiantamento FROM matriculos_jad m
         WHERE m."OperadorMatricula"::bigint = $1) AS eficiencia_override
    FROM relatorioentrega_export re
    WHERE re."OperadorMatricula"::bigint = $1
      AND re."Data"::date >= (CURRENT_DATE - INTERVAL '30 days')::date
  `, [matricula]);
  const ef = rows[0] || {};
  const total = Number(ef.total || 0);
  const entregas = Number(ef.entregas || 0);
  const pct = total > 0 ? (entregas / total) * 100 : 0;
  const minimo = eficienciaMinimaEfetiva(ef.eficiencia_override, config);
  return { pct, minimo };
}

// Valor de cada lista (mesma deduplicação de getDriverTripsFaixas, para que o
// total do servidor bata com o que a tela soma). Mapa lista → valor.
async function getValorListas(matricula) {
  const { rows } = await pool.query(`
    WITH entregas_raw AS (
      SELECT
        re."NCTE" AS ncte,
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
    ),
    dedup AS (
      SELECT DISTINCT ON (ncte, lista) lista, valor_peso
      FROM entregas_raw
      ORDER BY ncte, lista,
        CASE WHEN valor_peso > 0 THEN 0 ELSE 1 END,
        valor_peso ASC
    )
    SELECT lista, SUM(valor_peso)::numeric(12,2) AS valor_total
    FROM dedup
    GROUP BY lista
  `, [matricula]);
  const mapa = new Map();
  for (const r of rows) mapa.set(r.lista, Number(r.valor_total || 0));
  return mapa;
}

// A janela de 4h desde a última importação de reclamações é global (não por
// lista): vale o mesmo para todos. Devolve os motivos prontos.
async function motivosReclamacoesDesatualizadas() {
  const { rows } = await pool.query(`SELECT MAX(importado_em) AS ultima FROM acareacaojad`);
  const ultima = rows[0]?.ultima;
  if (!ultima) return ['Nenhuma reclamação importada ainda'];
  const horas = (Date.now() - new Date(ultima).getTime()) / (1000 * 60 * 60);
  if (horas > JANELA_RECLAMACOES_HORAS) {
    return [`Reclamações desatualizadas — última importação há mais de ${JANELA_RECLAMACOES_HORAS} horas`];
  }
  return [];
}

// Status de solicitação que bloqueia um novo pedido. Compartilhado por painel
// e pedido para não divergirem.
function motivoSolicitacaoExistente(statusSolicitacao) {
  const st = normalizarStatusSolicitacao(statusSolicitacao);
  if (st === 'aprovado' || st === 'pre_aprovado') {
    return 'Esta lista já teve o adiantamento aprovado';
  }
  if (st === 'pendente') {
    return 'Já existe uma solicitação pendente para esta lista';
  }
  if (st === 'erro_webhook') {
    return 'O Pix desta lista está com falha de envio e em aberto — aguarde o administrador reenviar';
  }
  if (st === 'processando_pix' || st === 'pix_rejeitado') {
    return 'Adiantamento em processamento';
  }
  return null;
}

// Avalia as regras de elegibilidade de UMA lista. `ctx` traz os dados já
// calculados uma vez (config, eficiência, valor, janela de reclamações) para
// não repetir consulta. Devolve { elegivel, motivos, em_suspensao }.
export function avaliarElegibilidade({ dataBaixa, status, pago, solicitacaoStatus, temReclamacao, valorLista, ctx }) {
  const { config, pct, minimo, motivosReclamacoes, suspensao } = ctx;
  const motivos = [];

  if (pago) motivos.push('Esta lista já foi paga');

  const motivoSol = motivoSolicitacaoExistente(solicitacaoStatus);
  if (motivoSol) motivos.push(motivoSol);

  if (suspensao) motivos.push('Quinzena em processamento');

  if (pct < minimo) {
    motivos.push(`Eficiência abaixo de ${minimo}% nos últimos 30 dias`);
  }

  motivos.push(...motivosReclamacoes);

  if (status !== 'Finalizado') {
    motivos.push('Lista não finalizada');
  }

  // Regra 02: a baixa tem de ser de um dia anterior ao de hoje.
  if (!dataBaixa || mesmaDataCivil(dataBaixa, new Date())) {
    motivos.push('Aguarde 24h após a última baixa da lista');
  }

  if (temReclamacao) motivos.push('Lista possui reclamação');

  const maximo = Number(config.valor_maximo_adiantamento) || 400;
  if (valorLista <= 0) {
    motivos.push('Valor da lista é zero');
  } else if (valorLista > maximo) {
    motivos.push(`Valor excede R$ ${maximo.toFixed(2)}`);
  }

  return { elegivel: motivos.length === 0, motivos, em_suspensao: suspensao };
}

// Monta o contexto compartilhado (insumos que não dependem da lista) uma vez
// por requisição: config, eficiência 30d e a janela de reclamações.
async function montarContextoAdiantamento(matricula) {
  const config = await getConfig();
  const [eficiencia, motivosReclamacoes] = await Promise.all([
    getEficiencia30d(matricula, config),
    motivosReclamacoesDesatualizadas(),
  ]);
  return { config, pct: eficiencia.pct, minimo: eficiencia.minimo, motivosReclamacoes };
}

export async function solicitarPagamento(matricula, listaNumero, valorSolicitado, chaveNfse = null) {
  const config = await getConfig();

  const { rows: lista } = await pool.query(`
    SELECT le."Número", le."Data Baixa", le.status, le.pago
    FROM lista_entregas le
    WHERE le."Número" = $1
  `, [listaNumero]);

  if (lista.length === 0) {
    return { success: false, motivo: 'Lista não encontrada' };
  }

const l = lista[0];

  const dataBaixa = l['Data Baixa'] ? new Date(l['Data Baixa']) : null;

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

  const { rows: solicitacaoExistente } = await pool.query(`
    SELECT status FROM solicitacoes_pagamento
    WHERE matricula = $1 AND lista_numero = $2
  `, [matricula, listaNumero]);

  const { rows: reclamacoes } = await pool.query(`
    SELECT 1 FROM acareacaojad a
    JOIN relatorioentrega_export re ON re."NCTE" = a."NCTE"
    WHERE re."Lista" = $1::text
      AND re."OperadorMatricula"::bigint = $2
    LIMIT 1
  `, [listaNumero, matricula]);

  const ctx = await montarContextoAdiantamento(matricula);
  // O valor da lista é calculado no servidor (fonte única com o painel) em vez
  // de vir do app: o cliente não decide quanto vai adiantar.
  const valores = await getValorListas(matricula);
  const valorLista = valores.get(String(listaNumero)) ?? 0;

  const avaliacao = avaliarElegibilidade({
    dataBaixa,
    status: l.status,
    pago: l.pago,
    solicitacaoStatus: solicitacaoExistente[0]?.status,
    temReclamacao: reclamacoes.length > 0,
    valorLista,
    ctx: { ...ctx, suspensao: dataBaixa ? emPeriodoSuspensao(dataBaixa, config.dias_uteis_pagamento) : false },
  });

  if (!avaliacao.elegivel) {
    return { success: false, motivo: avaliacao.motivos.join(' — ') };
  }

  // O app manda o valor, mas quem manda é o servidor.
  const valor = valorLista;
  const maximo = Number(config.valor_maximo_adiantamento) || 400;
  if (valor <= 0 || valor > maximo) {
    return { success: false, motivo: `Valor da lista deve ser entre R$ 0,01 e R$ ${maximo.toFixed(2)}` };
  }
  valorSolicitado = valor;

  const dias = l['Data Baixa'] ? calcDiasAteFechamento(l['Data Baixa']) : MAX_DIAS_TAXA;
  const { rows: taxaRow } = await pool.query(`
    SELECT taxa FROM taxas_adiantamento WHERE dias_ate_fechamento = $1
  `, [Math.min(dias, MAX_DIAS_TAXA)]);
  const taxaAplicadaBase = Number(taxaRow[0]?.taxa) || 0;

  const { rows: totalCtes } = await pool.query(`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (
        WHERE LOWER(re."Evento") = 'entrega'
          AND re."Data"::date = le."Data Emissão"
      ) AS entregues_d0
    FROM relatorioentrega_export re
    JOIN lista_entregas le ON le."Número"::text = re."Lista"
    WHERE re."Lista" = $1::text
      AND re."OperadorMatricula"::bigint = $2
  `, [listaNumero, matricula]);
  const todosEntreguesD0 = Number(totalCtes[0].total) > 0
    && Number(totalCtes[0].entregues_d0) === Number(totalCtes[0].total);
  const taxaAplicada = todosEntreguesD0 ? 0 : taxaAplicadaBase;

  const { rows: motorista } = await pool.query(`
    SELECT nome_completo, auto_aprovado FROM matriculos_jad WHERE "OperadorMatricula" = $1
  `, [matricula]);
  const temAutoAprovado = motorista.length > 0 && motorista[0].auto_aprovado === true;

  // ── NFse obrigatória para adiantamento? ──
  // A nota é validada ANTES de criar a solicitação, para que uma NF inválida
  // nunca chegue perto de disparar um Pix.
  let nfStatus = null;
  let nfChave = null;
  if (config.exigir_nfse_adiantamento) {
    if (!chaveNfse || String(chaveNfse).replace(/\D/g, '').length !== 50) {
      return {
        success: false,
        motivo: 'Este pagamento exige NFS-e: informe a chave de acesso (50 dígitos) da nota emitida para a transportadora.',
        nf_pendente: true,
      };
    }
    const val = await validarEregistrar({
      matricula,
      tipo: 'adiantamento',
      solicitacaoId: null,
      chave: chaveNfse,
      valorEsperado: valorSolicitado,
      dataReferencia: new Date(),
      config,
    });
    if (!val.ok) {
      return {
        success: false,
        motivo: mensagemParaMotorista(val),
        nf_pendente: true,
        nf_motivo: val.motivo,
        nf_infra: val.infra === true,
      };
    }
    nfStatus = val.status;
    nfChave = val.chave;
  }

  try {
    const status = temAutoAprovado ? 'pre_aprovado' : 'pendente';
    const { rows: inserted } = await pool.query(`
      INSERT INTO solicitacoes_pagamento (matricula, lista_numero, valor_solicitado, taxa_aplicada, status, nfse_chave, nfse_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [matricula, listaNumero, valorSolicitado, taxaAplicada, status, nfChave, nfStatus]);
    const solicitacaoId = inserted[0].id;

    // Reaproveita a NF validada: vincula a nota já registrada à solicitação.
    if (nfChave) {
      await pool.query(`
        UPDATE notas_fiscais SET solicitacao_id = $1 WHERE chave_acesso = $2 AND solicitacao_id IS NULL
      `, [solicitacaoId, nfChave]);
    }

    let pixEstado = null;
    let pixErro = null;
    if (temAutoAprovado) {
      const { rows: listaPagoAuto } = await pool.query(`
        SELECT pago FROM lista_entregas WHERE "Número" = $1
      `, [listaNumero]);
      if (listaPagoAuto[0]?.pago) {
        return { success: false, motivo: 'Esta lista já foi paga' };
      }

      await pool.query(`
        UPDATE solicitacoes_pagamento
        SET pix_enviado_em = CURRENT_TIMESTAMP,
            webhook_tentativas = COALESCE(webhook_tentativas, 0) + 1,
            ultimo_webhook_em = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [solicitacaoId]);

      const valorLiquido = valorSolicitado * (1 - taxaAplicada / 100);
      const webhook = await enviarWebhookDriverPix({
        tipo: 'adiantamento',
        entidade: 'solicitacao',
        entidade_id: Number(solicitacaoId),
        idempotency_key: chaveEstavel('adiantamento', 'solicitacao', solicitacaoId),
        payload: {
          matricula,
          nome: motorista[0].nome_completo || '',
          lista_numero: listaNumero,
          valor_solicitado: Number(valorSolicitado),
          taxa_aplicada: Number(taxaAplicada),
          valor_liquido: Number(valorLiquido),
          data_pagamento: new Date().toISOString().slice(0, 10),
          pre_aprovado: true,
          aprovado_por: 'auto',
        },
      });

      const pixEndToEndId = webhook.data?.endToEndId || null;
      const pixHorario = webhook.data?.horario || null;
      pixEstado = webhook.estado;
      pixErro = webhook.erro;

      const decisao = decidirStatus({ ok: webhook.ok, estado: pixEstado });
      const statusFinal = decisao.status === 'aprovado' ? 'aprovado'
                       : decisao.status === 'erro_webhook' ? 'erro_webhook'
                       : decisao.status === 'processando_pix' ? 'pre_aprovado'
                       : 'pix_rejeitado';

      await pool.query(`
        UPDATE solicitacoes_pagamento
        SET status = $1::varchar(20),
            pix_end_to_end_id = $2,
            pix_estado = $3,
            pix_horario = $4,
            webhook_http_status = $5,
            webhook_erro = $6,
            aprovado_em = CASE WHEN $1::varchar(20) = 'aprovado' THEN CURRENT_TIMESTAMP ELSE aprovado_em END
        WHERE id = $7
      `, [statusFinal, pixEndToEndId, pixEstado, pixHorario,
          webhook.httpStatus ?? null, pixErro ?? null, solicitacaoId]);

      if (statusFinal === 'aprovado') {
        await pool.query(`UPDATE lista_entregas SET pago = true WHERE "Número" = $1`, [listaNumero]);
      }

      if (decisao.status === 'erro_webhook') {
        return {
          success: false,
          motivo: 'Não foi possível enviar o Pix ao banco agora. Sua solicitação ficou em aberto — o administrador pode reenviar.',
          status: 'erro_webhook',
          webhook_erro: pixErro,
          beneficio_sem_taxa: todosEntreguesD0,
        };
      }
    }

    // Devolvemos o valor que o servidor registrou (o da lista, calculado aqui):
    // o app pode ter enviado outro número e é este que vale.
    return {
      success: true,
      motivo: 'Solicitação registrada com sucesso',
      valor_solicitado: Number(valorSolicitado),
      beneficio_sem_taxa: todosEntreguesD0,
      pix_estado: pixEstado,
    };
  } catch (err) {
    if (err.code === '23505') {
      return { success: false, motivo: 'Solicitação já existe para esta lista' };
    }
    throw err;
  }
}

export async function getDriverDados(matricula) {
  return getDriverData(matricula);
}

export async function atualizarDriverDados(matricula, dados) {
  const { cnpj_mei, telefone, pix_tipo, pix_chave } = dados;
  const cnpjMei = normalizaCnpjMei(cnpj_mei);
  await pool.query(`
    UPDATE matriculos_jad
    SET cnpj_mei = $1, telefone = $2, pix_tipo = $3, pix_chave = $4
    WHERE "OperadorMatricula"::bigint = $5
  `, [cnpjMei, telefone || null, pix_tipo, pix_chave || null, matricula]);
  return { success: true };
}

export async function confirmarRegras(matricula) {
  await pool.query(`
    UPDATE matriculos_jad SET leu_regras = true WHERE "OperadorMatricula"::bigint = $1
  `, [matricula]);
  return { success: true };
}

export async function getDriverMapaQuinzena(matricula, inicio, fim) {
  const { rows } = await pool.query(`
    WITH entregas AS (
      SELECT "Cep", COUNT(*)::int AS total
      FROM relatorioentrega_export
      WHERE "OperadorMatricula"::bigint = $1
        AND "Data" BETWEEN $2::date AND $3::date
        AND LOWER("Evento") = 'entrega'
      GROUP BY "Cep"
    )
    SELECT DISTINCT ON (e."Cep")
      e."Cep" AS cep,
      e.total AS total_entregas,
      COALESCE(ce.bairro, cb.bairro) AS bairro,
      ce.logradouro,
      ce.bairro_viacep,
      COALESCE(ce.lat, br.lat) AS lat,
      COALESCE(ce.lng, br.lng) AS lng
    FROM entregas e
    LEFT JOIN ceps_especificos ce ON ce.cep = e."Cep"
    LEFT JOIN ceps_bairros cb ON e."Cep" >= cb.cep_ini AND e."Cep" <= cb.cep_fim
    LEFT JOIN bairros_rotas br ON br.bairro = COALESCE(ce.bairro, cb.bairro) AND br.lat IS NOT NULL
    WHERE ce.lat IS NOT NULL OR br.lat IS NOT NULL
    ORDER BY e."Cep", (CASE WHEN ce.lat IS NOT NULL THEN 0 ELSE 1 END)
  `, [matricula, inicio, fim]);
  return rows;
}

export async function getBonusD0(matricula, inicio, fim) {
  const result = await pool.query(`
    WITH ctes_d0 AS (
      SELECT DISTINCT ON (re."NCTE", re."Lista")
        re."NCTE" AS ncte,
        re."Lista" AS lista,
        re."Data"::date AS data,
        CASE
          WHEN mj.bonus_d0_motorista = true THEN mj.bonus_d0_valor
          ELSE COALESCE(br.bonus_d0, 0)
        END AS bonus_d0
      FROM relatorioentrega_export re
      JOIN lista_entregas le ON le."Número"::text = re."Lista"
      JOIN matriculos_jad mj ON mj."OperadorMatricula"::bigint = re."OperadorMatricula"::bigint
      LEFT JOIN ceps_bairros cb
        ON NULLIF(REGEXP_REPLACE(COALESCE(re."Cep", '0'), '[^0-9]', '', 'g'), '') >= cb.cep_ini
        AND NULLIF(REGEXP_REPLACE(COALESCE(re."Cep", '0'), '[^0-9]', '', 'g'), '') <= cb.cep_fim
      LEFT JOIN bairros_rotas br ON LOWER(br.bairro) = LOWER(cb.bairro)
      WHERE re."OperadorMatricula"::bigint = $1
        AND LOWER(re."Evento") = 'entrega'
        AND re."Data"::date = le."Data Emissão"
        AND le.status = 'Finalizado'
        AND re."Data"::date >= $2::date
        AND re."Data"::date <= $3::date
        AND (CASE WHEN mj.bonus_d0_motorista = true THEN mj.bonus_d0_valor ELSE COALESCE(br.bonus_d0, 0) END) > 0
        AND NOT EXISTS (SELECT 1 FROM acareacaojad a WHERE a."NCTE" = re."NCTE" AND LOWER(a.assunto) IN ('acareação', 'comprovante de entrega'))
    )
    SELECT
      d.data,
      COUNT(*)::int AS entregas_d0,
      SUM(d.bonus_d0)::numeric(10,2) AS valor_total
    FROM ctes_d0 d
    GROUP BY d.data
    ORDER BY d.data
  `, [matricula, inicio, fim]);

  const dias = result.rows;
  const totalEntregas = dias.reduce((s, d) => s + Number(d.entregas_d0), 0);
  const totalBonus = dias.reduce((s, d) => s + Number(d.valor_total), 0);
  const valorUnitarioMedio = totalEntregas > 0 ? totalBonus / totalEntregas : 0;

  return {
    dias,
    total_entregas: totalEntregas,
    total_bonus: totalBonus,
    valor_unitario_medio: Number(valorUnitarioMedio.toFixed(2)),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// NFS-e do motorista
// ─────────────────────────────────────────────────────────────────────────────

// Quinzenas fechadas (a partir do dia 16 ou do dia 01) em que a NF do saldo
// ainda não foi apresentada. É o que o app consulta a cada entrada para alertar.
export async function getPendenciasNfse(matricula) {
  const config = await getConfig();

  if (!config.exigir_nfse_adiantamento && !config.exigir_nfse_quinzena) {
    return { exigido: false, pendencias: [] };
  }

  const { rows: pendencias } = await pool.query(`
    SELECT
      mj.matricula,
      mj.quinzena_inicio,
      mj.quinzena_fim,
      (SELECT nf.id FROM notas_fiscais nf
        WHERE nf.tipo = 'quinzena' AND nf.matricula = mj.matricula
          AND nf.quinzena_inicio = mj.quinzena_inicio AND nf.quinzena_fim = mj.quinzena_fim
      ) AS nota_id,
      (SELECT nf.status_validacao FROM notas_fiscais nf
        WHERE nf.tipo = 'quinzena' AND nf.matricula = mj.matricula
          AND nf.quinzena_inicio = mj.quinzena_inicio AND nf.quinzena_fim = mj.quinzena_fim
      ) AS nota_status,
      (SELECT nf.chave_acesso FROM notas_fiscais nf
        WHERE nf.tipo = 'quinzena' AND nf.matricula = mj.matricula
          AND nf.quinzena_inicio = mj.quinzena_inicio AND nf.quinzena_fim = mj.quinzena_fim
      ) AS nota_chave,
      (SELECT nf.motivo FROM notas_fiscais nf
        WHERE nf.tipo = 'quinzena' AND nf.matricula = mj.matricula
          AND nf.quinzena_inicio = mj.quinzena_inicio AND nf.quinzena_fim = mj.quinzena_fim
      ) AS nota_motivo,
      (SELECT pq.status FROM pagamentos_quinzena pq
        WHERE pq.matricula = mj.matricula
          AND pq.quinzena_inicio = mj.quinzena_inicio AND pq.quinzena_fim = mj.quinzena_fim
      ) AS pagamento_status
    FROM (
      SELECT $1::bigint AS matricula, q.inicio AS quinzena_inicio, q.fim AS quinzena_fim
      FROM (
        SELECT
          CASE WHEN EXTRACT(DAY FROM le."Data Baixa"::date) <= 15
            THEN date_trunc('month', le."Data Baixa"::date)::date
            ELSE (date_trunc('month', le."Data Baixa"::date) + INTERVAL '15 days')::date
          END AS inicio,
          CASE WHEN EXTRACT(DAY FROM le."Data Baixa"::date) <= 15
            THEN (date_trunc('month', le."Data Baixa"::date) + INTERVAL '14 days')::date
            ELSE (date_trunc('month', le."Data Baixa"::date) + INTERVAL '1 month' - INTERVAL '1 day')::date
          END AS fim
        FROM lista_entregas le
        JOIN relatorioentrega_export re ON re."Lista" = le."Número"::text
        WHERE re."OperadorMatricula"::bigint = $1
          AND le.status = 'Finalizado'
          AND le."Data Baixa" IS NOT NULL
        GROUP BY 1, 2
      ) q
      -- A quinzena só é exigível depois de fechada (dia 16 ou dia 01).
      WHERE q.fim < CURRENT_DATE
    ) mj
    ORDER BY mj.quinzena_fim DESC
    LIMIT 3
  `, [matricula]);

  const lista = pendencias
    .filter((p) => !['confirmado'].includes(p.pagamento_status))
    .map((p) => ({
      matricula: Number(p.matricula),
      quinzena_inicio: p.quinzena_inicio,
      quinzena_fim: p.quinzena_fim,
      nota_id: p.nota_id,
      nota_status: p.nota_status,
      nota_chave: p.nota_chave,
      nota_motivo: p.nota_motivo,
      atendida: notaAtende({ status_validacao: p.nota_status }),
    }))
    .filter((p) => !p.atendida);

  return {
    exigido: true,
    exigir_adiantamento: config.exigir_nfse_adiantamento === true,
    exigir_quinzena: config.exigir_nfse_quinzena === true,
    cnpj_tomador: config.nfse_cnpj_tomador,
    pendencias: lista,
  };
}

// Motorista apresenta a chave de acesso da NFS-e do saldo da quinzena.
export async function enviarNfseQuinzena(matricula, { quinzenaInicio, quinzenaFim, chave }) {
  const config = await getConfig();

  if (!config.exigir_nfse_quinzena) {
    return { success: false, motivo: 'Este sistema não está exigindo NFS-e para o pagamento da quinzena.' };
  }

  if (!quinzenaInicio || !quinzenaFim) {
    return { success: false, motivo: 'Informe o período da quinzena.' };
  }

  const chaveLimpa = String(chave || '').replace(/\D/g, '');
  if (chaveLimpa.length !== 50) {
    return { success: false, motivo: 'A chave de acesso da NFS-e tem 50 dígitos.' };
  }

  const { rows: iguais } = await pool.query(
    `SELECT 1 FROM notas_fiscais WHERE chave_acesso = $1 AND matricula <> $2::bigint`,
    [chaveLimpa, matricula]
  );
  if (iguais.length > 0) {
    return { success: false, motivo: 'Esta NFS-e já foi apresentada por outro motorista.' };
  }

  // O valor esperado é o saldo líquido que será pago naquela quinzena.
  const { calcularValoresQuinzena } = await import('./paymentService.js');
  const valores = await calcularValoresQuinzena(matricula, quinzenaInicio, quinzenaFim);

  if (valores.total_pagar <= 0) {
    return {
      success: false,
      motivo: 'Esta quinzena não tem valor a pagar, portanto não cabe emitir NFS-e.',
    };
  }

  const resultado = await validarEregistrar({
    matricula,
    tipo: 'quinzena',
    quinzenaInicio,
    quinzenaFim,
    chave: chaveLimpa,
    valorEsperado: valores.total_pagar,
    dataReferencia: new Date(),
    config,
  });

  if (!resultado.ok) {
    return {
      success: false,
      status: resultado.status,
      motivo: mensagemParaMotorista(resultado),
      nf_motivo: resultado.motivo,
      nf_infra: resultado.infra === true,
    };
  }

  return {
    success: true,
    status: resultado.status,
    chave: resultado.chave,
    valor_esperado: Number(valores.total_pagar),
    motivo: 'NFS-e validada com sucesso. O pagamento da quinzena está liberado.',
  };
}

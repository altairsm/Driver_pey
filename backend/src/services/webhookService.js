import { randomUUID } from 'crypto';
import { pool } from '../db/index.js';

const WEBHOOK_URL_PADRAO = 'https://webhook.sactudo.com.br/webhook/Driver_Pix';
const TIMEOUT_MS = Number(process.env.WEBHOOK_TIMEOUT_MS) || 15_000;

export function webhookUrl() {
  return process.env.WEBHOOK_DRIVER_PIX_URL || WEBHOOK_URL_PADRAO;
}

export function chaveEstavel(tipo, entidade, entidade_id) {
  return `${tipo}-${entidade}-${entidade_id}`;
}

function normalizarResposta(data) {
  if (Array.isArray(data)) return data[0] || null;
  return data || null;
}

export async function registrarWebhookLog({ tipo, entidade, entidade_id, idempotency_key, payload, resposta, http_status, ok, erro }) {
  try {
    await pool.query(`
      INSERT INTO webhook_log (tipo, entidade, entidade_id, idempotency_key, payload, resposta, http_status, ok, erro)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9)
    `, [
      tipo,
      entidade,
      entidade_id ?? null,
      idempotency_key ?? null,
      JSON.stringify(payload ?? null),
      resposta ? JSON.stringify(resposta) : null,
      http_status ?? null,
      ok === true,
      erro ?? null,
    ]);
  } catch (err) {
    console.error('Falha ao gravar webhook_log:', err.message);
  }
}

export async function enviarWebhookDriverPix({ tipo, entidade, entidade_id, payload, idempotency_key }) {
  const chave = idempotency_key || randomUUID();
  const body = { tipo, solicitacao_id: entidade_id ?? null, idempotency_key: chave, ...payload };

  let resposta = null;
  let httpStatus = null;
  let erro = null;
  let ok = false;

  try {
    const res = await fetch(webhookUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    httpStatus = res.status;
    const text = await res.text();
    let parsed = null;
    if (text) {
      try { parsed = JSON.parse(text); } catch { parsed = null; }
    }
    resposta = parsed;
    ok = res.ok;

    if (!res.ok) {
      erro = `HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ''}`;
    } else if (!parsed) {
      erro = 'Resposta do webhook não é JSON válido';
    }
  } catch (err) {
    const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    erro = timedOut ? `Timeout após ${TIMEOUT_MS}ms` : (err?.message || 'Falha de rede ao contatar o webhook');
    console.error(`Webhook ${tipo} error:`, err.message);
  }

  await registrarWebhookLog({
    tipo,
    entidade,
    entidade_id,
    idempotency_key: chave,
    payload: body,
    resposta,
    http_status: httpStatus,
    ok,
    erro,
  });

  const data = normalizarResposta(resposta);
  const estado = ok && data ? (data.estado || null) : null;

  return {
    ok,
    httpStatus,
    estado,
    data,
    erro,
    idempotency_key: chave,
    enviado_em: new Date().toISOString(),
  };
}

export function decidirStatus({ ok, estado }) {
  if (!ok || !estado) {
    return { status: 'erro_webhook', sucesso: false, mensagem: 'Falha ao contatar o webhook do Pix — solicitação mantida em aberto' };
  }
  if (estado === 'FINALIZADO') {
    return { status: 'aprovado', sucesso: true, mensagem: 'Pagamento confirmado via Pix' };
  }
  if (estado === 'EM_PROCESSAMENTO') {
    return { status: 'processando_pix', sucesso: true, mensagem: 'Pagamento em processamento — aguarde confirmação' };
  }
  return { status: 'pix_rejeitado', sucesso: false, mensagem: 'Pagamento rejeitado pelo Pix' };
}

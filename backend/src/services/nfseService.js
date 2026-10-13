import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import https from 'node:https';
import { pool } from '../db/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// Configuração da API nacional do nfse.gov.br
//
// A consulta oficial de NFS-e (GET /nfse/{chave}) exige TLS com autenticação
// mútua usando certificado ICP-Brasil A1/A3 e, para devolver o documento, o CNPJ
// do certificado precisa ser um dos atores da nota (Prestador / Tomador /
// Intermediário). Como a transportadora é o Tomador, o A1 dela enxerga a nota.
//
// Os hosts ficam em env para permitir ajuste sem novo deploy caso ogov.br mude
// a rota ou o ambiente.
// ─────────────────────────────────────────────────────────────────────────────
const AMBIENTES = {
  producao_restrita: process.env.NFSE_API_BASE_HOMOLOGACAO || 'https://sefin.producaorestrita.nfse.gov.br',
  producao: process.env.NFSE_API_BASE_PRODUCAO || 'https://sefin.nfse.gov.br',
};

const TIMEOUT_MS = Number(process.env.NFSE_TIMEOUT_MS) || 20_000;

// ─────────────────────────────────────────────────────────────────────────────
// Criptografia em repouso do certificado (A1) e da senha
// ─────────────────────────────────────────────────────────────────────────────
// A chave vem de NFSE_MASTER_KEY (64 hex = 32 bytes). Se não estiver definida,
// deriva de JWT_SECRET para o sistema funcionar sem configuração extra — mas
// trocar o JWT_SECRET passa a inutilizar o certificado guardado.
function masterKey() {
  const hex = (process.env.NFSE_MASTER_KEY || '').trim();
  if (/^[0-9a-f]{64}$/i.test(hex)) return Buffer.from(hex, 'hex');

  const segredo = process.env.JWT_SECRET || 'driver-pey-secret-key-2026';
  return scryptSync(segredo, 'nfse:master:v1', 32);
}

function cifra(texto) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', masterKey(), iv);
  const dados = Buffer.concat([c.update(Buffer.from(texto, 'utf8')), c.final()]);
  return [iv.toString('base64'), c.getAuthTag().toString('base64'), dados.toString('base64')].join('.');
}

function decifra(blob) {
  const [ivB64, tagB64, dadosB64] = String(blob).split('.');
  if (!ivB64 || !tagB64 || !dadosB64) throw new Error('Credencial criptografada corrompida');
  const d = createDecipheriv('aes-256-gcm', masterKey(), Buffer.from(ivB64, 'base64'));
  d.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([d.update(Buffer.from(dadosB64, 'base64')), d.final()]).toString('utf8');
}

function usandoChaveDerivada() {
  return !/^[0-9a-f]{64}$/i.test((process.env.NFSE_MASTER_KEY || '').trim());
}

export async function salvarCredencial({ arquivoBase64, senha, cnpjTitular, criadoPor }) {
  const pfx = Buffer.from(String(arquivoBase64), 'base64');
  if (pfx.length < 100) throw new Error('Arquivo do certificado inválido ou vazio');
  if (!senha) throw new Error('Senha do certificado é obrigatória');

  await pool.query(`
    INSERT INTO credenciais_nfse (id, cnpj_titular, arquivo_criptografado, senha_criptografada, criado_por, atualizado_em)
    VALUES (1, $1, $2, $3, $4, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO UPDATE SET
      cnpj_titular = EXCLUDED.cnpj_titular,
      arquivo_criptografado = EXCLUDED.arquivo_criptografado,
      senha_criptografada = EXCLUDED.senha_criptografada,
      criado_por = EXCLUDED.criado_por,
      atualizado_em = CURRENT_TIMESTAMP
  `, [
    (cnpjTitular || '').replace(/\D/g, '') || null,
    cifra(pfx.toString('base64')),
    cifra(String(senha)),
    criadoPor || null,
  ]);

  return { ok: true, chave_derivada: usandoChaveDerivada() };
}

export async function statusCredencial() {
  const { rows } = await pool.query(`
    SELECT cnpj_titular, criado_em, atualizado_em,
           length(arquivo_criptografado) AS tamanho
    FROM credenciais_nfse WHERE id = 1
  `);
  const c = rows[0];
  if (!c) return { configurada: false, aviso_chave: usandoChaveDerivada() };
  return {
    configurada: true,
    cnpj_titular: c.cnpj_titular,
    criado_em: c.criado_em,
    atualizado_em: c.atualizado_em,
    tamanho_certificado: Number(c.tamanho) || 0,
    aviso_chave: usandoChaveDerivada(),
  };
}

export async function apagarCredencial() {
  const r = await pool.query('DELETE FROM credenciais_nfse WHERE id = 1');
  return { ok: r.rowCount > 0 };
}

async function obterCredencial() {
  const { rows } = await pool.query('SELECT arquivo_criptografado, senha_criptografada FROM credenciais_nfse WHERE id = 1');
  if (rows.length === 0) return null;
  const pfx = Buffer.from(decifra(rows[0].arquivo_criptografado), 'base64');
  const senha = decifra(rows[0].senha_criptografada);
  return { pfx, passphrase: senha };
}

// ─────────────────────────────────────────────────────────────────────────────
// Parser do XML da NFS-e (padrão nacional)
// ─────────────────────────────────────────────────────────────────────────────
const semPrefixo = (tag) => `<(?:[A-Za-z0-9_]+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[A-Za-z0-9_]+:)?${tag}>`;

function tag(xml, nome) {
  const m = String(xml).match(new RegExp(semPrefixo(nome), 'i'));
  return m ? m[1].trim() : null;
}

function bloco(xml, nome) {
  return tag(xml, nome);
}

function soDigitos(v) {
  return (v || '').replace(/\D/g, '');
}

function paraData(v) {
  if (!v) return null;
  const iso = String(v).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const br = String(v).match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Extrai prestador/tomador/valor/data do XML da NFS-e.
// Suporta o leiaute nacional (<prestador>/<tomador>/<servico><trib><vServ>) e o
// leiaute municipal legado (<emit>/<dest>/vNF).
export function parseNfse(xml) {
  if (!xml || typeof xml !== 'string') return null;

  const id = String(xml).match(/Id="(NFS[^"]+)"/i);
  const chave = id ? id[1].replace(/^NFS/i, '') : null;

  const prestador = bloco(xml, 'prestador') || bloco(xml, 'emit') || '';
  const tomador = bloco(xml, 'tomador') || bloco(xml, 'dest') || '';

  const trib = bloco(xml, 'trib') || '';
  const servico = bloco(xml, 'servico') || bloco(xml, 'detServ') || '';
  const valorBruto =
    tag(trib, 'vServ') || tag(servico, 'vServ') || tag(xml, 'vLiq') ||
    tag(xml, 'vServicos') || tag(xml, 'vNF') || tag(xml, 'vValorServicos');

  const tempo = bloco(xml, 'tempo') || '';
  const dataEmissao = tag(tempo, 'dhEmi') || tag(xml, 'dhEmi') || tag(xml, 'DtEmi') || tag(xml, 'dtEmi');

  const cStat = tag(xml, 'cStat') || tag(xml, 'cSit');

  return {
    chave,
    cStat: cStat === null ? null : Number(cStat),
    valor: valorBruto === null ? null : Number(String(valorBruto).replace(',', '.')),
    dataEmissao: paraData(dataEmissao),
    cpfPrestador: soDigitos(tag(prestador, 'CPF')),
    cnpjPrestador: soDigitos(tag(prestador, 'CNPJ')),
    cnpjTomador: soDigitos(tag(tomador, 'CNPJ')),
    cpfTomador: soDigitos(tag(tomador, 'CPF')),
    nomePrestador: tag(prestador, 'xNome'),
    nomeTomador: tag(tomador, 'xNome'),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Consulta oficial (mTLS)
// ─────────────────────────────────────────────────────────────────────────────
function extrairXmlDeJson(json) {
  const chaves = ['xmlNfse', 'xml', 'nfse', 'xmlNFS', 'compNfse'];
  for (const k of chaves) {
    if (typeof json?.[k] === 'string' && json[k].includes('<')) return json[k];
  }
  return null;
}

function consultarApi(chave, ambiente, credencial) {
  return new Promise((resolve, reject) => {
    const base = AMBIENTES[ambiente] || AMBIENTES.producao_restrita;
    const url = `${base.replace(/\/$/, '')}/nfse/${chave}`;

    const req = https.request(url, {
      method: 'GET',
      pfx: credencial.pfx,
      passphrase: credencial.passphrase,
      rejectUnauthorized: true,
      headers: { Accept: 'application/xml, application/json', 'Accept-Encoding': 'gzip' },
      timeout: TIMEOUT_MS,
    }, (res) => {
      const pedacos = [];
      res.on('data', (c) => pedacos.push(c));
      res.on('end', () => {
        const bruto = Buffer.concat(pedacos);
        let corpo;
        try {
          corpo = res.headers['content-encoding'] === 'gzip' ? gunzipSync(bruto).toString('utf8') : bruto.toString('utf8');
        } catch {
          corpo = bruto.toString('utf8');
        }
        resolve({ statusCode: res.statusCode, corpo });
      });
    });

    req.on('timeout', () => req.destroy(new Error(`Tempo esgotado após ${TIMEOUT_MS}ms`)));
    req.on('error', reject);
    req.end();
  });
}

// Consulta a NFS-e no ambiente nacional e devolve o XML.
// `infra: true` indica falha do NOSSO lado (certificado ausente, rede, 5xx) — que
// não deve ser atribuída ao motorista. 404/403 são respostas legítimas da API.
export async function consultarNota(chave, ambiente) {
  const credencial = await obterCredencial();
  if (!credencial) {
    return { encontrado: false, infra: true, erro: 'Certificado digital não configurado no sistema' };
  }

  let resposta;
  try {
    resposta = await consultarApi(chave, ambiente, credencial);
  } catch (err) {
    return { encontrado: false, infra: true, erro: `Falha de comunicação com o nfse.gov.br: ${err.message}` };
  }

  const { statusCode, corpo } = resposta;

  if (statusCode === 404) return { encontrado: false, infra: false, erro: 'NFS-e não encontrada no sistema nacional' };
  if (statusCode === 401 || statusCode === 403) {
    return {
      encontrado: false,
      infra: true,
      erro: 'Certificado não autorizado a consultar esta NFS-e (o CNPJ do certificado precisa ser ator da nota: Prestador, Tomador ou Intermediário)',
    };
  }
  if (statusCode === 429) return { encontrado: false, infra: true, erro: 'Muitas consultas seguidas — tente novamente em instantes' };
  if (statusCode < 200 || statusCode >= 300) {
    return { encontrado: false, infra: true, erro: `nfse.gov.br respondeu HTTP ${statusCode}` };
  }

  const xml = corpo.trim().startsWith('<') ? corpo : extrairXmlDeJson(JSON.parse(corpo));
  if (!xml) return { encontrado: false, infra: true, erro: 'Resposta do nfse.gov.br sem XML da NFS-e' };

  return { encontrado: true, xml };
}

// ─────────────────────────────────────────────────────────────────────────────
// Regra de validação (função pura — sem I/O)
// ─────────────────────────────────────────────────────────────────────────────
export function validarNota({ nota, config, cpf, cnpjMei, valorEsperado, dataReferencia }) {
  const motivos = [];
  const tolValor = Number(config.nfse_tolerancia_valor || 0);
  const tolDias = Number(config.nfse_tolerancia_dias || 0);
  const cnpjTomadorEsperado = soDigitos(config.nfse_cnpj_tomador || '');

  if (!nota) {
    return { ok: false, status: 'nao_encontrada', motivo: 'NFS-e não encontrada' };
  }

  // 1. Situação: cStat 1 = gerada com sucesso
  if (nota.cStat !== null && nota.cStat !== 1) {
    motivos.push(`NFS-e com situação ${nota.cStat} (só é aceita a nota gerada com sucesso, cStat=1)`);
  }

  // 2. Tomador = transportadora
  if (!cnpjTomadorEsperado) {
    motivos.push('CNPJ da transportadora (tomador) não configurado no sistema');
  } else if (soDigitos(nota.cnpjTomador) !== cnpjTomadorEsperado && soDigitos(nota.cpfTomador) === '') {
    motivos.push(`Tomador da NF é ${nota.cnpjTomador || nota.cpfTomador || 'não informado'}, mas a transportadora é ${cnpjTomadorEsperado}`);
  }

  // 3. Prestador = motorista (CPF ou CNPJ do MEI)
  const cpfLimpo = soDigitos(cpf || '');
  const cnpjMeiLimpo = soDigitos(cnpjMei || '');
  const prestadorOk =
    (cpfLimpo && nota.cpfPrestador === cpfLimpo) ||
    (cnpjMeiLimpo && nota.cnpjPrestador === cnpjMeiLimpo);

  if (!prestadorOk) {
    const emitente = nota.cnpjPrestador || nota.cpfPrestador || 'não informado';
    const esperado = cnpjMeiLimpo
      ? `CPF ${cpfLimpo || '-'} ou CNPJ ${cnpjMeiLimpo}`
      : `CPF ${cpfLimpo || 'não informado'}`;
    motivos.push(`Prestador da NF é ${emitente}, mas o motorista consta como ${esperado}`);
  }

  // 4. Valor
  const alvo = Number(valorEsperado || 0);
  if (nota.valor === null || Number.isNaN(nota.valor)) {
    motivos.push('Não foi possível ler o valor da NFS-e');
  } else if (alvo > 0 && Math.abs(nota.valor - alvo) > tolValor + 0.001) {
    motivos.push(
      `Valor da NF é R$ ${nota.valor.toFixed(2)} e o valor do pagamento é R$ ${alvo.toFixed(2)} ` +
      `(diferença R$ ${Math.abs(nota.valor - alvo).toFixed(2)}, tolerância R$ ${tolValor.toFixed(2)})`
    );
  }

  // 5. Data de emissão dentro da tolerância
  if (!nota.dataEmissao) {
    motivos.push('Não foi possível ler a data de emissão da NFS-e');
  } else if (dataReferencia && tolDias > 0) {
    const diffDias = Math.abs(Math.round((nota.dataEmissao - dataReferencia) / 86400000));
    if (diffDias > tolDias) {
      motivos.push(
        `Data da NF (${formatarData(nota.dataEmissao)}) está a ${diffDias} dias de ${formatarData(dataReferencia)} ` +
        `(tolerância ${tolDias} dias)`
      );
    }
  }

  if (motivos.length > 0) return { ok: false, status: 'invalida', motivo: motivos.join(' · ') };
  return { ok: true, status: 'valida', motivo: null };
}

function formatarData(d) {
  if (!d) return '—';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fluxo completo: consulta + valida + registra
// ─────────────────────────────────────────────────────────────────────────────
export async function validarEregistrar({ matricula, tipo, solicitacaoId = null, quinzenaInicio = null, quinzenaFim = null, chave, valorEsperado, dataReferencia, config }) {
  const chaveLimpa = String(chave || '').replace(/\D/g, '');

  if (chaveLimpa.length !== 50) {
    return { ok: false, status: 'invalida', chave: chaveLimpa, motivo: 'Chave de acesso da NFS-e deve ter 50 dígitos' };
  }

  const { rows: linhasDriver } = await pool.query(
    `SELECT cpf, cnpj_mei FROM matriculos_jad WHERE "OperadorMatricula"::bigint = $1`,
    [matricula]
  );
  const driver = linhasDriver[0] || {};

  const consulta = await consultarNota(chaveLimpa, config.nfse_ambiente);

  let nota = null;
  if (consulta.encontrado) {
    try {
      nota = parseNfse(consulta.xml);
    } catch {
      nota = null;
    }
  }

  const resultado = consulta.encontrado
    ? validarNota({ nota, config, cpf: driver.cpf, cnpjMei: driver.cnpj_mei, valorEsperado, dataReferencia })
    : consulta.infra
      // Falha nossa (certificado/rede/5xx): não é culpa da nota nem do motorista.
      ? { ok: false, status: 'erro_consulta', motivo: consulta.erro }
      : { ok: false, status: 'nao_encontrada', motivo: consulta.erro };

  const { rows: existente } = await pool.query(
    'SELECT id FROM notas_fiscais WHERE chave_acesso = $1',
    [chaveLimpa]
  );

  const valores = [
    matricula, tipo, solicitacaoId, quinzenaInicio, quinzenaFim, chaveLimpa,
    nota?.valor ?? null, nota?.dataEmissao ?? null,
    nota?.cpfPrestador || null, nota?.cnpjPrestador || null, nota?.cnpjTomador || null,
    nota?.cStat !== null && nota?.cStat !== undefined ? String(nota.cStat) : null,
    resultado.status, resultado.motivo, consulta.encontrado ? consulta.xml : null,
  ];

  if (existente.length > 0) {
    await pool.query(`
      UPDATE notas_fiscais SET
        matricula = $1, tipo = $2, solicitacao_id = $3, quinzena_inicio = $4, quinzena_fim = $5,
        valor_nf = $6, data_emissao = $7, cpf_prestador = $8, cnpj_prestador = $9,
        cnpj_tomador = $10, situacao = $11, status_validacao = $12, motivo = $13, xml = $14,
        consultado_em = CURRENT_TIMESTAMP
      WHERE id = $15
    `, [...valores, existente[0].id]);
  } else {
    await pool.query(`
      INSERT INTO notas_fiscais
        (matricula, tipo, solicitacao_id, quinzena_inicio, quinzena_fim, chave_acesso,
         valor_nf, data_emissao, cpf_prestador, cnpj_prestador, cnpj_tomador,
         situacao, status_validacao, motivo, xml, consultado_em)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, CURRENT_TIMESTAMP)
    `, valores);
  }

  return { ...resultado, chave: chaveLimpa, infra: resultado.status === 'erro_consulta' };
}

// Mensagem mostrada ao MOTORISTA. Falhas de infraestrutura do servidor não são
// atribuídas a ele: recebe um aviso genérico para tentar mais tarde.
export function mensagemParaMotorista(resultado) {
  if (resultado.status === 'erro_consulta') {
    console.error('[NFse] falha de infraestrutura ao consultar a nota:', resultado.motivo);
    return 'Não foi possível consultar a NFS-e no sistema nacional agora. Tente novamente em alguns minutos — se persistir, avise o administrador.';
  }
  return `NFS-e não validada: ${resultado.motivo}`;
}

export async function liberarNota(id, { justificativa, usuario }) {
  if (!justificativa || String(justificativa).trim().length < 5) {
    return { ok: false, motivo: 'Justificativa é obrigatória' };
  }
  const { rows } = await pool.query(`
    UPDATE notas_fiscais
    SET status_validacao = 'liberada_admin', liberado_por = $1, liberado_em = CURRENT_TIMESTAMP,
        justificativa = $2, motivo = COALESCE(motivo, '') || ' · Liberado pelo admin'
    WHERE id = $3
    RETURNING id, chave_acesso, matricula, tipo
  `, [usuario || null, String(justificativa).trim(), id]);

  if (rows.length === 0) return { ok: false, motivo: 'Nota fiscal não encontrada' };
  return { ok: true, nota: rows[0] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Consultas usadas no gating e nas telas
// ─────────────────────────────────────────────────────────────────────────────
export async function notaDoAdiantamento(solicitacaoId) {
  const { rows } = await pool.query(
    `SELECT id, chave_acesso, status_validacao, motivo, valor_nf, data_emissao,
            justificativa, liberado_por, liberado_em
     FROM notas_fiscais WHERE tipo = 'adiantamento' AND solicitacao_id = $1`,
    [solicitacaoId]
  );
  return rows[0] || null;
}

export async function notaDaQuinzena(matricula, inicio, fim) {
  const { rows } = await pool.query(
    `SELECT id, chave_acesso, status_validacao, motivo, valor_nf, data_emissao, justificativa, liberado_por
     FROM notas_fiscais WHERE tipo = 'quinzena' AND matricula = $2
       AND quinzena_inicio = $1::date AND quinzena_fim = $3::date`,
    [inicio, matricula, fim]
  );
  return rows[0] || null;
}

// Considera liberada pelo admin como válida para fins de pagamento.
export function notaAtende(nota) {
  return !!nota && (nota.status_validacao === 'valida' || nota.status_validacao === 'liberada_admin');
}

export async function statusNfsePorSolicitacoes(ids) {
  if (!ids.length) return new Map();
  const { rows } = await pool.query(
    `SELECT solicitacao_id, chave_acesso, status_validacao, motivo
     FROM notas_fiscais WHERE tipo = 'adiantamento' AND solicitacao_id = ANY($1::int[])`,
    [ids]
  );
  return new Map(rows.map((r) => [r.solicitacao_id, r]));
}

export async function statusNfsePorQuinzena(inicio, fim) {
  const { rows } = await pool.query(
    `SELECT matricula, chave_acesso, status_validacao, motivo
     FROM notas_fiscais WHERE tipo = 'quinzena' AND quinzena_inicio = $1::date AND quinzena_fim = $2::date`,
    [inicio, fim]
  );
  return new Map(rows.map((r) => [Number(r.matricula), r]));
}

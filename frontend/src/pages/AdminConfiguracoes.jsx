import { useState, useEffect } from 'react';
import { getConfig, updateConfig, getCredencialNfse, salvarCredencialNfse, apagarCredencialNfse } from '../services/api';
import Topbar from '../components/Topbar';

function formatCnpj(v) {
  const d = (v || '').replace(/\D/g, '').slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export default function AdminConfiguracoes() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const [credencial, setCredencial] = useState(null);
  const [certArquivo, setCertArquivo] = useState(null);
  const [certSenha, setCertSenha] = useState('');
  const [certCnpj, setCertCnpj] = useState('');
  const [salvandoCert, setSalvandoCert] = useState(false);
  const [msgCert, setMsgCert] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [data, cert] = await Promise.all([
          getConfig(),
          getCredencialNfse().catch(() => null),
        ]);
        setConfig(data);
        setCertCnpj(formatCnpj(data?.nfse_cnpj_tomador || ''));
        setCredencial(cert);
      } catch {
        setMsg('Erro ao carregar configurações');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      const updated = await updateConfig({
        dias_uteis_pagamento: Number(config.dias_uteis_pagamento),
        eficiencia_minima_adiantamento: Number(config.eficiencia_minima_adiantamento),
        multa_reclamacao: Number(config.multa_reclamacao),
        valor_maximo_adiantamento: Number(config.valor_maximo_adiantamento),
        exigir_nfse_adiantamento: config.exigir_nfse_adiantamento === true || config.exigir_nfse_adiantamento === 'true',
        exigir_nfse_quinzena: config.exigir_nfse_quinzena === true || config.exigir_nfse_quinzena === 'true',
        nfse_cnpj_tomador: (config.nfse_cnpj_tomador || '').replace(/\D/g, ''),
        nfse_tolerancia_dias: Number(config.nfse_tolerancia_dias),
        nfse_tolerancia_valor: Number(config.nfse_tolerancia_valor),
        nfse_ambiente: config.nfse_ambiente,
      });
      setConfig(updated);
      setMsg('Configurações salvas com sucesso!');
    } catch {
      setMsg('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleCertFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCertArquivo(reader.result); // data URL (base64)
    reader.readAsDataURL(file);
    setMsgCert('');
  };

  const handleSalvarCert = async () => {
    if (!certArquivo || !certSenha) {
      setMsgCert('Selecione o arquivo .pfx e informe a senha.');
      return;
    }
    setSalvandoCert(true);
    setMsgCert('');
    try {
      // dataURL -> base64 puro
      const base64 = String(certArquivo).split(',')[1];
      const r = await salvarCredencialNfse({
        arquivo_base64: base64,
        senha: certSenha,
        cnpj_titular: (certCnpj || '').replace(/\D/g, ''),
      });
      setMsgCert('Certificado salvo e criptografado com sucesso.');
      if (r?.aviso) setMsgCert(`Certificado salvo. Atenção: ${r.aviso}`);
      setCertArquivo(null);
      setCertSenha('');
      setCredencial(await getCredencialNfse());
    } catch (e) {
      setMsgCert(e.response?.data?.error || 'Erro ao salvar o certificado');
    } finally {
      setSalvandoCert(false);
    }
  };

  const handleApagarCert = async () => {
    setSalvandoCert(true);
    try {
      await apagarCredencialNfse();
      setCredencial(await getCredencialNfse());
      setMsgCert('Certificado removido.');
    } catch {
      setMsgCert('Erro ao remover o certificado');
    } finally {
      setSalvandoCert(false);
    }
  };

  const check = (v) => v === true || v === 'true';

  if (loading) return <div style={s.container}><Topbar user={{ nome: 'Admin' }} /><div style={s.content}><p style={{ color: '#6b7280' }}>Carregando...</p></div></div>;

  return (
    <div style={s.container}>
      <Topbar user={{ nome: 'Admin' }} />
      <div style={s.content}>
        <h2 style={s.title}>Configurações do Sistema</h2>

        <div style={s.card}>
          <div style={s.field}>
            <label style={s.label}>Dias úteis para pagamento após fechamento da quinzena</label>
            <input
              type="number"
              min="1"
              max="30"
              value={config.dias_uteis_pagamento}
              onChange={e => handleChange('dias_uteis_pagamento', e.target.value)}
              style={s.input}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Eficiência mínima (%) para solicitar adiantamento</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={config.eficiencia_minima_adiantamento}
              onChange={e => handleChange('eficiencia_minima_adiantamento', e.target.value)}
              style={s.input}
            />
          </div>

          <div style={{ ...s.field, borderTop: '1px solid #2a2f3e', paddingTop: 16 }}>
            <label style={s.label}>Multa por reclamação pós-adiantamento (R$) — valor abatido na quinzena</label>
            <input
              type="number"
              min="0"
              max="9999"
              step="0.01"
              value={config.multa_reclamacao}
              onChange={e => handleChange('multa_reclamacao', e.target.value)}
              style={s.input}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Valor máximo para adiantamento (R$) — limite por lista</label>
            <input
              type="number"
              min="0"
              max="9999"
              step="0.01"
              value={config.valor_maximo_adiantamento}
              onChange={e => handleChange('valor_maximo_adiantamento', e.target.value)}
              style={s.input}
            />
          </div>

          <button onClick={handleSave} disabled={saving} style={s.btn}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>

          {msg && (
            <div style={{ ...s.msg, color: msg.includes('sucesso') ? '#3de8a0' : '#ff5a5a' }}>
              {msg}
            </div>
          )}
        </div>

        {/* ── NFS-e Nacional ── */}
        <h3 style={{ ...s.title, fontSize: '1.4rem', marginTop: 32 }}>NFS-e Nacional (nfse.gov.br)</h3>
        <p style={{ color: '#9ca3af', fontSize: '0.82rem', marginTop: -8, marginBottom: 16 }}>
          Quando ativado, o pagamento só é liberado se o motorista apresentar uma NFS-e emitida em seu nome
          (Prestador) para a transportadora (Tomador), com valor e data compatíveis. A nota é consultada
          diretamente na API oficial usando o certificado digital abaixo.
        </p>

        <div style={s.card}>
          <div style={s.toggleRow}>
            <input
              id="exigir_adiantamento"
              type="checkbox"
              checked={check(config.exigir_nfse_adiantamento)}
              onChange={e => handleChange('exigir_nfse_adiantamento', e.target.checked)}
              style={s.checkbox}
            />
            <label htmlFor="exigir_adiantamento" style={s.toggleLabel}>
              Exigir NFS-e para <strong>adiantamento</strong>
              <span style={s.toggleHint}>A nota é validada no valor bruto solicitado (antes da taxa).</span>
            </label>
          </div>

          <div style={s.toggleRow}>
            <input
              id="exigir_quinzena"
              type="checkbox"
              checked={check(config.exigir_nfse_quinzena)}
              onChange={e => handleChange('exigir_nfse_quinzena', e.target.checked)}
              style={s.checkbox}
            />
            <label htmlFor="exigir_quinzena" style={s.toggleLabel}>
              Exigir NFS-e para <strong>saldo da quinzena</strong>
              <span style={s.toggleHint}>A nota do saldo deve cobrir o valor líquido a pagar.</span>
            </label>
          </div>

          <div style={s.field}>
            <label style={s.label}>CNPJ da transportadora (Tomador da NFS-e)</label>
            <input
              type="text"
              value={formatCnpj(config.nfse_cnpj_tomador || '')}
              onChange={e => setConfig(prev => ({ ...prev, nfse_cnpj_tomador: e.target.value }))}
              style={s.input}
              placeholder="40.413.463/0001-08"
            />
          </div>

          <div style={s.fieldRow}>
            <div style={{ ...s.field, flex: 1 }}>
              <label style={s.label}>Tolerância de data (dias)</label>
              <input
                type="number"
                min="0"
                max="120"
                value={config.nfse_tolerancia_dias}
                onChange={e => handleChange('nfse_tolerancia_dias', e.target.value)}
                style={s.input}
              />
            </div>
            <div style={{ ...s.field, flex: 1 }}>
              <label style={s.label}>Tolerância de valor (R$)</label>
              <input
                type="number"
                min="0"
                max="9999"
                step="0.01"
                value={config.nfse_tolerancia_valor}
                onChange={e => handleChange('nfse_tolerancia_valor', e.target.value)}
                style={s.input}
              />
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Ambiente da consulta</label>
            <select
              value={config.nfse_ambiente}
              onChange={e => handleChange('nfse_ambiente', e.target.value)}
              style={s.input}
            >
              <option value="producao_restrita">Produção restrita (homologação)</option>
              <option value="producao">Produção</option>
            </select>
          </div>

          <button onClick={handleSave} disabled={saving} style={s.btn}>
            {saving ? 'Salvando...' : 'Salvar configurações da NFS-e'}
          </button>

          {msg && (
            <div style={{ ...s.msg, color: msg.includes('sucesso') ? '#3de8a0' : '#ff5a5a' }}>
              {msg}
            </div>
          )}
        </div>

        {/* ── Certificado digital ── */}
        <h3 style={{ ...s.title, fontSize: '1.4rem', marginTop: 32 }}>Certificado Digital (A1)</h3>
        <p style={{ color: '#9ca3af', fontSize: '0.82rem', marginTop: -8, marginBottom: 16 }}>
          Necessário para consultar a NFS-e na API oficial. O arquivo e a senha são gravados
          <strong> criptografados</strong> (AES-256-GCM) e nunca aparecem em log ou resposta da API.
        </p>

        <div style={s.card}>
          <div style={{ ...s.msg, ...s.certStatus, color: credencial?.configurada ? '#3de8a0' : '#ff9f40' }}>
            {credencial?.configurada
              ? `Certificado configurado${credencial.cnpj_titular ? ` (CNPJ ${formatCnpj(credencial.cnpj_titular)})` : ''} — atualizado em ${new Date(credencial.atualizado_em).toLocaleString('pt-BR')}`
              : 'Nenhum certificado configurado. Sem ele, a validação de NFS-e não funciona.'}
          </div>

          {credencial?.aviso_chave && (
            <div style={{ ...s.msg, color: '#f0c040' }}>
              Aviso: NFSE_MASTER_KEY não está definida no ambiente. A chave de criptografia foi derivada do
              JWT_SECRET — se ele mudar, o certificado gravado não poderá mais ser lido.
            </div>
          )}

          <div style={s.field}>
            <label style={s.label}>Arquivo do certificado (.pfx / .p12)</label>
            <input type="file" accept=".pfx,.p12" onChange={handleCertFile} style={s.file} />
            {certArquivo && <div style={s.fileOk}>Arquivo selecionado: {certArquivo.length} bytes (base64)</div>}
          </div>

          <div style={s.fieldRow}>
            <div style={{ ...s.field, flex: 1 }}>
              <label style={s.label}>Senha do certificado</label>
              <input
                type="password"
                value={certSenha}
                onChange={e => setCertSenha(e.target.value)}
                style={s.input}
                autoComplete="new-password"
              />
            </div>
            <div style={{ ...s.field, flex: 1 }}>
              <label style={s.label}>CNPJ do titular (opcional)</label>
              <input
                type="text"
                value={certCnpj}
                onChange={e => setCertCnpj(formatCnpj(e.target.value))}
                style={s.input}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={handleSalvarCert} disabled={salvandoCert} style={s.btn}>
              {salvandoCert ? 'Salvando...' : 'Salvar certificado'}
            </button>
            {credencial?.configurada && (
              <button onClick={handleApagarCert} disabled={salvandoCert} style={{ ...s.btn, ...s.btnDanger }}>
                Remover certificado
              </button>
            )}
          </div>

          {msgCert && (
            <div style={{ ...s.msg, color: msgCert.includes('sucesso') || msgCert.includes('removido') ? '#3de8a0' : '#ff5a5a' }}>
              {msgCert}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  container: {
    minHeight: '100vh',
    background: '#0d0f14',
    color: '#e8eaf0',
    fontFamily: "'IBM Plex Sans', sans-serif",
  },
  content: {
    maxWidth: 640,
    margin: '0 auto',
    padding: '32px 24px',
  },
  title: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '1.8rem',
    letterSpacing: '2px',
    color: '#f0c040',
    marginBottom: 24,
  },
  card: {
    background: '#161920',
    border: '1px solid #2a2f3e',
    borderRadius: 8,
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: '0.82rem',
    color: '#9ca3af',
  },
  input: {
    background: '#1e2230',
    border: '1px solid #2a2f3e',
    borderRadius: 4,
    color: '#e8eaf0',
    padding: '10px 14px',
    fontSize: '1rem',
    fontFamily: "'IBM Plex Mono', monospace",
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  btn: {
    background: '#1a3a2a',
    border: '1px solid #3de8a0',
    color: '#3de8a0',
    padding: '12px 24px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontFamily: "'IBM Plex Mono', monospace",
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  msg: {
    fontSize: '0.85rem',
    fontFamily: "'IBM Plex Mono', monospace",
    padding: '8px 12px',
    borderRadius: 4,
    background: '#1a1a1a',
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '10px 12px',
    background: '#1a1e2a',
    border: '1px solid #2a2f3e',
    borderRadius: 6,
  },
  checkbox: {
    width: 18,
    height: 18,
    marginTop: 2,
    accentColor: '#3de8a0',
    cursor: 'pointer',
    flexShrink: 0,
  },
  toggleLabel: {
    fontSize: '0.9rem',
    color: '#e8eaf0',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  toggleHint: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  fieldRow: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap',
  },
  file: {
    background: '#1e2230',
    border: '1px solid #2a2f3e',
    borderRadius: 4,
    color: '#9ca3af',
    padding: '10px 12px',
    fontSize: '0.82rem',
    fontFamily: "'IBM Plex Mono', monospace",
    width: '100%',
    boxSizing: 'border-box',
  },
  fileOk: {
    fontSize: '0.72rem',
    color: '#3de8a0',
    fontFamily: "'IBM Plex Mono', monospace",
    marginTop: 6,
  },
  certStatus: {
    fontSize: '0.85rem',
  },
  btnDanger: {
    background: '#2a1a1a',
    border: '1px solid #ff5a5a',
    color: '#ff5a5a',
  },
};

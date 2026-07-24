import { useState, useEffect } from 'react';
import { getConfig, updateConfig } from '../services/api';
import Topbar from '../components/Topbar';

export default function AdminConfiguracoes() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await getConfig();
        setConfig(data);
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
        valor_maximo_adiantamento: Number(config.valor_maximo_adiantamento),
        smtp_host: config.smtp_host || '',
        smtp_port: Number(config.smtp_port) || 587,
        smtp_user: config.smtp_user || '',
        smtp_pass: config.smtp_pass || '',
        smtp_from: config.smtp_from || '',
        smtp_secure: config.smtp_secure || false,
      });
      setConfig(updated);
      setMsg('Configurações salvas com sucesso!');
    } catch {
      setMsg('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={s.container}><Topbar user={{ nome: 'Admin' }} /><div style={s.content}><p style={{ color: '#6b7280' }}>Carregando...</p></div></div>;

  return (
    <div style={s.container}>
      <Topbar user={{ nome: 'Admin' }} />
      <div style={s.content}>
        <h2 style={s.title}>Configurações do Sistema</h2>

        <div style={s.card}>
          <h4 style={s.sectionTitle}>Pagamento</h4>
          <div style={s.field}>
            <label style={s.label}>Dias úteis para pagamento após fechamento da quinzena</label>
            <input type="number" min="1" max="30" value={config.dias_uteis_pagamento}
              onChange={e => handleChange('dias_uteis_pagamento', e.target.value)} style={s.input} disabled={!isAdmin} />
          </div>

          <div style={s.field}>
            <label style={s.label}>Eficiência mínima (%) para solicitar adiantamento</label>
            <input type="number" min="0" max="100" step="0.01" value={config.eficiencia_minima_adiantamento}
              onChange={e => handleChange('eficiencia_minima_adiantamento', e.target.value)} style={s.input} disabled={!isAdmin} />
          </div>

          <div style={s.field}>
            <label style={s.label}>Valor máximo para adiantamento (R$) — limite por romaneio</label>
            <input type="number" min="0" max="9999" step="0.01" value={config.valor_maximo_adiantamento}
              onChange={e => handleChange('valor_maximo_adiantamento', e.target.value)} style={s.input} disabled={!isAdmin} />
          </div>
        </div>

        <div style={{ ...s.card, marginTop: 20 }}>
          <h4 style={s.sectionTitle}>E-mail (SMTP)</h4>
          <p style={s.sectionHint}>Configure o servidor de e-mail para envio de senhas aos motoristas.</p>

          <div style={s.field}>
            <label style={s.label}>Servidor SMTP (host)</label>
            <input type="text" placeholder="smtp.gmail.com" value={config.smtp_host || ''}
              onChange={e => handleChange('smtp_host', e.target.value)} style={s.input} disabled={!isAdmin} />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ ...s.field, flex: 1 }}>
              <label style={s.label}>Porta</label>
              <input type="number" placeholder="587" value={config.smtp_port || 587}
                onChange={e => handleChange('smtp_port', e.target.value)} style={s.input} disabled={!isAdmin} />
            </div>
            <div style={{ ...s.field, flex: 1 }}>
              <label style={s.label}>Seguro (SSL/TLS)</label>
              <select value={config.smtp_secure ? 'true' : 'false'}
                onChange={e => handleChange('smtp_secure', e.target.value === 'true')} style={s.select} disabled={!isAdmin}>
                <option value="false">Não (STARTTLS)</option>
                <option value="true">Sim (SSL/TLS)</option>
              </select>
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Usuário SMTP (e-mail)</label>
            <input type="email" placeholder="seuemail@gmail.com" value={config.smtp_user || ''}
              onChange={e => handleChange('smtp_user', e.target.value)} style={s.input} disabled={!isAdmin} />
          </div>

          <div style={s.field}>
            <label style={s.label}>Senha SMTP</label>
            <input type="password" placeholder="Senha ou chave de aplicativo" value={config.smtp_pass || ''}
              onChange={e => handleChange('smtp_pass', e.target.value)} style={s.input} disabled={!isAdmin} />
          </div>

          <div style={s.field}>
            <label style={s.label}>E-mail remetente (From)</label>
            <input type="email" placeholder="noreply@ssw.com.br" value={config.smtp_from || ''}
              onChange={e => handleChange('smtp_from', e.target.value)} style={s.input} disabled={!isAdmin} />
          </div>
        </div>

        {isAdmin && (
          <button onClick={handleSave} disabled={saving} style={{ ...s.btn, marginTop: 20 }}>
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        )}

        {msg && (
          <div style={{ ...s.msg, color: msg.includes('sucesso') ? '#3de8a0' : '#ff5a5a', marginTop: 12 }}>
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  container: { minHeight: '100vh', background: '#0d0f14', color: '#e8eaf0', fontFamily: "'IBM Plex Sans', sans-serif" },
  content: { maxWidth: 640, margin: '0 auto', padding: '32px 24px' },
  title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '2px', color: '#f0c040', marginBottom: 24 },
  card: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 },
  sectionTitle: { margin: 0, fontSize: '1rem', color: '#f0c040', borderBottom: '1px solid #2a2f3e', paddingBottom: 8 },
  sectionHint: { margin: 0, fontSize: '0.8rem', color: '#6b7280', marginTop: -12 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: '0.82rem', color: '#9ca3af' },
  input: { background: '#1e2230', border: '1px solid #2a2f3e', borderRadius: 4, color: '#e8eaf0', padding: '10px 14px', fontSize: '1rem', fontFamily: "'IBM Plex Mono', monospace", outline: 'none', width: '100%', boxSizing: 'border-box' },
  select: { background: '#1e2230', border: '1px solid #2a2f3e', borderRadius: 4, color: '#e8eaf0', padding: '10px 14px', fontSize: '1rem', fontFamily: "'IBM Plex Mono', monospace", outline: 'none', width: '100%', boxSizing: 'border-box' },
  btn: { background: '#1a3a2a', border: '1px solid #3de8a0', color: '#3de8a0', padding: '12px 24px', borderRadius: 4, cursor: 'pointer', fontSize: '0.9rem', fontFamily: "'IBM Plex Mono', monospace", alignSelf: 'flex-start' },
  msg: { fontSize: '0.85rem', fontFamily: "'IBM Plex Mono', monospace", padding: '8px 12px', borderRadius: 4, background: '#1a1a1a' },
};

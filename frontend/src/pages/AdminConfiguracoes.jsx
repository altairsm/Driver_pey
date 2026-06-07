import { useState, useEffect } from 'react';
import { getConfig, updateConfig } from '../services/api';
import Topbar from '../components/Topbar';

export default function AdminConfiguracoes() {
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
        taxa_adiantamento: Number(config.taxa_adiantamento),
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

          <div style={s.field}>
            <label style={s.label}>Taxa de adiantamento (%) — desconto aplicado sobre o valor adiantado</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={config.taxa_adiantamento}
              onChange={e => handleChange('taxa_adiantamento', e.target.value)}
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
};

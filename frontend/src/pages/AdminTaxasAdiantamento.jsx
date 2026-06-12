import { useState, useEffect } from 'react';
import { getTaxasAdiantamento, updateTaxasAdiantamento } from '../services/api';
import Topbar from '../components/Topbar';

export default function AdminTaxasAdiantamento() {
  const [taxas, setTaxas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await getTaxasAdiantamento();
        setTaxas(data);
      } catch {
        setMsg('Erro ao carregar taxas');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleChange = (dias, value) => {
    setTaxas(prev => prev.map(t =>
      t.dias_ate_fechamento === dias ? { ...t, taxa: value } : t
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      const payload = {};
      for (const t of taxas) {
        payload[t.dias_ate_fechamento] = Number(t.taxa);
      }
      const updated = await updateTaxasAdiantamento(payload);
      setTaxas(updated);
      setMsg('Taxas salvas com sucesso!');
    } catch {
      setMsg('Erro ao salvar taxas');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={s.container}><Topbar user={{ nome: 'Admin' }} /><div style={s.content}><p style={{ color: '#6b7280' }}>Carregando...</p></div></div>;

  return (
    <div style={s.container}>
      <Topbar user={{ nome: 'Admin' }} />
      <div style={s.content}>
        <h2 style={s.title}>Taxas de Adiantamento por Dia</h2>

        <div style={s.card}>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Dias até fechamento</th>
                  <th style={s.th}>Taxa (%)</th>
                </tr>
              </thead>
              <tbody>
                {taxas.map(t => (
                  <tr key={t.dias_ate_fechamento}>
                    <td style={s.td}>{t.dias_ate_fechamento}</td>
                    <td style={s.td}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={Number(t.taxa).toFixed(2)}
                        onChange={e => handleChange(t.dias_ate_fechamento, e.target.value)}
                        style={s.input}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
  container: { minHeight: '100vh', background: '#0d0f14', color: '#e8eaf0', fontFamily: "'IBM Plex Sans', sans-serif" },
  content: { maxWidth: 640, margin: '0 auto', padding: '32px 24px' },
  title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '2px', color: '#f0c040', marginBottom: 24 },
  card: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 },
  tableWrap: { overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #2a2f3e', background: '#1e2230' },
  td: { padding: '8px 14px', fontSize: '0.82rem', borderBottom: '1px solid #2a2f3e', color: '#e8eaf0', fontFamily: "'IBM Plex Mono', monospace" },
  input: { background: '#1e2230', border: '1px solid #2a2f3e', borderRadius: 4, color: '#e8eaf0', padding: '8px 12px', fontSize: '1rem', fontFamily: "'IBM Plex Mono', monospace", outline: 'none', width: 120, boxSizing: 'border-box' },
  btn: { background: '#1a3a2a', border: '1px solid #3de8a0', color: '#3de8a0', padding: '12px 24px', borderRadius: 4, cursor: 'pointer', fontSize: '0.9rem', fontFamily: "'IBM Plex Mono', monospace", alignSelf: 'flex-start', marginTop: 8 },
  msg: { fontSize: '0.85rem', fontFamily: "'IBM Plex Mono', monospace", padding: '8px 12px', borderRadius: 4, background: '#1a1a1a' },
};

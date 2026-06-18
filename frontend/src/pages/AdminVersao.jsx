import { useState, useEffect } from 'react';
import { checkVersao, setVersaoAtiva } from '../services/api';
import Topbar from '../components/Topbar';

export default function AdminVersao() {
  const [form, setForm] = useState({ commit_hash: '', url_download: '' });
  const [versaoAtiva, setVersaoAtiva_] = useState(null);
  const [msg, setMsg] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    try {
      const v = await checkVersao('FORCE');
      if (v.commit_esperado) {
        setVersaoAtiva_({ commit_hash: v.commit_esperado, url_download: v.url_download });
      } else {
        setVersaoAtiva_(null);
      }
    } catch {
      setVersaoAtiva_(null);
    }
  };

  useEffect(() => { carregar(); }, []);

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!form.commit_hash || !form.url_download) {
      setMsg('Preencha commit e URL');
      return;
    }
    setSalvando(true);
    setMsg('');
    try {
      await setVersaoAtiva(form);
      setMsg('Versão salva com sucesso!');
      await carregar();
      setForm({ commit_hash: '', url_download: '' });
    } catch (err) {
      setMsg(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  const s = {
    container: { minHeight: '100vh', background: '#0d0f14', color: '#e8eaf0', fontFamily: "'IBM Plex Sans', sans-serif" },
    content: { maxWidth: 700, margin: '0 auto', padding: '32px 24px' },
    title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '2px', color: '#f0c040', marginBottom: 24 },
    card: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, padding: 24 },
    field: { marginBottom: 16 },
    label: { fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4, display: 'block' },
    input: { width: '100%', background: '#1e2230', border: '1px solid #2a2f3e', color: '#e8eaf0', padding: '8px 12px', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem', boxSizing: 'border-box' },
    btn: { background: '#f0c040', color: '#0d0f14', border: 'none', padding: '10px 24px', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' },
    msg: { padding: '10px 14px', borderRadius: 4, marginBottom: 16, fontSize: '0.85rem' },
    infoCard: { background: '#1e2230', border: '1px solid #2a2f3e', borderLeft: '3px solid #f0c040', padding: 16, borderRadius: 4, marginBottom: 24 },
    infoLabel: { fontSize: '0.7rem', color: '#6b7280', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '1px' },
    infoVal: { fontSize: '0.9rem', color: '#e8eaf0', fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 },
  };

  return (
    <div style={s.container}>
      <Topbar user={{ nome: 'Admin' }} />
      <div style={s.content}>
        <h2 style={s.title}>Versão do APK</h2>

        {versaoAtiva && (
          <div style={s.infoCard}>
            <div style={s.infoLabel}>Versão Ativa</div>
            <div style={s.infoVal}>Commit: {versaoAtiva.commit_hash}</div>
            <div style={{ ...s.infoVal, fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>URL: {versaoAtiva.url_download}</div>
          </div>
        )}

        {!versaoAtiva && (
          <div style={s.infoCard}>
            <div style={s.infoLabel}>Nenhuma versão ativa cadastrada</div>
          </div>
        )}

        <div style={s.card}>
          {msg && (
            <div style={{ ...s.msg, background: msg.includes('sucesso') ? '#1a3a2a' : '#2a1a1a', color: msg.includes('sucesso') ? '#3de8a0' : '#ff5a5a', border: `1px solid ${msg.includes('sucesso') ? '#3de8a0' : '#ff5a5a'}` }}>
              {msg}
            </div>
          )}
          <form onSubmit={handleSalvar}>
            <div style={s.field}>
              <label style={s.label}>Commit Hash</label>
              <input style={s.input} value={form.commit_hash}
                onChange={(e) => setForm({ ...form, commit_hash: e.target.value })}
                placeholder="Ex: 255e87e" required />
            </div>
            <div style={s.field}>
              <label style={s.label}>URL de Download do APK</label>
              <input style={s.input} value={form.url_download}
                onChange={(e) => setForm({ ...form, url_download: e.target.value })}
                placeholder="Ex: https://driverpix.intuitiva.log.br/app-release.apk" required />
            </div>
            <button type="submit" style={s.btn} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar Versão'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

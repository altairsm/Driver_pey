import { useState, useEffect } from 'react';
import { getBairrosSemRota, criarBairroRota, getTabelas } from '../services/api';
import Topbar from '../components/Topbar';

export default function AdminBairrosSemRota() {
  const [bairros, setBairros] = useState([]);
  const [tabelas, setTabelas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [editBairro, setEditBairro] = useState(null);
  const [tabelaSel, setTabelaSel] = useState('');
  const [rotaSel, setRotaSel] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [data, tabs] = await Promise.all([getBairrosSemRota(), getTabelas()]);
      setBairros(data);
      setTabelas(Object.keys(tabs).sort());
    } catch {
      setMsg('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCriar = async (bairro) => {
    if (!tabelaSel) { setMsg('Selecione uma tabela'); return; }
    try {
      await criarBairroRota(bairro, tabelaSel, rotaSel || null);
      setMsg(`✅ Cadastro criado para "${bairro}"`);
      setEditBairro(null);
      setTabelaSel('');
      setRotaSel('');
      load();
    } catch (e) {
      setMsg(`❌ ${e.response?.data?.error || e.message}`);
    }
  };

  const s = {
    container: { minHeight: '100vh', background: '#0d0f14', color: '#e8eaf0', fontFamily: "'IBM Plex Sans', sans-serif" },
    content: { maxWidth: 1100, margin: '0 auto', padding: '32px 24px' },
    title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '2px', color: '#f0c040', marginBottom: 24 },
    card: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, marginBottom: 20, overflow: 'hidden' },
    cardHeader: (c) => ({ padding: '12px 20px', background: '#1e2230', borderBottom: '1px solid #2a2f3e', borderLeft: `3px solid ${c}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }),
    cardTitle: { margin: 0, fontSize: '0.95rem', color: '#e8eaf0' },
    cardBody: { padding: 20 },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' },
    th: { padding: '8px 12px', textAlign: 'left', color: '#6b7280', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #2a2f3e', background: '#1a1e2a' },
    td: { padding: '8px 12px', borderBottom: '1px solid #2a2f3e', color: '#e8eaf0' },
    btn: (bg, c) => ({ background: bg, color: c, border: 'none', padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, marginRight: 4 }),
    sel: { background: '#1e2230', border: '1px solid #2a2f3e', color: '#e8eaf0', padding: '6px 10px', borderRadius: 4, fontSize: '0.82rem' },
    inp: { background: '#1e2230', border: '1px solid #2a2f3e', color: '#e8eaf0', padding: '6px 10px', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.82rem', width: 200, boxSizing: 'border-box' },
    msg: (c) => ({ padding: '8px 14px', borderRadius: 4, fontSize: '0.85rem', marginBottom: 12, background: c === '#ff5a5a' ? '#2a1a1a' : '#1a3a2a', border: `1px solid ${c}`, color: c }),
    row: { display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' },
    lab: { fontSize: '0.7rem', color: '#6b7280', marginBottom: 2, display: 'block' },
  };

  if (loading) {
    return (
      <div style={s.container}>
        <Topbar user={{ nome: 'Admin' }} />
        <div style={s.content}><p style={{ color: '#6b7280' }}>Carregando...</p></div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      <Topbar user={{ nome: 'Admin' }} />
      <div style={s.content}>
        <h2 style={s.title}>Bairros sem Rota (bairros_rotas)</h2>
        {msg && <div style={s.msg(msg.includes('✅') ? '#3de8a0' : '#ff5a5a')}>{msg}</div>}

        <div style={s.card}>
          <div style={s.cardHeader('#ff9f40')}>
            <h5 style={s.cardTitle}>Bairros em ceps_especificos sem entrada em bairros_rotas ({bairros.length})</h5>
          </div>
          <div style={s.cardBody}>
            {bairros.length === 0 ? (
              <p style={{ color: '#3de8a0', fontSize: '0.85rem' }}>✓ Todos os bairros possuem cadastro em bairros_rotas.</p>
            ) : (
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Bairro</th>
                    <th style={s.th}>Qtd CEPs</th>
                    <th style={s.th}>Tabela Exemplo</th>
                    <th style={s.th}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {bairros.map(b => (
                    <tr key={b.bairro}>
                      <td style={s.td}>{b.bairro}</td>
                      <td style={s.td}>{b.total_ceps}</td>
                      <td style={s.td}>{b.tabela_exemplo || '-'}</td>
                      <td style={s.td}>
                        {editBairro === b.bairro ? (
                          <div style={s.row}>
                            <div>
                              <label style={s.lab}>Tabela</label>
                              <select style={s.sel} value={tabelaSel} onChange={(e) => setTabelaSel(e.target.value)}>
                                <option value="">Selecione...</option>
                                {tabelas.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={s.lab}>Rota</label>
                              <input style={s.inp} placeholder="Rota" value={rotaSel}
                                onChange={(e) => setRotaSel(e.target.value)} />
                            </div>
                            <button style={s.btn('#198754', '#fff')} onClick={() => handleCriar(b.bairro)}>Salvar</button>
                            <button style={s.btn('#6c757d', '#fff')} onClick={() => { setEditBairro(null); setTabelaSel(''); setRotaSel(''); }}>Cancelar</button>
                          </div>
                        ) : (
                          <button style={s.btn('#0d6efd', '#fff')}
                            onClick={() => { setEditBairro(b.bairro); setTabelaSel(b.tabela_exemplo || ''); setRotaSel(''); }}>
                            Criar cadastro
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
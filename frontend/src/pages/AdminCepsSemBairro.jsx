import { useState, useEffect } from 'react';
import { getCepsSemBairro, consultarViaCep, getTabelas, atualizarCepSemBairro } from '../services/api';
import Topbar from '../components/Topbar';

export default function AdminCepsSemBairro() {
  const [ceps, setCeps] = useState([]);
  const [tabelas, setTabelas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ bairro: '' });
  const [tabelaSel, setTabelaSel] = useState('');
  const [buscandoViaCep, setBuscandoViaCep] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [data, tabs] = await Promise.all([getCepsSemBairro(), getTabelas()]);
      setCeps(data);
      setTabelas(Object.keys(tabs).sort());
    } catch {
      setMsg('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleBuscarViaCep = async (cep) => {
    setBuscandoViaCep(true);
    setMsg('');
    try {
      const data = await consultarViaCep(cep);
      if (data && data.bairro) {
        setForm({ bairro: data.bairro });
        setMsg(`✅ ViaCEP: ${data.logradouro}, ${data.bairro} - ${data.cidade}/${data.uf}`);
      } else {
        setMsg('⚠️ CEP não encontrado no ViaCEP');
      }
    } catch {
      setMsg('❌ Erro ao consultar ViaCEP');
    } finally {
      setBuscandoViaCep(false);
    }
  };

  const handleSalvar = async (id) => {
    if (!form.bairro.trim()) { setMsg('Preencha o bairro'); return; }
    try {
      await atualizarCepSemBairro(id, form.bairro.trim(), tabelaSel || null);
      setMsg('✅ Bairro definido com sucesso!');
      setEditId(null);
      setForm({ bairro: '' });
      setTabelaSel('');
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
    inp: { background: '#1e2230', border: '1px solid #2a2f3e', color: '#e8eaf0', padding: '6px 10px', borderRadius: 4, fontSize: '0.82rem', width: '100%', boxSizing: 'border-box' },
    sel: { background: '#1e2230', border: '1px solid #2a2f3e', color: '#e8eaf0', padding: '6px 10px', borderRadius: 4, fontSize: '0.82rem' },
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
        <h2 style={s.title}>CEPs sem Bairro</h2>
        {msg && <div style={s.msg(msg.includes('✅') ? '#3de8a0' : msg.includes('❌') ? '#ff5a5a' : '#f0c040')}>{msg}</div>}

        <div style={s.card}>
          <div style={s.cardHeader('#ff5a5a')}>
            <h5 style={s.cardTitle}>CEPs sem bairro definido ({ceps.length})</h5>
          </div>
          <div style={s.cardBody}>
            {ceps.length === 0 ? (
              <p style={{ color: '#3de8a0', fontSize: '0.85rem' }}>✓ Todos os CEPs possuem bairro definido.</p>
            ) : (
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>CEP</th>
                    <th style={s.th}>CTEs</th>
                    <th style={s.th}>Bairro (relatório)</th>
                    <th style={s.th}>Cidade</th>
                    <th style={s.th}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {ceps.map(c => (
                    <>
                      <tr key={c.id}>
                        <td style={s.td}>{c.cep}</td>
                        <td style={s.td}>{c.total_ctes}</td>
                        <td style={s.td}>{c.bairro_no_relatorio || '-'}</td>
                        <td style={s.td}>{c.cidade || '-'}</td>
                        <td style={s.td}>
                          <button style={s.btn('#0d6efd', '#fff')} onClick={() => {
                            setEditId(c.id);
                            setForm({ bairro: c.bairro_no_relatorio || '' });
                            setTabelaSel('');
                            handleBuscarViaCep(c.cep);
                          }}>Definir Bairro</button>
                        </td>
                      </tr>
                      {editId === c.id && (
                        <tr key={`edit-${c.id}`}>
                          <td colSpan={5} style={{ padding: '12px 20px', background: '#1e2230' }}>
                            <div style={s.row}>
                              <div style={{ flex: 1, minWidth: 200 }}>
                                <label style={s.lab}>Bairro</label>
                                <input style={s.inp} value={form.bairro}
                                  onChange={(e) => setForm({ bairro: e.target.value })}
                                  placeholder="Nome do bairro" disabled={buscandoViaCep} />
                              </div>
                              <div>
                                <label style={s.lab}>Tabela de Frete</label>
                                <select style={s.sel} value={tabelaSel} onChange={(e) => setTabelaSel(e.target.value)}>
                                  <option value="">Sem tabela</option>
                                  {tabelas.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                              </div>
                              <div>
                                <label style={s.lab}>&nbsp;</label>
                                <button style={s.btn('#198754', '#fff')} onClick={() => handleSalvar(c.id)}>Salvar</button>
                              </div>
                              <div>
                                <label style={s.lab}>&nbsp;</label>
                                <button style={s.btn('#6c757d', '#fff')} onClick={() => setEditId(null)}>Cancelar</button>
                              </div>
                            </div>
                            {buscandoViaCep && <p style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: 8 }}>Consultando ViaCEP...</p>}
                          </td>
                        </tr>
                      )}
                    </>
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

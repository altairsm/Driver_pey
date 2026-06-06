import { useState, useEffect } from 'react';
import { getCepsSemRange, adicionarCepRange, getRangesSemTabela, atribuirTabelaParaBairro } from '../services/api';
import Topbar from '../components/Topbar';

export default function AdminCepsSemRange() {
  const [cepsSemRange, setCepsSemRange] = useState([]);
  const [rangesSemTabela, setRangesSemTabela] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [cepExpandido, setCepExpandido] = useState(null);
  const [busca, setBusca] = useState(null);
  const [buscaLoading, setBuscaLoading] = useState(false);
  const [manual, setManual] = useState({ bairro: '', cidade: '' });
  const [tabelaSel, setTabelaSel] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [sem, semTab] = await Promise.all([getCepsSemRange(), getRangesSemTabela()]);
      setCepsSemRange(sem);
      setRangesSemTabela(semTab);
    } catch (e) {
      setMsg('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const buscarViaCep = async (cep) => {
    const cepNum = cep.replace(/\D/g, '');
    if (cepNum.length !== 8) { setMsg('CEP inválido'); return; }
    setBuscaLoading(true);
    setBusca(null);
    setManual({ bairro: '', cidade: '' });
    setMsg('');
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cepNum}/json/`);
      const d = await r.json();
      if (d.erro) {
        setMsg('CEP não encontrado no ViaCEP. Preencha manualmente.');
        setBusca(null);
      } else {
        setBusca(d);
        setManual({ bairro: d.bairro || '', cidade: d.localidade || '' });
      }
    } catch {
      setMsg('Erro ao consultar ViaCEP. Preencha manualmente.');
      setBusca(null);
    } finally {
      setBuscaLoading(false);
    }
  };

  const confirmarInsercao = async (cep) => {
    const cepNum = cep.replace(/\D/g, '');
    if (!manual.bairro || !manual.cidade) {
      setMsg('Preencha bairro e cidade');
      return;
    }
    setMsg('');
    try {
      await adicionarCepRange({
        cep_ini: cepNum,
        cep_fim: cepNum,
        bairro: manual.bairro,
        cidade: manual.cidade,
        tabela_motorista: tabelaSel || null,
      });
      setMsg(`✅ Range ${cepNum} adicionado!`);
      setCepExpandido(null);
      setBusca(null);
      setManual({ bairro: '', cidade: '' });
      setTabelaSel('');
      load();
    } catch (e) {
      setMsg(`❌ ${e.response?.data?.error || e.message}`);
    }
  };

  const atribuirTabela = async (bairro, tabela) => {
    if (!tabela) return;
    try {
      await atribuirTabelaParaBairro(bairro, tabela);
      setMsg(`✅ Tabela ${tabela} atribuída a "${bairro}"`);
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
    badge: { padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 600 },
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
        <h2 style={s.title}>CEPs sem Range</h2>
        {msg && <div style={s.msg(msg.includes('✅') ? '#3de8a0' : '#ff5a5a')}>{msg}</div>}

        <div style={s.card}>
          <div style={s.cardHeader('#ff9f40')}>
            <h5 style={s.cardTitle}>CEPs sem correspondência em ceps_bairros ({cepsSemRange.length})</h5>
          </div>
          <div style={s.cardBody}>
            {cepsSemRange.length === 0 ? (
              <p style={{ color: '#3de8a0', fontSize: '0.85rem' }}>✓ Todos os CEPs possuem range cadastrado.</p>
            ) : (
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>CEP</th>
                    <th style={s.th}>CTEs</th>
                    <th style={s.th}>Bairro (exemplo)</th>
                    <th style={s.th}>Cidade</th>
                    <th style={s.th}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {cepsSemRange.map((c, i) => (
                    <>
                      <tr key={i}>
                        <td style={s.td}>{c.Cep}</td>
                        <td style={s.td}>{c.total_ctes}</td>
                        <td style={s.td}>{c.bairro_exemplo || '-'}</td>
                        <td style={s.td}>{c.cidade_exemplo || '-'}</td>
                        <td style={s.td}>
                          <button style={s.btn('#0d6efd', '#fff')} onClick={() => { setCepExpandido(c.Cep); buscarViaCep(c.Cep); }}>
                            Buscar ViaCEP
                          </button>
                        </td>
                      </tr>
                      {cepExpandido === c.Cep && (
                        <tr key={`exp-${i}`}>
                          <td colSpan={5} style={{ padding: '12px 20px', background: '#1e2230', borderBottom: '1px solid #2a2f3e' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {buscaLoading ? (
                                <span style={{ color: '#6b7280', fontSize: '0.82rem' }}>Consultando ViaCEP...</span>
                              ) : (
                                <>
                                  {busca && (
                                    <div style={{ fontSize: '0.82rem', color: '#5ab4ff', marginBottom: 4 }}>
                                      ViaCEP: {busca.logradouro}, {busca.bairro} - {busca.localidade}/{busca.uf}
                                    </div>
                                  )}
                                  <div style={s.row}>
                                    <div style={{ flex: 1, minWidth: 200 }}>
                                      <label style={s.lab}>Bairro</label>
                                      <input style={s.inp} value={manual.bairro} onChange={(e) => setManual({ ...manual, bairro: e.target.value })} placeholder="Nome do bairro" />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 150 }}>
                                      <label style={s.lab}>Cidade</label>
                                      <input style={s.inp} value={manual.cidade} onChange={(e) => setManual({ ...manual, cidade: e.target.value })} placeholder="Cidade" />
                                    </div>
                                    <div>
                                      <label style={s.lab}>Tabela</label>
                                      <select style={s.sel} value={tabelaSel} onChange={(e) => setTabelaSel(e.target.value)}>
                                        <option value="">Sem tabela</option>
                                        <option value="Tab_1">Tab_1</option>
                                        <option value="Tab_2">Tab_2</option>
                                        <option value="Tab_3">Tab_3</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label style={s.lab}>&nbsp;</label>
                                      <button style={s.btn('#3de8a0', '#0d0f14')} onClick={() => confirmarInsercao(c.Cep)}>
                                        Adicionar Range
                                      </button>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
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

        <div style={s.card}>
          <div style={s.cardHeader('#6f42c1')}>
            <h5 style={s.cardTitle}>Ranges sem Tabela Atribuída ({rangesSemTabela.length})</h5>
          </div>
          <div style={s.cardBody}>
            {rangesSemTabela.length === 0 ? (
              <p style={{ color: '#3de8a0', fontSize: '0.85rem' }}>✓ Todos os ranges possuem tabela atribuída.</p>
            ) : (
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Bairro</th>
                    <th style={s.th}>CEP Início</th>
                    <th style={s.th}>CEP Fim</th>
                    <th style={s.th}>Cidade</th>
                    <th style={s.th}>Atribuir Tabela</th>
                  </tr>
                </thead>
                <tbody>
                  {rangesSemTabela.map((r, i) => (
                    <tr key={i}>
                      <td style={s.td}>{r.bairro}</td>
                      <td style={s.td}>{r.cep_ini}</td>
                      <td style={s.td}>{r.cep_fim}</td>
                      <td style={s.td}>{r.cidade}</td>
                      <td style={s.td}>
                        <select style={s.sel} onChange={(e) => { if (e.target.value) atribuirTabela(r.bairro, e.target.value); }}>
                          <option value="">Selecionar...</option>
                          <option value="Tab_1">Tab_1</option>
                          <option value="Tab_2">Tab_2</option>
                          <option value="Tab_3">Tab_3</option>
                        </select>
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
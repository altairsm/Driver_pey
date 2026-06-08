import { useState, useEffect } from 'react';
import { getCepsSemCadastro, criarCep, getBairrosRotas, atualizarBairroRota, consultarViaCep, autoDescobrirCeps, getTabelas } from '../services/api';
import Topbar from '../components/Topbar';

export default function AdminCepsSemRange() {
  const [cepsSemCadastro, setCepsSemCadastro] = useState([]);
  const [bairrosRotas, setBairrosRotas] = useState([]);
  const [tabelas, setTabelas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoLoading, setAutoLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [cepExpandido, setCepExpandido] = useState(null);
  const [buscaLoading, setBuscaLoading] = useState(false);
  const [manual, setManual] = useState({ bairro: '', cidade: '' });
  const [tabelaSel, setTabelaSel] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [sem, semTab, tabs] = await Promise.all([getCepsSemCadastro(), getBairrosRotas(), getTabelas()]);
      setCepsSemCadastro(sem);
      setBairrosRotas(semTab);
      setTabelas(Object.keys(tabs).sort());
    } catch {
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
    setManual({ bairro: '', cidade: '' });
    setMsg('');
    try {
      const d = await consultarViaCep(cepNum);
      setManual({ bairro: d.bairro || '', cidade: d.cidade || '' });
    } catch {
      setMsg('CEP não encontrado no ViaCEP. Preencha manualmente.');
    } finally {
      setBuscaLoading(false);
    }
  };

  const confirmarInsercao = async (cep) => {
    const cepNum = cep.replace(/\D/g, '');
    if (!manual.bairro) {
      setMsg('Preencha o bairro');
      return;
    }
    setMsg('');
    try {
      await criarCep({
        cep: cepNum,
        bairro: manual.bairro,
        rota: null,
        nome_tabela: tabelaSel || null,
      });
      setMsg(`✅ CEP ${cepNum} adicionado!`);
      setCepExpandido(null);
      setManual({ bairro: '', cidade: '' });
      setTabelaSel('');
      load();
    } catch (e) {
      setMsg(`❌ ${e.response?.data?.error || e.message}`);
    }
  };

  const handleAutoDescobrir = async () => {
    if (!confirm('Consultar ViaCEP para todos os CEPs sem cadastro? Isso pode levar alguns minutos.')) return;
    setAutoLoading(true);
    setMsg('');
    try {
      const r = await autoDescobrirCeps();
      setMsg(`✅ ${r.sucesso} CEPs descobertos, ${r.falha} falhas`);
      load();
    } catch (e) {
      setMsg(`❌ ${e.response?.data?.error || e.message}`);
    } finally {
      setAutoLoading(false);
    }
  };

  const handleAtribuirTabela = async (id, tabela) => {
    if (!tabela) return;
    try {
      await atualizarBairroRota(id, tabela);
      setMsg(`✅ Tabela ${tabela} atribuída`);
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
        <h2 style={s.title}>CEPs sem Cadastro</h2>
        {msg && <div style={s.msg(msg.includes('✅') ? '#3de8a0' : '#ff5a5a')}>{msg}</div>}

        <div style={{ ...s.row, marginBottom: 20 }}>
          <button style={s.btn('#0d6efd', '#fff')} onClick={handleAutoDescobrir} disabled={autoLoading}>
            {autoLoading ? 'Descobrindo...' : 'Auto-Descobrir ViaCEP'}
          </button>
        </div>

        <div style={s.card}>
          <div style={s.cardHeader('#ff9f40')}>
            <h5 style={s.cardTitle}>CEPs sem correspondência ({cepsSemCadastro.length})</h5>
          </div>
          <div style={s.cardBody}>
            {cepsSemCadastro.length === 0 ? (
              <p style={{ color: '#3de8a0', fontSize: '0.85rem' }}>✓ Todos os CEPs estão cadastrados.</p>
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
                  {cepsSemCadastro.map((c, i) => (
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
                                  <div style={s.row}>
                                    <div style={{ flex: 1, minWidth: 200 }}>
                                      <label style={s.lab}>Bairro</label>
                                      <input style={s.inp} value={manual.bairro} onChange={(e) => setManual({ ...manual, bairro: e.target.value })} placeholder="Nome do bairro" />
                                    </div>
                                    <div>
                                      <label style={s.lab}>Tabela</label>
                                      <select style={s.sel} value={tabelaSel} onChange={(e) => setTabelaSel(e.target.value)}>
                                        <option value="">Sem tabela</option>
                                        {tabelas.map(t => <option key={t} value={t}>{t}</option>)}
                                      </select>
                                    </div>
                                    <div>
                                      <label style={s.lab}>&nbsp;</label>
                                      <button style={s.btn('#3de8a0', '#0d0f14')} onClick={() => confirmarInsercao(c.Cep)}>
                                        Adicionar CEP
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
            <h5 style={s.cardTitle}>Bairros e Rotas ({bairrosRotas.length})</h5>
          </div>
          <div style={s.cardBody}>
            {bairrosRotas.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>Nenhum bairro/rota cadastrado.</p>
            ) : (
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Bairro</th>
                    <th style={s.th}>Rota</th>
                    <th style={s.th}>Tabela Atual</th>
                    <th style={s.th}>Alterar</th>
                  </tr>
                </thead>
                <tbody>
                  {bairrosRotas.map((r, i) => (
                    <tr key={i}>
                      <td style={s.td}>{r.bairro}</td>
                      <td style={s.td}>{r.rota}</td>
                      <td style={s.td}>{r.nome_tabela}</td>
                      <td style={s.td}>
                        <select style={s.sel} value="" onChange={(e) => { if (e.target.value) handleAtribuirTabela(r.id, e.target.value); }}>
                          <option value="">Alterar...</option>
                          {tabelas.map(t => <option key={t} value={t}>{t}</option>)}
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

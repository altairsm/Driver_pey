import { useState } from 'react';
import { getBairros, getCepsPorBairro, getBairrosRotas, atualizarBairroRota, getTabelas } from '../services/api';
import Topbar from '../components/Topbar';

export default function AdminCeps() {
  const [termo, setTermo] = useState('');
  const [bairros, setBairros] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [bairroSel, setBairroSel] = useState('');
  const [ceps, setCeps] = useState([]);
  const [bairroRotaId, setBairroRotaId] = useState(null);
  const [tabelaAtual, setTabelaAtual] = useState('');
  const [tabelaSel, setTabelaSel] = useState('');
  const [tabelas, setTabelas] = useState([]);
  const [msg, setMsg] = useState('');
  const [salvando, setSalvando] = useState(false);

  const handleBuscar = async () => {
    if (!termo.trim() || termo.trim().length < 2) return;
    setBuscando(true);
    setMsg('');
    setBairroSel('');
    setCeps([]);
    try {
      const result = await getBairros(termo.trim());
      setBairros(result);
      if (result.length === 0) setMsg('Nenhum bairro encontrado');
    } catch (err) {
      setMsg(err.response?.data?.error || 'Erro ao buscar');
    } finally {
      setBuscando(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleBuscar();
  };

  const handleSelecionarBairro = async (bairro) => {
    setBairroSel(bairro);
    setTabelaSel('');
    setMsg('');
    try {
      const [cepsResult, bairrosRotasResult, tabelasResult] = await Promise.all([
        getCepsPorBairro(bairro),
        getBairrosRotas(),
        getTabelas(),
      ]);
      setCeps(cepsResult);
      setTabelas(Object.keys(tabelasResult).sort());

      const br = bairrosRotasResult.find(r => r.bairro.toLowerCase() === bairro.toLowerCase());
      if (br) {
        setBairroRotaId(br.id);
        setTabelaAtual(br.nome_tabela);
        setTabelaSel(br.nome_tabela);
      } else {
        setBairroRotaId(null);
        setTabelaAtual('');
        setTabelaSel('');
      }
    } catch (err) {
      setMsg(err.response?.data?.error || 'Erro ao carregar dados');
    }
  };

  const handleAtribuir = async () => {
    if (!bairroRotaId || !tabelaSel) {
      setMsg('❌ Bairro não encontrado em bairros_rotas. Importe a planilha primeiro.');
      return;
    }
    if (!confirm(`Atribuir tabela "${tabelaSel}" ao bairro "${bairroSel}"?`)) return;
    setSalvando(true);
    setMsg('');
    try {
      await atualizarBairroRota(bairroRotaId, tabelaSel);
      setMsg(`✅ Tabela "${tabelaSel}" atribuída a "${bairroSel}"`);
      setTabelaAtual(tabelaSel);
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.error || 'Erro ao atribuir tabela'}`);
    } finally {
      setSalvando(false);
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
    row: { display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' },
    btn: (bg, c) => ({ background: bg, color: c, border: 'none', padding: '8px 20px', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }),
    btnSm: (bg, c) => ({ background: bg, color: c, border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, marginRight: 4 }),
    inp: { background: '#1e2230', border: '1px solid #2a2f3e', color: '#e8eaf0', padding: '8px 12px', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem', width: 300, boxSizing: 'border-box' },
    label: { fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4, display: 'block' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' },
    th: { padding: '8px 10px', textAlign: 'left', color: '#6b7280', borderBottom: '1px solid #2a2f3e', background: '#1e2230', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' },
    td: { padding: '6px 10px', borderBottom: '1px solid #2a2f3e', color: '#e8eaf0', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' },
    sel: { background: '#1e2230', border: '1px solid #2a2f3e', color: '#e8eaf0', padding: '8px 12px', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem', boxSizing: 'border-box', width: 160 },
    bairroItem: { padding: '8px 14px', cursor: 'pointer', color: '#e8eaf0', borderBottom: '1px solid #2a2f3e', fontSize: '0.85rem', transition: 'background 0.15s' },
    bairroItemHover: { background: '#1e2230' },
    msgBox: (tipo) => ({ padding: '8px 14px', borderRadius: 4, fontSize: '0.85rem', marginTop: 12, background: tipo === 'ok' ? '#1a3a2a' : '#2a1a1a', border: `1px solid ${tipo === 'ok' ? '#3de8a0' : '#ff5a5a'}`, color: tipo === 'ok' ? '#3de8a0' : '#ff5a5a' }),
    selectAtivo: { display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16, padding: 16, background: '#1e2230', borderRadius: 6 },
  };

  return (
    <div style={s.container}>
      <Topbar user={{ nome: 'Admin' }} />
      <div style={s.content}>
        <h2 style={s.title}>Gerenciar Bairros e CEPs</h2>

        <div style={s.card}>
          <div style={s.cardHeader('#0d6efd')}>
            <h5 style={s.cardTitle}>Pesquisar Bairro</h5>
          </div>
          <div style={s.cardBody}>
            <div style={s.row}>
              <div>
                <label style={s.label}>Nome do Bairro</label>
                <input style={s.inp} placeholder="Digite o nome do bairro..."
                  value={termo} onChange={(e) => setTermo(e.target.value)} onKeyDown={handleKeyDown} />
              </div>
              <button style={s.btn('#f0c040', '#0d0f14')} onClick={handleBuscar} disabled={buscando}>
                {buscando ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </div>
        </div>

        {bairros.length > 0 && !bairroSel && (
          <div style={s.card}>
            <div style={s.cardHeader('#198754')}>
              <h5 style={s.cardTitle}>Bairros Encontrados ({bairros.length})</h5>
            </div>
            <div style={s.cardBody}>
              {bairros.map(b => (
                <div key={b} style={s.bairroItem}
                  onClick={() => handleSelecionarBairro(b)}
                  onMouseEnter={(e) => e.target.style.background = s.bairroItemHover.background}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}>
                  {b}
                </div>
              ))}
            </div>
          </div>
        )}

        {bairroSel && (
          <div style={s.card}>
            <div style={s.cardHeader('#f0c040')}>
              <div>
                <h5 style={{ ...s.cardTitle, color: '#f0c040' }}>{bairroSel}</h5>
                <span style={{ fontSize: '0.75rem', color: '#6b7280', fontFamily: "'IBM Plex Mono', monospace" }}>
                  {ceps.length} CEP(s) cadastrados • Tabela atual: <strong>{tabelaAtual || 'N/A'}</strong>
                </span>
              </div>
              <button style={s.btnSm('#6c757d', '#fff')} onClick={() => { setBairroSel(''); setCeps([]); setBairros([]); }}>
                Limpar
              </button>
            </div>
            <div style={s.cardBody}>
              {bairroRotaId && (
                <div style={s.selectAtivo}>
                  <div>
                    <label style={s.label}>Alterar Tabela</label>
                    <select style={s.sel} value={tabelaSel} onChange={(e) => setTabelaSel(e.target.value)}>
                      <option value="">Selecione...</option>
                      {tabelas.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <button style={s.btn('#198754', '#fff')} onClick={handleAtribuir} disabled={!tabelaSel || salvando || tabelaSel === tabelaAtual}>
                    {salvando ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              )}

              {msg && <div style={s.msgBox(msg.startsWith('✅') ? 'ok' : 'err')}>{msg}</div>}

              <table style={s.table}>
                <thead><tr>
                  <th style={s.th}>CEP</th>
                  <th style={s.th}>Bairro</th>
                  <th style={s.th}>Rota</th>
                  <th style={s.th}>Tabela</th>
                </tr></thead>
                <tbody>
                  {ceps.map(c => (
                    <tr key={c.id}>
                      <td style={s.td}>{c.cep}</td>
                      <td style={s.td}>{c.bairro}</td>
                      <td style={s.td}>{c.rota || '-'}</td>
                      <td style={{ ...s.td, color: tabelas.indexOf(c.nome_tabela) !== -1 ? '#f0c040' : '#ff5a5a' }}>
                        {c.nome_tabela}
                      </td>
                    </tr>
                  ))}
                  {ceps.length === 0 && (
                    <tr><td colSpan={4} style={{ ...s.td, textAlign: 'center', color: '#6b7280' }}>Nenhum CEP cadastrado para este bairro.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

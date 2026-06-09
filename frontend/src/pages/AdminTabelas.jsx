import { useState, useEffect } from 'react';
import { getTabelas, createTabela, updateFaixa, deleteFaixa, deleteTabela } from '../services/api';
import Topbar from '../components/Topbar';

const faixasPadrao = [
  { peso_de: 0.001, peso_ate: 1.000, faixas: '0,01 a 1 kg', valor_peso: '' },
  { peso_de: 1.010, peso_ate: 3.000, faixas: '1,01 a 3 kg', valor_peso: '' },
  { peso_de: 3.010, peso_ate: 5.000, faixas: '3,01 a 5 kg', valor_peso: '' },
  { peso_de: 5.010, peso_ate: 8.000, faixas: '5,01 a 8 kg', valor_peso: '' },
  { peso_de: 8.010, peso_ate: 15.000, faixas: '8,01 a 15 kg', valor_peso: '' },
  { peso_de: 15.010, peso_ate: 9999000, faixas: 'acima de 15 kg', valor_peso: '' },
];

export default function AdminTabelas() {
  const [tabelas, setTabelas] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [modalTipo, setModalTipo] = useState(null);
  const [novaTabelaNome, setNovaTabelaNome] = useState('');
  const [novasFaixas, setNovasFaixas] = useState(faixasPadrao.map(f => ({ ...f })));
  const [editandoFaixa, setEditandoFaixa] = useState(null);
  const [addFaixaTabela, setAddFaixaTabela] = useState('');
  const [novaFaixaForm, setNovaFaixaForm] = useState({ peso_de: '', peso_ate: '', valor_peso: '' });

  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try { setTabelas(await getTabelas()); }
    catch { setTabelas({}); }
    finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, []);

  const abrirNovaTabela = () => {
    setModalTipo('nova');
    setNovaTabelaNome('');
    setNovasFaixas(faixasPadrao.map(f => ({ ...f })));
    setError('');
  };

  const abrirEditarFaixa = (faixa) => {
    setModalTipo('editar');
    setEditandoFaixa({ ...faixa });
    setError('');
  };

  const abrirAddFaixa = (tabelaNome) => {
    setModalTipo('add');
    setAddFaixaTabela(tabelaNome);
    setNovaFaixaForm({ peso_de: '', peso_ate: '', valor_peso: '' });
    setError('');
  };

  const fecharModal = () => {
    setModalTipo(null);
    setNovaTabelaNome('');
    setEditandoFaixa(null);
    setAddFaixaTabela('');
    setError('');
  };

  const handleNovaFaixaChange = (idx, campo, valor) => {
    const updated = [...novasFaixas];
    updated[idx] = { ...updated[idx], [campo]: valor };
    setNovasFaixas(updated);
  };

  const handleSalvarNovaTabela = async () => {
    if (!novaTabelaNome.trim()) { setError('Nome da tabela é obrigatório'); return; }
    const vazias = novasFaixas.some(f => !f.valor_peso && f.valor_peso !== 0);
    if (vazias) { setError('Preencha o valor_peso de todas as faixas'); return; }
    setSalvando(true);
    try {
      const faixas = novasFaixas.map(f => ({ ...f, valor_peso: parseFloat(f.valor_peso) }));
      await createTabela(novaTabelaNome.trim(), faixas);
      fecharModal();
      await carregar();
    } catch (err) { setError(err.response?.data?.error || 'Erro ao criar tabela'); }
    finally { setSalvando(false); }
  };

  const handleSalvarEdicao = async () => {
    if (!editandoFaixa) return;
    setSalvando(true);
    try {
      await updateFaixa(editandoFaixa.id, {
        peso_de: parseFloat(editandoFaixa.peso_de),
        peso_ate: parseFloat(editandoFaixa.peso_ate),
        valor_peso: parseFloat(editandoFaixa.valor_peso),
        faixas: editandoFaixa.faixas,
      });
      fecharModal();
      await carregar();
    } catch (err) { setError(err.response?.data?.error || 'Erro ao atualizar'); }
    finally { setSalvando(false); }
  };

  const handleSalvarAddFaixa = async () => {
    if (!novaFaixaForm.peso_de || !novaFaixaForm.peso_ate || !novaFaixaForm.valor_peso) {
      setError('Preencha todos os campos'); return;
    }
    setSalvando(true);
    try {
      const faixa = {
        peso_de: parseFloat(novaFaixaForm.peso_de),
        peso_ate: parseFloat(novaFaixaForm.peso_ate),
        valor_peso: parseFloat(novaFaixaForm.valor_peso),
      };
      await createTabela(addFaixaTabela, [faixa]);
      fecharModal();
      await carregar();
    } catch (err) { setError(err.response?.data?.error || 'Erro ao adicionar faixa'); }
    finally { setSalvando(false); }
  };

  const handleExcluirFaixa = async (id) => {
    if (!confirm('Excluir esta faixa?')) return;
    try {
      await deleteFaixa(id);
      await carregar();
    } catch (err) { alert(err.response?.data?.error || 'Erro ao excluir faixa'); }
  };

  const handleExcluirTabela = async (nome) => {
    if (!confirm(`Excluir tabela ${nome} completamente?`)) return;
    if (!confirm(`Confirma exclusão de ${nome}? Isso não pode ser desfeito.`)) return;
    try {
      await deleteTabela(nome);
      await carregar();
    } catch (err) { alert(err.response?.data?.error || 'Erro ao excluir tabela'); }
  };

  const s = {
    container: { minHeight: '100vh', background: '#0d0f14', color: '#e8eaf0', fontFamily: "'IBM Plex Sans', sans-serif" },
    content: { maxWidth: 1100, margin: '0 auto', padding: '32px 24px' },
    title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '2px', color: '#f0c040', marginBottom: 24 },
    card: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, marginBottom: 20, overflow: 'hidden' },
    cardHeader: (c) => ({ padding: '12px 20px', background: '#1e2230', borderBottom: '1px solid #2a2f3e', borderLeft: `3px solid ${c}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }),
    cardTitle: { margin: 0, fontSize: '0.95rem', color: '#e8eaf0' },
    cardBody: { padding: 20 },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' },
    th: { padding: '8px 10px', textAlign: 'left', color: '#6b7280', borderBottom: '1px solid #2a2f3e', background: '#1e2230', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' },
    td: { padding: '6px 10px', borderBottom: '1px solid #2a2f3e', color: '#e8eaf0', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' },
    btn: (bg, c) => ({ background: bg, color: c, border: 'none', padding: '8px 20px', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }),
    btnSm: (bg, c) => ({ background: bg, color: c, border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, marginRight: 4 }),
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, width: '100%', maxWidth: 520, maxHeight: '80vh', overflow: 'auto' },
    mh: { padding: '16px 20px', borderBottom: '1px solid #2a2f3e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    mt: { fontSize: '1rem', color: '#e8eaf0', margin: 0 },
    mb: { padding: 20 },
    x: { background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 },
    field: { marginBottom: 16 },
    label: { fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4, display: 'block' },
    input: { width: '100%', background: '#1e2230', border: '1px solid #2a2f3e', color: '#e8eaf0', padding: '8px 12px', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem', boxSizing: 'border-box' },
    inputP: { width: '100%', background: '#1e2230', border: '1px solid #2a2f3e', color: '#b0b4c0', padding: '8px 12px', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem', boxSizing: 'border-box', cursor: 'not-allowed' },
    errorMsg: { color: '#ff5a5a', fontSize: '0.85rem', marginBottom: 12 },
    loadingText: { textAlign: 'center', color: '#f0c040', padding: 40, fontSize: '0.85rem' },
    emptyText: { textAlign: 'center', color: '#6b7280', padding: 40, fontSize: '0.9rem' },
    miniTable: { width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', marginTop: 8 },
    mth: { padding: '6px 8px', textAlign: 'left', color: '#6b7280', borderBottom: '1px solid #2a2f3e', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px' },
    mtd: { padding: '4px 8px', borderBottom: '1px solid #2a2f3e' },
  };

  const nomes = Object.keys(tabelas).sort();

  return (
    <div style={s.container}>
      <Topbar user={{ nome: 'Admin' }} />
      <div style={s.content}>
        <h2 style={s.title}>Tabelas de Faixas de Peso</h2>

        {loading ? <div style={s.loadingText}>Carregando...</div>
        : nomes.length === 0 ? <div style={s.emptyText}>Nenhuma tabela cadastrada</div>
        : nomes.map(nome => {
            const faixas = tabelas[nome];
            const colors = { 'Tab_1': '#0d6efd', 'Tab_2': '#198754', 'Tab_3': '#dc3545' };
            const color = colors[nome] || '#f0c040';
            return (
              <div key={nome} style={s.card}>
                <div style={s.cardHeader(color)}>
                  <h5 style={s.cardTitle}>{nome}</h5>
                  <div>
                    <button style={s.btnSm('#ffc107', '#0d0f14')} onClick={() => abrirAddFaixa(nome)}>+ Faixa</button>
                    <button style={s.btnSm('#dc3545', '#fff')} onClick={() => handleExcluirTabela(nome)}>Excluir Tabela</button>
                  </div>
                </div>
                <div style={s.cardBody}>
                  <table style={s.table}>
                    <thead><tr>
                      <th style={s.th}>Peso De</th>
                      <th style={s.th}>Peso Até</th>
                      <th style={s.th}>Faixa</th>
                      <th style={s.th}>Valor (R$)</th>
                      <th style={s.th}>Ações</th>
                    </tr></thead>
                    <tbody>
                      {faixas.map(f => (
                        <tr key={f.id}>
                          <td style={s.td}>{f.peso_de}</td>
                          <td style={s.td}>{f.peso_ate}</td>
                          <td style={s.td}>{f.faixas || '—'}</td>
                          <td style={s.td}>{f.valor_peso}</td>
                          <td style={{ ...s.td, whiteSpace: 'nowrap' }}>
                            <button style={s.btnSm('#ffc107', '#0d0f14')} onClick={() => abrirEditarFaixa(f)}>Editar</button>
                            <button style={s.btnSm('#dc3545', '#fff')} onClick={() => handleExcluirFaixa(f.id)}>Excluir</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        }
      </div>

      <div style={{ position: 'fixed', bottom: 32, right: 32 }}>
        <button style={{ ...s.btn('#f0c040', '#0d0f14'), margin: 0, padding: '12px 24px', fontSize: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
          onClick={abrirNovaTabela}>+ Nova Tabela</button>
      </div>

      {modalTipo === 'nova' && (
        <div style={s.overlay} onClick={fecharModal}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.mh}>
              <h3 style={s.mt}>Nova Tabela</h3>
              <button style={s.x} onClick={fecharModal}>&times;</button>
            </div>
            <div style={s.mb}>
              {error && <div style={s.errorMsg}>{error}</div>}
              <div style={s.field}>
                <label style={s.label}>Nome da Tabela</label>
                <input style={s.input} value={novaTabelaNome}
                  onChange={(e) => setNovaTabelaNome(e.target.value)}
                  placeholder="Ex: Tab_4" />
              </div>
              <label style={s.label}>Faixas de Peso</label>
              <table style={s.miniTable}>
                <thead><tr>
                  <th style={s.mth}>Peso De</th>
                  <th style={s.mth}>Peso Até</th>
                  <th style={s.mth}>Faixa</th>
                  <th style={s.mth}>Valor (R$)</th>
                </tr></thead>
                <tbody>
                  {novasFaixas.map((f, i) => (
                    <tr key={i}>
                      <td style={s.mtd}><input style={s.inputP} value={f.peso_de} disabled /></td>
                      <td style={s.mtd}><input style={s.inputP} value={f.peso_ate} disabled /></td>
                      <td style={s.mtd}><input style={s.inputP} value={f.faixas} disabled /></td>
                      <td style={s.mtd}><input style={s.input} value={f.valor_peso}
                        onChange={(e) => handleNovaFaixaChange(i, 'valor_peso', e.target.value)}
                        placeholder="0.00" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
                <button style={s.btnSm('#6c757d', '#fff')} onClick={fecharModal}>Cancelar</button>
                <button style={s.btnSm('#198754', '#fff')} onClick={handleSalvarNovaTabela} disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Criar Tabela'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalTipo === 'editar' && editandoFaixa && (
        <div style={s.overlay} onClick={fecharModal}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.mh}>
              <h3 style={s.mt}>Editar Faixa</h3>
              <button style={s.x} onClick={fecharModal}>&times;</button>
            </div>
            <div style={s.mb}>
              {error && <div style={s.errorMsg}>{error}</div>}
              <div style={s.field}>
                <label style={s.label}>Tabela</label>
                <input style={s.inputP} value={editandoFaixa.nome_tabela} disabled />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ ...s.field, flex: 1 }}>
                  <label style={s.label}>Peso De</label>
                  <input style={s.inputP} type="number" step="0.001"
                    value={editandoFaixa.peso_de} disabled />
                </div>
                <div style={{ ...s.field, flex: 1 }}>
                  <label style={s.label}>Peso Até</label>
                  <input style={s.inputP} type="number" step="0.001"
                    value={editandoFaixa.peso_ate} disabled />
                </div>
              </div>
              <div style={s.field}>
                <label style={s.label}>Faixa (descrição)</label>
                <input style={s.inputP} value={editandoFaixa.faixas || ''} disabled />
              </div>
              <div style={s.field}>
                <label style={s.label}>Valor (R$)</label>
                <input style={s.input} type="number" step="0.01"
                  value={editandoFaixa.valor_peso}
                  onChange={(e) => setEditandoFaixa({ ...editandoFaixa, valor_peso: e.target.value })} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
                <button style={s.btnSm('#6c757d', '#fff')} onClick={fecharModal}>Cancelar</button>
                <button style={s.btnSm('#198754', '#fff')} onClick={handleSalvarEdicao} disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalTipo === 'add' && (
        <div style={s.overlay} onClick={fecharModal}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.mh}>
              <h3 style={s.mt}>Nova Faixa — {addFaixaTabela}</h3>
              <button style={s.x} onClick={fecharModal}>&times;</button>
            </div>
            <div style={s.mb}>
              {error && <div style={s.errorMsg}>{error}</div>}
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ ...s.field, flex: 1 }}>
                  <label style={s.label}>Peso De</label>
                  <input style={s.input} type="number" step="0.001"
                    value={novaFaixaForm.peso_de}
                    onChange={(e) => setNovaFaixaForm({ ...novaFaixaForm, peso_de: e.target.value })} />
                </div>
                <div style={{ ...s.field, flex: 1 }}>
                  <label style={s.label}>Peso Até</label>
                  <input style={s.input} type="number" step="0.001"
                    value={novaFaixaForm.peso_ate}
                    onChange={(e) => setNovaFaixaForm({ ...novaFaixaForm, peso_ate: e.target.value })} />
                </div>
              </div>
              <div style={s.field}>
                <label style={s.label}>Valor (R$)</label>
                <input style={s.input} type="number" step="0.01"
                  value={novaFaixaForm.valor_peso}
                  onChange={(e) => setNovaFaixaForm({ ...novaFaixaForm, valor_peso: e.target.value })} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
                <button style={s.btnSm('#6c757d', '#fff')} onClick={fecharModal}>Cancelar</button>
                <button style={s.btnSm('#198754', '#fff')} onClick={handleSalvarAddFaixa} disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Adicionar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

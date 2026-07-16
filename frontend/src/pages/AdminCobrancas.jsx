import { useState, useEffect } from 'react';
import {
  listarCobrancas, criarCobranca, buscarMotoristaPorCTE,
  desativarCobranca, getMotoristas,
} from '../services/api';
import Topbar from '../components/Topbar';

export default function AdminCobrancas() {
  const [cobrancas, setCobrancas] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [ncte, setNcte] = useState('');
  const [motoristaEncontrado, setMotoristaEncontrado] = useState(null);
  const [matriculaSel, setMatriculaSel] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [parcelas, setParcelas] = useState(1);
  const [observacao, setObservacao] = useState('');
  const [criando, setCriando] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    load();
    getMotoristas().then(setMotoristas).catch(() => {});
  }, []);

  async function load() {
    try {
      setLoading(true);
      const data = await listarCobrancas();
      setCobrancas(data);
    } catch {
      setError('Erro ao carregar cobranças');
    } finally {
      setLoading(false);
    }
  }

  async function handleBuscar() {
    setError('');
    setMotoristaEncontrado(null);
    setMatriculaSel('');
    if (!ncte.trim()) return;
    try {
      const m = await buscarMotoristaPorCTE(ncte.trim());
      setMotoristaEncontrado(m);
      setMatriculaSel(String(m.matricula));
    } catch (err) {
      setError(err.response?.data?.error || 'CTE não encontrado');
    }
  }

  async function handleCriar(e) {
    e.preventDefault();
    setError('');
    setMsg('');
    if (!ncte.trim() || !matriculaSel || !valorTotal || Number(valorTotal) <= 0) {
      setError('Preencha NCTE, motorista e valor total');
      return;
    }
    setCriando(true);
    try {
      await criarCobranca({
        ncte: ncte.trim(),
        matricula: Number(matriculaSel),
        valor_total: Number(valorTotal),
        parcelas: Number(parcelas),
        observacao,
      });
      setMsg('Cobrança criada com sucesso!');
      setNcte('');
      setMotoristaEncontrado(null);
      setMatriculaSel('');
      setValorTotal('');
      setParcelas(1);
      setObservacao('');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar cobrança');
    } finally {
      setCriando(false);
      setTimeout(() => setMsg(''), 4000);
    }
  }

  async function handleDesativar(id) {
    if (!window.confirm('Desativar esta cobrança?')) return;
    try {
      await desativarCobranca(id);
      load();
    } catch {
      setError('Erro ao desativar cobrança');
    }
  }

  function formatMoney(v) {
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  const s = {
    container: { minHeight: '100vh', background: '#0d0f14', color: '#e8eaf0', fontFamily: "'IBM Plex Sans', sans-serif" },
    content: { maxWidth: 1200, margin: '0 auto', padding: '32px 24px' },
    title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '2px', color: '#f0c040', marginBottom: 24 },
    section: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, padding: 20, marginBottom: 24 },
    sectionTitle: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: '1.5px', color: '#f0c040', marginBottom: 16 },
    label: { fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: "'IBM Plex Mono', monospace", marginBottom: 4 },
    input: { background: '#1e2230', border: '1px solid #2a2f3e', color: '#e8eaf0', padding: '8px 12px', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' },
    inputRow: { display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 12 },
    select: { background: '#1e2230', border: '1px solid #2a2f3e', color: '#e8eaf0', padding: '8px 12px', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem', width: '100%' },
    btn: { background: '#f0c040', color: '#0d0f14', border: 'none', padding: '8px 16px', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },
    btnSmall: { background: '#2a2f3e', color: '#e8eaf0', border: 'none', padding: '4px 10px', borderRadius: 3, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', cursor: 'pointer' },
    btnDanger: { background: '#ff5a5a', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 3, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', cursor: 'pointer' },
    disabled: { opacity: 0.5, cursor: 'not-allowed' },
    errorMsg: { color: '#ff5a5a', fontSize: '0.8rem', marginBottom: 12, fontFamily: "'IBM Plex Mono', monospace" },
    successMsg: { color: '#3de8a0', fontSize: '0.8rem', marginBottom: 12, fontFamily: "'IBM Plex Mono', monospace" },
    tableCard: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, overflow: 'hidden' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' },
    th: { padding: '8px 10px', textAlign: 'left', color: '#6b7280', borderBottom: '1px solid #2a2f3e', background: '#1e2230', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' },
    td: { padding: '6px 10px', borderBottom: '1px solid #2a2f3e', color: '#e8eaf0', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' },
    tdNum: { padding: '6px 10px', borderBottom: '1px solid #2a2f3e', color: '#e8eaf0', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', textAlign: 'right' },
    progressWrap: { width: 80, height: 6, background: '#2a2f3e', borderRadius: 3, overflow: 'hidden', display: 'inline-block', verticalAlign: 'middle' },
    progressBar: { height: '100%', borderRadius: 3, transition: 'width 0.5s' },
  };

  return (
    <div style={s.container}>
      <Topbar user={{ nome: 'Admin' }} />
      <div style={s.content}>
        <h2 style={s.title}>Cobranças de CTEs</h2>

        {error && <div style={s.errorMsg}>{error}</div>}
        {msg && <div style={s.successMsg}>{msg}</div>}

        <div style={s.section}>
          <h3 style={s.sectionTitle}>Nova Cobrança</h3>
          <form onSubmit={handleCriar}>
            <div style={s.inputRow}>
              <div style={{ flex: 1 }}>
                <div style={s.label}>NCTE</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={s.input} value={ncte} onChange={e => setNcte(e.target.value)} placeholder="Ex: 123456" />
                  <button type="button" style={s.btn} onClick={handleBuscar}>Buscar</button>
                </div>
              </div>
            </div>

            {motoristaEncontrado && (
              <div style={{ marginBottom: 12, padding: 12, background: '#0d0f14', borderRadius: 4, border: '1px solid #2a2f3e' }}>
                <div style={s.label}>Motorista do CTE</div>
                <select style={s.select} value={matriculaSel} onChange={e => setMatriculaSel(e.target.value)}>
                  <option value={motoristaEncontrado.matricula}>
                    {motoristaEncontrado.nome} (mat. {motoristaEncontrado.matricula})
                  </option>
                  {motoristas
                    .filter(m => String(m.matricula) !== String(motoristaEncontrado.matricula))
                    .map(m => (
                      <option key={m.matricula} value={m.matricula}>{m.nome_completo} (mat. {m.matricula})</option>
                    ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={s.label}>Valor Total (R$)</div>
                <input style={s.input} type="number" step="0.01" min="0.01" value={valorTotal} onChange={e => setValorTotal(e.target.value)} placeholder="0,00" />
              </div>
              <div style={{ width: 120 }}>
                <div style={s.label}>Parcelas</div>
                <input style={s.input} type="number" min="1" value={parcelas} onChange={e => setParcelas(Math.max(1, Number(e.target.value)))} />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={s.label}>Observação</div>
              <textarea style={{ ...s.input, minHeight: 60, resize: 'vertical' }} value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Motivo da cobrança..." />
            </div>

            <button type="submit" style={{ ...s.btn, ...(criando ? s.disabled : {}) }} disabled={criando}>
              {criando ? 'Criando...' : 'Criar Cobrança'}
            </button>
          </form>
        </div>

        <div style={s.section}>
          <h3 style={s.sectionTitle}>Cobranças Ativas</h3>
          {loading ? (
            <div style={{ color: '#6b7280', textAlign: 'center', padding: 20 }}>Carregando...</div>
          ) : cobrancas.length === 0 ? (
            <div style={{ color: '#6b7280', textAlign: 'center', padding: 20 }}>Nenhuma cobrança</div>
          ) : (
            <div style={s.tableCard}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>NCTE</th>
                    <th style={s.th}>Motorista</th>
                    <th style={{ ...s.th, textAlign: 'right' }}>Valor Total</th>
                    <th style={{ ...s.th, textAlign: 'right' }}>Restante</th>
                    <th style={{ ...s.th, textAlign: 'center' }}>Parcelas</th>
                    <th style={{ ...s.th, textAlign: 'right' }}>Progresso</th>
                    <th style={s.th}>Obs</th>
                    <th style={s.th}>Criado em</th>
                    <th style={s.th}>Status</th>
                    <th style={s.th}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {cobrancas.map((c, i) => {
                    const pct = c.valor_total > 0 ? ((c.valor_total - c.valor_restante) / c.valor_total) * 100 : 0;
                    const cor = c.ativo ? (pct < 50 ? '#ff5a5a' : pct < 100 ? '#ff9f40' : '#3de8a0') : '#6b7280';
                    return (
                      <tr key={c.id} style={{ background: i % 2 === 0 ? 'transparent' : '#0d0f14' }}>
                        <td style={s.td}>{c.ncte}</td>
                        <td style={s.td}>{c.motorista_nome || `Mat. ${c.matricula}`}</td>
                        <td style={s.tdNum}>{formatMoney(c.valor_total)}</td>
                        <td style={s.tdNum}>{formatMoney(c.valor_restante)}</td>
                        <td style={{ ...s.td, textAlign: 'center' }}>{c.parcelas_pagas}/{c.parcelas}</td>
                        <td style={s.tdNum}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                            <div style={s.progressWrap}>
                              <div style={{ ...s.progressBar, width: `${Math.min(pct, 100)}%`, background: cor }} />
                            </div>
                            <span style={{ color: cor, fontSize: '0.65rem' }}>{pct.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td style={{ ...s.td, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.observacao || '—'}</td>
                        <td style={s.td}>{new Date(c.criado_em).toLocaleDateString('pt-BR')}</td>
                        <td style={s.td}>
                          <span style={{ color: c.ativo ? '#ff9f40' : '#6b7280', fontSize: '0.65rem', fontWeight: 600 }}>
                            {c.ativo ? 'Ativa' : 'Quitada'}
                          </span>
                        </td>
                        <td style={s.td}>
                          {c.ativo && (
                            <button style={s.btnDanger} onClick={() => handleDesativar(c.id)}>Desativar</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

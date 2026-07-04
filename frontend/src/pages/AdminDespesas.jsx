import { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import {
  getAdminQuinzenas, getResumo,
  getDespesas, createDespesa, updateDespesa, deleteDespesa, getResumoDespesas,
} from '../services/api';
import Topbar from '../components/Topbar';

const CATEGORIAS = [
  { value: 'impostos', label: 'Impostos', color: '#ff5a5a' },
  { value: 'aluguel', label: 'Aluguel', color: '#f0c040' },
  { value: 'pessoal', label: 'Pessoal', color: '#3de8a0' },
  { value: 'insumos', label: 'Insumos', color: '#4fc3f7' },
  { value: 'internet', label: 'Internet', color: '#ab47bc' },
  { value: 'entregadores', label: 'Entregadores', color: '#ff6f00' },
  { value: 'outros', label: 'Outros', color: '#78909c' },
];
const CAT_CORES = Object.fromEntries(CATEGORIAS.map((c) => [c.value, c.color]));

function formatQuinzena(inicio, fim) {
  const i = String(inicio).slice(0, 10).split('-');
  const f = String(fim).slice(0, 10).split('-');
  return `${i[2]}/${i[1]}/${i[0].slice(2)} a ${f[2]}/${f[1]}/${f[0].slice(2)}`;
}

const formatMoney = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function AdminDespesas() {
  const [quinzenas, setQuinzenas] = useState([]);
  const [qzIdx, setQzIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [resumo, setResumo] = useState(null);
  const [despesas, setDespesas] = useState([]);
  const [resumoDesp, setResumoDesp] = useState(null);

  const [filtroCategoria, setFiltroCategoria] = useState('');

  const [modal, setModal] = useState(null);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ descricao: '', valor: '', categoria: '', data: '', observacao: '' });
  const [saving, setSaving] = useState(false);

  const qzAtual = quinzenas[qzIdx] || null;

  useEffect(() => {
    getAdminQuinzenas()
      .then(setQuinzenas)
      .catch(() => setError('Erro ao carregar quinzenas'))
      .finally(() => setLoading(false));
  }, []);

  const fetchData = async (i, f) => {
    setLoading(true);
    setError('');
    try {
      const [r, d, rd] = await Promise.all([
        getResumo(i, f),
        getDespesas(i, f),
        getResumoDespesas(i, f),
      ]);
      setResumo(r);
      setDespesas(d);
      setResumoDesp(rd);
    } catch {
      setError('Erro ao buscar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!qzAtual) return;
    fetchData(qzAtual.inicio.slice(0, 10), qzAtual.fim.slice(0, 10));
  }, [qzAtual?.inicio, qzAtual?.fim]);

  const handlePrev = () => {
    if (qzIdx < quinzenas.length - 1) setQzIdx(qzIdx + 1);
  };
  const handleNext = () => {
    if (qzIdx > 0) setQzIdx(qzIdx - 1);
  };

  const abrirModal = (despesa) => {
    if (despesa) {
      setEditando(despesa.id);
      setForm({
        descricao: despesa.descricao,
        valor: String(despesa.valor),
        categoria: despesa.categoria,
        data: String(despesa.data).slice(0, 10),
        observacao: despesa.observacao || '',
      });
    } else {
      setEditando(null);
      setForm({ descricao: '', valor: '', categoria: 'outros', data: new Date().toISOString().slice(0, 10), observacao: '' });
    }
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.descricao || !form.valor || !form.categoria) {
      setError('Preencha descrição, valor e categoria');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        descricao: form.descricao,
        valor: Number(form.valor),
        categoria: form.categoria,
        data: form.data,
        observacao: form.observacao || null,
      };
      if (editando) {
        await updateDespesa(editando, payload);
      } else {
        await createDespesa(payload);
      }
      setModal(false);
      if (qzAtual) fetchData(qzAtual.inicio.slice(0, 10), qzAtual.fim.slice(0, 10));
    } catch {
      setError('Erro ao salvar despesa');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir esta despesa?')) return;
    try {
      await deleteDespesa(id);
      if (qzAtual) fetchData(qzAtual.inicio.slice(0, 10), qzAtual.fim.slice(0, 10));
    } catch {
      setError('Erro ao excluir despesa');
    }
  };

  const receita = useMemo(() => Number(resumo?.total_receita || 0), [resumo]);
  const totalDesp = useMemo(() => Number(resumoDesp?.total || 0), [resumoDesp]);
  const saldo = receita - totalDesp;
  const margemPct = receita > 0 ? ((saldo / receita) * 100).toFixed(1) : 0;

  const pizzaData = useMemo(() => {
    if (!resumoDesp?.categorias) return [];
    return resumoDesp.categorias.map((c) => ({
      ...c,
      color: CAT_CORES[c.categoria] || '#78909c',
    }));
  }, [resumoDesp]);

  const despesasFiltradas = useMemo(() => {
    if (!filtroCategoria) return despesas;
    return despesas.filter((d) => d.categoria === filtroCategoria);
  }, [despesas, filtroCategoria]);

  const s = {
    container: { minHeight: '100vh', background: '#0d0f14', color: '#e8eaf0', fontFamily: "'IBM Plex Sans', sans-serif" },
    content: { maxWidth: 1400, margin: '0 auto', padding: '32px 24px' },
    title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '2px', color: '#f0c040', marginBottom: 8 },
    navRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' },
    navArrows: { display: 'flex', alignItems: 'center', gap: 12 },
    arrowBtn: { background: '#161920', border: '1px solid #2a2f3e', color: '#e8eaf0', padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: '1rem' },
    qzLabel: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem', color: '#6b7280' },
    errorMsg: { color: '#ff5a5a', fontSize: '0.85rem', marginBottom: 16 },
    kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 28 },
    kpiCard: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, padding: '14px 16px' },
    kpiLabel: { fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: "'IBM Plex Mono', monospace" },
    kpiValue: { fontSize: '1.3rem', fontWeight: 700, marginTop: 4 },
    section: { marginBottom: 32 },
    sectionTitle: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: '1.5px', color: '#f0c040', marginBottom: 12 },
    flexRow: { display: 'flex', gap: 20 },
    flexCol: { flex: 1, minWidth: 0 },
    chartCard: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' },
    tableCard: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, overflow: 'hidden' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' },
    th: { padding: '8px 10px', textAlign: 'left', color: '#6b7280', borderBottom: '1px solid #2a2f3e', background: '#1e2230', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' },
    td: { padding: '6px 10px', borderBottom: '1px solid #2a2f3e', color: '#e8eaf0', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' },
    tdNum: { padding: '6px 10px', borderBottom: '1px solid #2a2f3e', color: '#e8eaf0', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', textAlign: 'right' },
    btn: { background: '#f0c040', color: '#0d0f14', border: 'none', padding: '8px 18px', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' },
    btnSm: { background: 'transparent', border: '1px solid #2a2f3e', color: '#e8eaf0', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: '0.72rem' },
    btnDanger: { background: 'transparent', border: '1px solid #ff5a5a', color: '#ff5a5a', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: '0.72rem' },
    filterSelect: { background: '#1e2230', border: '1px solid #2a2f3e', color: '#e8eaf0', padding: '6px 12px', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem' },
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
    modal: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, padding: 28, width: 420, maxWidth: '90vw' },
    modalTitle: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', color: '#f0c040', marginBottom: 20 },
    field: { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 },
    label: { fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px' },
    input: { background: '#1e2230', border: '1px solid #2a2f3e', color: '#e8eaf0', padding: '8px 12px', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem' },
    textarea: { background: '#1e2230', border: '1px solid #2a2f3e', color: '#e8eaf0', padding: '8px 12px', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem', resize: 'vertical' },
    modalBtns: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 },
  };

  const green = '#3de8a0';
  const red = '#ff5a5a';

  return (
    <div style={s.container}>
      <Topbar user={{ nome: 'Admin' }} />
      <div style={s.content}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 style={s.title}>Despesas</h2>
          <button style={s.btn} onClick={() => abrirModal(null)}>+ Nova Despesa</button>
        </div>

        <div style={s.navRow}>
          <div style={s.navArrows}>
            <button style={s.arrowBtn} onClick={handlePrev} disabled={qzIdx >= quinzenas.length - 1}>‹ Anterior</button>
            <span style={s.qzLabel}>{qzAtual ? formatQuinzena(qzAtual.inicio, qzAtual.fim) : ''}</span>
            <button style={s.arrowBtn} onClick={handleNext} disabled={qzIdx <= 0}>Próxima ›</button>
          </div>
          <select style={s.filterSelect} value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
            <option value="">Todas as categorias</option>
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {error && <div style={s.errorMsg}>{error}</div>}
        {loading && <div style={{ textAlign: 'center', color: '#f0c040', padding: 40, fontSize: '0.85rem' }}>Carregando...</div>}

        {!loading && resumo && (
          <>
            <div style={s.kpiGrid}>
              <div style={s.kpiCard}>
                <div style={s.kpiLabel}>Receita</div>
                <div style={{ ...s.kpiValue, color: '#3de8a0' }}>{formatMoney(receita)}</div>
              </div>
              <div style={s.kpiCard}>
                <div style={s.kpiLabel}>Despesas</div>
                <div style={{ ...s.kpiValue, color: '#ff5a5a' }}>{formatMoney(totalDesp)}</div>
              </div>
              <div style={s.kpiCard}>
                <div style={s.kpiLabel}>Saldo</div>
                <div style={{ ...s.kpiValue, color: saldo >= 0 ? '#3de8a0' : '#ff5a5a' }}>{formatMoney(saldo)}</div>
              </div>
              <div style={s.kpiCard}>
                <div style={s.kpiLabel}>Margem</div>
                <div style={{ ...s.kpiValue, color: saldo >= 0 ? '#3de8a0' : '#ff5a5a' }}>{margemPct}%</div>
              </div>
              <div style={s.kpiCard}>
                <div style={s.kpiLabel}>Qtd Despesas</div>
                <div style={s.kpiValue}>{despesas.length}</div>
              </div>
            </div>

            <div style={s.section}>
              <h3 style={s.sectionTitle}>Despesas por Categoria</h3>
              {pizzaData.length === 0 ? (
                <div style={{ color: '#6b7280', fontSize: '0.85rem', padding: 20 }}>Nenhuma despesa no período</div>
              ) : (
                <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                  <div style={{ ...s.chartCard, flex: 'none', width: 300 }}>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={pizzaData} dataKey="total" nameKey="categoria" cx="50%" cy="50%" outerRadius={90} innerRadius={40} label={({ categoria, percent }) => `${CATEGORIAS.find(c=>c.value===categoria)?.label||categoria} ${(percent*100).toFixed(0)}%`}>
                          {pizzaData.map((e, i) => (
                            <Cell key={i} fill={e.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#1e2230', border: '1px solid #2a2f3e', borderRadius: 4, fontSize: '0.75rem' }} formatter={(v) => formatMoney(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ flex: 1 }}>
                    {pizzaData.map((c) => (
                      <div key={c.categoria} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #2a2f3e', fontSize: '0.82rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, display: 'inline-block' }} />
                          {CATEGORIAS.find((x) => x.value === c.categoria)?.label || c.categoria}
                        </div>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#e8eaf0' }}>{formatMoney(c.total)} <span style={{ color: '#6b7280', fontSize: '0.72rem' }}>({c.qtd}x)</span></div>
                      </div>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', fontSize: '0.85rem', fontWeight: 700, borderTop: '1px solid #2a2f3e', marginTop: 4 }}>
                      <span style={{ color: '#f0c040' }}>TOTAL</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#ff5a5a' }}>{formatMoney(totalDesp)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={s.section}>
              <h3 style={s.sectionTitle}>Lista de Despesas</h3>
              {despesasFiltradas.length === 0 ? (
                <div style={{ color: '#6b7280', fontSize: '0.85rem', padding: 20 }}>Nenhuma despesa encontrada</div>
              ) : (
                <div style={s.tableCard}>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        <th style={s.th}>Data</th>
                        <th style={s.th}>Descrição</th>
                        <th style={s.th}>Categoria</th>
                        <th style={{ ...s.th, textAlign: 'right' }}>Valor</th>
                        <th style={s.th}>Observação</th>
                        <th style={{ ...s.th, textAlign: 'center' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {despesasFiltradas.map((d, i) => (
                        <tr key={d.id} style={{ background: i % 2 === 0 ? 'transparent' : '#0d0f14' }}>
                          <td style={s.td}>{String(d.data).slice(0, 10)}</td>
                          <td style={s.td}>{d.descricao}</td>
                          <td style={s.td}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: CAT_CORES[d.categoria] || '#78909c', display: 'inline-block' }} />
                              {CATEGORIAS.find((c) => c.value === d.categoria)?.label || d.categoria}
                            </span>
                          </td>
                          <td style={s.tdNum}>{formatMoney(d.valor)}</td>
                          <td style={{ ...s.td, color: '#6b7280', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.observacao || '—'}</td>
                          <td style={{ ...s.td, textAlign: 'center' }}>
                            <button style={{ ...s.btnSm, marginRight: 4 }} onClick={() => abrirModal(d)}>Editar</button>
                            <button style={s.btnDanger} onClick={() => handleDelete(d.id)}>Excluir</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {!loading && !resumo && !error && (
          <div style={{ color: '#6b7280', fontSize: '0.9rem', padding: 40, textAlign: 'center' }}>Selecione uma quinzena para visualizar</div>
        )}

        {/* Modal */}
        {modal && (
          <div style={s.overlay} onClick={() => setModal(false)}>
            <div style={s.modal} onClick={(e) => e.stopPropagation()}>
              <div style={s.modalTitle}>{editando ? 'Editar Despesa' : 'Nova Despesa'}</div>
              <div style={s.field}>
                <label style={s.label}>Descrição</label>
                <input style={s.input} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Aluguel do galpão" />
              </div>
              <div style={s.field}>
                <label style={s.label}>Valor (R$)</label>
                <input style={s.input} type="number" step="0.01" min="0" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Categoria</label>
                <select style={s.input} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                  {CATEGORIAS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Data</label>
                <input style={s.input} type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Observação</label>
                <textarea style={s.textarea} rows={2} value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
              </div>
              {error && <div style={{ color: '#ff5a5a', fontSize: '0.8rem', marginBottom: 10 }}>{error}</div>}
              <div style={s.modalBtns}>
                <button style={{ ...s.btnSm, padding: '8px 18px' }} onClick={() => setModal(false)}>Cancelar</button>
                <button style={{ ...s.btn, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

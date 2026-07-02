import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import {
  getResumo, getAdminQuinzenas, getMotoristas,
  getDistribuicaoRotas, getEvolucaoQuinzenal, getComparativoMotoristas,
} from '../services/api';
import Topbar from '../components/Topbar';

const ROTA_CORES = ['#f0c040', '#3de8a0', '#ff5a5a', '#4fc3f7', '#ab47bc', '#ff7043', '#8d6e63', '#78909c'];

function formatQuinzena(inicio, fim) {
  const i = String(inicio).slice(0, 10).split('-');
  const f = String(fim).slice(0, 10).split('-');
  return `${i[2]}/${i[1]}/${i[0].slice(2)} a ${f[2]}/${f[1]}/${f[0].slice(2)}`;
}

function formatDate(d) {
  const p = String(d).slice(0, 10).split('-');
  return `${p[2]}/${p[1]}`;
}

export default function AdminAnalytics() {
  const [quinzenas, setQuinzenas] = useState([]);
  const [qzIdx, setQzIdx] = useState(0);
  const [resumo, setResumo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [motoristas, setMotoristas] = useState([]);
  const [filtroMotorista, setFiltroMotorista] = useState('');
  const [sortKey, setSortKey] = useState('margem_bruta');
  const [sortDir, setSortDir] = useState('desc');

  const [distribuicao, setDistribuicao] = useState([]);
  const [evolucao, setEvolucao] = useState([]);
  const [comparativo, setComparativo] = useState(null);
  const [extraLoading, setExtraLoading] = useState(false);

  const qzAtual = quinzenas[qzIdx] || null;

  useEffect(() => {
    getMotoristas().then(setMotoristas).catch(() => {});
  }, []);

  useEffect(() => {
    getAdminQuinzenas()
      .then(setQuinzenas)
      .catch(() => setError('Erro ao carregar quinzenas'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!qzAtual) return;
    setLoading(true);
    setError('');
    const i = qzAtual.inicio.slice(0, 10);
    const f = qzAtual.fim.slice(0, 10);
    setExtraLoading(true);
    Promise.all([
      getResumo(i, f),
      getDistribuicaoRotas(i, f),
      getComparativoMotoristas(i, f),
    ])
      .then(([r, d, c]) => {
        setResumo(r);
        setDistribuicao(d);
        setComparativo(c);
      })
      .catch(() => setError('Erro ao buscar dados'))
      .finally(() => { setLoading(false); setExtraLoading(false); });
  }, [qzAtual?.inicio, qzAtual?.fim]);

  useEffect(() => {
    if (evolucao.length > 0) return;
    getEvolucaoQuinzenal(12)
      .then(setEvolucao)
      .catch(() => {});
  }, []);

  const handlePrev = () => {
    if (qzIdx < quinzenas.length - 1) setQzIdx(qzIdx + 1);
  };
  const handleNext = () => {
    if (qzIdx > 0) setQzIdx(qzIdx - 1);
  };

  const kpis = useMemo(() => {
    if (!resumo) return [];
    return [
      { label: 'Motoristas', value: resumo.total_motoristas, fmt: 'num' },
      { label: 'Total CT-es', value: resumo.total_ctes, fmt: 'num' },
      { label: 'Receita Total', value: Number(resumo.total_receita), fmt: 'money' },
      { label: 'Total a Pagar', value: Number(resumo.total_pagar), fmt: 'money' },
      { label: 'Margem Bruta', value: Number(resumo.total_margem), fmt: 'money' },
      { label: 'Multas', value: Number(resumo.total_multa), fmt: 'money' },
      { label: 'Bônus D0', value: Number(resumo.total_bonus_d0), fmt: 'money' },
    ];
  }, [resumo]);

  const entregasData = useMemo(() => {
    if (!resumo?.motoristas) return [];
    return resumo.motoristas
      .filter((m) => !filtroMotorista || Number(m.matricula) === Number(filtroMotorista))
      .map((m) => ({
        nome: m.nome_completo?.split(' ').slice(0, 2).join(' ') || m.matricula,
        matricula: m.matricula,
        entregas: Number(m.total_ctes),
        reclamacoes: Number(m.qtd_reclamacoes),
        receita: Number(m.receita_total),
        margem: Number(m.margem_bruta),
        pagar: Number(m.total_quinzena),
      }));
  }, [resumo, filtroMotorista]);

  const ranking = useMemo(() => {
    return [...entregasData].sort((a, b) => {
      const va = a[sortKey] ?? 0;
      const vb = b[sortKey] ?? 0;
      return sortDir === 'desc' ? vb - va : va - vb;
    });
  }, [entregasData, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const formatMoney = (v) =>
    Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const qzLabel = qzAtual ? formatQuinzena(qzAtual.inicio, qzAtual.fim) : '';

  const evolucaoChartData = useMemo(() => {
    return evolucao.map((e) => ({
      quinzena: formatDate(e.inicio),
      ctes: Number(e.total_ctes),
      receita: Number(e.total_receita),
      faturamento: Number(e.total_faturamento),
    }));
  }, [evolucao]);

  const s = {
    container: { minHeight: '100vh', background: '#0d0f14', color: '#e8eaf0', fontFamily: "'IBM Plex Sans', sans-serif" },
    content: { maxWidth: 1400, margin: '0 auto', padding: '32px 24px' },
    title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '2px', color: '#f0c040', marginBottom: 24 },
    navRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 16 },
    navArrows: { display: 'flex', alignItems: 'center', gap: 12 },
    arrowBtn: { background: '#161920', border: '1px solid #2a2f3e', color: '#e8eaf0', padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: '1rem' },
    qzLabel: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem', color: '#6b7280' },
    filterSelect: { background: '#1e2230', border: '1px solid #2a2f3e', color: '#e8eaf0', padding: '6px 12px', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem' },
    errorMsg: { color: '#ff5a5a', fontSize: '0.85rem', marginBottom: 16 },
    kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 28 },
    kpiCard: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, padding: '14px 16px' },
    kpiLabel: { fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: "'IBM Plex Mono', monospace" },
    kpiValue: { fontSize: '1.3rem', fontWeight: 700, marginTop: 4 },
    section: { marginBottom: 32 },
    sectionTitle: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: '1.5px', color: '#f0c040', marginBottom: 12 },
    flexRow: { display: 'flex', gap: 20 },
    flexCol: { flex: 1, minWidth: 0 },
    chartCard: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, padding: 20 },
    tableCard: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, overflow: 'hidden' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' },
    th: { padding: '8px 10px', textAlign: 'left', color: '#6b7280', borderBottom: '1px solid #2a2f3e', background: '#1e2230', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer', userSelect: 'none' },
    td: { padding: '6px 10px', borderBottom: '1px solid #2a2f3e', color: '#e8eaf0', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' },
    tdNum: { padding: '6px 10px', borderBottom: '1px solid #2a2f3e', color: '#e8eaf0', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', textAlign: 'right' },
    sortIcon: { marginLeft: 4, fontSize: '0.55rem' },
    mediaRow: { background: '#0d0f14', fontWeight: 600 },
    mediaTd: { padding: '6px 10px', borderBottom: '1px solid #2a2f3e', color: '#4fc3f7', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' },
    mediaTdNum: { padding: '6px 10px', borderBottom: '1px solid #2a2f3e', color: '#4fc3f7', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', textAlign: 'right' },
  };

  const chartText = { fill: '#6b7280', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" };

  const renderBarChart = (data, dataKey, label, color) => (
    <div style={s.chartCard}>
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 32)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 100, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3e" />
          <XAxis type="number" tick={chartText} axisLine={{ stroke: '#2a2f3e' }} />
          <YAxis type="category" dataKey="nome" tick={chartText} axisLine={{ stroke: '#2a2f3e' }} width={90} />
          <Tooltip contentStyle={{ background: '#1e2230', border: '1px solid #2a2f3e', borderRadius: 4, fontSize: '0.75rem' }} labelStyle={{ color: '#f0c040' }} formatter={(v) => [dataKey === 'entregas' ? v : formatMoney(v), label]} />
          <Bar dataKey={dataKey} fill={color} radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  if (loading && !resumo) {
    return (
      <div style={s.container}>
        <Topbar user={{ nome: 'Admin' }} />
        <div style={{ ...s.content, textAlign: 'center', color: '#f0c040', paddingTop: 80, fontSize: '0.85rem' }}>Carregando...</div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      <Topbar user={{ nome: 'Admin' }} />
      <div style={s.content}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 style={s.title}>Dashboard Analítico</h2>
          <select style={s.filterSelect} value={filtroMotorista} onChange={(e) => setFiltroMotorista(e.target.value)}>
            <option value="">Todos os motoristas</option>
            {motoristas.map((m) => (
              <option key={m.matricula} value={m.matricula}>{m.nome_completo}</option>
            ))}
          </select>
        </div>

        <div style={s.navRow}>
          <div style={s.navArrows}>
            <button style={s.arrowBtn} onClick={handlePrev} disabled={qzIdx >= quinzenas.length - 1}>‹ Anterior</button>
            <span style={s.qzLabel}>{qzLabel}</span>
            <button style={s.arrowBtn} onClick={handleNext} disabled={qzIdx <= 0}>Próxima ›</button>
          </div>
        </div>

        {error && <div style={s.errorMsg}>{error}</div>}
        {extraLoading && <div style={{ textAlign: 'center', color: '#f0c040', padding: 20, fontSize: '0.85rem' }}>Atualizando gráficos...</div>}

        {resumo && (
          <>
            {/* KPIs */}
            <div style={s.kpiGrid}>
              {kpis.map((k) => (
                <div key={k.label} style={s.kpiCard}>
                  <div style={s.kpiLabel}>{k.label}</div>
                  <div style={{
                    ...s.kpiValue,
                    color: k.label === 'Multas' ? '#ff5a5a' : k.label === 'Margem Bruta' ? '#3de8a0' : k.label === 'Bônus D0' ? '#ff9f40' : '#e8eaf0',
                  }}>
                    {k.fmt === 'money' ? formatMoney(k.value) : k.value}
                  </div>
                </div>
              ))}
            </div>

            {/* BarCharts + PieChart row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 32 }}>
              <div>
                <h3 style={s.sectionTitle}>Entregas por Motorista</h3>
                {entregasData.length === 0
                  ? <div style={{ color: '#6b7280', fontSize: '0.85rem', padding: 20, textAlign: 'center' }}>Nenhum dado</div>
                  : renderBarChart(entregasData, 'entregas', 'CT-es', '#f0c040')}
              </div>
              <div>
                <h3 style={s.sectionTitle}>Reclamações por Motorista</h3>
                {entregasData.length === 0
                  ? <div style={{ color: '#6b7280', fontSize: '0.85rem', padding: 20, textAlign: 'center' }}>Nenhum dado</div>
                  : renderBarChart(entregasData, 'reclamacoes', 'Reclamações', '#ff5a5a')}
              </div>
              <div>
                <h3 style={s.sectionTitle}>Distribuição por Rota</h3>
                <div style={s.chartCard}>
                  {distribuicao.length === 0
                    ? <div style={{ color: '#6b7280', fontSize: '0.85rem', padding: 40, textAlign: 'center' }}>Sem dados</div>
                    : (
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie data={distribuicao} dataKey="total_ctes" nameKey="rota" cx="50%" cy="50%" outerRadius={90} innerRadius={40} label={({ rota, percent }) => `${rota} ${(percent * 100).toFixed(0)}%`}>
                            {distribuicao.map((_, i) => (
                              <Cell key={i} fill={ROTA_CORES[i % ROTA_CORES.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ background: '#1e2230', border: '1px solid #2a2f3e', borderRadius: 4, fontSize: '0.75rem' }} formatter={(v, n) => [n === 'total_ctes' ? v : formatMoney(v)]} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 }}>
                    {distribuicao.map((r, i) => (
                      <div key={r.rota} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.65rem', color: '#6b7280' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: ROTA_CORES[i % ROTA_CORES.length], display: 'inline-block' }} />
                        {r.rota}: {r.total_ctes} CT-es
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Evolução Quinzenal */}
            {evolucaoChartData.length > 0 && (
              <div style={s.section}>
                <h3 style={s.sectionTitle}>Evolução Quinzenal (últimas {evolucao.length})</h3>
                <div style={s.chartCard}>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={evolucaoChartData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3e" />
                      <XAxis dataKey="quinzena" tick={chartText} axisLine={{ stroke: '#2a2f3e' }} />
                      <YAxis tick={chartText} axisLine={{ stroke: '#2a2f3e' }} />
                      <Tooltip contentStyle={{ background: '#1e2230', border: '1px solid #2a2f3e', borderRadius: 4, fontSize: '0.75rem' }} labelStyle={{ color: '#f0c040' }} />
                      <Legend wrapperStyle={{ fontSize: '0.7rem', color: '#6b7280' }} />
                      <Line type="monotone" dataKey="ctes" name="CT-es" stroke="#f0c040" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="receita" name="Receita (R$)" stroke="#3de8a0" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Comparativo vs Frota */}
            {comparativo && (
              <div style={s.section}>
                <h3 style={s.sectionTitle}>Comparativo vs Frota</h3>
                <div style={s.tableCard}>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        <th style={s.th}>Motorista</th>
                        <th style={{ ...s.th, textAlign: 'right' }}>CT-es</th>
                        <th style={{ ...s.th, textAlign: 'right' }}>Dif. Frota</th>
                        <th style={{ ...s.th, textAlign: 'right' }}>Receita</th>
                        <th style={{ ...s.th, textAlign: 'right' }}>Margem</th>
                        <th style={{ ...s.th, textAlign: 'right' }}>Dif. Margem</th>
                        <th style={{ ...s.th, textAlign: 'right' }}>Reclamações</th>
                        <th style={{ ...s.th, textAlign: 'right' }}>% Recl.</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={s.mediaRow}>
                        <td style={s.mediaTd}>Média da Frota</td>
                        <td style={s.mediaTdNum}>{comparativo.media_frota.media_ctes.toFixed(1)}</td>
                        <td style={s.mediaTdNum}>—</td>
                        <td style={s.mediaTdNum}>{formatMoney(comparativo.media_frota.media_receita)}</td>
                        <td style={s.mediaTdNum}>{formatMoney(comparativo.media_frota.media_margem)}</td>
                        <td style={s.mediaTdNum}>—</td>
                        <td style={s.mediaTdNum}>{comparativo.media_frota.media_reclamacoes.toFixed(1)}</td>
                        <td style={s.mediaTdNum}>{comparativo.media_frota.media_pct_reclamacao.toFixed(1)}%</td>
                      </tr>
                      {comparativo.motoristas.map((m, i) => (
                        <tr key={m.matricula} style={{ background: i % 2 === 0 ? 'transparent' : '#0d0f14' }}>
                          <td style={s.td}>{m.nome_completo?.split(' ').slice(0, 2).join(' ')}</td>
                          <td style={s.tdNum}>{m.total_ctes}</td>
                          <td style={{ ...s.tdNum, color: Number(m.diff_ctes_pct) >= 0 ? '#3de8a0' : '#ff5a5a' }}>
                            {Number(m.diff_ctes_pct) >= 0 ? '+' : ''}{m.diff_ctes_pct}%
                          </td>
                          <td style={s.tdNum}>{formatMoney(m.total_receita)}</td>
                          <td style={{ ...s.tdNum, color: Number(m.margem_bruta) >= 0 ? '#3de8a0' : '#ff5a5a' }}>{formatMoney(m.margem_bruta)}</td>
                          <td style={{ ...s.tdNum, color: Number(m.diff_margem_pct) >= 0 ? '#3de8a0' : '#ff5a5a' }}>
                            {Number(m.diff_margem_pct) >= 0 ? '+' : ''}{m.diff_margem_pct}%
                          </td>
                          <td style={{ ...s.tdNum, color: Number(m.qtd_reclamacoes) > 0 ? '#ff5a5a' : '#6b7280' }}>
                            {m.qtd_reclamacoes}
                          </td>
                          <td style={{ ...s.tdNum, color: Number(m.pct_reclamacao) > 0 ? '#ff5a5a' : '#6b7280' }}>
                            {m.pct_reclamacao}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Ranking */}
            <div style={s.section}>
              <h3 style={s.sectionTitle}>Ranking de Motoristas</h3>
              <div style={s.tableCard}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th} onClick={() => handleSort('nome')}>
                        Motorista{sortKey === 'nome' && <span style={s.sortIcon}>{sortDir === 'desc' ? '▼' : '▲'}</span>}
                      </th>
                      <th style={{ ...s.th, textAlign: 'right' }} onClick={() => handleSort('entregas')}>
                        CT-es{sortKey === 'entregas' && <span style={s.sortIcon}>{sortDir === 'desc' ? '▼' : '▲'}</span>}
                      </th>
                      <th style={{ ...s.th, textAlign: 'right' }} onClick={() => handleSort('receita')}>
                        Receita{sortKey === 'receita' && <span style={s.sortIcon}>{sortDir === 'desc' ? '▼' : '▲'}</span>}
                      </th>
                      <th style={{ ...s.th, textAlign: 'right' }} onClick={() => handleSort('pagar')}>
                        A Pagar{sortKey === 'pagar' && <span style={s.sortIcon}>{sortDir === 'desc' ? '▼' : '▲'}</span>}
                      </th>
                      <th style={{ ...s.th, textAlign: 'right' }} onClick={() => handleSort('margem')}>
                        Margem{sortKey === 'margem' && <span style={s.sortIcon}>{sortDir === 'desc' ? '▼' : '▲'}</span>}
                      </th>
                      <th style={{ ...s.th, textAlign: 'right' }} onClick={() => handleSort('reclamacoes')}>
                        Recl.{sortKey === 'reclamacoes' && <span style={s.sortIcon}>{sortDir === 'desc' ? '▼' : '▲'}</span>}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((m, i) => (
                      <tr key={m.matricula} style={{ background: i % 2 === 0 ? 'transparent' : '#0d0f14' }}>
                        <td style={s.td}>{m.nome}</td>
                        <td style={s.tdNum}>{m.entregas}</td>
                        <td style={s.tdNum}>{formatMoney(m.receita)}</td>
                        <td style={s.tdNum}>{formatMoney(m.pagar)}</td>
                        <td style={{ ...s.tdNum, color: m.margem >= 0 ? '#3de8a0' : '#ff5a5a' }}>{formatMoney(m.margem)}</td>
                        <td style={{ ...s.tdNum, color: m.reclamacoes > 0 ? '#ff5a5a' : '#6b7280' }}>{m.reclamacoes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getResumo, getAdminQuinzenas, getMotoristas } from '../services/api';
import Topbar from '../components/Topbar';

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
    getResumo(qzAtual.inicio.slice(0, 10), qzAtual.fim.slice(0, 10))
      .then(setResumo)
      .catch(() => setError('Erro ao buscar dados'))
      .finally(() => setLoading(false));
  }, [qzAtual?.inicio, qzAtual?.fim]);

  const handlePrev = () => {
    if (qzIdx < quinzenas.length - 1) setQzIdx(qzIdx + 1);
  };
  const handleNext = () => {
    if (qzIdx > 0) setQzIdx(qzIdx - 1);
  };

  const kpis = useMemo(() => {
    if (!resumo) return [];
    const cards = [
      { label: 'Motoristas', value: resumo.total_motoristas, fmt: 'num' },
      { label: 'Total CT-es', value: resumo.total_ctes, fmt: 'num' },
      { label: 'Receita Total', value: Number(resumo.total_receita), fmt: 'money' },
      { label: 'Total a Pagar', value: Number(resumo.total_pagar), fmt: 'money' },
      { label: 'Margem Bruta', value: Number(resumo.total_margem), fmt: 'money' },
      { label: 'Multas', value: Number(resumo.total_multa), fmt: 'money' },
      { label: 'Bônus D0', value: Number(resumo.total_bonus_d0), fmt: 'money' },
    ];
    return cards;
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

  const qzLabel = qzAtual
    ? `${new Date(qzAtual.inicio).toLocaleDateString('pt-BR')} - ${new Date(qzAtual.fim).toLocaleDateString('pt-BR')}`
    : '';

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
    chartCard: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, padding: 20 },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, overflow: 'hidden' },
    th: { padding: '8px 10px', textAlign: 'left', color: '#6b7280', borderBottom: '1px solid #2a2f3e', background: '#1e2230', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer', userSelect: 'none' },
    td: { padding: '6px 10px', borderBottom: '1px solid #2a2f3e', color: '#e8eaf0', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' },
    tdNum: { padding: '6px 10px', borderBottom: '1px solid #2a2f3e', color: '#e8eaf0', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', textAlign: 'right' },
    sortIcon: { marginLeft: 4, fontSize: '0.55rem' },
  };

  const chartText = { fill: '#6b7280', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" };

  const renderChart = (data, dataKey, label, color) => (
    <div style={s.chartCard}>
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 32)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 100, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3e" />
          <XAxis type="number" tick={chartText} axisLine={{ stroke: '#2a2f3e' }} />
          <YAxis type="category" dataKey="nome" tick={chartText} axisLine={{ stroke: '#2a2f3e' }} width={90} />
          <Tooltip
            contentStyle={{ background: '#1e2230', border: '1px solid #2a2f3e', borderRadius: 4, fontSize: '0.75rem' }}
            labelStyle={{ color: '#f0c040' }}
            formatter={(v) => [dataKey === 'entregas' ? v : formatMoney(v), label]}
          />
          <Bar dataKey={dataKey} fill={color} radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  if (loading && !resumo) {
    return (
      <div style={s.container}>
        <Topbar user={{ nome: 'Admin' }} />
        <div style={{ ...s.content, textAlign: 'center', color: '#f0c040', paddingTop: 80, fontSize: '0.85rem' }}>
          Carregando...
        </div>
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
            <button style={s.arrowBtn} onClick={handlePrev} disabled={qzIdx >= quinzenas.length - 1}>
              ‹ Anterior
            </button>
            <span style={s.qzLabel}>{qzLabel}</span>
            <button style={s.arrowBtn} onClick={handleNext} disabled={qzIdx <= 0}>
              Próxima ›
            </button>
          </div>
        </div>

        {error && <div style={s.errorMsg}>{error}</div>}

        {loading && <div style={{ textAlign: 'center', color: '#f0c040', padding: 40, fontSize: '0.85rem' }}>Atualizando...</div>}

        {resumo && (
          <>
            <div style={s.kpiGrid}>
              {kpis.map((k) => (
                <div key={k.label} style={s.kpiCard}>
                  <div style={s.kpiLabel}>{k.label}</div>
                  <div style={{ ...s.kpiValue, color: k.label === 'Multas' ? '#ff5a5a' : k.label === 'Margem Bruta' ? '#3de8a0' : k.label === 'Bônus D0' ? '#ff9f40' : '#e8eaf0' }}>
                    {k.fmt === 'money' ? formatMoney(k.value) : k.value}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
              <div>
                <h3 style={s.sectionTitle}>Entregas por Motorista</h3>
                {entregasData.length === 0
                  ? <div style={{ color: '#6b7280', fontSize: '0.85rem', padding: 20, textAlign: 'center' }}>Nenhum dado</div>
                  : renderChart(entregasData, 'entregas', 'CT-es', '#f0c040')}
              </div>
              <div>
                <h3 style={s.sectionTitle}>Reclamações por Motorista</h3>
                {entregasData.length === 0
                  ? <div style={{ color: '#6b7280', fontSize: '0.85rem', padding: 20, textAlign: 'center' }}>Nenhum dado</div>
                  : renderChart(entregasData, 'reclamacoes', 'Reclamações', '#ff5a5a')}
              </div>
            </div>

            <div style={s.section}>
              <h3 style={s.sectionTitle}>Ranking de Motoristas</h3>
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
          </>
        )}
      </div>
    </div>
  );
}

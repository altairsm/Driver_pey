import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell,
} from 'recharts';
import { getEntregasReclamacoes } from '../services/api';
import Topbar from '../components/Topbar';

function formatDate(d) {
  const p = String(d).slice(0, 10).split('-');
  return `${p[2]}/${p[1]}`;
}

function formatFullDate(d) {
  const p = String(d).slice(0, 10).split('-');
  return `${p[2]}/${p[1]}/${p[0]}`;
}

export default function AdminRelatorioEntregas() {
  const defFim = new Date().toISOString().slice(0, 10);
  const defInicio = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);

  const [inicio, setInicio] = useState(defInicio);
  const [fim, setFim] = useState(defFim);
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = (i, f) => {
    setLoading(true);
    setErro('');
    getEntregasReclamacoes(i, f)
      .then(setDados)
      .catch(() => setErro('Erro ao buscar dados'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    carregar(inicio, fim);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const intervalTick = useMemo(() => {
    if (dados.length <= 1) return 0;
    return Math.max(0, Math.ceil(dados.length / 12));
  }, [dados.length]);

  const diasComEvento = dados.filter((d) => Number(d.total_eventos) > 0).length;
  const diasComReclamacao = dados.filter((d) => d.tem_reclamacao).length;
  const totalReclamacoes = dados.reduce((s, d) => s + Number(d.total_reclamacoes), 0);
  const mediaReclamacoesPorDia = diasComEvento > 0 ? totalReclamacoes / diasComEvento : 0;

  const chartText = { fill: '#9ca3af', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" };

  const s = {
    container: { minHeight: '100vh', background: '#0d0f14', color: '#e8eaf0', fontFamily: "'IBM Plex Sans', sans-serif" },
    content: { maxWidth: 1400, margin: '0 auto', padding: '32px 24px' },
    title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '2px', color: '#f0c040', marginBottom: 24 },
    filterRow: { display: 'flex', gap: 16, alignItems: 'flex-end', marginBottom: 24, flexWrap: 'wrap' },
    field: { display: 'flex', flexDirection: 'column', gap: 4 },
    label: { fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: "'IBM Plex Mono', monospace" },
    input: { background: '#1e2230', border: '1px solid #2a2f3e', color: '#e8eaf0', padding: '6px 12px', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem' },
    btn: { background: '#f0c040', border: 'none', color: '#0d0f14', padding: '8px 18px', borderRadius: 4, cursor: 'pointer', fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem' },
    section: { marginBottom: 32 },
    sectionTitle: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: '1.5px', color: '#f0c040', marginBottom: 12 },
    chartCard: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, padding: 20 },
    errorMsg: { color: '#ff5a5a', fontSize: '0.85rem', marginBottom: 16 },
    kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 },
    kpiCard: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, padding: '14px 16px' },
    kpiLabel: { fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: "'IBM Plex Mono', monospace" },
    kpiValue: { fontSize: '1.6rem', fontWeight: 700, marginTop: 4 },
  };

  return (
    <div style={s.container}>
      <Topbar user={{ nome: 'Admin' }} />
      <div style={s.content}>
        <h2 style={s.title}>Entregas x Reclamações por Data</h2>

        <div style={s.filterRow}>
          <div style={s.field}>
            <span style={s.label}>Início</span>
            <input style={s.input} type="date" value={inicio} max={fim} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div style={s.field}>
            <span style={s.label}>Fim</span>
            <input style={s.input} type="date" value={fim} min={inicio} onChange={(e) => setFim(e.target.value)} />
          </div>
          <button style={s.btn} onClick={() => carregar(inicio, fim)}>Filtrar</button>
        </div>

        {erro && <div style={s.errorMsg}>{erro}</div>}

        {!loading && !erro && (
          <div style={s.kpiGrid}>
            <div style={s.kpiCard}>
              <div style={s.kpiLabel}>Dias com entrega</div>
              <div style={s.kpiValue}>{diasComEvento}</div>
            </div>
            <div style={s.kpiCard}>
              <div style={s.kpiLabel}>Dias com entrega e reclamação</div>
              <div style={{ ...s.kpiValue, color: '#ef4444' }}>{diasComReclamacao}</div>
            </div>
            <div style={s.kpiCard}>
              <div style={s.kpiLabel}>Total de reclamações</div>
              <div style={{ ...s.kpiValue, color: '#f59e0b' }}>{totalReclamacoes}</div>
            </div>
            <div style={s.kpiCard}>
              <div style={s.kpiLabel}>Média de reclamações / dia com entrega</div>
              <div style={s.kpiValue}>{mediaReclamacoesPorDia.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</div>
            </div>
          </div>
        )}
        {loading && <div style={{ textAlign: 'center', color: '#f0c040', padding: 20, fontSize: '0.85rem' }}>Carregando...</div>}

        {!loading && !erro && (
          <div style={s.section}>
            <h3 style={s.sectionTitle}>Entregas e Reclamações por Data</h3>
            <div style={s.chartCard}>
              {dados.length === 0 ? (
                <div style={{ color: '#6b7280', fontSize: '0.85rem', padding: 20, textAlign: 'center' }}>Nenhum dado no período</div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(280, dados.length * 14)}>
                  <BarChart data={dados} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3e" />
                    <XAxis dataKey="data" tickFormatter={formatDate} tick={chartText} axisLine={{ stroke: '#2a2f3e' }} interval={intervalTick} angle={-45} textAnchor="end" height={60} />
                    <YAxis tick={chartText} axisLine={{ stroke: '#2a2f3e' }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#1e2230', border: '1px solid #2a2f3e', borderRadius: 4, fontSize: '0.75rem', color: '#e8eaf0' }} labelStyle={{ color: '#f0c040' }} itemStyle={{ color: '#e8eaf0' }} labelFormatter={(l) => formatFullDate(l)} formatter={(v, name) => [name === 'Entregas' ? `${v} entrega(s)` : `${v} reclamação(ões)`, name]} />
                    <Legend wrapperStyle={{ fontSize: '0.7rem', color: '#e8eaf0' }} />
                    <Bar dataKey="total_eventos" name="Entregas" radius={[3, 3, 0, 0]}>
                      {dados.map((d, i) => (
                        <Cell key={i} fill={d.tem_reclamacao ? '#ef4444' : '#3b82f6'} />
                      ))}
                    </Bar>
                    <Bar dataKey="total_reclamacoes" name="Reclamações" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

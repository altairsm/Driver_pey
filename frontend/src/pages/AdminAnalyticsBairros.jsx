import { useState, useEffect } from 'react';
import { getAnalyticsBairros, getMotoristas, getAdminQuinzenas } from '../services/api';
import Topbar from '../components/Topbar';

function formatQuinzena(inicio, fim) {
  const i = String(inicio).slice(0, 10).split('-');
  const f = String(fim).slice(0, 10).split('-');
  return `${i[2]}/${i[1]}/${i[0].slice(2)} a ${f[2]}/${f[1]}/${f[0].slice(2)}`;
}

export default function AdminAnalyticsBairros() {
  const [quinzenas, setQuinzenas] = useState([]);
  const [qzIdx, setQzIdx] = useState(0);
  const [matricula, setMatricula] = useState('');
  const [motoristas, setMotoristas] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const qzAtual = quinzenas[qzIdx] || null;

  useEffect(() => {
    getMotoristas().then(setMotoristas).catch(() => {});
    getAdminQuinzenas()
      .then(setQuinzenas)
      .catch(() => setError('Erro ao carregar quinzenas'))
      .finally(() => setLoading(false));
  }, []);

  const fetchData = async (i, f) => {
    setError('');
    try {
      const data = await getAnalyticsBairros(i, f, matricula || undefined);
      setRows(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao gerar relatório');
    }
  };

  useEffect(() => {
    if (!qzAtual) return;
    setLoading(true);
    fetchData(qzAtual.inicio.slice(0, 10), qzAtual.fim.slice(0, 10))
      .finally(() => setLoading(false));
  }, [qzAtual?.inicio, qzAtual?.fim, matricula]);

  const handlePrev = () => {
    if (qzIdx < quinzenas.length - 1) setQzIdx(qzIdx + 1);
  };
  const handleNext = () => {
    if (qzIdx > 0) setQzIdx(qzIdx - 1);
  };

  let totalGeralCtes = 0;
  let totalGeralReceita = 0;
  let totalGeralFaturamento = 0;

  for (const r of rows) {
    totalGeralCtes += Number(r.total_ctes);
    totalGeralReceita += Number(r.total_receita_motorista);
    totalGeralFaturamento += Number(r.total_faturamento);
  }

  const s = {
    container: { minHeight: '100vh', background: '#0d0f14', color: '#e8eaf0', fontFamily: "'IBM Plex Sans', sans-serif" },
    content: { maxWidth: 1200, margin: '0 auto', padding: '32px 24px' },
    title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '2px', color: '#f0c040', marginBottom: 24 },
    filtros: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, padding: 20, marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' },
    navRow: { display: 'flex', alignItems: 'center', gap: 12 },
    arrowBtn: { background: '#1e2230', border: '1px solid #2a2f3e', color: '#e8eaf0', padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: '0.85rem' },
    qzLabel: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem', color: '#f0c040', fontWeight: 600, minWidth: 180, textAlign: 'center' },
    field: { display: 'flex', flexDirection: 'column', gap: 4 },
    label: { fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px' },
    input: { background: '#1e2230', border: '1px solid #2a2f3e', color: '#e8eaf0', padding: '8px 12px', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem' },
    btn: { background: '#f0c040', color: '#0d0f14', border: 'none', padding: '8px 24px', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' },
    errorMsg: { color: '#ff5a5a', fontSize: '0.85rem' },
    card: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, overflow: 'hidden' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' },
    th: { padding: '8px 10px', textAlign: 'left', color: '#6b7280', borderBottom: '1px solid #2a2f3e', background: '#1e2230', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' },
    td: { padding: '6px 10px', borderBottom: '1px solid #2a2f3e', color: '#e8eaf0', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' },
    tdNum: { padding: '6px 10px', borderBottom: '1px solid #2a2f3e', color: '#e8eaf0', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', textAlign: 'right' },
    totalRow: { background: '#0d0f14' },
    totalTd: { padding: '10px', color: '#f0c040', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem', fontWeight: 700 },
    totalTdNum: { padding: '10px', color: '#f0c040', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem', fontWeight: 700, textAlign: 'right' },
    emptyText: { textAlign: 'center', color: '#6b7280', padding: 40, fontSize: '0.9rem' },
    loadingText: { textAlign: 'center', color: '#f0c040', padding: 40, fontSize: '0.85rem' },
  };

  return (
    <div style={s.container}>
      <Topbar user={{ nome: 'Admin' }} />
      <div style={s.content}>
        <h2 style={s.title}>Relatório Analítico por Bairro</h2>

        <div style={s.filtros}>
          <div style={s.navRow}>
            <button onClick={handlePrev} disabled={qzIdx >= quinzenas.length - 1} style={s.arrowBtn}>
              ‹ Anterior
            </button>
            <span style={s.qzLabel}>
              {qzAtual ? formatQuinzena(qzAtual.inicio, qzAtual.fim) : '—'}
            </span>
            <button onClick={handleNext} disabled={qzIdx <= 0} style={s.arrowBtn}>
              Próximo ›
            </button>
          </div>
          <div style={s.field}>
            <label style={s.label}>Motorista</label>
            <select style={s.input} value={matricula}
              onChange={(e) => setMatricula(e.target.value)}>
              <option value="">Todos</option>
              {motoristas.map((m) => (
                <option key={m.matricula} value={m.matricula}>{m.nome_completo}</option>
              ))}
            </select>
          </div>
          {error && <div style={s.errorMsg}>{error}</div>}
        </div>

        {loading && <div style={s.loadingText}>Carregando...</div>}

        {!loading && rows.length === 0 && (
          <div style={s.emptyText}>Nenhum registro encontrado no período.</div>
        )}

        {!loading && rows.length > 0 && (
          <div style={s.card}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Bairro</th>
                  <th style={s.th}>Tabela</th>
                  <th style={s.th}>Faixa de Peso</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>Qtd CTEs</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>Receita Motorista (R$)</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>Faturamento (R$)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td style={s.td}>{r.bairro}</td>
                    <td style={s.td}>{r.nome_tabela || '—'}</td>
                    <td style={s.td}>{r.faixa_peso_desc}</td>
                    <td style={s.tdNum}>{r.total_ctes}</td>
                    <td style={s.tdNum}>{Number(r.total_receita_motorista).toFixed(2)}</td>
                    <td style={s.tdNum}>{Number(r.total_faturamento).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={s.totalRow}>
                  <td style={s.totalTd} colSpan={3}>TOTAL GERAL</td>
                  <td style={s.totalTdNum}>{totalGeralCtes}</td>
                  <td style={s.totalTdNum}>{totalGeralReceita.toFixed(2)}</td>
                  <td style={s.totalTdNum}>{totalGeralFaturamento.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

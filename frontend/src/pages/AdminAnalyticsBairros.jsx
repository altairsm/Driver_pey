import { useState } from 'react';
import { getAnalyticsBairros } from '../services/api';
import Topbar from '../components/Topbar';

export default function AdminAnalyticsBairros() {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gerou, setGerou] = useState(false);

  const handleGerar = async () => {
    if (!dataInicio || !dataFim) { setError('Selecione data inicial e final'); return; }
    setLoading(true);
    setError('');
    setGerou(false);
    try {
      const data = await getAnalyticsBairros(dataInicio, dataFim);
      setRows(data);
      setGerou(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  };

  const subtotais = {};
  let totalGeralCtes = 0;
  let totalGeralReceita = 0;
  let totalGeralFaturamento = 0;

  for (const r of rows) {
    if (!subtotais[r.bairro]) subtotais[r.bairro] = { ctes: 0, receita: 0, faturamento: 0 };
    subtotais[r.bairro].ctes += Number(r.total_ctes);
    subtotais[r.bairro].receita += Number(r.total_receita_motorista);
    subtotais[r.bairro].faturamento += Number(r.total_faturamento);
    totalGeralCtes += Number(r.total_ctes);
    totalGeralReceita += Number(r.total_receita_motorista);
    totalGeralFaturamento += Number(r.total_faturamento);
  }

  const s = {
    container: { minHeight: '100vh', background: '#0d0f14', color: '#e8eaf0', fontFamily: "'IBM Plex Sans', sans-serif" },
    content: { maxWidth: 1200, margin: '0 auto', padding: '32px 24px' },
    title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '2px', color: '#f0c040', marginBottom: 24 },
    filtros: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, padding: 20, marginBottom: 20, display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' },
    field: { display: 'flex', flexDirection: 'column', gap: 4 },
    label: { fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px' },
    input: { background: '#1e2230', border: '1px solid #2a2f3e', color: '#e8eaf0', padding: '8px 12px', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem' },
    btn: { background: '#f0c040', color: '#0d0f14', border: 'none', padding: '8px 24px', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' },
    btnDisabled: { ...s.btn, opacity: 0.5, cursor: 'not-allowed' },
    errorMsg: { color: '#ff5a5a', fontSize: '0.85rem' },
    card: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, overflow: 'hidden' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' },
    th: { padding: '8px 10px', textAlign: 'left', color: '#6b7280', borderBottom: '1px solid #2a2f3e', background: '#1e2230', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' },
    td: { padding: '6px 10px', borderBottom: '1px solid #2a2f3e', color: '#e8eaf0', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' },
    tdNum: { padding: '6px 10px', borderBottom: '1px solid #2a2f3e', color: '#e8eaf0', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', textAlign: 'right' },
    subHeader: { background: '#1e2230', fontWeight: 700, color: '#f0c040' },
    subTd: { padding: '8px 10px', borderBottom: '2px solid #2a2f3e', color: '#f0c040', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem', fontWeight: 700 },
    subTdNum: { padding: '8px 10px', borderBottom: '2px solid #2a2f3e', color: '#f0c040', fontFamily: "'IBM Plex Mono', monospace', monospace", fontSize: '0.8rem', fontWeight: 700, textAlign: 'right' },
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
          <div style={s.field}>
            <label style={s.label}>Data Início</label>
            <input type="date" style={s.input} value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Data Fim</label>
            <input type="date" style={s.input} value={dataFim}
              onChange={(e) => setDataFim(e.target.value)} />
          </div>
          <button style={loading ? s.btnDisabled : s.btn} onClick={handleGerar} disabled={loading}>
            {loading ? 'Gerando...' : 'Filtrar'}
          </button>
          {error && <div style={s.errorMsg}>{error}</div>}
        </div>

        {loading && <div style={s.loadingText}>Gerando relatório...</div>}

        {!loading && gerou && rows.length === 0 && (
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
                {rows.map((r, i) => {
                  const isFirstBairro = i === 0 || rows[i - 1].bairro !== r.bairro;
                  const isLastBairro = i === rows.length - 1 || rows[i + 1].bairro !== r.bairro;
                  return (
                    <tr key={i}>
                      <td style={s.td}>{r.bairro}</td>
                      <td style={s.td}>{r.nome_tabela || '—'}</td>
                      <td style={s.td}>{r.faixa_peso_desc}</td>
                      <td style={s.tdNum}>{r.total_ctes}</td>
                      <td style={s.tdNum}>{Number(r.total_receita_motorista).toFixed(2)}</td>
                      <td style={s.tdNum}>{Number(r.total_faturamento).toFixed(2)}</td>
                    </tr>
                  );
                })}
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

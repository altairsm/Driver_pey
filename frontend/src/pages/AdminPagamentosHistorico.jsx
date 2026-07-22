import { useState, useEffect } from 'react';
import { getPagamentosHistorico, getPagamentosPendentes, reverificarPagamento } from '../services/api';
import Topbar from '../components/Topbar';

export default function AdminPagamentosHistorico() {
  const [pagamentos, setPagamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('');
  const [reverificando, setReverificando] = useState({});

  const carregar = async () => {
    setLoading(true);
    setError('');
    try {
      const data = filtro === 'processando'
        ? await getPagamentosPendentes()
        : await getPagamentosHistorico();
      setPagamentos(data);
    } catch (err) {
      setError('Erro ao carregar pagamentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, [filtro]);

  const handleReverificar = async (id) => {
    setReverificando(prev => ({ ...prev, [id]: true }));
    try {
      const result = await reverificarPagamento(id);
      if (result.pix_estado === 'FINALIZADO') {
        setError('');
      } else if (result.pix_estado === 'EM_PROCESSAMENTO') {
        setError('Pagamento ainda em processamento.');
      } else {
        setError('Pagamento rejeitado pelo Pix.');
      }
      carregar();
    } catch (err) {
      setError('Erro ao reverificar pagamento');
    } finally {
      setReverificando(prev => ({ ...prev, [id]: false }));
    }
  };

  const formatMoney = (v) => `R$ ${(Number(v) || 0).toFixed(2).replace('.', ',')}`;
  const formatDt = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—';
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

  const statusCor = (st) => {
    if (st === 'confirmado') return '#3de8a0';
    if (st === 'processando') return '#ff9f40';
    if (st === 'rejeitado') return '#ff5a5a';
    return '#6b7280';
  };

  return (
    <div style={s.container}>
      <Topbar user={{ nome: 'Admin' }} />
      <div style={s.content}>
        <h2 style={s.title}>Histórico de Pagamentos Quinzenais</h2>

        <div style={s.filterRow}>
          <span
            style={{ ...s.filterBtn, background: !filtro ? '#f0c040' : '#1e2230', color: !filtro ? '#0d0f14' : '#6b7280' }}
            onClick={() => setFiltro('')}
          >Todos</span>
          <span
            style={{ ...s.filterBtn, background: filtro === 'confirmado' ? '#3de8a0' : '#1e2230', color: filtro === 'confirmado' ? '#0d0f14' : '#6b7280' }}
            onClick={() => setFiltro('confirmado')}
          >Confirmados</span>
          <span
            style={{ ...s.filterBtn, background: filtro === 'processando' ? '#ff9f40' : '#1e2230', color: filtro === 'processando' ? '#0d0f14' : '#6b7280' }}
            onClick={() => setFiltro('processando')}
          >Pendentes</span>
          <span
            style={{ ...s.filterBtn, background: filtro === 'rejeitado' ? '#ff5a5a' : '#1e2230', color: filtro === 'rejeitado' ? '#0d0f14' : '#6b7280' }}
            onClick={() => setFiltro('rejeitado')}
          >Rejeitados</span>
        </div>

        {error && <div style={s.error}>{error}</div>}

        {loading ? (
          <div style={s.empty}>Carregando...</div>
        ) : pagamentos.length === 0 ? (
          <div style={s.empty}>Nenhum pagamento encontrado.</div>
        ) : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Motorista</th>
                  <th style={s.th}>Quinzena</th>
                  <th style={s.th}>Entregas</th>
                  <th style={s.th}>Quinzena</th>
                  <th style={s.th}>Bônus D0</th>
                  <th style={s.th}>Multa</th>
                  <th style={s.th}>Adiantado</th>
                  <th style={s.th}>Cobranças</th>
                  <th style={s.th}>Total</th>
                  <th style={s.th}>Status Pix</th>
                  <th style={s.th}>End-to-End</th>
                  <th style={s.th}>Criado</th>
                  <th style={s.th}>Confirmado</th>
                  <th style={s.th}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {pagamentos.map((pg) => (
                  <tr key={pg.id}>
                    <td style={s.td}>{pg.nome_completo}</td>
                    <td style={s.td}>{formatDate(pg.quinzena_inicio)} — {formatDate(pg.quinzena_fim)}</td>
                    <td style={s.td}>{pg.total_entregas}</td>
                    <td style={s.td}>{formatMoney(pg.total_quinzena)}</td>
                    <td style={{ ...s.td, color: Number(pg.total_bonus_d0) > 0 ? '#3de8a0' : '#6b7280' }}>{formatMoney(pg.total_bonus_d0)}</td>
                    <td style={{ ...s.td, color: Number(pg.total_multa) > 0 ? '#ff5a5a' : '#6b7280' }}>{formatMoney(pg.total_multa)}</td>
                    <td style={s.td}>{formatMoney(pg.total_adiantado)}</td>
                    <td style={s.td}>{formatMoney(pg.total_cobrancas)}</td>
                    <td style={{ ...s.td, color: '#f0c040', fontWeight: 600 }}>{formatMoney(pg.total_pagar)}</td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, background: `${statusCor(pg.status)}22`, color: statusCor(pg.status) }}>
                        {pg.pix_estado || pg.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ ...s.td, fontSize: '0.65rem', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {pg.pix_end_to_end_id || '—'}
                    </td>
                    <td style={s.td}>{formatDt(pg.criado_em)}</td>
                    <td style={s.td}>{pg.confirmado_em ? formatDt(pg.confirmado_em) : '—'}</td>
                    <td style={s.td}>
                      {pg.status === 'processando' ? (
                        <button
                          style={{ ...s.btnReverificar }}
                          onClick={() => handleReverificar(pg.id)}
                          disabled={reverificando[pg.id]}
                        >
                          {reverificando[pg.id] ? '...' : 'Reverificar'}
                        </button>
                      ) : pg.status === 'confirmado' ? (
                        <span style={{ color: '#3de8a0', fontSize: '0.75rem' }}>Confirmado</span>
                      ) : pg.status === 'rejeitado' ? (
                        <span style={{ color: '#ff5a5a', fontSize: '0.75rem' }}>Rejeitado</span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  container: { minHeight: '100vh', background: '#0d0f14', color: '#e8eaf0', fontFamily: "'IBM Plex Sans', sans-serif" },
  content: { maxWidth: 1400, margin: '0 auto', padding: '32px 24px' },
  title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '2px', color: '#f0c040', marginBottom: 24 },
  filterRow: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  filterBtn: { padding: '6px 16px', borderRadius: 4, cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', letterSpacing: '1px', border: '1px solid #2a2f3e', transition: 'all .15s' },
  error: { background: '#2a1a1a', border: '1px solid #ff5a5a', color: '#ff5a5a', padding: '10px 16px', borderRadius: 4, marginBottom: 20 },
  tableWrap: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, overflow: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 1100 },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #2a2f3e', background: '#1e2230', whiteSpace: 'nowrap' },
  td: { padding: '10px 14px', fontSize: '0.82rem', borderBottom: '1px solid #2a2f3e', color: '#e8eaf0', fontFamily: "'IBM Plex Mono', monospace", whiteSpace: 'nowrap' },
  badge: { display: 'inline-block', padding: '2px 8px', fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: "'IBM Plex Mono', monospace", borderRadius: 2 },
  btnReverificar: { background: '#3a2a1a', border: '1px solid #ff9f40', color: '#ff9f40', padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem', fontFamily: "'IBM Plex Mono', monospace" },
  empty: { textAlign: 'center', color: '#6b7280', padding: 40, fontSize: '1rem', fontFamily: "'IBM Plex Mono', monospace" },
};

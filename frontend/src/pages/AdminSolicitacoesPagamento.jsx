import { useState, useEffect } from 'react';
import { getSolicitacoes, aprovarSolicitacao, recusarSolicitacao } from '../services/api';
import Topbar from '../components/Topbar';

export default function AdminSolicitacoesPagamento() {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('');

  const carregar = async (status) => {
    setLoading(true);
    setError('');
    try {
      const data = await getSolicitacoes(status || undefined);
      setSolicitacoes(data);
      setFiltro(status || '');
    } catch (err) {
      setError('Erro ao carregar solicitações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const handleAprovar = async (id) => {
    try {
      const result = await aprovarSolicitacao(id);
      if (result.success) carregar(filtro);
    } catch (err) {
      setError('Erro ao aprovar solicitação');
    }
  };

  const handleRecusar = async (id) => {
    try {
      const result = await recusarSolicitacao(id);
      if (result.success) carregar(filtro);
    } catch (err) {
      setError('Erro ao recusar solicitação');
    }
  };

  const formatMoney = (v) => `R$ ${(Number(v) || 0).toFixed(2).replace('.', ',')}`;
  const formatDt = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—';

  const badgeCor = (s) => {
    if (s === 'aprovado') return '#3de8a0';
    if (s === 'recusado') return '#ff5a5a';
    if (s === 'pre_aprovado') return '#00bcd4';
    return '#ff9f40';
  };

  return (
    <div style={s.container}>
      <Topbar user={{ nome: 'Admin' }} />
      <div style={s.content}>
        <h2 style={s.title}>Solicitações de Pagamento Antecipado</h2>

        <div style={s.filterRow}>
          <span
            style={{ ...s.filterBtn, background: !filtro ? '#f0c040' : '#1e2230', color: !filtro ? '#0d0f14' : '#6b7280' }}
            onClick={() => carregar('')}
          >Todas</span>
          <span
            style={{ ...s.filterBtn, background: filtro === 'pendente' ? '#ff9f40' : '#1e2230', color: filtro === 'pendente' ? '#0d0f14' : '#6b7280' }}
            onClick={() => carregar('pendente')}
          >Pendentes</span>
          <span
            style={{ ...s.filterBtn, background: filtro === 'pre_aprovado' ? '#00bcd4' : '#1e2230', color: filtro === 'pre_aprovado' ? '#0d0f14' : '#6b7280' }}
            onClick={() => carregar('pre_aprovado')}
          >Pré-aprovadas</span>
          <span
            style={{ ...s.filterBtn, background: filtro === 'aprovado' ? '#3de8a0' : '#1e2230', color: filtro === 'aprovado' ? '#0d0f14' : '#6b7280' }}
            onClick={() => carregar('aprovado')}
          >Aprovadas</span>
          <span
            style={{ ...s.filterBtn, background: filtro === 'recusado' ? '#ff5a5a' : '#1e2230', color: filtro === 'recusado' ? '#0d0f14' : '#6b7280' }}
            onClick={() => carregar('recusado')}
          >Recusadas</span>
        </div>

        {error && <div style={s.error}>{error}</div>}

        {loading ? (
          <div style={s.empty}>Carregando...</div>
        ) : solicitacoes.length === 0 ? (
          <div style={s.empty}>Nenhuma solicitação encontrada.</div>
        ) : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>ID</th>
                  <th style={s.th}>Matrícula</th>
                  <th style={s.th}>Motorista</th>
                  <th style={s.th}>Lista</th>
                  <th style={s.th}>Valor</th>
                  <th style={s.th}>Taxa</th>
                  <th style={s.th}>Líquido</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Solicitado em</th>
                  <th style={s.th}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {solicitacoes.map((solic) => (
                  <tr key={solic.id}>
                    <td style={s.td}>{solic.id}</td>
                    <td style={s.td}>{solic.matricula}</td>
                    <td style={s.td}>{solic.nome_completo}</td>
                    <td style={s.td}>#{solic.lista_numero}</td>
                    <td style={s.td}>{formatMoney(solic.valor_solicitado)}</td>
                    <td style={s.td}>{solic.taxa_aplicada ? `${solic.taxa_aplicada}%` : '—'}</td>
                    <td style={{ ...s.td, color: '#3de8a0' }}>{formatMoney(solic.valor_solicitado * (1 - (Number(solic.taxa_aplicada) || 0) / 100))}</td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, background: `${badgeCor(solic.status)}22`, color: badgeCor(solic.status) }}>
                        {solic.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={s.td}>{formatDt(solic.criado_em)}</td>
                    <td style={s.td}>
                      {solic.status === 'pendente' || solic.status === 'pre_aprovado' ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button style={s.btnAprovar} onClick={() => handleAprovar(solic.id)}>
                            Aprovar
                          </button>
                          <button style={s.btnRecusar} onClick={() => handleRecusar(solic.id)}>
                            Recusar
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                          {solic.aprovado_em ? `Aprovado: ${formatDt(solic.aprovado_em)}` : solic.recusado_em ? `Recusado: ${formatDt(solic.recusado_em)}` : '—'}
                        </span>
                      )}
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
  content: { maxWidth: 1200, margin: '0 auto', padding: '32px 24px' },
  title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '2px', color: '#f0c040', marginBottom: 24 },
  filterRow: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  filterBtn: { padding: '6px 16px', borderRadius: 4, cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', letterSpacing: '1px', border: '1px solid #2a2f3e', transition: 'all .15s' },
  error: { background: '#2a1a1a', border: '1px solid #ff5a5a', color: '#ff5a5a', padding: '10px 16px', borderRadius: 4, marginBottom: 20 },
  tableWrap: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #2a2f3e', background: '#1e2230' },
  td: { padding: '10px 14px', fontSize: '0.82rem', borderBottom: '1px solid #2a2f3e', color: '#e8eaf0', fontFamily: "'IBM Plex Mono', monospace" },
  badge: { display: 'inline-block', padding: '2px 8px', fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: "'IBM Plex Mono', monospace", borderRadius: 2 },
  btnAprovar: { background: '#1a3a2a', border: '1px solid #3de8a0', color: '#3de8a0', padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem', fontFamily: "'IBM Plex Mono', monospace" },
  btnRecusar: { background: '#3a1a1a', border: '1px solid #ff5a5a', color: '#ff5a5a', padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem', fontFamily: "'IBM Plex Mono', monospace" },
  empty: { textAlign: 'center', color: '#6b7280', padding: 40, fontSize: '1rem', fontFamily: "'IBM Plex Mono', monospace" },
};

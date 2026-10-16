import { useState, useEffect } from 'react';
import { getSolicitacoes, aprovarSolicitacao, recusarSolicitacao, reverificarSolicitacao, reenviarSolicitacao, getNfseSolicitacoes } from '../services/api';
import Topbar from '../components/Topbar';

export default function AdminSolicitacoesPagamento() {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('');
  const [reverificando, setReverificando] = useState({});
  const [nfMap, setNfMap] = useState({});

  const carregar = async (status) => {
    setError('');
    try {
      const data = await getSolicitacoes(status || undefined);
      setSolicitacoes(data);
      setFiltro(status || '');
      // Status da NFS-e de cada solicitação (exibido na coluna NF).
      const ids = data.map((x) => x.id);
      if (ids.length > 0) {
        getNfseSolicitacoes(ids).then(setNfMap).catch(() => {});
      } else {
        setNfMap({});
      }
    } catch {
      setError('Erro ao carregar solicitações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = setTimeout(() => carregar(), 0);
    return () => clearTimeout(id);
  }, []);

  const mostrarResultado = (result) => {
    if (result?.status === 'erro_webhook') {
      setError(`Falha no webhook do Pix (${result.webhook_erro || 'sem resposta'}). A solicitação segue em aberto — use "Reenviar" ou "Recusar".`);
    } else if (result?.pix_estado === 'EM_PROCESSAMENTO' || result?.status === 'processando_pix') {
      setError('Pix em processamento — aguarde a confirmação.');
    } else if (result?.status === 'pix_rejeitado' || result?.pix_estado === 'REJEITADO') {
      setError('Pagamento rejeitado pelo Pix. Pode reenviar ou recusar a solicitação.');
    } else if (result?.success) {
      setError('');
    }
  };

  const handleAprovar = async (id) => {
    try {
      const result = await aprovarSolicitacao(id);
      mostrarResultado(result);
      carregar(filtro);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.motivo || 'Erro ao aprovar solicitação');
    }
  };

  const handleRecusar = async (id) => {
    try {
      const result = await recusarSolicitacao(id);
      if (result.success) { setError(''); carregar(filtro); }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.motivo || 'Erro ao recusar solicitação');
    }
  };

  const handleReverificar = async (id) => {
    setReverificando(prev => ({ ...prev, [id]: true }));
    try {
      const result = await reverificarSolicitacao(id);
      mostrarResultado(result);
      carregar(filtro);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.motivo || 'Erro ao reverificar pagamento');
    } finally {
      setReverificando(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleReenviar = async (id) => {
    setReverificando(prev => ({ ...prev, [id]: true }));
    try {
      const result = await reenviarSolicitacao(id);
      mostrarResultado(result);
      carregar(filtro);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.motivo || 'Erro ao reenviar solicitação');
    } finally {
      setReverificando(prev => ({ ...prev, [id]: false }));
    }
  };

  const formatMoney = (v) => `R$ ${(Number(v) || 0).toFixed(2).replace('.', ',')}`;
  const formatDt = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—';

  const badgeCor = (s) => {
    if (s === 'aprovado') return '#3de8a0';
    if (s === 'recusado') return '#ff5a5a';
    if (s === 'pre_aprovado') return '#00bcd4';
    if (s === 'processando_pix') return '#ff9f40';
    if (s === 'pix_rejeitado') return '#ff5a5a';
    if (s === 'erro_webhook') return '#f97316';
    return '#ff9f40';
  };

  const pixBadgeCor = (estado) => {
    if (estado === 'FINALIZADO') return '#3de8a0';
    if (estado === 'EM_PROCESSAMENTO') return '#ff9f40';
    if (estado === 'REJEITADO') return '#ff5a5a';
    return '#6b7280';
  };

  return (
    <div style={s.container}>
      <Topbar user={{ nome: 'Admin' }} />
      <div style={s.content}>
        <h2 style={s.title}>Solicitações de Pagamento Antecipado</h2>

        <div style={s.filterRow}>
          <span
            style={{ ...s.filterBtn, background: !filtro ? '#f0c040' : '#1e2230', color: !filtro ? '#0d0f14' : '#6b7280' }}
            onClick={() => { setLoading(true); carregar(''); }}
          >Todas</span>
          <span
            style={{ ...s.filterBtn, background: filtro === 'pendente' ? '#ff9f40' : '#1e2230', color: filtro === 'pendente' ? '#0d0f14' : '#6b7280' }}
            onClick={() => { setLoading(true); carregar('pendente'); }}
          >Pendentes</span>
          <span
            style={{ ...s.filterBtn, background: filtro === 'pre_aprovado' ? '#00bcd4' : '#1e2230', color: filtro === 'pre_aprovado' ? '#0d0f14' : '#6b7280' }}
            onClick={() => { setLoading(true); carregar('pre_aprovado'); }}
          >Pré-aprovadas</span>
          <span
            style={{ ...s.filterBtn, background: filtro === 'processando_pix' ? '#ff9f40' : '#1e2230', color: filtro === 'processando_pix' ? '#0d0f14' : '#6b7280' }}
            onClick={() => { setLoading(true); carregar('processando_pix'); }}
          >Processando Pix</span>
          <span
            style={{ ...s.filterBtn, background: filtro === 'erro_webhook' ? '#f97316' : '#1e2230', color: filtro === 'erro_webhook' ? '#0d0f14' : '#6b7280' }}
            onClick={() => { setLoading(true); carregar('erro_webhook'); }}
          >Erro de Webhook</span>
          <span
            style={{ ...s.filterBtn, background: filtro === 'aprovado' ? '#3de8a0' : '#1e2230', color: filtro === 'aprovado' ? '#0d0f14' : '#6b7280' }}
            onClick={() => { setLoading(true); carregar('aprovado'); }}
          >Aprovadas</span>
          <span
            style={{ ...s.filterBtn, background: filtro === 'recusado' ? '#ff5a5a' : '#1e2230', color: filtro === 'recusado' ? '#0d0f14' : '#6b7280' }}
            onClick={() => { setLoading(true); carregar('recusado'); }}
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
                  <th style={s.th}>Motorista</th>
                  <th style={s.th}>Lista</th>
                  <th style={s.th}>Valor</th>
                  <th style={s.th}>Taxa</th>
                  <th style={s.th}>Líquido</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Pix</th>
                  <th style={s.th}>NF</th>
                  <th style={s.th}>Webhook</th>
                  <th style={s.th}>Criado</th>
                  <th style={s.th}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {solicitacoes.map((solic) => (
                  <tr key={solic.id}>
                    <td style={s.td}>{solic.id}</td>
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
                    <td style={s.td}>
                      {solic.pix_estado ? (
                        <span style={{ ...s.badge, background: `${pixBadgeCor(solic.pix_estado)}22`, color: pixBadgeCor(solic.pix_estado) }}>
                          {solic.pix_estado}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={s.td}>
                      {(() => {
                        const nf = nfMap[solic.id];
                        if (!nf) return <span style={{ color: '#6b7280' }}>—</span>;
                        const cor = nf.status_validacao === 'valida' ? '#3de8a0'
                          : nf.status_validacao === 'liberada_admin' ? '#f0c040'
                          : nf.status_validacao === 'nao_encontrada' ? '#ff9f40'
                          : '#ff5a5a';
                        const rot = nf.status_validacao === 'valida' ? 'VÁLIDA'
                          : nf.status_validacao === 'liberada_admin' ? 'LIBERADA'
                          : nf.status_validacao === 'nao_encontrada' ? 'NÃO ENC.'
                          : 'INVÁLIDA';
                        return (
                          <span style={{ ...s.badge, background: `${cor}22`, color: cor }} title={nf.motivo || ''}>
                            {rot}
                          </span>
                        );
                      })()}
                    </td>
                    <td style={{ ...s.td, fontSize: '0.65rem', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', color: solic.webhook_erro ? '#f97316' : '#6b7280' }}>
                      {solic.webhook_erro
                        ? `${solic.webhook_erro}${solic.webhook_http_status ? ` (HTTP ${solic.webhook_http_status})` : ''} · ${solic.webhook_tentativas || 0}ª tentativa`
                        : solic.webhook_tentativas
                          ? `${solic.webhook_tentativas} envio(s) · ${formatDt(solic.ultimo_webhook_em)}`
                          : '—'}
                    </td>
                    <td style={s.td}>{formatDt(solic.criado_em)}</td>
                    <td style={s.td}>
                      {solic.status === 'pendente' ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button style={s.btnAprovar} onClick={() => handleAprovar(solic.id)}>
                            Aprovar
                          </button>
                          {solic.pix_enviado_em && (
                            <button
                              style={{ ...s.btnAprovar, background: '#3a2a1a', borderColor: '#ff9f40', color: '#ff9f40' }}
                              onClick={() => handleReverificar(solic.id)}
                              disabled={reverificando[solic.id]}
                              title="Pix já foi disparado. Use Conferir para recuperar o resultado do log sem enviar um novo Pix."
                            >
                              {reverificando[solic.id] ? '...' : 'Conferir'}
                            </button>
                          )}
                          <button style={s.btnRecusar} onClick={() => handleRecusar(solic.id)}>
                            Recusar
                          </button>
                        </div>
                      ) : solic.status === 'erro_webhook' ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            style={{ ...s.btnAprovar, background: '#3a2a1a', borderColor: '#f97316', color: '#f97316' }}
                            onClick={() => handleReenviar(solic.id)}
                            disabled={reverificando[solic.id]}
                          >
                            {reverificando[solic.id] ? '...' : 'Reenviar'}
                          </button>
                          <button style={s.btnRecusar} onClick={() => handleRecusar(solic.id)}>
                            Recusar
                          </button>
                        </div>
                      ) : solic.status === 'processando_pix' ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            style={{ ...s.btnAprovar, background: '#3a2a1a', borderColor: '#ff9f40', color: '#ff9f40' }}
                            onClick={() => handleReverificar(solic.id)}
                            disabled={reverificando[solic.id]}
                          >
                            {reverificando[solic.id] ? '...' : 'Reverificar'}
                          </button>
                          <button style={s.btnRecusar} onClick={() => handleRecusar(solic.id)}>
                            Recusar
                          </button>
                        </div>
                      ) : solic.status === 'pix_rejeitado' ? (
                        <button
                          style={{ ...s.btnAprovar, background: '#3a2a1a', borderColor: '#ff5a5a', color: '#ff5a5a' }}
                          onClick={() => handleReenviar(solic.id)}
                          disabled={reverificando[solic.id]}
                        >
                          {reverificando[solic.id] ? '...' : 'Reenviar'}
                        </button>
                      ) : solic.status === 'pre_aprovado' ? (
                        <button
                          style={{ ...s.btnAprovar, background: '#12262a', borderColor: '#00bcd4', color: '#00bcd4' }}
                          onClick={() => handleReverificar(solic.id)}
                          disabled={reverificando[solic.id]}
                        >
                          {reverificando[solic.id] ? '...' : 'Conferir'}
                        </button>
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
  content: { maxWidth: 1400, margin: '0 auto', padding: '32px 24px' },
  title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '2px', color: '#f0c040', marginBottom: 24 },
  filterRow: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  filterBtn: { padding: '6px 16px', borderRadius: 4, cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', letterSpacing: '1px', border: '1px solid #2a2f3e', transition: 'all .15s' },
  error: { background: '#2a1a1a', border: '1px solid #ff5a5a', color: '#ff5a5a', padding: '10px 16px', borderRadius: 4, marginBottom: 20 },
  tableWrap: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, overflow: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 900 },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #2a2f3e', background: '#1e2230', whiteSpace: 'nowrap' },
  td: { padding: '10px 14px', fontSize: '0.82rem', borderBottom: '1px solid #2a2f3e', color: '#e8eaf0', fontFamily: "'IBM Plex Mono', monospace", whiteSpace: 'nowrap' },
  badge: { display: 'inline-block', padding: '2px 8px', fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: "'IBM Plex Mono', monospace", borderRadius: 2 },
  btnAprovar: { background: '#1a3a2a', border: '1px solid #3de8a0', color: '#3de8a0', padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem', fontFamily: "'IBM Plex Mono', monospace" },
  btnRecusar: { background: '#3a1a1a', border: '1px solid #ff5a5a', color: '#ff5a5a', padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem', fontFamily: "'IBM Plex Mono', monospace" },
  empty: { textAlign: 'center', color: '#6b7280', padding: 40, fontSize: '1rem', fontFamily: "'IBM Plex Mono', monospace" },
};

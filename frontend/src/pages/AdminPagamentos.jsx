import { useState, useEffect, useCallback } from 'react';
import { getResumo, confirmarPagamento, getAdminQuinzenas, getConfig, getListasPendentesMotorista } from '../services/api';
import Topbar from '../components/Topbar';

function formatQuinzena(inicio, fim) {
  const i = String(inicio).slice(0, 10).split('-');
  const f = String(fim).slice(0, 10).split('-');
  return `${i[2]}/${i[1]}/${i[0].slice(2)} a ${f[2]}/${f[1]}/${f[0].slice(2)}`;
}

function calcPagamento(endDate, diasUteis) {
  const d = new Date(endDate);
  d.setUTCDate(d.getUTCDate() + 1);
  let uteis = 0;
  while (uteis < diasUteis) {
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) uteis++;
    if (uteis < diasUteis) d.setUTCDate(d.getUTCDate() + 1);
  }
  return d;
}

export default function AdminPagamentos() {
  const [quinzenas, setQuinzenas] = useState([]);
  const [qzIdx, setQzIdx] = useState(0);
  const [resumo, setResumo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmando, setConfirmando] = useState(null);
  const [config, setConfig] = useState(null);
  const [expandido, setExpandido] = useState({});
  const [listasData, setListasData] = useState({});
  const [listasLoading, setListasLoading] = useState({});

  const qzAtual = quinzenas[qzIdx] || null;

  const fetchResumo = useCallback(async (inicio, fim) => {
    setLoading(true);
    setError('');
    try {
      const data = await getResumo(inicio, fim);
      setResumo(data);
    } catch (err) {
      setError('Erro ao buscar pagamentos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const [qzs, cfg] = await Promise.all([getAdminQuinzenas(), getConfig()]);
        setQuinzenas(qzs);
        setConfig(cfg);
        if (qzs.length > 0) {
          const q = qzs[0];
          await fetchResumo(q.inicio.slice(0, 10), q.fim.slice(0, 10));
        }
      } catch (e) {
        setError('Erro ao carregar quinzenas');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [fetchResumo]);

  const handlePrev = async () => {
    if (qzIdx < quinzenas.length - 1) {
      const newIdx = qzIdx + 1;
      setQzIdx(newIdx);
      const q = quinzenas[newIdx];
      await fetchResumo(q.inicio.slice(0, 10), q.fim.slice(0, 10));
    }
  };

  const handleNext = async () => {
    if (qzIdx > 0) {
      const newIdx = qzIdx - 1;
      setQzIdx(newIdx);
      const q = quinzenas[newIdx];
      await fetchResumo(q.inicio.slice(0, 10), q.fim.slice(0, 10));
    }
  };

  const handleConfirmar = async (matricula) => {
    if (!qzAtual) return;
    setConfirmando(matricula);
    try {
      const motorista = resumo?.motoristas?.find(m => Number(m.matricula) === Number(matricula));
      const pagamento = {
        nome: motorista?.nome_completo || '',
        total_entregas: Number(motorista?.total_ctes) || 0,
        total_multa: Number(motorista?.total_multa) || 0,
        total_adiantado: Number(motorista?.total_adiantado) || 0,
        total_pagar: Number(motorista?.total_pagar) || 0,
      };
      await confirmarPagamento(matricula, qzAtual.inicio.slice(0, 10), qzAtual.fim.slice(0, 10), pagamento);
      const data = await getResumo(qzAtual.inicio.slice(0, 10), qzAtual.fim.slice(0, 10));
      setResumo(data);
    } catch (err) {
      setError('Erro ao confirmar pagamento');
    } finally {
      setConfirmando(null);
    }
  };

  const toggleExpandido = async (matricula) => {
    const novo = !expandido[matricula];
    setExpandido(prev => ({ ...prev, [matricula]: novo }));
    if (novo && !listasData[matricula]) {
      setListasLoading(prev => ({ ...prev, [matricula]: true }));
      try {
        const data = await getListasPendentesMotorista(matricula, qzAtual.inicio.slice(0, 10), qzAtual.fim.slice(0, 10));
        setListasData(prev => ({ ...prev, [matricula]: data }));
      } catch {
        setListasData(prev => ({ ...prev, [matricula]: [] }));
      } finally {
        setListasLoading(prev => ({ ...prev, [matricula]: false }));
      }
    }
  };

  const formatBRL = (v) =>
    `R$ ${(Number(v) || 0).toFixed(2).replace('.', ',')}`;

  return (
    <div style={styles.container}>
      <Topbar user={{ nome: 'Admin' }} />
      <div style={styles.content}>
        <h2 style={styles.title}>Pagamentos a Motoristas</h2>

        <div style={styles.filterRow}>
          <button onClick={handlePrev} disabled={qzIdx >= quinzenas.length - 1} style={styles.navBtn}>
            &lt; Anterior
          </button>
          <div style={styles.quinzenaLabel}>
            {qzAtual ? formatQuinzena(qzAtual.inicio, qzAtual.fim) : '—'}
          </div>
          <button onClick={handleNext} disabled={qzIdx <= 0} style={styles.navBtn}>
            Próximo &gt;
          </button>
          {qzAtual && (
            <div style={styles.pagDateLabel}>
              Pagamento: {calcPagamento(qzAtual.fim.slice(0, 10), config?.dias_uteis_pagamento || 4).toLocaleDateString('pt-BR')}
            </div>
          )}
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {resumo && (
          <>
            <div style={styles.resumoCards}>
              <div style={styles.rCard}>
                <span style={styles.rLabel}>Motoristas</span>
                <span style={styles.rValue}>{resumo.total_motoristas}</span>
              </div>
              <div style={styles.rCard}>
                <span style={styles.rLabel}>Total CT-es</span>
                <span style={styles.rValue}>{resumo.total_ctes}</span>
              </div>
              <div style={styles.rCard}>
                <span style={styles.rLabel}>Total a Pagar</span>
                <span style={{ ...styles.rValue, color: '#3de8a0' }}>
                  {formatBRL(resumo.total_pagar)}
                </span>
              </div>
              <div style={styles.rCard}>
                <span style={styles.rLabel}>Receita Total</span>
                <span style={{ ...styles.rValue, color: '#f0c040' }}>
                  {formatBRL(resumo.total_receita)}
                </span>
              </div>
              <div style={styles.rCard}>
                <span style={styles.rLabel}>Margem Bruta</span>
                <span
                  style={{
                    ...styles.rValue,
                    color: resumo.total_margem >= 0 ? '#3de8a0' : '#ff5a5a',
                  }}
                >
                  {formatBRL(resumo.total_margem)}
                </span>
              </div>
              {resumo.total_multa > 0 && (
                <div style={styles.rCard}>
                  <span style={styles.rLabel}>Total Multas</span>
                  <span style={{ ...styles.rValue, color: '#ff9f40' }}>
                    {formatBRL(resumo.total_multa)}
                  </span>
                </div>
              )}
            </div>

            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Matrícula</th>
                    <th style={styles.th}>Nome</th>
                    <th style={styles.th}>CPF</th>
                    <th style={styles.th}>CT-es</th>
                    <th style={styles.th}>Faturamento</th>
                    <th style={styles.th}>Valor Motorista</th>
                    <th style={styles.th}>Multa</th>
                    <th style={styles.th}>Margem</th>
                    <th style={styles.th}>Listas</th>
                    <th style={styles.th}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                   {resumo.motoristas.map((m, i) => (
                    <>
                    <tr key={i}>
                      <td style={styles.td}>{m.matricula}</td>
                      <td style={styles.td}>{m.nome_completo}</td>
                      <td style={styles.td}>{m.cpf}</td>
                      <td style={styles.td}>{m.total_ctes}</td>
                      <td style={styles.td}>{formatBRL(m.receita_total)}</td>
                      <td style={{ ...styles.td, color: '#3de8a0', fontWeight: 600 }}>
                        {formatBRL(m.total_quinzena)}
                      </td>
                      <td style={{ ...styles.td, color: '#ff9f40' }}>
                        {Number(m.total_multa) > 0 ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {formatBRL(m.total_multa)}
                            <span style={{
                              display: 'inline-block',
                              padding: '1px 6px',
                              fontSize: '0.58rem',
                              letterSpacing: '1px',
                              borderRadius: 2,
                              background: 'rgba(255,159,64,.15)',
                              color: '#ff9f40',
                            }}>
                              {m.qtd_reclamacoes} reclamações
                            </span>
                          </span>
                        ) : (
                          formatBRL(0)
                        )}
                      </td>
                      <td
                        style={{
                          ...styles.td,
                          color: Number(m.margem_bruta) >= 0 ? '#e8eaf0' : '#ff5a5a',
                        }}
                      >
                        {formatBRL(m.margem_bruta)}
                      </td>
                      <td style={styles.td}>
                        <div
                          onClick={() => toggleExpandido(m.matricula)}
                          style={{ cursor: 'pointer', userSelect: 'none', color: expandido[m.matricula] ? '#f0c040' : '#a0a8b8', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', letterSpacing: '1px' }}
                        >
                          {expandido[m.matricula] ? '▼' : '▶'} Listas
                        </div>
                      </td>
                      <td style={styles.td}>
                        {m.pgto === false || m.pgto === 'false' || m.pgto === 'FALSE' ? (
                          <span style={{ color: '#ff5a5a', fontWeight: 600, fontSize: '0.78rem' }}>
                            Bloqueado
                          </span>
                        ) : m.pago ? (
                          <span style={{ color: '#3de8a0', fontWeight: 600, fontSize: '0.78rem' }}>
                            Pago
                          </span>
                        ) : (
                          <button
                            onClick={() => handleConfirmar(m.matricula)}
                            disabled={confirmando === m.matricula}
                            style={styles.pendenteBtn}
                          >
                            {confirmando === m.matricula ? '...' : 'Pendente'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandido[m.matricula] && (
                      <tr key={`${i}-exp`}>
                        <td colSpan={10} style={{ padding: 0, border: 'none' }}>
                          <div style={styles.expandedWrap}>
                            {listasLoading[m.matricula] ? (
                              <div style={styles.expandedLoading}>Carregando...</div>
                            ) : !listasData[m.matricula] || listasData[m.matricula].length === 0 ? (
                              <div style={styles.expandedEmpty}>Nenhuma lista na quinzena</div>
                            ) : (
                              <table style={styles.innerTable}>
                                <thead>
                                  <tr>
                                    <th style={styles.innerTh}>Nº Lista</th>
                                    <th style={styles.innerTh}>Baixa</th>
                                    <th style={styles.innerTh}>CT-es</th>
                                    <th style={styles.innerTh}>Rota</th>
                                    <th style={styles.innerTh}>Valor Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {listasData[m.matricula].map((l, j) => (
                                    <tr key={j}>
                                      <td style={styles.innerTd}>{l["Número"]}</td>
                                      <td style={styles.innerTd}>{l["Data Baixa"]?.slice(0, 10)}</td>
                                      <td style={styles.innerTd}>{l.qtd_ctes}</td>
                                      <td style={styles.innerTd}>
                                        <span style={{
                                          ...styles.rotaTag,
                                          background: l["Rota"] === 'PICKUP_AEREO' ? 'rgba(240,192,64,.15)' : 'rgba(61,232,160,.15)',
                                          color: l["Rota"] === 'PICKUP_AEREO' ? '#f0c040' : '#3de8a0',
                                        }}>
                                          {l["Rota"] || 'Normal'}
                                        </span>
                                      </td>
                                      <td style={{ ...styles.innerTd, color: '#3de8a0', fontWeight: 600 }}>
                                        {formatBRL(l.valor_total)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {resumo.motoristas.length === 0 && (
              <div style={styles.empty}>
                Nenhum motorista encontrado no período selecionado
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#0d0f14',
    color: '#e8eaf0',
    fontFamily: "'IBM Plex Sans', sans-serif",
  },
  content: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '32px 24px',
  },
  title: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '1.8rem',
    letterSpacing: '2px',
    color: '#f0c040',
    marginBottom: 24,
  },
  filterRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  navBtn: {
    background: '#1e2230',
    border: '1px solid #2a2f3e',
    color: '#e8eaf0',
    padding: '8px 16px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontFamily: "'IBM Plex Mono', monospace",
  },
  quinzenaLabel: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: '#f0c040',
    fontFamily: "'Bebas Neue', sans-serif",
    letterSpacing: '2px',
    minWidth: 180,
    textAlign: 'center',
  },
  pagDateLabel: {
    fontSize: '0.78rem',
    color: '#3de8a0',
    fontFamily: "'IBM Plex Mono', monospace",
  },
  error: {
    background: '#2a1a1a',
    border: '1px solid #ff5a5a',
    color: '#ff5a5a',
    padding: '10px 16px',
    borderRadius: 4,
    marginBottom: 20,
  },
  resumoCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 12,
    marginBottom: 24,
  },
  rCard: {
    background: '#161920',
    border: '1px solid #2a2f3e',
    borderRadius: 8,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  rLabel: {
    fontSize: '0.7rem',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  rValue: {
    fontSize: '1.4rem',
    fontWeight: 600,
    fontFamily: "'IBM Plex Mono', monospace",
    color: '#e8eaf0',
  },
  tableWrap: {
    background: '#161920',
    border: '1px solid #2a2f3e',
    borderRadius: 8,
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '10px 14px',
    textAlign: 'left',
    fontSize: '0.7rem',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    borderBottom: '1px solid #2a2f3e',
    background: '#1e2230',
  },
  td: {
    padding: '10px 14px',
    fontSize: '0.82rem',
    borderBottom: '1px solid #2a2f3e',
    color: '#e8eaf0',
    fontFamily: "'IBM Plex Mono', monospace",
  },
  confirmBtn: {
    background: '#1a3a2a',
    border: '1px solid #3de8a0',
    color: '#3de8a0',
    padding: '4px 14px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: '0.75rem',
  },
  pendenteBtn: {
    background: '#3a2a1a',
    border: '1px solid #f0c040',
    color: '#f0c040',
    padding: '4px 14px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: '0.75rem',
  },
  empty: {
    textAlign: 'center',
    color: '#6b7280',
    padding: 40,
    fontSize: '1rem',
  },
  expandedWrap: {
    background: '#0d0f14',
    padding: '12px 20px',
    borderBottom: '1px solid #2a2f3e',
  },
  expandedLoading: {
    color: '#6b7280',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.8rem',
    padding: '8px 0',
  },
  expandedEmpty: {
    color: '#6b7280',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.8rem',
    padding: '8px 0',
  },
  innerTable: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  innerTh: {
    padding: '6px 10px',
    textAlign: 'left',
    fontSize: '0.65rem',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    borderBottom: '1px solid #2a2f3e',
  },
  innerTd: {
    padding: '6px 10px',
    fontSize: '0.78rem',
    color: '#e8eaf0',
    fontFamily: "'IBM Plex Mono', monospace",
    borderBottom: '1px solid #1e2230',
  },
  rotaTag: {
    display: 'inline-block',
    padding: '1px 6px',
    fontSize: '0.6rem',
    borderRadius: 3,
    fontWeight: 500,
  },
};

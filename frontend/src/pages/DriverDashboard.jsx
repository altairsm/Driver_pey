import { useState, useEffect, useCallback } from 'react';
import { getDriverDashboard, getDriverTrips, getDriverMe, getDriverTripsFaixas, getQuinzenas, getProdutividade, getEficiencia, getReclamacoes, solicitarPagamento, getUltimaImportacaoReclamacoes, getConfig } from '../services/api';

const EVENTOS_INSUCESSO = [
  'tentativa de entrega', 'ausente', 'recusado',
  'endereco nao encontrado', 'endereço não encontrado',
  'avaria', 'aguardando retirada', 'devolvido',
  'restricao de acesso / movimentacao', 'restrição de acesso',
  'nao localizado', 'não localizado', 'cliente nao encontrado',
  'fora da area', 'retorno', 'sinistro', 'extravio',
];

function isInsucesso(evento) {
  const ev = String(evento || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return EVENTOS_INSUCESSO.some(ie => {
    const norm = ie.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return ev.includes(norm);
  });
}

function formatDate(d) {
  if (!d) return '—';
  const match = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return String(d);
}

function formatMoney(v) {
  const n = Number(v) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

export default function DriverDashboard() {
  const [driver, setDriver] = useState(null);
  const [quinzenas, setQuinzenas] = useState([]);
  const [qzIdx, setQzIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [dashboard, setDashboard] = useState(null);
  const [trips, setTrips] = useState([]);
  const [faixas, setFaixas] = useState({});
  const [produtividade, setProdutividade] = useState([]);
  const [eficiencia, setEficiencia] = useState([]);
  const [reclamacoes, setReclamacoes] = useState([]);
  const [expandido, setExpandido] = useState({});
  const [solicitando, setSolicitando] = useState({});
  const [msgSolicitacao, setMsgSolicitacao] = useState('');
  const [ultimaImportacao, setUltimaImportacao] = useState(null);
  const [cepCache, setCepCache] = useState({});
  const [config, setConfig] = useState(null);

  const qzAtual = quinzenas[qzIdx] || null;

  const fetchQuinzenaData = useCallback(async (inicio, fim) => {
    try {
      const [prod, ef, rec, dash, tripList, faixasData] = await Promise.all([
        getProdutividade(inicio, fim),
        getEficiencia(inicio, fim),
        getReclamacoes(inicio, fim),
        getDriverDashboard(inicio, fim),
        getDriverTrips(inicio, fim),
        getDriverTripsFaixas(inicio, fim),
      ]);
      setProdutividade(prod);
      setEficiencia(ef);
      setReclamacoes(rec);
      setDashboard(dash);
      setTrips(tripList);
      const agrupado = {};
      for (const f of faixasData) {
        if (!agrupado[f.lista]) agrupado[f.lista] = [];
        agrupado[f.lista].push(f);
      }
      setFaixas(agrupado);
    } catch (err) {
      setError('Erro ao carregar dados da quinzena');
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const me = await getDriverMe();
        setDriver(me);
        const [qzs, cfg] = await Promise.all([getQuinzenas(), getConfig()]);
        setQuinzenas(qzs);
        setConfig(cfg);
        const ultima = await getUltimaImportacaoReclamacoes();
        setUltimaImportacao(ultima.ultima_importacao);
        if (qzs.length > 0) {
          const q = qzs[0];
          await fetchQuinzenaData(
            q.inicio.slice(0, 10),
            q.fim.slice(0, 10)
          );
        }
      } catch (e) {
        setError('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [fetchQuinzenaData]);

  useEffect(() => {
    const cepsUnicos = [...new Set(reclamacoes.map(r => r.cep).filter(Boolean))];
    const novos = cepsUnicos.filter(c => !cepCache[c]);
    if (novos.length === 0) return;
    novos.forEach(async (c) => {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${c.replace(/\D/g, '')}/json/`);
        const d = await res.json();
        if (!d.erro) {
          setCepCache(prev => ({ ...prev, [c]: d }));
        } else {
          setCepCache(prev => ({ ...prev, [c]: {} }));
        }
      } catch {
        setCepCache(prev => ({ ...prev, [c]: {} }));
      }
    });
  }, [reclamacoes]);

  const handlePrev = async () => {
    if (qzIdx < quinzenas.length - 1) {
      const newIdx = qzIdx + 1;
      setQzIdx(newIdx);
      const q = quinzenas[newIdx];
      await fetchQuinzenaData(q.inicio.slice(0, 10), q.fim.slice(0, 10));
    }
  };

  const handleNext = async () => {
    if (qzIdx > 0) {
      const newIdx = qzIdx - 1;
      setQzIdx(newIdx);
      const q = quinzenas[newIdx];
      await fetchQuinzenaData(q.inicio.slice(0, 10), q.fim.slice(0, 10));
    }
  };

  const toggleExpandido = (lista) => {
    setExpandido((prev) => ({ ...prev, [lista]: !prev[lista] }));
  };

  const handleSolicitarPagamento = async (lista, valor) => {
    setSolicitando((prev) => ({ ...prev, [lista]: true }));
    setMsgSolicitacao('');
    try {
      const result = await solicitarPagamento(lista, valor);
      if (result.success) {
        setMsgSolicitacao(`✅ Lista #${lista}: ${result.motivo}`);
      } else {
        setMsgSolicitacao(`❌ Lista #${lista}: ${result.motivo}`);
      }
    } catch (err) {
      setMsgSolicitacao(`❌ Lista #${lista}: ${err.response?.data?.error || err.message}`);
    } finally {
      setSolicitando((prev) => ({ ...prev, [lista]: false }));
    }
    setTimeout(() => setMsgSolicitacao(''), 5000);
  };

  const soEntregasQ = eficiencia.filter(e => e.evento === 'entrega');
  const totalEventos = eficiencia.reduce((s, e) => s + Number(e.quantidade), 0);
  const totalEntregasNum = soEntregasQ.reduce((s, e) => s + Number(e.quantidade), 0);
  const totalInsucessos = eficiencia.filter(e => isInsucesso(e.evento)).reduce((s, e) => s + Number(e.quantidade), 0);
  const pctEficiencia = totalEventos > 0 ? Math.round((totalEntregasNum / totalEventos) * 100) : 0;
  const totalReclamacoes = reclamacoes.length;
  const pctReclamacao = totalEntregasNum > 0 ? ((totalReclamacoes / totalEntregasNum) * 100) : 0;

  const qzLabel = qzAtual
    ? `${formatDate(qzAtual.inicio)} — ${formatDate(qzAtual.fim)}`
    : 'SEM DADOS';
  const qzPos = quinzenas.length > 1 ? ` (${qzIdx + 1}/${quinzenas.length})` : '';
  const pagamentoDate = qzAtual ? calcPagamento(qzAtual.fim, config?.dias_uteis_pagamento || 4) : null;

  const prodMaxCtes = Math.max(...produtividade.map(p => Number(p.ctes)), 1);

  if (loading) {
    return (
      <div style={s.container}>
        <div style={s.loading}>
          <div style={s.spinner}></div>
          CARREGANDO DADOS DA ÚLTIMA QUINZENA...
        </div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      <div style={s.topbar}>
        <div style={s.brand}>DRIVER PEY - INTUITIVA LOG</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={s.topbarInfo}>
            MOTORISTA <span style={s.topbarInfoVal}>{driver?.nome_completo?.toUpperCase() || '—'}</span><br />
            MATRÍCULA <span style={s.topbarInfoVal}>{driver?.matricula || '—'}</span>
          </div>
          <button style={s.logoutBtn} onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href = '/login'; }}>SAIR</button>
        </div>
      </div>

      <div style={s.content}>
        {error && <div style={s.error}>{error}</div>}

        <div style={s.hero}>
          <div>
            <div style={s.heroName}>
              <em style={s.heroNameEm}>{driver?.nome_completo?.split(' ').slice(0, 2).join(' ')?.toUpperCase() || 'MOTORISTA'}</em>
            </div>
            <div style={s.heroMat}>MAT. {driver?.matricula || '—'}</div>
          </div>
          <div style={s.qzNav}>
            <div style={s.qzLabelSmall}>Selecionar Quinzena</div>
            <div style={s.qzNavRow}>
              <button onClick={handlePrev} disabled={qzIdx >= quinzenas.length - 1} style={{ ...s.qzBtn, opacity: qzIdx >= quinzenas.length - 1 ? 0.3 : 1 }}>&#8249;</button>
              <div style={s.qzBadge}>{qzLabel}{qzPos}</div>
              <button onClick={handleNext} disabled={qzIdx <= 0} style={{ ...s.qzBtn, opacity: qzIdx <= 0 ? 0.3 : 1 }}>&#8250;</button>
            </div>
            {pagamentoDate && (
              <div style={s.pagLabel}>
                💰 PAGAMENTO PREVISTO: <span style={s.pagData}>{pagamentoDate.toLocaleDateString('pt-BR', { timeZone: 'UTC', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</span>
              </div>
            )}
          </div>
        </div>

        <div style={s.kpiStrip}>
          <div style={{ ...s.kpi, borderBottom: '2px solid #3de8a0' }}>
            <div style={s.kpiLabel}>CTes Entregues</div>
            <div style={{ ...s.kpiValue, color: '#3de8a0' }}>{dashboard?.total_ctes || 0}</div>
            <div style={s.kpiDetail}>na quinzena</div>
          </div>
          <div style={{ ...s.kpi, borderBottom: '2px solid #f0c040' }}>
            <div style={s.kpiLabel}>Dias Trabalhados</div>
            <div style={{ ...s.kpiValue, color: '#f0c040' }}>{produtividade.length}</div>
            <div style={s.kpiDetail}>com registros</div>
          </div>
          <div style={{ ...s.kpi, borderBottom: '2px solid #ff9f40' }}>
            <div style={s.kpiLabel}>Insucessos</div>
            <div style={{ ...s.kpiValue, color: '#ff9f40' }}>{totalInsucessos}</div>
            <div style={s.kpiDetail}>{totalEventos > 0 ? ((totalInsucessos / totalEventos) * 100).toFixed(1) : '0.0'}% dos eventos</div>
          </div>
          <div style={{ ...s.kpi, borderBottom: '2px solid #ff5a5a' }}>
            <div style={s.kpiLabel}>Reclamações</div>
            <div style={{ ...s.kpiValue, color: '#ff5a5a' }}>{totalReclamacoes}</div>
            <div style={s.kpiDetail}>{pctReclamacao.toFixed(2)}% das entregas</div>
          </div>
          <div style={{ ...s.kpi, borderBottom: '2px solid #3de8a0' }}>
            <div style={s.kpiLabel}>Total a Receber</div>
            <div style={{ ...s.kpiValue, color: '#3de8a0', fontSize: '1.6rem' }}>{formatMoney(dashboard?.receita_total)}</div>
            <div style={s.kpiDetail}>faixa de peso</div>
          </div>
        </div>

        <div style={s.sections}>
          <div style={{ ...s.section, gridColumn: '1 / -1' }}>
            <div style={s.sectionTitle}><span style={s.sectionIcon}>📦</span> RELATÓRIO DE PRODUTIVIDADE</div>
            <div style={s.sectionSub}>SUAS ENTREGAS — por data</div>

            <div style={s.barChart}>
              {produtividade.map(p => {
                const pct = (Number(p.ctes) / prodMaxCtes * 100).toFixed(1);
                return (
                  <div key={p.data} style={s.barRow}>
                    <div style={s.barLabel}>{formatDate(p.data)}</div>
                    <div style={s.barTrack}>
                      <div style={{ ...s.barFill, width: `${pct}%` }}></div>
                    </div>
                    <div style={s.barVal}>{p.ctes}</div>
                  </div>
                );
              })}
              {produtividade.length === 0 && <div style={s.empty}>Nenhum registro na quinzena</div>}
            </div>

            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Data</th>
                    <th style={s.th}>CTes Entregues</th>
                    <th style={s.th}>Pacotes</th>
                    <th style={s.th}>Peso (kg)</th>
                    <th style={s.th}>Valor Pago (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {produtividade.length === 0 ? (
                    <tr><td colSpan={5} style={{ ...s.td, textAlign: 'center', color: '#6b7280' }}>Nenhum registro encontrado.</td></tr>
                  ) : (
                    produtividade.map(p => (
                      <tr key={p.data}>
                        <td style={s.td}>{formatDate(p.data)}</td>
                        <td style={s.td}><span style={s.badgeGreen}>{p.ctes}</span></td>
                        <td style={s.td}>{p.pacotes}</td>
                        <td style={s.td}>{Number(p.peso_total).toFixed(1)}</td>
                        <td style={s.td}>{formatMoney(p.valor_total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={s.section}>
            <div style={s.sectionTitle}><span style={s.sectionIcon}>📊</span> EFICIÊNCIA</div>
            <div style={s.sectionSub}>Proporção de entregas × insucessos</div>

            <div style={s.gaugeWrap}>
              <div style={s.gaugeRing}>
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#2a2f3e" strokeWidth="10" />
                  <circle cx="60" cy="60" r="50" fill="none"
                    stroke={pctEficiencia < 70 ? '#ff5a5a' : pctEficiencia < 85 ? '#ff9f40' : '#3de8a0'}
                    strokeWidth="10"
                    strokeDasharray="314"
                    strokeDashoffset={314 - (pctEficiencia / 100) * 314}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.23,1,.32,1)' }} />
                </svg>
                <div style={s.gaugeCenter}>
                  <div style={{
                    ...s.gaugePct,
                    color: pctEficiencia < 70 ? '#ff5a5a' : pctEficiencia < 85 ? '#ff9f40' : '#3de8a0'
                  }}>{pctEficiencia}%</div>
                  <div style={s.gaugeSubLabel}>eficiência</div>
                </div>
              </div>
              <div style={s.gaugeDetail}>
                <div style={s.gaugeRow}>
                  <span style={s.gaugeLbl}>TOTAL EVENTOS</span>
                  <span style={s.gaugeVal}>{totalEventos}</span>
                </div>
                <div style={s.gaugeRow}>
                  <span style={s.gaugeLbl}>ENTREGAS</span>
                  <span style={s.gaugeVal}>{totalEntregasNum}</span>
                </div>
                <div style={s.gaugeRow}>
                  <span style={s.gaugeLbl}>INSUCESSOS</span>
                  <span style={s.gaugeVal}>{totalInsucessos}</span>
                </div>
              </div>
            </div>

            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Evento</th>
                    <th style={s.th}>Qtd</th>
                    <th style={s.th}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {eficiencia.length === 0 ? (
                    <tr><td colSpan={3} style={{ ...s.td, textAlign: 'center', color: '#6b7280' }}>Sem dados.</td></tr>
                  ) : (
                    eficiencia.map(e => {
                      const pct = totalEventos > 0 ? ((Number(e.quantidade) / totalEventos) * 100).toFixed(1) : '0.0';
                      const isIns = isInsucesso(e.evento);
                      return (
                        <tr key={e.evento}>
                          <td style={s.td}>
                            {e.evento.toUpperCase()}{' '}
                            {isIns && <span style={s.badgeWarn}>INSUCESSO</span>}
                          </td>
                          <td style={s.td}>{e.quantidade}</td>
                          <td style={s.td}>{pct}%</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={s.section}>
            <div style={s.sectionTitle}><span style={s.sectionIcon}>⚠️</span> RECLAMAÇÕES</div>
            <div style={s.sectionSub}>Acareações geradas</div>
            <div id="rec-content">
              {reclamacoes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.5rem', color: '#3de8a0' }}>✓ ZERO</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#6b7280', marginTop: 8, letterSpacing: '2px' }}>NENHUMA RECLAMAÇÃO NA QUINZENA</div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 20 }}>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '3rem', color: '#ff5a5a' }}>{reclamacoes.length}</div>
                    <div>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#6b7280' }}>ÍNDICE DE RECLAMAÇÕES</div>
                      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', color: '#ff9f40' }}>{pctReclamacao.toFixed(2)}%</div>
                    </div>
                  </div>
                  <div style={s.tableWrap}>
                    <table style={s.table}>
                      <thead>
                        <tr>
                          <th style={s.th}>Lista</th>
                          <th style={s.th}>Data Entrega</th>
                          <th style={s.th}>Endereço</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reclamacoes.map((r, i) => {
                          const addr = r.cep ? cepCache[r.cep] : null;
                          const mapsQ = addr?.logradouro || addr?.bairro
                            ? `${addr.logradouro || ''}, ${addr.bairro || ''}, Salvador, BA`
                            : r.cep ? `CEP ${r.cep.replace(/\D/g, '')}, Salvador, BA` : '';
                          return (
                            <tr key={r.id || i}>
                              <td style={s.td}>{r.lista}</td>
                              <td style={s.td}>{formatDate(r.data_entrega || r.data_criacao)}</td>
                              <td style={{ ...s.td, fontSize: '0.65rem' }}>
                                {!r.cep ? (
                                  <em style={{ color: '#6b7280' }}>—</em>
                                ) : !addr ? (
                                  <span style={{ color: '#ff9f40' }}>carregando...</span>
                                ) : addr.logradouro ? (
                                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQ)}`} target="_blank" rel="noopener noreferrer" style={{ color: '#5ab4ff', textDecoration: 'none' }}>
                                    {addr.logradouro}, {addr.bairro} <span style={{ fontSize: '0.6rem' }}>📍</span>
                                  </a>
                                ) : (
                                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQ)}`} target="_blank" rel="noopener noreferrer" style={{ color: '#5ab4ff', textDecoration: 'none' }}>
                                    {addr.bairro} <span style={{ fontSize: '0.6rem' }}>📍</span>
                                  </a>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{ ...s.section, gridColumn: '1 / -1' }}>
            <div style={{ ...s.sectionTitle, justifyContent: 'space-between' }}>
              <span><span style={s.sectionIcon}>🚚</span> LISTAS / VIAGENS DA QUINZENA</span>
              <a href="/driver/regras-pagamento" target="_blank" rel="noopener noreferrer" style={s.regrasLink}>📋 Regras p/ Pagamento Antecipado</a>
            </div>
            <div style={s.sectionSub}>Status da lista + valor calculado por faixa de peso e bairro</div>
            {msgSolicitacao && <div style={s.solicMsg}>{msgSolicitacao}</div>}

            {trips.length === 0 ? (
              <div style={s.empty}>Nenhuma lista encontrada para esta quinzena.</div>
            ) : (
              <>
                <div style={s.listasGrid}>
                  {trips.map((t) => {
                    const lista = t.numero_lista;
                    const faixasLista = faixas[lista] || [];
                    const totalEntregasLista = faixasLista.reduce((s2, f) => s2 + Number(f.entregas), 0);
                    const totalValorLista = faixasLista.reduce((s2, f) => s2 + Number(f.total_valor), 0);
                    const status = t.pago ? 'Pago' : t.status === 'Finalizado' ? 'Finalizado' : 'Em aberto';
                    const statusColor = t.pago ? '#5ab4ff' : t.status === 'Finalizado' ? '#3de8a0' : '#6b7280';

                    const db = t.data_baixa ? new Date(t.data_baixa.slice(0, 10)) : null;
                    const hoje = new Date(); hoje.setHours(0,0,0,0);
                    const dataBaixaOk = db && db < hoje;

                    const emSuspensao = qzAtual && pagamentoDate
                      ? hoje.getTime() >= new Date(qzAtual.fim.slice(0, 10)).getTime() &&
                        hoje.getTime() <= pagamentoDate.getTime()
                      : false;

                    const temSolicitacao = t.solicitacao_status && t.solicitacao_status !== 'recusado';
                    const solicitacaoStatus = t.solicitacao_status || null;

                    const reclamacoesDesatualizadas = !ultimaImportacao || (Date.now() - new Date(ultimaImportacao).getTime()) > 4 * 60 * 60 * 1000;

                    const eficienciaMinima = Number(config?.eficiencia_minima_adiantamento) || 98;
                    const taxaAdiantamento = Number(config?.taxa_adiantamento) || 0;
                    const valorLiquido = totalValorLista * (1 - taxaAdiantamento / 100);
                    const elegivel = !t.pago && pctEficiencia >= eficienciaMinima && dataBaixaOk && !t.tem_reclamacao_aberta && totalValorLista > 0 && totalValorLista <= 400 && !emSuspensao && !temSolicitacao && !reclamacoesDesatualizadas;
                    const motivos = [];
                    if (pctEficiencia < eficienciaMinima) motivos.push(`Eficiência abaixo de ${eficienciaMinima}%`);
                    if (!dataBaixaOk) motivos.push('Data Baixa deve ser anterior a hoje');
                    if (t.tem_reclamacao_aberta) motivos.push('Lista possui reclamação');
                    if (totalValorLista <= 0) motivos.push('Valor da lista é zero');
                    if (totalValorLista > 400) motivos.push('Valor da lista excede R$ 400,00');
                    if (emSuspensao) motivos.push('Período de pagamento da quinzena em processamento');
                    if (t.pago) motivos.push('Lista já foi paga');
                    if (temSolicitacao) motivos.push(solicitacaoStatus === 'pendente' ? 'Adiantamento já solicitado (pendente)' : 'Adiantamento já aprovado');
                    if (reclamacoesDesatualizadas) motivos.push('Reclamações desatualizadas — aguardando análise');
                    return (
                      <div key={lista} style={s.listaCard}>
                        <div style={s.listaCardHeader}>
                          <div>
                            <div style={s.listaNumero}>#{lista}</div>
                            <div style={s.listaRota}>{t.ctes_vinculados} CTEs</div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                            <span style={s.badgeStatus(statusColor)}>{status}</span>
                            {solicitacaoStatus && (
                              <span style={{
                                ...s.badgeStatus(solicitacaoStatus === 'aprovado' ? '#3de8a0' : '#ff9f40'),
                                fontSize: '0.5rem'
                              }}>
                                ADIANTAMENTO {solicitacaoStatus.toUpperCase()}
                              </span>
                            )}
                            <button
                              onClick={() => handleSolicitarPagamento(lista, totalValorLista)}
                              disabled={!elegivel || solicitando[lista]}
                              title={!elegivel ? motivos.join('; ') : ''}
                              style={reclamacoesDesatualizadas ? s.btnSolicitarDisabled : elegivel ? s.btnSolicitar : s.btnSolicitarDisabled}
                            >
                              {solicitando[lista] ? '...' : reclamacoesDesatualizadas ? 'Adiantamento em análise' : 'Solicitar Pagamento Antecipado'}
                            </button>
                          </div>
                        </div>

                        <div style={s.listaStats}>
                          <div style={s.listaStat}>
                            <div style={s.listaStatVal}>{totalEntregasLista}</div>
                            <div style={s.listaStatLbl}>Entregues</div>
                          </div>
                          <div style={s.listaStat}>
                            <div style={s.listaStatVal}>{t.qtd || '-'}</div>
                            <div style={s.listaStatLbl}>Na Lista</div>
                          </div>
                          <div style={s.listaStat}>
                            <div style={s.listaStatVal}>{t.ctes_vinculados || 0}</div>
                            <div style={s.listaStatLbl}>CTEs</div>
                          </div>
                        </div>

                        <div style={{ marginTop: 8 }}>
                          {faixasLista.length > 0 && (
                            <div style={{ cursor: 'pointer' }} onClick={() => toggleExpandido(lista)}>
                              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#6b7280', letterSpacing: '1px', marginBottom: 4 }}>
                                {expandido[lista] ? '▼' : '▶'} Bairros e Faixas
                              </div>
                            </div>
                          )}
                          {expandido[lista] && faixasLista.length > 0 && (
                            <div style={{ background: '#1e2230', borderRadius: 4, padding: 8, marginTop: 4 }}>
                              {(() => {
                                const byBairro = {};
                                for (const f of faixasLista) {
                                  const b = f.bairro || 'Sem bairro';
                                  if (!byBairro[b]) byBairro[b] = [];
                                  byBairro[b].push(f);
                                }
                                return Object.entries(byBairro).map(([bairro, faixasDoBairro]) => (
                                  <div key={bairro} style={{ marginBottom: 8, borderLeft: '2px solid #2a2f3e', paddingLeft: 8 }}>
                                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#f0c040', letterSpacing: '1px', marginBottom: 4 }}>{bairro}</div>
                                    {faixasDoBairro.map((f, idx) => (
                                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', padding: '2px 0', fontFamily: "'IBM Plex Mono', monospace" }}>
                                        <span style={{ color: '#6b7280' }}>{f.faixa_desc}</span>
                                        <span style={{ color: '#e8eaf0' }}>{f.entregas} × {formatMoney(f.total_valor)}</span>
                                      </div>
                                    ))}
                                  </div>
                                ));
                              })()}
                            </div>
                          )}
                        </div>

                        <div style={s.listaValor}>
                          <div>
                            <div style={s.listaValorLbl}>Valor Calculado</div>
                            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#6b7280' }}>
                              faixa de peso
                            </div>
                          </div>
                          <div style={totalValorLista > 0 ? s.listaValorNum : { ...s.listaValorNum, color: '#6b7280' }}>
                            {totalValorLista > 0 ? formatMoney(totalValorLista) : '—'}
                          </div>
                        </div>
                        {taxaAdiantamento > 0 && totalValorLista > 0 && (
                          <div style={s.listaValor}>
                            <div>
                              <div style={s.listaValorLbl}>Líquido (taxa {taxaAdiantamento}%)</div>
                            </div>
                            <div style={{ ...s.listaValorNum, color: '#3de8a0', fontSize: '0.95rem' }}>
                              {formatMoney(valorLiquido)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={s.totalRodape}>
                  <div style={s.totalRodapeLbl}>Total das Listas na Quinzena</div>
                  <div style={s.totalRodapeVal}>{formatMoney(trips.reduce((s2, t) => {
                    const fl = faixas[t.numero_lista] || [];
                    return s2 + fl.reduce((s3, f) => s3 + Number(f.total_valor), 0);
                  }, 0))}</div>
                </div>
              </>
            )}
          </div>
        </div>

        <div style={s.footer}>SISTEMA DE GESTÃO DE MOTORISTAS · DRIVER_PEY</div>
      </div>
    </div>
  );
}

const s = {
  container: { minHeight: '100vh', background: '#0d0f14', color: '#e8eaf0', fontFamily: "'IBM Plex Sans', sans-serif", position: 'relative' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12, fontFamily: "'IBM Plex Mono', monospace", color: '#6b7280', fontSize: '0.8rem', letterSpacing: '2px' },
  spinner: { width: 20, height: 20, border: '2px solid #2a2f3e', borderTopColor: '#f0c040', borderRadius: '50%', animation: 'spin .7s linear infinite' },

  topbar: { background: '#161920', borderBottom: '1px solid #2a2f3e', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60, position: 'sticky', top: 0, zIndex: 50 },
  brand: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '3px', color: '#f0c040' },
  topbarInfo: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#6b7280', textAlign: 'right', lineHeight: 1.6 },
  topbarInfoVal: { color: '#e8eaf0', fontWeight: 600 },
  logoutBtn: { background: 'transparent', border: '1px solid #2a2f3e', color: '#6b7280', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', letterSpacing: '1px', padding: '6px 12px', cursor: 'pointer', marginLeft: 24 },

  content: { maxWidth: 1200, margin: '0 auto', padding: '0 0 60px' },
  error: { background: '#2a1a1a', border: '1px solid #ff5a5a', color: '#ff5a5a', padding: '12px 16px', margin: '20px 32px 0', fontSize: '0.85rem' },

  hero: { padding: '40px 32px 0', display: 'flex', gap: 32, alignItems: 'flex-end', flexWrap: 'wrap' },
  heroName: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2.5rem, 6vw, 5rem)', letterSpacing: '4px', lineHeight: 1, color: '#e8eaf0' },
  heroNameEm: { color: '#f0c040', fontStyle: 'normal' },
  heroMat: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#6b7280', letterSpacing: '2px', marginTop: 6 },
  qzNav: { display: 'flex', flexDirection: 'column', gap: 8 },
  qzLabelSmall: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', letterSpacing: '2px', color: '#6b7280', textTransform: 'uppercase' },
  qzNavRow: { display: 'flex', alignItems: 'center', gap: 0 },
  qzBtn: { background: '#1e2230', border: '1px solid #2a2f3e', color: '#6b7280', width: 32, height: 36, cursor: 'pointer', fontSize: '1rem', transition: 'color .15s', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  qzBadge: { background: '#1e2230', border: '1px solid #2a2f3e', padding: '8px 16px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', letterSpacing: '1px', color: '#3de8a0', minWidth: 220, textAlign: 'center', borderLeft: 'none', borderRight: 'none' },
  pagLabel: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#3de8a0', letterSpacing: '1px' },
  pagData: { fontWeight: 600, color: '#f0c040' },

  kpiStrip: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1px', background: '#2a2f3e', margin: '32px 32px 0', border: '1px solid #2a2f3e' },
  kpi: { background: '#161920', padding: '24px 20px', position: 'relative', overflow: 'hidden' },
  kpiLabel: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', letterSpacing: '2px', textTransform: 'uppercase', color: '#6b7280', marginBottom: 10 },
  kpiValue: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.4rem', letterSpacing: '2px', lineHeight: 1 },
  kpiDetail: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#6b7280', marginTop: 6 },

  sections: { padding: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 },
  section: { background: '#161920', border: '1px solid #2a2f3e', padding: 24 },
  sectionTitle: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: '3px', color: '#f0c040', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 },
  sectionIcon: { width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' },
  sectionSub: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#6b7280', letterSpacing: '1px', marginBottom: 20 },

  barChart: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 },
  barRow: { display: 'flex', alignItems: 'center', gap: 12 },
  barLabel: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#6b7280', width: 80, flexShrink: 0, textAlign: 'right' },
  barTrack: { flex: 1, background: '#1e2230', height: 20, position: 'relative', overflow: 'hidden' },
  barFill: { height: '100%', background: '#f0c040', transition: 'width 1s cubic-bezier(.23,1,.32,1)' },
  barVal: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#e8eaf0', width: 30, flexShrink: 0 },

  tableWrap: { overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' },
  th: { textAlign: 'left', fontSize: '0.6rem', letterSpacing: '2px', textTransform: 'uppercase', color: '#6b7280', padding: '8px 12px', borderBottom: '1px solid #2a2f3e' },
  td: { padding: '10px 12px', borderBottom: '1px solid rgba(42,47,62,.6)', color: '#e8eaf0', fontSize: '0.75rem' },
  badgeGreen: { display: 'inline-block', padding: '2px 8px', fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: "'IBM Plex Mono', monospace", borderRadius: 2, background: 'rgba(61,232,160,.15)', color: '#3de8a0' },
  badgeWarn: { display: 'inline-block', padding: '2px 8px', fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: "'IBM Plex Mono', monospace", borderRadius: 2, background: 'rgba(255,159,64,.15)', color: '#ff9f40' },
  badgeStatus: (c) => ({ display: 'inline-block', padding: '2px 8px', fontSize: '0.55rem', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: "'IBM Plex Mono', monospace", borderRadius: 2, background: `${c}22`, color: c }),

  gaugeWrap: { display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' },
  gaugeRing: { position: 'relative', width: 120, height: 120, flexShrink: 0 },
  gaugeCenter: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  gaugePct: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', lineHeight: 1 },
  gaugeSubLabel: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.5rem', color: '#6b7280', letterSpacing: '1px', marginTop: 4 },
  gaugeDetail: { flex: 1 },
  gaugeRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #2a2f3e', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem' },
  gaugeLbl: { color: '#6b7280' },
  gaugeVal: { color: '#e8eaf0', fontWeight: 600 },

  empty: { textAlign: 'center', padding: '40px 0', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#6b7280', letterSpacing: '1px' },

  listasGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginTop: 4 },
  listaCard: { background: '#0d0f14', border: '1px solid #2a2f3e', padding: 16, position: 'relative', transition: 'border-color .2s' },
  listaCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  listaNumero: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', letterSpacing: '2px', color: '#f0c040', lineHeight: 1 },
  listaRota: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#6b7280', letterSpacing: '1px', marginTop: 2, textTransform: 'uppercase' },
  listaStats: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 },
  listaStat: { textAlign: 'center' },
  listaStatVal: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', color: '#e8eaf0', lineHeight: 1 },
  listaStatLbl: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: '#6b7280', letterSpacing: '1px', textTransform: 'uppercase' },
  listaValor: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #2a2f3e' },
  listaValorLbl: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#6b7280', letterSpacing: '1px', textTransform: 'uppercase' },
  listaValorNum: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', color: '#3de8a0', letterSpacing: '1px' },

  totalRodape: { marginTop: 16, padding: '14px 18px', background: '#1e2230', border: '1px solid #2a2f3e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  totalRodapeLbl: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#6b7280', letterSpacing: '2px', textTransform: 'uppercase' },
  totalRodapeVal: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#3de8a0', letterSpacing: '2px' },

  footer: { padding: '20px 32px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#2a2f3e', letterSpacing: '1px', textAlign: 'center' },
  regrasLink: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#5ab4ff', textDecoration: 'none', letterSpacing: '1px', padding: '4px 8px', border: '1px solid #5ab4ff33', borderRadius: 2, transition: 'background .2s' },
  solicMsg: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', color: '#3de8a0', marginBottom: 12, padding: '8px 12px', background: '#1a3a2a', border: '1px solid #3de8a033', borderRadius: 4 },
  btnSolicitar: { background: 'rgba(61,232,160,.15)', border: '1px solid #3de8a0', color: '#3de8a0', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', letterSpacing: '1px', padding: '4px 8px', cursor: 'pointer', borderRadius: 2, whiteSpace: 'nowrap', transition: 'background .2s' },
  btnSolicitarDisabled: { background: 'transparent', border: '1px solid #2a2f3e', color: '#6b7280', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', letterSpacing: '1px', padding: '4px 8px', cursor: 'not-allowed', borderRadius: 2, whiteSpace: 'nowrap' },
};
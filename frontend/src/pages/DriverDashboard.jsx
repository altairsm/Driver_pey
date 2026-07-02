import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDriverDashboard, getDriverTrips, getDriverMe, getDriverTripsFaixas, getQuinzenas, getProdutividade, getEficiencia, getEficiencia30dias, getReclamacoes, solicitarPagamento, getUltimaImportacaoReclamacoes, getConfig, getTaxasAdiantamento, getBonusD0 } from '../services/api';
import { sendFcmTokenWithRetry } from '../services/notificationService';
import { LocalNotifications } from '@capacitor/local-notifications';

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
  if (match) return `${match[3]}/${match[2]}/${match[1].slice(2)}`;
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

function calcQuinzenaFim(dataStr) {
  const d = new Date(dataStr.slice(0, 10));
  const dia = d.getUTCDate();
  if (dia <= 15) return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 14));
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
}

function calcDiasAteFechamento(dataBaixa) {
  const d = new Date(dataBaixa.slice(0, 10));
  const dia = d.getUTCDate();
  let fechamento;
  if (dia <= 15) {
    fechamento = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 14));
  } else {
    fechamento = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  }
  const hoje = new Date();
  hoje.setUTCHours(0, 0, 0, 0);
  const diffMs = fechamento.getTime() - hoje.getTime();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

// ─── Tab navigation ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'reclamacoes',  label: 'Acareação',   icon: '⚠️' },
  { id: 'resumo',       label: 'Resumo',       icon: '📋' },
  { id: 'produtividade',label: 'Produção',      icon: '📦' },
  { id: 'eficiencia',   label: 'Eficiência',    icon: '📊' },
  { id: 'listas',       label: 'Listas',        icon: '🚚' },
];

export default function DriverDashboard() {
  const navigate = useNavigate();
  const [driver, setDriver] = useState(null);
  const [quinzenas, setQuinzenas] = useState([]);
  const [qzIdx, setQzIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [dashboard, setDashboard] = useState(null);
  const [trips, setTrips] = useState([]);
  const [faixas, setFaixas] = useState({});
  const [produtividade, setProdutividade] = useState([]);
  const [bonusD0, setBonusD0] = useState({ dias: [], total_entregas: 0, total_bonus: 0, valor_unitario_medio: 0 });
  const [eficiencia, setEficiencia] = useState([]);
  const [eficiencia30dias, setEficiencia30dias] = useState([]);
  const [reclamacoes, setReclamacoes] = useState([]);
  const [expandido, setExpandido] = useState({});
  const [solicitando, setSolicitando] = useState({});
  const [msgSolicitacao, setMsgSolicitacao] = useState('');
  const [ultimaImportacao, setUltimaImportacao] = useState(null);
  const [countdown, setCountdown] = useState({ ativo: false, texto: '' });
  const [cepCache, setCepCache] = useState({});
  const [config, setConfig] = useState(null);
  const [taxas, setTaxas] = useState([]);
  const [activeTab, setActiveTab] = useState('reclamacoes');
  const [menuOpen, setMenuOpen] = useState(false);

  const qzAtual = quinzenas[qzIdx] || null;

  const fetchQuinzenaData = useCallback(async (inicio, fim) => {
    try {
      const [prod, ef, ef30, rec, dash, tripList, faixasData, bD0] = await Promise.all([
        getProdutividade(inicio, fim),
        getEficiencia(inicio, fim),
        getEficiencia30dias(),
        getReclamacoes(inicio, fim),
        getDriverDashboard(inicio, fim),
        getDriverTrips(inicio, fim),
        getDriverTripsFaixas(inicio, fim),
        getBonusD0(inicio, fim).catch(() => ({ dias: [], total_entregas: 0, total_bonus: 0, valor_unitario_medio: 0 })),
      ]);
      setProdutividade(prod);
      setBonusD0(bD0);
      setEficiencia(ef);
      setEficiencia30dias(ef30);
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
        const userLS = JSON.parse(localStorage.getItem('user') || '{}');
        if (!me.leu_regras && !userLS.leu_regras) {
          navigate('/driver/regras-pagamento');
          return;
        }
        const [qzs, cfg, tx] = await Promise.all([getQuinzenas(), getConfig(), getTaxasAdiantamento()]);
        setQuinzenas(qzs);
        setConfig(cfg);
        setTaxas(tx);

        sendFcmTokenWithRetry(5, 2000);

        const ultima = await getUltimaImportacaoReclamacoes();
        setUltimaImportacao(ultima.ultima_importacao);
        if (qzs.length > 0) {
          const q = qzs[0];
          await fetchQuinzenaData(q.inicio.slice(0, 10), q.fim.slice(0, 10));
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

  useEffect(() => {
    if (!ultimaImportacao) {
      setCountdown({ ativo: false, texto: '' });
      return;
    }
    const notifiedKey = `notified_30min_${ultimaImportacao}`;
    const atualizar = () => {
      const fim = new Date(ultimaImportacao).getTime() + 4 * 60 * 60 * 1000;
      const restante = fim - Date.now();
      if (restante <= 0) {
        setCountdown({ ativo: false, texto: '' });
        return;
      }
      if (restante <= 30 * 60 * 1000 && !localStorage.getItem(notifiedKey)) {
        localStorage.setItem(notifiedKey, 'true');
        LocalNotifications.schedule({
          notifications: [{
            title: 'Atenção ⏰ 💲 💵 🤑',
            body: 'Você ainda tem 30 minutos para solicitar seu adiantamento!',
            id: 2,
            schedule: { at: new Date(Date.now() + 1000) },
            sound: 'dinheiro-caindo-na-conta',
          }]
        });
      }
      const h = Math.floor(restante / (1000 * 60 * 60));
      const m = Math.floor((restante % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((restante % (1000 * 60)) / 1000);
      setCountdown({
        ativo: true,
        texto: `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`,
      });
    };
    atualizar();
    const id = setInterval(atualizar, 1000);
    return () => clearInterval(id);
  }, [ultimaImportacao]);

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
  const pctEficiencia = totalEventos > 0 ? ((totalEntregasNum / totalEventos) * 100) : 0;

  const soEntregasQ30 = eficiencia30dias.filter(e => e.evento === 'entrega');
  const totalEventos30 = eficiencia30dias.reduce((s, e) => s + Number(e.quantidade), 0);
  const totalEntregasNum30 = soEntregasQ30.reduce((s, e) => s + Number(e.quantidade), 0);
  const totalInsucessos30 = eficiencia30dias.filter(e => isInsucesso(e.evento)).reduce((s, e) => s + Number(e.quantidade), 0);
  const pctEficiencia30dias = totalEventos30 > 0 ? ((totalEntregasNum30 / totalEventos30) * 100) : 0;

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
          <span>CARREGANDO...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      {/* ── TOPBAR MOBILE ── */}
      <div style={s.topbar}>
        <div style={s.brand}>DRIVER PIX</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            style={s.menuBtn}
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Menu"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* ── DRAWER MENU ── */}
      {menuOpen && (
        <div style={s.drawer}>
          <div style={s.drawerHeader}>
            <div style={s.drawerName}>{driver?.nome_completo?.toUpperCase() || 'MOTORISTA'}</div>
            <div style={s.drawerMat}>MAT. {driver?.matricula || '—'}</div>
          </div>
          <div style={s.drawerDivider} />
          <button style={s.drawerItem} onClick={() => { setMenuOpen(false); navigate('/driver/regras-pagamento'); }}>📋 Regras de Pagamento</button>
          <button style={s.drawerItem} onClick={() => { setMenuOpen(false); navigate('/driver/mapa'); }}>🗺️ Mapa de Entregas</button>
          <button style={s.drawerItem} onClick={() => { setMenuOpen(false); navigate('/driver/meus-dados'); }}>👤 Meus Dados</button>
          <div style={s.drawerDivider} />
          <button style={{ ...s.drawerItem, color: '#ff5a5a' }} onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href = '/login'; }}>⏻ Sair</button>
        </div>
      )}
      {menuOpen && <div style={s.overlay} onClick={() => setMenuOpen(false)} />}

      <div style={s.content}>
        {error && <div style={s.error}>{error}</div>}

        {/* ── HERO / QUINZENA ── */}
        <div style={s.hero}>
          <div style={s.heroName}>
            <em style={s.heroNameEm}>{driver?.nome_completo?.split(' ').slice(0, 2).join(' ')?.toUpperCase() || 'MOTORISTA'}</em>
          </div>
          <div style={s.heroMat}>MAT. {driver?.matricula || '—'}</div>

          {/* Quinzena navigator */}
          <div style={s.qzNav}>
            <div style={s.qzLabelSmall}>Selecionar Quinzena</div>
            <div style={s.qzNavRow}>
              <button className="qz-nav-btn" onClick={handlePrev} disabled={qzIdx >= quinzenas.length - 1} style={{ ...s.qzBtn, opacity: qzIdx >= quinzenas.length - 1 ? 0.3 : 1 }}>&#8249;</button>
              <div style={s.qzBadge}>{qzLabel}{qzPos}</div>
              <button className="qz-nav-btn" onClick={handleNext} disabled={qzIdx <= 0} style={{ ...s.qzBtn, opacity: qzIdx <= 0 ? 0.3 : 1 }}>&#8250;</button>
            </div>
            {pagamentoDate && (
              <div style={s.pagLabel}>
                💰 PAGAMENTO: <span style={s.pagData}>{pagamentoDate.toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: 'long' })}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── KPI CARDS SCROLL ── */}
        <div style={s.kpiScroll}>
          <div style={{ ...s.kpiCard, borderBottomColor: '#3de8a0' }}>
            <div style={s.kpiLabel}>CTes Entregues</div>
            <div style={{ ...s.kpiValue, color: '#3de8a0' }}>{dashboard?.total_ctes || 0}</div>
            <div style={s.kpiDetail}>na quinzena</div>
          </div>

          <div style={{ ...s.kpiCard, borderBottomColor: '#ff9f40' }}>
            <div style={s.kpiLabel}>Insucessos (30d)</div>
            <div style={{ ...s.kpiValue, color: '#ff9f40' }}>{totalInsucessos30}</div>
            <div style={s.kpiDetail}>{totalEventos30 > 0 ? ((totalInsucessos30 / totalEventos30) * 100).toFixed(1) : '0.0'}% eventos</div>
          </div>
          <div style={{ ...s.kpiCard, borderBottomColor: '#ff5a5a' }}>
            <div style={s.kpiLabel}>Reclamações</div>
            <div style={{ ...s.kpiValue, color: '#ff5a5a' }}>{totalReclamacoes}</div>
            <div style={s.kpiDetail}>{pctReclamacao.toFixed(2)}% entregas</div>
          </div>
          <div style={{ ...s.kpiCard, borderBottomColor: '#3de8a0', minWidth: 140 }}>
            <div style={s.kpiLabel}>Total a Receber</div>
            <div style={{ ...s.kpiValue, color: '#3de8a0', fontSize: '1.2rem' }}>{formatMoney(dashboard?.receita_total)}</div>
            <div style={s.kpiDetail}>faixa de peso</div>
          </div>
        </div>

        {/* ── TAB BAR ── */}
        <div style={s.tabBar}>
          {TABS.map(t => (
            <button
              key={t.id}
              style={{ ...s.tabBtn, ...(activeTab === t.id ? s.tabBtnActive : {}) }}
              onClick={() => setActiveTab(t.id)}
            >
              <span style={s.tabIcon}>{t.icon}</span>
              <span style={s.tabLabel}>{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── TAB CONTENT ── */}
        <div style={s.tabContent}>

          {/* RESUMO */}
          {activeTab === 'resumo' && (
            <div style={s.section}>
              <div style={s.sectionTitle}>📋 RESUMO DA QUINZENA</div>
              <div style={s.sectionSub}>Visão geral do seu desempenho</div>
              <div style={s.resumoGrid}>
                <div style={s.resumoItem}>
                  <div style={s.resumoLbl}>Eficiência</div>
                  <div style={{ ...s.resumoVal, color: pctEficiencia < 70 ? '#ff5a5a' : pctEficiencia < 85 ? '#ff9f40' : '#3de8a0' }}>{pctEficiencia.toFixed(2).replace('.', ',')}%</div>
                </div>
                <div style={s.resumoItem}>
                  <div style={s.resumoLbl}>CTes</div>
                  <div style={{ ...s.resumoVal, color: '#3de8a0' }}>{dashboard?.total_ctes || 0}</div>
                </div>
                <div style={s.resumoItem}>
                  <div style={s.resumoLbl}>Dias</div>
                  <div style={{ ...s.resumoVal, color: '#f0c040' }}>{produtividade.length}</div>
                </div>
                <div style={s.resumoItem}>
                  <div style={s.resumoLbl}>Insucessos</div>
                  <div style={{ ...s.resumoVal, color: '#ff9f40' }}>{totalInsucessos}</div>
                </div>
              </div>
              {pagamentoDate && (
                <div style={s.pagCard}>
                  <div style={s.pagCardLbl}>💰 Previsão de Pagamento</div>
                  <div style={s.pagCardVal}>{pagamentoDate.toLocaleDateString('pt-BR', { timeZone: 'UTC', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</div>
                  <div style={s.pagCardTotal}>{formatMoney(dashboard?.receita_total)}</div>
                </div>
              )}
            </div>
          )}

          {/* PRODUTIVIDADE */}
          {activeTab === 'produtividade' && (
            <>
            {bonusD0.dias.length > 0 && (
              <div style={s.section}>
                <div style={{ ...s.sectionTitle, color: '#3de8a0' }}>🏆 BÔNUS D0</div>
                <div style={s.sectionSub}>Valor acumulado por data (entrega no mesmo dia da emissão)</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.9rem', color: '#3de8a0', marginBottom: 12, letterSpacing: '2px' }}>
                  Total: R$ {bonusD0.total_bonus.toFixed(2)} · {bonusD0.total_entregas} entregas
                </div>
                <div style={s.barChart}>
                  {(() => {
                    const maxVal = Math.max(...bonusD0.dias.map(d => Number(d.valor_total)), 1);
                    return bonusD0.dias.map(d => {
                      const pct = (Number(d.valor_total) / maxVal * 100).toFixed(1);
                      return (
                        <div key={d.data} style={s.barRow}>
                          <div style={s.barLabel}>{formatDate(d.data)}</div>
                          <div style={s.barTrack}>
                            <div style={{ ...s.barFill, background: '#3de8a0', width: `${pct}%` }}></div>
                          </div>
                          <div style={s.barVal}>{d.entregas_d0}</div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
            <div style={s.section}>
              <div style={s.sectionTitle}>📦 PRODUTIVIDADE</div>
              <div style={s.sectionSub}>Suas entregas por data</div>
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
            </div>
          </>)}

          {/* EFICIÊNCIA */}
          {activeTab === 'eficiencia' && (
            <div style={s.section}>
              <div style={s.sectionTitle}>📊 EFICIÊNCIA</div>
              <div style={s.sectionSub}>Últimos 30 dias — proporção de entregas × insucessos</div>
              {/* Gauge */}
              <div style={s.gaugeWrap}>
                <div style={s.gaugeRing}>
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#2a2f3e" strokeWidth="10" />
                    <circle cx="60" cy="60" r="50" fill="none"
                      stroke={pctEficiencia30dias < 95 ? '#ff5a5a' : pctEficiencia30dias < 97 ? '#ff9f40' : '#3de8a0'}
                      strokeWidth="10"
                      strokeDasharray="314"
                      strokeDashoffset={314 - (pctEficiencia30dias / 100) * 314}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.23,1,.32,1)' }} />
                  </svg>
                  <div style={s.gaugeCenter}>
                    <div style={{ ...s.gaugePct, color: pctEficiencia30dias < 70 ? '#ff5a5a' : pctEficiencia30dias < 85 ? '#ff9f40' : '#3de8a0' }}>{pctEficiencia30dias.toFixed(2).replace('.', ',')}%</div>
                    <div style={s.gaugeSubLabel}>eficiência (30 dias)</div>
                  </div>
                </div>
                <div style={s.gaugeStats}>
                  <div style={s.gaugeRow}><span style={s.gaugeLbl}>TOTAL EVENTOS</span><span style={s.gaugeVal}>{totalEventos30}</span></div>
                  <div style={s.gaugeRow}><span style={s.gaugeLbl}>ENTREGAS</span><span style={s.gaugeVal}>{totalEntregasNum30}</span></div>
                  <div style={s.gaugeRow}><span style={s.gaugeLbl}>INSUCESSOS</span><span style={s.gaugeVal}>{totalInsucessos30}</span></div>
                </div>
              </div>
              {/* Eventos como cards */}
              {eficiencia30dias.map(e => {
                const pct = totalEventos30 > 0 ? ((Number(e.quantidade) / totalEventos30) * 100).toFixed(1) : '0.0';
                const isIns = isInsucesso(e.evento);
                return (
                  <div key={e.evento} style={{ ...s.efCard, borderLeftColor: isIns ? '#ff9f40' : '#3de8a0' }}>
                    <div style={s.efCardEvento}>
                      {e.evento.toUpperCase()}
                      {isIns && <span style={s.badgeWarn}>INSUCESSO</span>}
                    </div>
                    <div style={s.efCardNums}>
                      <span style={s.efCardQtd}>{e.quantidade}</span>
                      <span style={s.efCardPct}>{pct}%</span>
                    </div>
                  </div>
                );
              })}
              {eficiencia.length === 0 && <div style={s.empty}>Sem dados de eficiência.</div>}
            </div>
          )}

          {/* RECLAMAÇÕES */}
          {activeTab === 'reclamacoes' && (
            <div style={s.section}>
              <div style={s.sectionTitle}>⚠️ RECLAMAÇÕES</div>
              <div style={s.sectionSub}>Acareações geradas na quinzena</div>
              {reclamacoes.length === 0 ? (
                <div style={s.zeroRec}>
                  <div style={s.zeroRecNum}>✓ ZERO</div>
                  <div style={s.zeroRecSub}>NENHUMA RECLAMAÇÃO</div>
                </div>
              ) : (
                <>
                  <div style={s.recHeader}>
                    <div style={s.recNum}>{reclamacoes.length}</div>
                    <div>
                      <div style={s.recLbl}>RECLAMAÇÕES</div>
                      <div style={s.recPct}>{pctReclamacao.toFixed(2)}%</div>
                    </div>
                  </div>
                  {reclamacoes.map((r, i) => {
                    const addr = r.cep ? cepCache[r.cep] : null;
                    const mapsQ = addr?.logradouro || addr?.bairro
                      ? `${addr.logradouro || ''}, ${addr.bairro || ''}, Salvador, BA`
                      : r.cep ? `CEP ${r.cep.replace(/\D/g, '')}, Salvador, BA` : '';
                    const resolvido = r.status_original === 'Resolvido';
                    return (
                      <div key={r.id || i} style={{ ...s.recCard, ...(resolvido ? s.recCardResolvido : s.recCardPendente) }}>
                        <div style={s.recCardRow}>
                          <div style={s.recCardLbl}>Lista</div>
                          <div style={s.recCardVal}>{r.lista}</div>
                        </div>
                        <div style={s.recCardRow}>
                          <div style={s.recCardLbl}>Data Entrega</div>
                          <div style={s.recCardVal}>{formatDate(r.data_entrega || r.data_criacao)}</div>
                        </div>
                        {r.status_original && (
                          <div style={s.recCardRow}>
                            <div style={s.recCardLbl}>Status</div>
                            <div style={s.recCardVal}>
                              <span style={resolvido ? s.recStatusResolvido : s.recStatusPendente}>
                                {r.status_original}
                              </span>
                            </div>
                          </div>
                        )}
                        <div style={s.recCardRow}>
                          <div style={s.recCardLbl}>Endereço</div>
                          <div style={s.recCardVal}>
                            {!r.cep ? (
                              <em style={{ color: '#6b7280' }}>—</em>
                            ) : !addr ? (
                              <span style={{ color: '#ff9f40' }}>carregando...</span>
                            ) : addr.logradouro ? (
                              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQ)}`} target="_blank" rel="noopener noreferrer" style={s.mapLink}>
                                {addr.logradouro}, {addr.bairro} 📍
                              </a>
                            ) : (
                              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQ)}`} target="_blank" rel="noopener noreferrer" style={s.mapLink}>
                                {addr.bairro} 📍
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* LISTAS */}
          {activeTab === 'listas' && (
            <div style={s.section}>
              <div style={{ ...s.sectionTitle, justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <span>🚚 LISTAS DA QUINZENA</span>
                <span onClick={() => navigate('/driver/regras-pagamento')} style={{ ...s.regrasLink, cursor: 'pointer' }}>📋 Regras</span>
              </div>
              <div style={s.sectionSub}>Valor calculado por faixa de peso e bairro</div>
              {countdown.ativo ? (
                <div style={s.countdownBanner}>
                  <span>🕐</span>
                  <span>Janela de solicitação ativa por mais <strong>{countdown.texto}</strong></span>
                </div>
              ) : ultimaImportacao ? (
                <div style={s.countdownExpired}>
                  <span>⏳</span>
                  <span>Última importação de reclamações há mais de 4h. Aguarde o administrador atualizar para solicitar adiantamento.</span>
                </div>
              ) : null}
              {msgSolicitacao && <div style={s.solicMsg}>{msgSolicitacao}</div>}
              {trips.length === 0 ? (
                <div style={s.empty}>Nenhuma lista encontrada para esta quinzena.</div>
              ) : (
                <>
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

                    const emSuspensao = t.data_baixa
                      ? (() => {
                          const qf = calcQuinzenaFim(t.data_baixa);
                          qf.setHours(0,0,0,0);
                          const pd = calcPagamento(qf.toISOString().slice(0, 10), config?.dias_uteis_pagamento || 4);
                          pd.setHours(0,0,0,0);
                          return hoje.getTime() >= qf.getTime() && hoje.getTime() <= pd.getTime();
                        })()
                      : false;

                    const temSolicitacao = t.solicitacao_status && t.solicitacao_status !== 'recusado';
                    const solicitacaoStatus = t.solicitacao_status || null;
                    const reclamacoesDesatualizadas = !ultimaImportacao || (Date.now() - new Date(ultimaImportacao).getTime()) > 4 * 60 * 60 * 1000;
                    const eficienciaMinima = Number(config?.eficiencia_minima_adiantamento) || 98;
                    const maximoAdiantamento = Number(config?.valor_maximo_adiantamento) || 400;
                    const diasAteFech = t.data_baixa ? calcDiasAteFechamento(t.data_baixa) : 14;
                    const taxaRow = taxas.find(tx => tx.dias_ate_fechamento === Math.min(diasAteFech, 14));
                    const taxaAdiantamento = Number(taxaRow?.taxa) || 0;
                    const valorLiquido = totalValorLista * (1 - taxaAdiantamento / 100);
                    const elegivel = !t.pago && pctEficiencia30dias >= eficienciaMinima && dataBaixaOk && !t.tem_reclamacao_aberta && totalValorLista > 0 && totalValorLista <= maximoAdiantamento && !emSuspensao && !temSolicitacao && !reclamacoesDesatualizadas && t.status === 'Finalizado';
                    const motivos = [];
                    if (pctEficiencia30dias < eficienciaMinima) motivos.push(`Eficiência abaixo de ${eficienciaMinima}% nos últimos 30 dias`);
                    if (!dataBaixaOk) motivos.push('Aguarde 23h após a última baixa da lista');
                    if (t.tem_reclamacao_aberta) motivos.push('Lista possui reclamação');
                    if (totalValorLista <= 0) motivos.push('Valor da lista é zero');
                    if (totalValorLista > maximoAdiantamento) motivos.push(`Valor excede R$ ${maximoAdiantamento.toFixed(2)}`);
                    if (emSuspensao) motivos.push('Quinzena em processamento');
                    if (t.status !== 'Finalizado') motivos.push('Lista não finalizada');
                    if (t.pago) motivos.push('Já paga');
                    if (temSolicitacao) motivos.push(solicitacaoStatus === 'pendente' ? 'Adiantamento pendente' : 'Adiantamento aprovado');
                    if (reclamacoesDesatualizadas) motivos.push('Reclamações em análise');

                    return (
                      <div key={lista} style={s.listaCard}>
                        {/* Header */}
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
                                ADIANT. {solicitacaoStatus.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stats */}
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

                        {/* Bairros expandível */}
                        {faixasLista.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ cursor: 'pointer' }} onClick={() => toggleExpandido(lista)}>
                              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#fdfdfe', letterSpacing: '1px', marginBottom: 4 }}>
                                {expandido[lista] ? '▼' : '▶'} Bairros e Faixas
                              </div>
                            </div>
                            {expandido[lista] && (
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
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', padding: '2px 0', fontFamily: "'IBM Plex Mono', monospace" }}>
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
                        )}

                        {/* Valor */}
                        <div style={s.listaValor}>
                          <div>
                            <div style={s.listaValorLbl}>Valor Calculado</div>
                            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: '#6b7280' }}>faixa de peso</div>
                          </div>
                          <div style={totalValorLista > 0 ? s.listaValorNum : { ...s.listaValorNum, color: '#6b7280' }}>
                            {totalValorLista > 0 ? formatMoney(totalValorLista) : '—'}
                          </div>
                        </div>

                        {taxaAdiantamento > 0 && totalValorLista > 0 && (
                          <div style={{ ...s.listaValor, borderTop: 'none', paddingTop: 4 }}>
                            <div style={{ ...s.listaValorLbl, color: '#e8eaf0' }}>Líquido (taxa {taxaAdiantamento}%)</div>
                            <div style={{ ...s.listaValorNum, color: '#3de8a0', fontSize: '0.9rem' }}>{formatMoney(valorLiquido)}</div>
                          </div>
                        )}

                        {/* Botão solicitar */}
                        <button
                          onClick={() => handleSolicitarPagamento(lista, totalValorLista)}
                          disabled={!elegivel || solicitando[lista]}
                          title={!elegivel ? motivos.join('; ') : ''}
                          style={{ ...s.btnSolicitar, ...(elegivel ? {} : s.btnSolicitarDisabled), marginTop: 12, width: '100%' }}
                        >
                          {solicitando[lista] ? '...' : reclamacoesDesatualizadas ? 'Adiantamento em análise' : 'Solicitar Pagamento Antecipado'}
                        </button>
                      </div>
                    );
                  })}

                  <div style={s.totalRodape}>
                    <div style={s.totalRodapeLbl}>Total da Quinzena</div>
                    <div style={s.totalRodapeVal}>{formatMoney(trips.reduce((s2, t) => {
                      const fl = faixas[t.numero_lista] || [];
                      return s2 + fl.reduce((s3, f) => s3 + Number(f.total_valor), 0);
                    }, 0))}</div>
                  </div>
                </>
              )}
            </div>
          )}

        </div>{/* end tabContent */}
      </div>{/* end content */}

      <div style={s.footer}>DRIVER PIX · INTUITIVA LOG</div>
    </div>
  );
}

const s = {
  container: { minHeight: '100vh', background: '#0d0f14', color: '#e8eaf0', fontFamily: "'IBM Plex Sans', sans-serif" },

  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12, fontFamily: "'IBM Plex Mono', monospace", color: '#6b7280', fontSize: '0.8rem', letterSpacing: '2px', flexDirection: 'column' },
  spinner: { width: 24, height: 24, border: '2px solid #2a2f3e', borderTopColor: '#f0c040', borderRadius: '50%', animation: 'spin .7s linear infinite' },

  // ── Topbar ──
  topbar: { background: '#161920', borderBottom: '1px solid #2a2f3e', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52, position: 'sticky', top: 0, zIndex: 100 },
  brand: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', letterSpacing: '3px', color: '#f0c040' },
  menuBtn: { background: 'transparent', border: '1px solid #2a2f3e', color: '#e8eaf0', width: 36, height: 36, cursor: 'pointer', fontSize: '1rem', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' },

  // ── Drawer ──
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 200 },
  drawer: { position: 'fixed', top: 0, right: 0, width: 260, height: '100%', background: '#161920', borderLeft: '1px solid #2a2f3e', zIndex: 201, display: 'flex', flexDirection: 'column', padding: '20px 0' },
  drawerHeader: { padding: '0 20px 20px' },
  drawerName: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '2px', color: '#e8eaf0' },
  drawerMat: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#6b7280', letterSpacing: '1px', marginTop: 4 },
  drawerDivider: { height: 1, background: '#2a2f3e', margin: '8px 0' },
  drawerItem: { background: 'transparent', border: 'none', color: '#e8eaf0', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem', letterSpacing: '1px', padding: '14px 20px', cursor: 'pointer', textAlign: 'left', width: '100%' },

  // ── Content ──
  content: { maxWidth: 600, margin: '0 auto', paddingBottom: 80 },
  error: { background: '#2a1a1a', border: '1px solid #ff5a5a', color: '#ff5a5a', padding: '12px 16px', margin: '12px 16px', fontSize: '0.85rem', borderRadius: 4 },

  // ── Hero ──
  hero: { padding: '24px 16px 0' },
  heroName: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 10vw, 3.5rem)', letterSpacing: '3px', lineHeight: 1, color: '#e8eaf0' },
  heroNameEm: { color: '#f0c040', fontStyle: 'normal' },
  heroMat: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#6b7280', letterSpacing: '2px', marginTop: 4 },

  // ── Quinzena nav ──
  qzNav: { marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 },
  qzLabelSmall: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', letterSpacing: '2px', color: '#6b7280', textTransform: 'uppercase' },
  qzNavRow: { display: 'flex', alignItems: 'center', gap: 6 },
  qzBtn: { background: '#2a2f3e', border: '1px solid #3a3f4e', color: '#f0c040', width: 44, height: 44, borderRadius: 8, cursor: 'pointer', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' },
  qzBadge: { flex: 1, background: '#1e2230', border: '1px solid #2a2f3e', borderLeft: 'none', borderRight: 'none', padding: '10px 12px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', letterSpacing: '1px', color: '#3de8a0', textAlign: 'center' },
  pagLabel: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#3de8a0', letterSpacing: '1px' },
  pagData: { fontWeight: 600, color: '#f0c040' },

  // ── KPI horizontal scroll ──
  kpiScroll: { display: 'flex', gap: 1, background: '#2a2f3e', overflowX: 'auto', margin: '16px 0 0', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' },
  kpiCard: { background: '#161920', padding: '16px 14px', borderBottom: '2px solid #3de8a0', flexShrink: 0, minWidth: 110 },
  kpiLabel: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', letterSpacing: '2px', textTransform: 'uppercase', color: '#6b7280', marginBottom: 8 },
  kpiValue: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '2px', lineHeight: 1 },
  kpiDetail: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#6b7280', marginTop: 4 },

  // ── Tab bar ──
  tabBar: { display: 'flex', background: '#161920', borderBottom: '1px solid #2a2f3e', position: 'sticky', top: 52, zIndex: 90, overflowX: 'auto', scrollbarWidth: 'none' },
  tabBtn: { flex: '1 0 auto', background: 'transparent', border: 'none', color: '#6b7280', padding: '10px 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, transition: 'color .15s', borderBottom: '2px solid transparent', minWidth: 60 },
  tabBtnActive: { color: '#f0c040', borderBottomColor: '#f0c040' },
  tabIcon: { fontSize: '1rem' },
  tabLabel: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.5rem', letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap' },

  // ── Tab content ──
  tabContent: { padding: '0 0 16px' },
  section: { padding: '20px 16px' },
  sectionTitle: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '3px', color: '#f0c040', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 },
  sectionSub: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#6b7280', letterSpacing: '1px', marginBottom: 16 },

  // ── Resumo ──
  resumoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 },
  resumoItem: { background: '#161920', border: '1px solid #2a2f3e', padding: '16px 14px', borderRadius: 4 },
  resumoLbl: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#6b7280', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 },
  resumoVal: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', lineHeight: 1, color: '#e8eaf0' },
  pagCard: { background: '#1e2230', border: '1px solid #2a2f3e', borderLeft: '3px solid #3de8a0', padding: '16px', borderRadius: 4 },
  pagCardLbl: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#6b7280', letterSpacing: '1px', marginBottom: 6 },
  pagCardVal: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem', color: '#e8eaf0', marginBottom: 8 },
  pagCardTotal: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', color: '#3de8a0', letterSpacing: '2px' },

  // ── Produtividade ──
  barChart: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 },
  barRow: { display: 'flex', alignItems: 'center', gap: 10 },
  barLabel: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#6b7280', width: 72, flexShrink: 0, textAlign: 'right' },
  barTrack: { flex: 1, background: '#1e2230', height: 18, position: 'relative', overflow: 'hidden' },
  barFill: { height: '100%', background: '#f0c040', transition: 'width 1s cubic-bezier(.23,1,.32,1)' },
  barVal: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#e8eaf0', width: 24, flexShrink: 0 },
  prodCard: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 4, padding: '12px 14px', marginBottom: 8 },
  prodCardDate: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', color: '#f0c040', letterSpacing: '2px', marginBottom: 10 },
  prodCardRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 },
  prodCardItem: { textAlign: 'center' },
  prodCardLbl: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.5rem', color: '#6b7280', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 },
  prodCardVal: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', color: '#e8eaf0' },

  // ── Eficiência ──
  gaugeWrap: { display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 20 },
  gaugeRing: { position: 'relative', width: 120, height: 120, flexShrink: 0 },
  gaugeCenter: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  gaugePct: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', lineHeight: 1 },
  gaugeSubLabel: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.5rem', color: '#6b7280', letterSpacing: '1px', marginTop: 4 },
  gaugeStats: { flex: 1 },
  gaugeRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #2a2f3e', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem' },
  gaugeLbl: { color: '#6b7280' },
  gaugeVal: { color: '#e8eaf0', fontWeight: 600 },
  efCard: { background: '#161920', border: '1px solid #2a2f3e', borderLeft: '3px solid #3de8a0', padding: '12px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 2 },
  efCardEvento: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#e8eaf0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 },
  efCardNums: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 },
  efCardQtd: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', color: '#e8eaf0', lineHeight: 1 },
  efCardPct: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#6b7280' },

  // ── Reclamações ──
  zeroRec: { textAlign: 'center', padding: '40px 0' },
  zeroRecNum: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.5rem', color: '#3de8a0' },
  zeroRecSub: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#6b7280', marginTop: 8, letterSpacing: '2px' },
  recHeader: { display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 },
  recNum: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '3rem', color: '#ff5a5a' },
  recLbl: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#6b7280' },
  recPct: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', color: '#ff9f40' },
  recCard: { background: '#161920', border: '1px solid #2a2f3e', padding: '12px 14px', marginBottom: 8, borderRadius: 2 },
  recCardResolvido: { borderLeft: '3px solid #3de8a0' },
  recCardPendente: { borderLeft: '3px solid #ff5a5a' },
  recStatusResolvido: { color: '#3de8a0', fontWeight: 600 },
  recStatusPendente: { color: '#ff9f40', fontWeight: 600 },
  recCardRow: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(42,47,62,.5)', fontFamily: "'IBM Plex Mono', monospace" },
  recCardLbl: { fontSize: '0.58rem', color: '#6b7280', letterSpacing: '1px', textTransform: 'uppercase' },
  recCardVal: { fontSize: '0.72rem', color: '#e8eaf0' },
  mapLink: { color: '#5ab4ff', textDecoration: 'none' },

  // ── Listas ──
  listaCard: { background: '#161920', border: '1px solid #2a2f3e', padding: '14px', marginBottom: 10, borderRadius: 4 },
  listaCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  listaNumero: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', letterSpacing: '2px', color: '#f0c040', lineHeight: 1 },
  listaRota: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#6b7280', letterSpacing: '1px', marginTop: 2 },
  listaStats: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 },
  listaStat: { textAlign: 'center', background: '#0d0f14', padding: '8px 4px', borderRadius: 2 },
  listaStatVal: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', color: '#e8eaf0', lineHeight: 1 },
  listaStatLbl: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.5rem', color: '#6b7280', letterSpacing: '1px', textTransform: 'uppercase', marginTop: 2 },
  listaValor: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #2a2f3e', marginTop: 8 },
  listaValorLbl: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', color: '#6b7280', letterSpacing: '1px', textTransform: 'uppercase' },
  listaValorNum: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', color: '#3de8a0', letterSpacing: '1px' },

  totalRodape: { marginTop: 12, padding: '14px 16px', background: '#1e2230', border: '1px solid #2a2f3e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 4 },
  totalRodapeLbl: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#6b7280', letterSpacing: '2px', textTransform: 'uppercase' },
  totalRodapeVal: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#3de8a0', letterSpacing: '2px' },

  // ── Badges ──
  badgeStatus: (c) => ({ display: 'inline-block', padding: '3px 8px', fontSize: '0.55rem', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: "'IBM Plex Mono', monospace", borderRadius: 2, background: `${c}22`, color: c }),
  badgeWarn: { display: 'inline-block', padding: '2px 6px', fontSize: '0.55rem', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: "'IBM Plex Mono', monospace", borderRadius: 2, background: 'rgba(255,159,64,.15)', color: '#ff9f40' },

  // ── Botões ──
  btnSolicitar: { background: 'rgba(61,232,160,.15)', border: '1px solid #3de8a0', color: '#3de8a0', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', letterSpacing: '1px', padding: '10px 12px', cursor: 'pointer', borderRadius: 4, textAlign: 'center' },
  btnSolicitarDisabled: { background: 'transparent', border: '1px solid #2a2f3e', color: '#6b7280', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', letterSpacing: '1px', padding: '10px 12px', cursor: 'not-allowed', borderRadius: 4, textAlign: 'center' },

  // ── Misc ──
  empty: { textAlign: 'center', padding: '32px 0', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', color: '#6b7280', letterSpacing: '1px' },
  regrasLink: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#5ab4ff', textDecoration: 'none', letterSpacing: '1px', padding: '4px 8px', border: '1px solid #5ab4ff33', borderRadius: 2 },
  solicMsg: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', color: '#3de8a0', marginBottom: 12, padding: '10px 12px', background: '#1a3a2a', border: '1px solid #3de8a033', borderRadius: 4 },

  countdownBanner: { background: '#0a2a1a', border: '1px solid #3de8a0', borderRadius: 6, padding: '10px 16px', marginBottom: 16, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#3de8a0', display: 'flex', alignItems: 'center', gap: 8 },

  countdownExpired: { background: '#2a1a0a', border: '1px solid #ff9f40', borderRadius: 6, padding: '10px 16px', marginBottom: 16, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#ff9f40', display: 'flex', alignItems: 'center', gap: 8 },
  footer: { padding: '20px 16px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: '#2a2f3e', letterSpacing: '1px', textAlign: 'center' },
};

import { useState, useEffect } from 'react';
import { getEficienciaMotoristas, getAppUsageMotoristas, getCtrcsParados } from '../services/api';
import Topbar from '../components/Topbar';

export default function AdminDashboard() {
  const [eficiencia, setEficiencia] = useState([]);
  const [appUsage, setAppUsage] = useState([]);
  const [ctrcsParados, setCtrcsParados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('eficiencia');

  useEffect(() => {
    const init = async () => {
      try {
        const [ef, app, parados] = await Promise.all([
          getEficienciaMotoristas(),
          getAppUsageMotoristas(),
          getCtrcsParados(),
        ]);
        setEficiencia(ef);
        setAppUsage(app);
        setCtrcsParados(parados);
      } catch (e) {
        setError('Erro ao carregar dados do dashboard');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const totalParados = ctrcsParados.reduce((s, c) => s + c.total, 0);
  const totalAte3 = ctrcsParados.reduce((s, c) => s + c.ate_3_dias, 0);
  const total4a7 = ctrcsParados.reduce((s, c) => s + c.de_4_a_7, 0);
  const total8a15 = ctrcsParados.reduce((s, c) => s + c.de_8_a_15, 0);
  const total16a30 = ctrcsParados.reduce((s, c) => s + c.de_16_a_30, 0);
  const totalMais30 = ctrcsParados.reduce((s, c) => s + c.mais_30, 0);

  if (loading) {
    return (
      <div style={s.container}>
        <Topbar user={JSON.parse(localStorage.getItem('user') || '{}')} />
        <div style={s.loading}><div style={s.spinner}></div><span>CARREGANDO...</span></div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      <Topbar user={JSON.parse(localStorage.getItem('user') || '{}')} />
      <div style={s.content}>
        <h2 style={s.title}>Dashboard de Desempenho</h2>
        <div style={s.sub}>Visão geral dos motoristas — últimos 30 dias</div>

        {error && <div style={s.error}>{error}</div>}

        <div style={s.tabBar}>
          {[
            { id: 'eficiencia', label: 'Eficiência', icon: '📊' },
            { id: 'app', label: 'Uso do App', icon: '📱' },
            { id: 'aging', label: 'CTRCs Parados', icon: '⏳' },
          ].map(t => (
            <button key={t.id} style={{ ...s.tabBtn, ...(activeTab === t.id ? s.tabBtnActive : {}) }} onClick={() => setActiveTab(t.id)}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'eficiencia' && (
          <div style={s.section}>
            <div style={s.sectionTitle}>Eficiência por Motorista</div>
            {eficiencia.length === 0 ? (
              <div style={s.empty}>Nenhum dado de eficiência encontrado.</div>
            ) : (
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Motorista</th>
                      <th style={s.th}>CPF</th>
                      <th style={s.th}>Entregas</th>
                      <th style={s.th}>Total</th>
                      <th style={{ ...s.th, minWidth: 200 }}>Eficiência</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eficiencia.map((e, i) => {
                      const pct = Number(e.pct_eficiencia) || 0;
                      const color = pct >= 95 ? '#3de8a0' : pct >= 85 ? '#ff9f40' : '#ff5a5a';
                      return (
                        <tr key={i}>
                          <td style={s.td}>{e.nome}</td>
                          <td style={s.td}>{e.cpf}</td>
                          <td style={s.td}>{e.entregas}</td>
                          <td style={s.td}>{e.total}</td>
                          <td style={s.td}>
                            <div style={s.barWrap}>
                              <div style={{ ...s.barFill, width: `${pct}%`, background: color }}></div>
                            </div>
                            <span style={{ ...s.pctLabel, color }}>{pct.toFixed(1)}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'app' && (
          <div style={s.section}>
            <div style={s.sectionTitle}>Uso do App por Motorista</div>
            {appUsage.length === 0 ? (
              <div style={s.empty}>Nenhum dado de uso do app encontrado.</div>
            ) : (
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Motorista</th>
                      <th style={s.th}>CPF</th>
                      <th style={s.th}>APP</th>
                      <th style={s.th}>BASE</th>
                      <th style={s.th}>Sem Origem</th>
                      <th style={s.th}>Total</th>
                      <th style={{ ...s.th, minWidth: 200 }}>% APP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appUsage.map((a, i) => {
                      const pct = Number(a.pct_app) || 0;
                      return (
                        <tr key={i}>
                          <td style={s.td}>{a.nome}</td>
                          <td style={s.td}>{a.cpf}</td>
                          <td style={{ ...s.td, color: '#3de8a0' }}>{a.app}</td>
                          <td style={{ ...s.td, color: '#ff9f40' }}>{a.base}</td>
                          <td style={{ ...s.td, color: '#6b7280' }}>{a.sem_origem}</td>
                          <td style={s.td}>{a.total}</td>
                          <td style={s.td}>
                            <div style={s.barWrap}>
                              <div style={{ ...s.barFill, width: `${pct}%`, background: '#3de8a0' }}></div>
                              <div style={{ ...s.barFill, width: `${a.total > 0 ? ((a.base / a.total) * 100).toFixed(1) : 0}%`, background: '#ff9f40', position: 'absolute', left: `${pct}%` }}></div>
                            </div>
                            <span style={{ ...s.pctLabel, color: '#3de8a0' }}>{pct}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'aging' && (
          <div style={s.section}>
            <div style={s.sectionTitle}>CTRCs Parados — Aging de Entregas</div>
            <div style={s.sectionSub}>CTRCs com ocorrência diferente de "MERCADORIA ENTREGUE", agrupados por cidade</div>

            <div style={s.agingCards}>
              <div style={{ ...s.agingCard, borderBottomColor: '#3de8a0' }}>
                <div style={s.agingLbl}>Total Parados</div>
                <div style={{ ...s.agingVal, color: '#3de8a0' }}>{totalParados}</div>
              </div>
              <div style={{ ...s.agingCard, borderBottomColor: '#6b7280' }}>
                <div style={s.agingLbl}>Ate 3 dias</div>
                <div style={{ ...s.agingVal, color: '#6b7280' }}>{totalAte3}</div>
              </div>
              <div style={{ ...s.agingCard, borderBottomColor: '#ff9f40' }}>
                <div style={s.agingLbl}>4-7 dias</div>
                <div style={{ ...s.agingVal, color: '#ff9f40' }}>{total4a7}</div>
              </div>
              <div style={{ ...s.agingCard, borderBottomColor: '#ff9f40' }}>
                <div style={s.agingLbl}>8-15 dias</div>
                <div style={{ ...s.agingVal, color: '#ff9f40' }}>{total8a15}</div>
              </div>
              <div style={{ ...s.agingCard, borderBottomColor: '#ff5a5a' }}>
                <div style={s.agingLbl}>16-30 dias</div>
                <div style={{ ...s.agingVal, color: '#ff5a5a' }}>{total16a30}</div>
              </div>
              <div style={{ ...s.agingCard, borderBottomColor: '#ff5a5a' }}>
                <div style={s.agingLbl}>+30 dias</div>
                <div style={{ ...s.agingVal, color: '#ff5a5a' }}>{totalMais30}</div>
              </div>
            </div>

            {ctrcsParados.length === 0 ? (
              <div style={s.empty}>Nenhum CTRC parado encontrado.</div>
            ) : (
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Cidade</th>
                      <th style={s.th}>Ate 3 dias</th>
                      <th style={s.th}>4-7 dias</th>
                      <th style={s.th}>8-15 dias</th>
                      <th style={s.th}>16-30 dias</th>
                      <th style={s.th}>+30 dias</th>
                      <th style={s.th}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ctrcsParados.map((c, i) => (
                      <tr key={i}>
                        <td style={s.td}>{c.cidade_entrega}</td>
                        <td style={s.td}>{c.ate_3_dias}</td>
                        <td style={{ ...s.td, color: c.de_4_a_7 > 0 ? '#ff9f40' : '#e8eaf0' }}>{c.de_4_a_7}</td>
                        <td style={{ ...s.td, color: c.de_8_a_15 > 0 ? '#ff9f40' : '#e8eaf0' }}>{c.de_8_a_15}</td>
                        <td style={{ ...s.td, color: c.de_16_a_30 > 0 ? '#ff5a5a' : '#e8eaf0' }}>{c.de_16_a_30}</td>
                        <td style={{ ...s.td, color: c.mais_30 > 0 ? '#ff5a5a' : '#e8eaf0', fontWeight: c.mais_30 > 0 ? 600 : 400 }}>{c.mais_30}</td>
                        <td style={{ ...s.td, fontWeight: 600 }}>{c.total}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td style={{ ...s.td, fontWeight: 600, color: '#f0c040' }}>TOTAL</td>
                      <td style={{ ...s.td, fontWeight: 600 }}>{totalAte3}</td>
                      <td style={{ ...s.td, fontWeight: 600 }}>{total4a7}</td>
                      <td style={{ ...s.td, fontWeight: 600 }}>{total8a15}</td>
                      <td style={{ ...s.td, fontWeight: 600 }}>{total16a30}</td>
                      <td style={{ ...s.td, fontWeight: 600, color: '#ff5a5a' }}>{totalMais30}</td>
                      <td style={{ ...s.td, fontWeight: 600, color: '#f0c040' }}>{totalParados}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  container: { minHeight: '100vh', background: '#0d0f14', color: '#e8eaf0', fontFamily: "'IBM Plex Sans', sans-serif" },
  content: { maxWidth: 1200, margin: '0 auto', padding: '32px 24px' },
  title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '2px', color: '#f0c040', marginBottom: 4 },
  sub: { color: '#6b7280', fontSize: '0.85rem', marginBottom: 24 },
  error: { background: '#2a1a1a', border: '1px solid #ff5a5a', color: '#ff5a5a', padding: '10px 16px', borderRadius: 4, marginBottom: 20 },
  loading: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16, color: '#6b7280' },
  spinner: { width: 36, height: 36, border: '3px solid #2a2f3e', borderTopColor: '#f0c040', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  tabBar: { display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' },
  tabBtn: { background: '#1e2230', border: '1px solid #2a2f3e', color: '#6b7280', padding: '10px 20px', borderRadius: 4, cursor: 'pointer', fontSize: '0.85rem', fontFamily: "'IBM Plex Mono', monospace", transition: 'all .15s' },
  tabBtnActive: { background: '#1e2230', borderColor: '#f0c040', color: '#f0c040' },
  section: { marginBottom: 32 },
  sectionTitle: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: '2px', color: '#f0c040', marginBottom: 16 },
  sectionSub: { color: '#6b7280', fontSize: '0.8rem', marginBottom: 16 },
  tableWrap: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #2a2f3e', background: '#1e2230', fontFamily: "'IBM Plex Mono', monospace" },
  td: { padding: '10px 14px', fontSize: '0.82rem', borderBottom: '1px solid #2a2f3e', color: '#e8eaf0', fontFamily: "'IBM Plex Mono', monospace" },
  barWrap: { display: 'inline-block', width: 120, height: 8, background: '#2a2f3e', borderRadius: 4, position: 'relative', verticalAlign: 'middle', marginRight: 8 },
  barFill: { height: '100%', borderRadius: 4, position: 'absolute', top: 0, left: 0 },
  pctLabel: { fontSize: '0.78rem', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 },
  agingCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 },
  agingCard: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, padding: '16px', display: 'flex', flexDirection: 'column', gap: 4 },
  agingLbl: { fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px' },
  agingVal: { fontSize: '1.4rem', fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" },
  empty: { textAlign: 'center', color: '#6b7280', padding: 40, fontSize: '0.9rem' },
};

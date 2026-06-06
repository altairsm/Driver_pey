import { useState, useEffect } from 'react';
import { getCtesSemFaixa } from '../services/api';
import Topbar from '../components/Topbar';

export default function AdminCtesSemFaixa() {
  const [ctes, setCtes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCtesSemFaixa();
        setCtes(data);
      } catch (e) {
        setMsg('Erro ao carregar CTEs sem faixa');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const s = {
    container: { minHeight: '100vh', background: '#0d0f14', color: '#e8eaf0', fontFamily: "'IBM Plex Sans', sans-serif" },
    content: { maxWidth: 1100, margin: '0 auto', padding: '32px 24px' },
    title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '2px', color: '#f0c040', marginBottom: 24 },
    card: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, overflow: 'hidden' },
    cardHeader: { padding: '12px 20px', background: '#1e2230', borderBottom: '1px solid #2a2f3e', borderLeft: '3px solid #ff5a5a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { margin: 0, fontSize: '0.95rem', color: '#e8eaf0' },
    cardBody: { padding: 20 },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' },
    th: { padding: '8px 12px', textAlign: 'left', color: '#6b7280', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #2a2f3e', background: '#1a1e2a' },
    td: { padding: '8px 12px', borderBottom: '1px solid #2a2f3e', color: '#e8eaf0' },
    badgeSemRange: { background: '#3a1a1a', color: '#ff5a5a', padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 600 },
    badgeSemFaixa: { background: '#1a2a3a', color: '#5ab4ff', padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 600 },
    msg: (c) => ({ padding: '8px 14px', borderRadius: 4, fontSize: '0.85rem', marginBottom: 12, background: c === '#ff5a5a' ? '#2a1a1a' : '#1a3a2a', border: `1px solid ${c}`, color: c }),
    link: { color: '#f0c040', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.82rem' },
  };

  return (
    <div style={s.container}>
      <Topbar user={{ nome: 'Admin' }} />
      <div style={s.content}>
        <h2 style={s.title}>CTEs sem Faixa de Peso</h2>
        {msg && <div style={s.msg('#ff5a5a')}>{msg}</div>}

        <div style={s.card}>
          <div style={s.cardHeader}>
            <h5 style={s.cardTitle}>CTEs sem encaixe em faixa de peso ({ctes.length})</h5>
          </div>
          <div style={s.cardBody}>
            {loading ? (
              <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>Carregando...</p>
            ) : ctes.length === 0 ? (
              <p style={{ color: '#3de8a0', fontSize: '0.85rem' }}>✓ Todos os CTEs possuem faixa de peso.</p>
            ) : (
              <>
                <p style={{ color: '#ff9f40', fontSize: '0.82rem', marginBottom: 12 }}>
                  Esses CTEs não geram valor de pagamento. Cadastre ranges em <span style={s.link} onClick={() => window.location.href = '/admin/ceps/sem-range'}>CEPs sem Range</span> ou ajuste as faixas de peso em <span style={s.link} onClick={() => window.location.href = '/admin/tabelas'}>Tabelas</span>.
                </p>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>CT-e</th>
                      <th style={s.th}>Lista</th>
                      <th style={s.th}>Peso (kg)</th>
                      <th style={s.th}>CEP</th>
                      <th style={s.th}>Bairro</th>
                      <th style={s.th}>Tabela</th>
                      <th style={s.th}>Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ctes.map((c, i) => (
                      <tr key={i}>
                        <td style={{ ...s.td, fontFamily: "'IBM Plex Mono', monospace" }}>{c.ncte}</td>
                        <td style={s.td}>{c.lista || '-'}</td>
                        <td style={s.td}>{Number(c.peso).toFixed(2)}</td>
                        <td style={s.td}>{c.cep || '-'}</td>
                        <td style={s.td}>{c.bairro || '-'}</td>
                        <td style={s.td}>{c.tabela_motorista || '-'}</td>
                        <td style={s.td}>
                          <span style={c.motivo === 'CEP sem range' ? s.badgeSemRange : s.badgeSemFaixa}>
                            {c.motivo}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { getDriverDashboard, getDriverTrips, getDriverMe } from '../services/api';
import Topbar from '../components/Topbar';

export default function DriverDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [trips, setTrips] = useState([]);
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) setDriver(JSON.parse(userData));

    const fetchData = async () => {
      try {
        const [dash, tripList, me] = await Promise.all([
          getDriverDashboard(),
          getDriverTrips(),
          getDriverMe(),
        ]);
        setDashboard(dash);
        setTrips(tripList);
        setDriver(me);
      } catch (err) {
        setError('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={styles.container}>
        <Topbar user={driver} />
        <div style={styles.loading}>Carregando...</div>
      </div>
    );
  }

  const formatBRL = (v) =>
    `R$ ${(Number(v) || 0).toFixed(2).replace('.', ',')}`;

  return (
    <div style={styles.container}>
      <Topbar user={driver} />
      <div style={styles.content}>
        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.greeting}>
          Olá, <strong>{driver?.nome_completo || 'Motorista'}</strong>
        </div>

        <div style={styles.cardsRow}>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Total de Entregas</div>
            <div style={{ ...styles.cardValue, color: '#5ab4ff' }}>
              {dashboard?.total_ctes || 0}
            </div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Valor a Receber</div>
            <div style={{ ...styles.cardValue, color: '#3de8a0' }}>
              {formatBRL(dashboard?.custo_total)}
            </div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Receita Gerada</div>
            <div style={{ ...styles.cardValue, color: '#f0c040' }}>
              {formatBRL(dashboard?.receita_total)}
            </div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Peso Total (kg)</div>
            <div style={{ ...styles.cardValue, color: '#ff9f40' }}>
              {Number(dashboard?.peso_total || 0).toFixed(1)}
            </div>
          </div>
        </div>

        <div style={styles.sectionTitle}>Viagens Recentes</div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Nº Lista</th>
                <th style={styles.th}>Data Emissão</th>
                <th style={styles.th}>Métrica</th>
                <th style={styles.th}>CTEs</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>OK</th>
              </tr>
            </thead>
            <tbody>
              {trips.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: '#6b7280' }}>
                    Nenhuma viagem encontrada
                  </td>
                </tr>
              ) : (
                trips.map((t, i) => (
                  <tr key={i}>
                    <td style={styles.td}>{t.numero_lista}</td>
                    <td style={styles.td}>
                      {t.data_emissao
                        ? new Date(t.data_emissao).toLocaleDateString('pt-BR')
                        : '-'}
                    </td>
                    <td style={styles.td}>{t.metrica_da_lista || '-'}</td>
                    <td style={styles.td}>{t.qtd_ctes || '-'}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.badge,
                          background:
                            t.status === 'Aberto'
                              ? '#1e3a5f'
                              : t.status === 'Finalizado'
                              ? '#1a3a2a'
                              : '#2a2f3e',
                          color:
                            t.status === 'Aberto'
                              ? '#5ab4ff'
                              : t.status === 'Finalizado'
                              ? '#3de8a0'
                              : '#e8eaf0',
                        }}
                      >
                        {t.status || '-'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {t.ok_motorista ? (
                        <span style={{ color: '#3de8a0' }}>✓</span>
                      ) : (
                        <span style={{ color: '#6b7280' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
    maxWidth: 1100,
    margin: '0 auto',
    padding: '32px 24px',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: 'calc(100vh - 60px)',
    color: '#6b7280',
    fontSize: '1.2rem',
  },
  error: {
    background: '#2a1a1a',
    border: '1px solid #ff5a5a',
    color: '#ff5a5a',
    padding: '12px 16px',
    borderRadius: 4,
    marginBottom: 20,
  },
  greeting: {
    fontSize: '1.3rem',
    marginBottom: 24,
    color: '#e8eaf0',
  },
  cardsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
    marginBottom: 32,
  },
  card: {
    background: '#161920',
    border: '1px solid #2a2f3e',
    borderRadius: 8,
    padding: '20px 24px',
  },
  cardLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: '1.8rem',
    fontWeight: 600,
    fontFamily: "'IBM Plex Mono', monospace",
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    marginBottom: 16,
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
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '0.75rem',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    borderBottom: '1px solid #2a2f3e',
    background: '#1e2230',
  },
  td: {
    padding: '12px 16px',
    fontSize: '0.85rem',
    borderBottom: '1px solid #2a2f3e',
    color: '#e8eaf0',
  },
  badge: {
    padding: '2px 10px',
    borderRadius: 12,
    fontSize: '0.75rem',
  },
};

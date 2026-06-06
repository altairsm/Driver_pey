import { useState, useEffect } from 'react';
import { getResumo, confirmarPagamento } from '../services/api';
import Topbar from '../components/Topbar';

export default function AdminPagamentos() {
  const hoje = new Date().toISOString().split('T')[0];
  const mesPassado = new Date(Date.now() - 32 * 86400000).toISOString().split('T')[0];

  const [inicio, setInicio] = useState(mesPassado);
  const [fim, setFim] = useState(hoje);
  const [resumo, setResumo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmando, setConfirmando] = useState(null);

  const buscar = async () => {
    if (!inicio || !fim) return;
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
  };

  useEffect(() => {
    buscar();
  }, []);

  const handleConfirmar = async (matricula) => {
    setConfirmando(matricula);
    try {
      await confirmarPagamento(matricula, inicio, fim);
      buscar();
    } catch (err) {
      setError('Erro ao confirmar pagamento');
    } finally {
      setConfirmando(null);
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
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Início</label>
            <input
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              style={styles.dateInput}
            />
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Fim</label>
            <input
              type="date"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
              style={styles.dateInput}
            />
          </div>
          <button onClick={buscar} style={styles.filterBtn} disabled={loading}>
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
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
                    <th style={styles.th}>Margem</th>
                    <th style={styles.th}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {resumo.motoristas.map((m, i) => (
                    <tr key={i}>
                      <td style={styles.td}>{m.matricula}</td>
                      <td style={styles.td}>{m.nome_completo}</td>
                      <td style={styles.td}>{m.cpf}</td>
                      <td style={styles.td}>{m.total_ctes}</td>
                      <td style={styles.td}>{formatBRL(m.receita_total)}</td>
                      <td style={{ ...styles.td, color: '#3de8a0', fontWeight: 600 }}>
                        {formatBRL(m.total_quinzena)}
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
                        <button
                          onClick={() => handleConfirmar(m.matricula)}
                          disabled={confirmando === m.matricula}
                          style={styles.confirmBtn}
                        >
                          {confirmando === m.matricula ? '...' : 'Pago'}
                        </button>
                      </td>
                    </tr>
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
    alignItems: 'flex-end',
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  filterLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  dateInput: {
    background: '#1e2230',
    border: '1px solid #2a2f3e',
    color: '#e8eaf0',
    padding: '8px 12px',
    borderRadius: 4,
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.85rem',
  },
  filterBtn: {
    background: '#f0c040',
    color: '#0d0f14',
    border: 'none',
    padding: '8px 24px',
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.85rem',
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
  empty: {
    textAlign: 'center',
    color: '#6b7280',
    padding: 40,
    fontSize: '1rem',
  },
};

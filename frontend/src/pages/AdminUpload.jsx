import { useState, useRef } from 'react';
import { uploadXLSX, previewXLSX } from '../services/api';
import Topbar from '../components/Topbar';

export default function AdminUpload() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);
    setError('');
    setResult(null);

    try {
      setLoading(true);
      const data = await previewXLSX(selected);
      setPreview(data);
    } catch (err) {
      setError('Erro ao ler preview do arquivo');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const data = await uploadXLSX(file, (e) => {
        if (e.total) {
          // progress
        }
      });
      setResult(data);
      setFile(null);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao importar arquivo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <Topbar user={{ nome: 'Admin' }} />
      <div style={styles.content}>
        <h2 style={styles.title}>Importar Relatório JadLog</h2>

        <div style={styles.card}>
          <div style={styles.cardBody}>
            <label style={styles.uploadZone}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <div style={styles.uploadPlaceholder}>
                {file ? (
                  <span style={{ color: '#3de8a0' }}>{file.name}</span>
                ) : (
                  <>
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>📁</div>
                    <span>Clique para selecionar o arquivo XLSX</span>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 4 }}>
                      Relatório de entregas exportado da JadLog
                    </span>
                  </>
                )}
              </div>
            </label>
          </div>
        </div>

        {loading && (
          <div style={styles.loading}>Processando arquivo...</div>
        )}

        {error && <div style={styles.error}>{error}</div>}

        {preview && !result && (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              Preview — {preview.total_linhas} linhas encontradas
            </div>
            <div style={styles.cardBody}>
              <div style={styles.previewCols}>
                <strong>Colunas detectadas:</strong>
                <div style={styles.colList}>
                  {preview.colunas.map((col, i) => (
                    <span key={i} style={styles.colTag}>
                      {col}
                    </span>
                  ))}
                </div>
              </div>
              {preview.amostra.length > 0 && (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        {Object.keys(preview.amostra[0]).slice(0, 8).map((col, i) => (
                          <th key={i} style={styles.th}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.amostra.slice(0, 5).map((row, i) => (
                        <tr key={i}>
                          {Object.values(row).slice(0, 8).map((val, j) => (
                            <td key={j} style={styles.td}>
                              {String(val ?? '').substring(0, 30)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <button
                onClick={handleUpload}
                disabled={loading}
                style={styles.importBtn}
              >
                {loading ? 'Importando...' : 'Confirmar Importação'}
              </button>
            </div>
          </div>
        )}

        {result && (
          <div style={styles.resultCard}>
            <div style={styles.resultIcon}>✓</div>
            <div style={styles.resultTitle}>Importação Concluída</div>
            <div style={styles.resultDetails}>
              <span>{result.importados} registros importados</span>
              <span>{result.ignorados} ignorados</span>
              <span>{result.total_lidos} linhas lidas</span>
            </div>
          </div>
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
    maxWidth: 900,
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
  card: {
    background: '#161920',
    border: '1px solid #2a2f3e',
    borderRadius: 8,
    marginBottom: 20,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '12px 20px',
    background: '#1e2230',
    borderBottom: '1px solid #2a2f3e',
    fontSize: '0.85rem',
    color: '#9ca3af',
  },
  cardBody: {
    padding: 20,
  },
  uploadZone: {
    display: 'block',
    cursor: 'pointer',
  },
  uploadPlaceholder: {
    border: '2px dashed #2a2f3e',
    borderRadius: 8,
    padding: '40px 20px',
    textAlign: 'center',
    color: '#6b7280',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  loading: {
    textAlign: 'center',
    color: '#f0c040',
    padding: 20,
  },
  error: {
    background: '#2a1a1a',
    border: '1px solid #ff5a5a',
    color: '#ff5a5a',
    padding: '10px 16px',
    borderRadius: 4,
    marginBottom: 20,
  },
  previewCols: {
    marginBottom: 16,
  },
  colList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  colTag: {
    background: '#1e2230',
    padding: '3px 10px',
    borderRadius: 4,
    fontSize: '0.75rem',
    color: '#9ca3af',
    fontFamily: "'IBM Plex Mono', monospace",
  },
  tableWrap: {
    overflowX: 'auto',
    marginBottom: 16,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.75rem',
  },
  th: {
    padding: '8px 10px',
    textAlign: 'left',
    color: '#6b7280',
    borderBottom: '1px solid #2a2f3e',
    background: '#1e2230',
    fontFamily: "'IBM Plex Mono', monospace",
  },
  td: {
    padding: '6px 10px',
    borderBottom: '1px solid #2a2f3e',
    color: '#e8eaf0',
    fontFamily: "'IBM Plex Mono', monospace",
    maxWidth: 150,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  importBtn: {
    background: '#f0c040',
    color: '#0d0f14',
    border: 'none',
    padding: '12px 32px',
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.9rem',
  },
  resultCard: {
    background: '#1a3a2a',
    border: '1px solid #3de8a0',
    borderRadius: 8,
    padding: 32,
    textAlign: 'center',
  },
  resultIcon: {
    fontSize: '2.5rem',
    color: '#3de8a0',
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: '1.3rem',
    fontWeight: 600,
    color: '#3de8a0',
    marginBottom: 12,
  },
  resultDetails: {
    display: 'flex',
    gap: 20,
    justifyContent: 'center',
    color: '#9ca3af',
    fontSize: '0.9rem',
  },
};

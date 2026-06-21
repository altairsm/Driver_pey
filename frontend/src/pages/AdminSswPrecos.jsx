import { useState, useEffect } from 'react';
import { getPrecosCidades, updatePrecoCidade, deletePrecoCidade } from '../services/api';
import Topbar from '../components/Topbar';

export default function AdminSswPrecos() {
  const [cidades, setCidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [novaCidade, setNovaCidade] = useState('');
  const [novoValor, setNovoValor] = useState('');
  const [editando, setEditando] = useState(null);
  const [editValor, setEditValor] = useState('');

  const fetchCidades = async () => {
    try {
      const data = await getPrecosCidades();
      setCidades(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCidades(); }, []);

  const handleAdd = async () => {
    if (!novaCidade || !novoValor) return;
    try {
      await updatePrecoCidade(novaCidade, parseFloat(novoValor));
      setNovaCidade('');
      setNovoValor('');
      await fetchCidades();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async (cidade) => {
    if (!editValor) return;
    try {
      await updatePrecoCidade(cidade, parseFloat(editValor));
      setEditando(null);
      setEditValor('');
      await fetchCidades();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (cidade) => {
    if (!confirm(`Remover ${cidade}?`)) return;
    try {
      await deletePrecoCidade(cidade);
      await fetchCidades();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={styles.container}>
      <Topbar user={{ nome: 'Admin' }} />
      <div style={styles.content}>
        <h2 style={styles.title}>Tabela de Preço por Cidade</h2>

        <div style={styles.card}>
          <div style={styles.cardHeader}>Nova Cidade</div>
          <div style={styles.cardBody}>
            <div style={styles.formRow}>
              <input
                style={styles.input}
                placeholder="Cidade"
                value={novaCidade}
                onChange={(e) => setNovaCidade(e.target.value.toUpperCase())}
              />
              <input
                style={{ ...styles.input, maxWidth: 120 }}
                type="number"
                step="0.01"
                placeholder="Valor"
                value={novoValor}
                onChange={(e) => setNovoValor(e.target.value)}
              />
              <button onClick={handleAdd} style={styles.addBtn}>Adicionar</button>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>Cidades Cadastradas ({cidades.length})</div>
          <div style={styles.cardBody}>
            {loading ? (
              <div style={styles.loading}>Carregando...</div>
            ) : cidades.length === 0 ? (
              <div style={styles.empty}>Nenhuma cidade cadastrada</div>
            ) : (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Cidade</th>
                      <th style={styles.th}>Valor Entrega</th>
                      <th style={styles.th}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cidades.map((c) => (
                      <tr key={c.cidade}>
                        <td style={styles.td}>{c.cidade}</td>
                        <td style={styles.td}>
                          {editando === c.cidade ? (
                            <input
                              style={{ ...styles.input, width: 100 }}
                              type="number"
                              step="0.01"
                              value={editValor}
                              onChange={(e) => setEditValor(e.target.value)}
                            />
                          ) : (
                            `R$ ${Number(c.valor_entrega).toFixed(2)}`
                          )}
                        </td>
                        <td style={styles.td}>
                          {editando === c.cidade ? (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => handleUpdate(c.cidade)} style={styles.smallBtn}>Salvar</button>
                              <button onClick={() => setEditando(null)} style={{ ...styles.smallBtn, background: '#2a2f3e', color: '#9ca3af' }}>Cancelar</button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => { setEditando(c.cidade); setEditValor(c.valor_entrega); }} style={styles.smallBtn}>Editar</button>
                              <button onClick={() => handleDelete(c.cidade)} style={{ ...styles.smallBtn, background: '#3a1a1a', color: '#ff5a5a' }}>Remover</button>
                            </div>
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
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: '#0d0f14', color: '#e8eaf0', fontFamily: "'IBM Plex Sans', sans-serif" },
  content: { maxWidth: 900, margin: '0 auto', padding: '32px 24px' },
  title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '2px', color: '#f0c040', marginBottom: 24 },
  card: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, marginBottom: 20, overflow: 'hidden' },
  cardHeader: { padding: '12px 20px', background: '#1e2230', borderBottom: '1px solid #2a2f3e', fontSize: '0.85rem', color: '#f0c040', fontFamily: "'IBM Plex Mono', monospace" },
  cardBody: { padding: 20 },
  formRow: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  input: { background: '#0d0f14', border: '1px solid #2a2f3e', color: '#e8eaf0', padding: '10px 14px', borderRadius: 4, fontSize: '0.85rem', fontFamily: "'IBM Plex Mono', monospace", flex: 1, minWidth: 150 },
  addBtn: { background: '#f0c040', color: '#0d0f14', border: 'none', padding: '10px 20px', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' },
  th: { padding: '10px 14px', textAlign: 'left', color: '#6b7280', borderBottom: '1px solid #2a2f3e', background: '#1e2230', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem' },
  td: { padding: '10px 14px', borderBottom: '1px solid #2a2f3e', color: '#e8eaf0', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' },
  smallBtn: { background: '#1e2230', border: '1px solid #2a2f3e', color: '#e8eaf0', padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: '0.7rem', fontFamily: "'IBM Plex Mono', monospace" },
  loading: { textAlign: 'center', color: '#6b7280', padding: 20 },
  empty: { textAlign: 'center', color: '#6b7280', padding: 20 },
};

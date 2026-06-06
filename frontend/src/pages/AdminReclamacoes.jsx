import { useState, useEffect } from 'react';
import Topbar from '../components/Topbar';
import { uploadReclamacoes, getAdminReclamacoes, updateReclamacaoCte, deleteReclamacao } from '../services/api';

export default function AdminReclamacoes() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [msgUpload, setMsgUpload] = useState('');

  const [reclamacoes, setReclamacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editCteId, setEditCteId] = useState(null);
  const [editCteVal, setEditCteVal] = useState('');

  const carregar = async () => {
    try {
      const data = await getAdminReclamacoes();
      setReclamacoes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const handleUpload = async () => {
    if (!file) { setMsgUpload('Selecione um arquivo.'); return; }
    setUploading(true);
    setMsgUpload('');
    try {
      const r = await uploadReclamacoes(file);
      let msg = `✅ ${r.importadas} importados (${r.com_motorista} c/ motorista, ${r.cte_pendente} CTE pendente, ${r.cte_nao_encontrado} CTE não encontrado`;
      if (r.duplicatas > 0) msg += `, ${r.duplicatas} duplicatas`;
      msg += ')';
      if (r.erros?.length > 0) msg += ` | ⚠️ ${r.erros.length} erro(s): ${r.erros.join('; ')}`;
      setMsgUpload(msg);
      setFile(null);
      carregar();
    } catch (err) {
      setMsgUpload(`❌ ${err.response?.data?.error || err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSalvarCte = async (id) => {
    if (!editCteVal.trim()) return;
    try {
      await updateReclamacaoCte(id, editCteVal.trim());
      setEditCteId(null);
      setEditCteVal('');
      carregar();
    } catch (err) {
      alert('Erro ao atualizar CTE: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeletar = async (id) => {
    if (!confirm('Remover esta reclamação?')) return;
    try {
      await deleteReclamacao(id);
      carregar();
    } catch (err) {
      alert('Erro ao remover: ' + (err.response?.data?.error || err.message));
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : String(d);
  };

  const s = {
    container: { minHeight: '100vh', background: '#0d0f14', color: '#e8eaf0', fontFamily: "'IBM Plex Sans', sans-serif" },
    content: { maxWidth: 1200, margin: '0 auto', padding: '32px 24px' },
    title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '2px', color: '#f0c040', marginBottom: 24 },
    card: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, marginBottom: 20, overflow: 'hidden' },
    cardHeader: (c) => ({ padding: '12px 20px', background: '#1e2230', borderBottom: '1px solid #2a2f3e', borderLeft: `3px solid ${c}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }),
    cardTitle: { margin: 0, fontSize: '0.95rem', color: '#e8eaf0' },
    cardBody: { padding: 20 },
    fileRow: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
    fileInput: { background: '#1e2230', border: '1px solid #2a2f3e', color: '#e8eaf0', padding: '8px 12px', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.82rem', flex: 1 },
    btn: (bg, c) => ({ background: bg, color: c, border: 'none', padding: '8px 20px', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }),
    btnSm: (bg, c) => ({ background: bg, color: c, border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, marginRight: 4 }),
    inp: { background: '#1e2230', border: '1px solid #2a2f3e', color: '#e8eaf0', padding: '4px 8px', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', width: 140 },
    msg: (c) => ({ padding: '8px 14px', borderRadius: 4, fontSize: '0.85rem', marginTop: 12, background: c === '#ff5a5a' ? '#2a1a1a' : '#1a3a2a', border: `1px solid ${c}`, color: c }),
    tableWrap: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem' },
    th: { textAlign: 'left', fontSize: '0.58rem', letterSpacing: '2px', textTransform: 'uppercase', color: '#6b7280', padding: '8px 10px', borderBottom: '1px solid #2a2f3e', whiteSpace: 'nowrap' },
    td: { padding: '8px 10px', borderBottom: '1px solid rgba(42,47,62,.6)', color: '#e8eaf0', fontSize: '0.72rem' },
    badge: (bg, fg) => ({ display: 'inline-block', padding: '2px 8px', fontSize: '0.58rem', letterSpacing: '1px', borderRadius: 2, background: bg, color: fg }),
    empty: { textAlign: 'center', padding: '40px 0', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#6b7280' },
  };

  return (
    <div style={s.container}>
      <Topbar user={{ nome: 'Admin' }} />
      <div style={s.content}>
        <h2 style={s.title}>Reclamações (Solicitações Status)</h2>

        <div style={s.card}>
          <div style={s.cardHeader('#0d6efd')}>
            <h5 style={s.cardTitle}>Importar CSV / XLSX</h5>
          </div>
          <div style={s.cardBody}>
            <div style={s.fileRow}>
              <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setFile(e.target.files[0])} style={s.fileInput} />
              <button style={s.btn('#f0c040', '#0d0f14')} onClick={handleUpload} disabled={uploading}>
                {uploading ? 'Importando...' : 'Importar'}
              </button>
            </div>
            <div style={{ marginTop: 8, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#6b7280' }}>
              Apenas ASSUNTO = "Acareação" ou "Comprovante de entrega" serão importados.
              CTEs vazios ou "-" ficam pendentes para edição manual.
            </div>
            {msgUpload && <div style={s.msg(msgUpload.startsWith('✅') ? '#3de8a0' : '#ff5a5a')}>{msgUpload}</div>}
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardHeader('#dc3545')}>
            <h5 style={s.cardTitle}>Reclamações Importadas ({reclamacoes.length})</h5>
          </div>
          <div style={s.cardBody}>
            {loading ? (
              <div style={s.empty}>Carregando...</div>
            ) : reclamacoes.length === 0 ? (
              <div style={s.empty}>Nenhuma reclamação importada.</div>
            ) : (
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Ticket ID</th>
                      <th style={s.th}>CTE</th>
                      <th style={s.th}>Assunto</th>
                      <th style={s.th}>Status</th>
                      <th style={s.th}>Motorista</th>
                      <th style={s.th}>Data</th>
                      <th style={s.th}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reclamacoes.map((r) => {
                      const semCte = !r.cte;
                      const semMotorista = !r.matricula;
                      const situacao = semCte ? 'pendente' : semMotorista ? 'nao_encontrado' : 'ok';
                      return (
                        <tr key={r.id}>
                          <td style={s.td}>{r.ticket_id}</td>
                          <td style={s.td}>
                            {editCteId === r.id ? (
                              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                <input style={s.inp} value={editCteVal} onChange={(e) => setEditCteVal(e.target.value)} placeholder="CTE" />
                                <button style={s.btnSm('#3de8a0', '#0d0f14')} onClick={() => handleSalvarCte(r.id)}>OK</button>
                                <button style={s.btnSm('#6b7280', '#fff')} onClick={() => setEditCteId(null)}>X</button>
                              </div>
                            ) : (
                              <span style={{ color: semCte ? '#ff9f40' : '#e8eaf0' }}>
                                {r.cte || <em style={{ color: '#ff9f40' }}>vazio</em>}
                              </span>
                            )}
                          </td>
                          <td style={s.td}>{r.assunto}</td>
                          <td style={s.td}>{r.status_original}</td>
                          <td style={s.td}>
                            {situacao === 'ok' ? (
                              <span style={s.badge('rgba(61,232,160,.15)', '#3de8a0')}>{r.motorista_nome || `Mat. ${r.matricula}`}</span>
                            ) : situacao === 'pendente' ? (
                              <span style={s.badge('rgba(255,159,64,.15)', '#ff9f40')}>CTE pendente</span>
                            ) : (
                              <span style={s.badge('rgba(255,90,90,.15)', '#ff5a5a')}>CTE não encontrado</span>
                            )}
                          </td>
                          <td style={s.td}>{formatDate(r.data_criacao)}</td>
                          <td style={s.td}>
                            {semCte && (
                              <button style={s.btnSm('#ffc107', '#0d0f14')} onClick={() => { setEditCteId(r.id); setEditCteVal(''); }}>
                                Editar CTE
                              </button>
                            )}
                            <button style={s.btnSm('#dc3545', '#fff')} onClick={() => handleDeletar(r.id)}>
                              Remover
                            </button>
                          </td>
                        </tr>
                      );
                    })}
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
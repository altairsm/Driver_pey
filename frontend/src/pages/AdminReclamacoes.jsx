import { useState, useEffect, useCallback, useMemo } from 'react';
import Topbar from '../components/Topbar';
import { uploadReclamacoes, getAdminReclamacoes, updateReclamacaoCte, updateReclamacaoMotorista, vincularReclamacaoMotorista, vincularReclamacoesPendentes, deleteReclamacao, getReclamacoesQuinzenas } from '../services/api';

function formatQuinzena(inicio, fim) {
  const i = String(inicio).slice(0, 10).split('-');
  const f = String(fim).slice(0, 10).split('-');
  return `${i[2]}/${i[1]}/${i[0].slice(2)} a ${f[2]}/${f[1]}/${f[0].slice(2)}`;
}

export default function AdminReclamacoes() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [msgUpload, setMsgUpload] = useState('');
  const [msgAuto, setMsgAuto] = useState('');

  const [reclamacoes, setReclamacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editCteId, setEditCteId] = useState(null);
  const [editCteVal, setEditCteVal] = useState('');
  const [editMotoristaId, setEditMotoristaId] = useState(null);
  const [editMotoristaVal, setEditMotoristaVal] = useState('');

  const [filtroStatus, setFiltroStatus] = useState('Pendente');
  const [quinzenas, setQuinzenas] = useState([]);
  const [qzIdx, setQzIdx] = useState(0);

  const qzAtual = quinzenas[qzIdx] || null;

  const filtradas = useMemo(() => {
    if (filtroStatus === 'todos') return reclamacoes;
    return reclamacoes.filter(r => r.status_original === filtroStatus);
  }, [reclamacoes, filtroStatus]);

  const carregar = useCallback(async (inicio, fim) => {
    setLoading(true);
    try {
      const data = await getAdminReclamacoes(inicio, fim);
      setReclamacoes(data.reclamacoes || data);
      if (data.atualizadas && data.atualizadas > 0) {
        setMsgAuto(`${data.atualizadas} matrícula(s) atualizada(s) automaticamente com base no relatório importado.`);
        setTimeout(() => setMsgAuto(''), 6000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const qzs = await getReclamacoesQuinzenas();
        setQuinzenas(qzs);
        if (qzs.length > 0) {
          const q = qzs[0];
          await carregar(q.inicio.slice(0, 10), q.fim.slice(0, 10));
        } else {
          await carregar();
        }
      } catch (e) {
        await carregar();
      }
    };
    init();
  }, [carregar]);

  const handlePrev = async () => {
    if (qzIdx < quinzenas.length - 1) {
      const newIdx = qzIdx + 1;
      setQzIdx(newIdx);
      const q = quinzenas[newIdx];
      await carregar(q.inicio.slice(0, 10), q.fim.slice(0, 10));
    }
  };

  const handleNext = async () => {
    if (qzIdx > 0) {
      const newIdx = qzIdx - 1;
      setQzIdx(newIdx);
      const q = quinzenas[newIdx];
      await carregar(q.inicio.slice(0, 10), q.fim.slice(0, 10));
    }
  };

  const handleUpload = async () => {
    if (!file) { setMsgUpload('Selecione um arquivo.'); return; }
    setUploading(true);
    setMsgUpload('');
    try {
      const r = await uploadReclamacoes(file);
      let msg = `✅ ${r.importadas} importados (${r.com_motorista} c/ motorista, ${r.cte_pendente} CTE pendente, ${r.cte_nao_encontrado} CTE não encontrado`;
      if (r.atualizadas > 0) msg += `, ${r.atualizadas} atualizadas`;
      msg += ')';
      if (r.erros?.length > 0) msg += ` | ⚠️ ${r.erros.length} erro(s): ${r.erros.join('; ')}`;
      setMsgUpload(msg);
      setFile(null);
      if (qzAtual) await carregar(qzAtual.inicio.slice(0, 10), qzAtual.fim.slice(0, 10));
      else await carregar();
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
      if (qzAtual) await carregar(qzAtual.inicio.slice(0, 10), qzAtual.fim.slice(0, 10));
      else await carregar();
    } catch (err) {
      alert('Erro ao atualizar CTE: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleSalvarMotorista = async (id) => {
    if (!editMotoristaVal.trim()) return;
    try {
      await updateReclamacaoMotorista(id, editMotoristaVal.trim());
      setEditMotoristaId(null);
      setEditMotoristaVal('');
      if (qzAtual) await carregar(qzAtual.inicio.slice(0, 10), qzAtual.fim.slice(0, 10));
      else await carregar();
    } catch (err) {
      alert('Erro ao atualizar motorista: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleVincular = async (id) => {
    try {
      const result = await vincularReclamacaoMotorista(id);
      if (result && result.matricula) {
        if (qzAtual) await carregar(qzAtual.inicio.slice(0, 10), qzAtual.fim.slice(0, 10));
        else await carregar();
      } else {
        alert('CTE não encontrado na tabela de entregas. Verifique se a entrega já foi importada.');
      }
    } catch (err) {
      alert('Erro ao vincular: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleVincularPendentes = async () => {
    if (!confirm('Vincular motoristas de todas as reclamações pendentes?')) return;
    try {
      const result = await vincularReclamacoesPendentes();
      if (qzAtual) await carregar(qzAtual.inicio.slice(0, 10), qzAtual.fim.slice(0, 10));
      else await carregar();
      alert(`${result.atualizados} motorista(s) vinculado(s).`);
    } catch (err) {
      alert('Erro: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeletar = async (id) => {
    if (!confirm('Remover esta reclamação?')) return;
    try {
      await deleteReclamacao(id);
      if (qzAtual) await carregar(qzAtual.inicio.slice(0, 10), qzAtual.fim.slice(0, 10));
      else await carregar();
    } catch (err) {
      alert('Erro ao remover: ' + (err.response?.data?.error || err.message));
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1].slice(2)}` : String(d);
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
    navBtn: { background: '#1e2230', border: '1px solid #2a2f3e', color: '#e8eaf0', padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: '0.78rem', fontFamily: "'IBM Plex Mono', monospace" },
    qzLabel: { fontSize: '1rem', fontWeight: 600, color: '#f0c040', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '2px', minWidth: 170, textAlign: 'center' },
  };

  return (
    <div style={s.container}>
      <Topbar user={{ nome: 'Admin' }} />
      <div style={s.content}>
        <h2 style={s.title}>Reclamações (Solicitações Status)</h2>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
          <button onClick={handlePrev} disabled={qzIdx >= quinzenas.length - 1} style={s.navBtn}>
            &lt; Anterior
          </button>
          <div style={s.qzLabel}>
            {qzAtual ? formatQuinzena(qzAtual.inicio, qzAtual.fim) : 'Todas'}
          </div>
          <button onClick={handleNext} disabled={qzIdx <= 0} style={s.navBtn}>
            Próximo &gt;
          </button>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px' }}>Status</label>
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}
              style={{ background: '#1e2230', border: '1px solid #2a2f3e', color: '#e8eaf0', padding: '6px 12px', borderRadius: 4, fontSize: '0.78rem', fontFamily: "'IBM Plex Mono', monospace" }}>
              <option value="Pendente">Pendente</option>
              <option value="Resolvido">Resolvido</option>
              <option value="todos">Todos</option>
            </select>
          </div>
        </div>

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h5 style={s.cardTitle}>Reclamações Importadas ({filtradas.length}/{reclamacoes.length})</h5>
              {msgAuto && <span style={{ fontSize: '0.72rem', color: '#3de8a0', fontFamily: "'IBM Plex Mono', monospace" }}>{msgAuto}</span>}
            </div>
            {(() => {
              const pendentes = reclamacoes.filter(r => !r.matricula && r.cte).length;
              return pendentes > 0 ? (
                <button style={s.btnSm('#0d6efd', '#fff')} onClick={handleVincularPendentes}>
                  Vincular pendentes ({pendentes})
                </button>
              ) : null;
            })()}
          </div>
          <div style={s.cardBody}>
            {loading ? (
              <div style={s.empty}>Carregando...</div>
            ) : filtradas.length === 0 ? (
              <div style={s.empty}>Nenhuma reclamação com status "{filtroStatus}".</div>
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
                    {filtradas.map((r) => {
                      const semCte = !r.cte;
                      const semMotorista = !r.matricula;
                      const pendente = semCte || semMotorista;
                      const situacao = semCte ? 'pendente' : semMotorista ? 'nao_encontrado' : 'ok';
                      return (
                        <tr key={r.id} style={pendente ? { background: '#1e1520' } : {}}>
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
                            {editMotoristaId === r.id ? (
                              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                <input style={s.inp} value={editMotoristaVal} onChange={(e) => setEditMotoristaVal(e.target.value)} placeholder="Matrícula" />
                                <button style={s.btnSm('#3de8a0', '#0d0f14')} onClick={() => handleSalvarMotorista(r.id)}>OK</button>
                                <button style={s.btnSm('#6b7280', '#fff')} onClick={() => setEditMotoristaId(null)}>X</button>
                              </div>
                            ) : situacao === 'ok' ? (
                              <span style={s.badge('rgba(61,232,160,.15)', '#3de8a0')}>{r.motorista_nome || `Mat. ${r.matricula}`}</span>
                            ) : situacao === 'pendente' ? (
                              <span style={s.badge('rgba(255,159,64,.15)', '#ff9f40')}>CTE pendente</span>
                            ) : (
                              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                <span style={s.badge('rgba(255,90,90,.15)', '#ff5a5a')}>CTE não encontrado</span>
                                <button style={s.btnSm('#0d6efd', '#fff')} onClick={() => handleVincular(r.id)}>
                                  Vincular
                                </button>
                              </div>
                            )}
                          </td>
                          <td style={s.td}>{formatDate(r.data_criacao)}</td>
                          <td style={s.td}>
                            {(semCte || r.assunto === 'Assunto não identificado') && (
                              <button style={s.btnSm('#ffc107', '#0d0f14')} onClick={() => { setEditCteId(r.id); setEditCteVal(r.cte || ''); }}>
                                Editar CTE
                              </button>
                            )}
                            {semMotorista && r.cte && (
                              <button style={s.btnSm('#0d6efd', '#fff')} onClick={() => { setEditMotoristaId(r.id); setEditMotoristaVal(''); }}>
                                Buscar Motorista
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
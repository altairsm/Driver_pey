import { useState, useEffect } from 'react';
import {
  importListas, getListasPendentes, getMotoristas,
  setListaMetrica, setListaMotorista, importCtesDaLista,
  resetLista, deleteLista
} from '../services/api';
import Topbar from '../components/Topbar';

function parseDateToISO(dateStr) {
  if (!dateStr || dateStr.toLowerCase().includes('aberto')) return null;
  try {
    const [data, hora] = dateStr.split(' ');
    const [dia, mes, ano] = data.split('/');
    const [h, m, s = '00'] = (hora || '00:00:00').split(':');
    const dt = new Date(ano, mes - 1, dia, h, m, s);
    return isNaN(dt.getTime()) ? null : dt.toISOString().replace('Z', '-03:00');
  } catch {
    return null;
  }
}

function parseListas(texto) {
  const linhas = texto.trim().split('\n').filter(l => l.trim() !== '');
  const dados = [];
  const erros = [];
  const startIndex = linhas[0]?.toLowerCase().includes('número') ? 1 : 0;
  for (let i = startIndex; i < linhas.length; i++) {
    const linha = linhas[i].trim();
    if (!linha) continue;
    let partes = linha.split('\t').map(p => p.trim());
    if (partes.length < 7) partes = linha.split(/\s{2,}/).map(p => p.trim());
    if (partes.length < 7) { erros.push(`Linha ${i+1} incompleta`); continue; }
    try {
      const numero = parseInt(partes[0]);
      const qtd = parseInt(partes[1]);
      const peso = parseFloat(partes[2].replace(',', '.')) || 0;
      const valor = parseFloat(partes[3].replace('R$','').replace('.','').replace(',','.')) || 0;
      const dataEmissao = parseDateToISO(partes[4]);
      const campoBaixa = partes[5] || '';
      let dataBaixa = null, status = 'Em aberto', offset = 6;
      if (campoBaixa.toLowerCase().includes('aberto') || campoBaixa.trim() === '') {
        dataBaixa = null; status = 'Em aberto'; offset = 6;
      } else if (campoBaixa.match(/^\d{2}\/\d{2}\/\d{4}/)) {
        dataBaixa = parseDateToISO(campoBaixa); status = 'Finalizado'; offset = 6;
      }
      const tipo = partes[offset] || '';
      const rota = partes.slice(offset + 1).join(' ').trim();
      if (isNaN(numero) || isNaN(qtd)) { erros.push(`Linha ${i+1} inválida`); continue; }
      dados.push({ numero, qtd, peso, valor, data_emissao: dataEmissao, data_baixa: dataBaixa, status, tipo, rota, qtd_ctes: 0 });
    } catch (e) { erros.push(`Linha ${i+1}: ${e.message}`); }
  }
  return { dados, erros };
}

function parseCtes(texto, numeroLista, matriculaMotorista) {
  const linhas = texto.split('\n').filter(l => l.trim() !== '');
  const ctes = [];
  const start = linhas[0]?.toLowerCase().includes('remessa') ? 1 : 0;
  linhas.slice(start).forEach((linha) => {
    let partes = linha.split('\t').map(p => p.trim());
    if (partes.length < 2) partes = linha.split(/\s{2,}/).map(p => p.trim());
    if (partes.length < 6) return;
    ctes.push({
      remessa: partes[0], bairro: partes[2], cidade: partes[3],
      cep: partes[4], data_agendada: partes[7]?.trim() || null,
      numero_lista: numeroLista, matricula_motorista: matriculaMotorista,
    });
  });
  return ctes;
}

export default function AdminImportarListas() {
  const [entradaListas, setEntradaListas] = useState('');
  const [enviandoListas, setEnviandoListas] = useState(false);
  const [msgListas, setMsgListas] = useState('');
  const [numeroGestao, setNumeroGestao] = useState('');
  const [msgGestao, setMsgGestao] = useState('');
  const [pendentes, setPendentes] = useState([]);
  const [loadingPendentes, setLoadingPendentes] = useState(false);
  const [motoristas, setMotoristas] = useState([]);

  const [modalTipo, setModalTipo] = useState(null);
  const [modalLista, setModalLista] = useState(null);
  const [modalListaData, setModalListaData] = useState(null);
  const [selectMetrica, setSelectMetrica] = useState('');
  const [selectMotorista, setSelectMotorista] = useState('');
  const [entradaCtes, setEntradaCtes] = useState('');
  const [enviandoCtes, setEnviandoCtes] = useState(false);

  const carregarPendentes = async () => {
    setLoadingPendentes(true);
    try { setPendentes(await getListasPendentes()); }
    catch { setPendentes([]); }
    finally { setLoadingPendentes(false); }
  };

  useEffect(() => { carregarPendentes(); getMotoristas().then(setMotoristas).catch(() => {}); }, []);

  const handleEnviarListas = async () => {
    if (!entradaListas.trim()) return;
    setMsgListas('');
    const { dados, erros } = parseListas(entradaListas);
    if (dados.length === 0) { setMsgListas('Nenhuma lista válida encontrada.'); return; }
    setEnviandoListas(true);
    try {
      const r = await importListas(dados);
      setMsgListas(`✅ ${r.importados} listas importadas!` + (erros.length ? ` (${erros.length} linhas ignoradas)` : ''));
      setEntradaListas('');
      await carregarPendentes();
    } catch (err) { setMsgListas(`❌ ${err.response?.data?.error || err.message}`); }
    finally { setEnviandoListas(false); }
  };

  const handleResetar = async () => {
    if (!numeroGestao) return;
    if (!confirm(`Resetar lista ${numeroGestao}?`)) return;
    setMsgGestao('');
    try { await resetLista(numeroGestao); setMsgGestao(`✅ Lista ${numeroGestao} resetada!`); setNumeroGestao(''); await carregarPendentes(); }
    catch (err) { setMsgGestao(`❌ ${err.response?.data?.error || err.message}`); }
  };

  const handleApagar = async () => {
    if (!numeroGestao) return;
    if (!confirm(`APAGAR lista ${numeroGestao}? Isso não pode ser desfeito!`)) return;
    setMsgGestao('');
    try { await deleteLista(numeroGestao); setMsgGestao(`🗑️ Lista ${numeroGestao} apagada!`); setNumeroGestao(''); await carregarPendentes(); }
    catch (err) { setMsgGestao(`❌ ${err.response?.data?.error || err.message}`); }
  };

  const abrirModal = (tipo, lista) => {
    setModalTipo(tipo);
    setModalLista(lista['Número']);
    setModalListaData(lista);
    setSelectMetrica('');
    setSelectMotorista('');
    setEntradaCtes('');
  };

  const fecharModal = () => { setModalTipo(null); setModalLista(null); setModalListaData(null); };

  const salvarMetrica = async () => {
    if (!selectMetrica) return alert('Selecione uma métrica!');
    try { await setListaMetrica(modalLista, selectMetrica); fecharModal(); await carregarPendentes(); }
    catch { alert('Erro ao salvar métrica'); }
  };

  const salvarMotorista = async () => {
    if (!selectMotorista) return alert('Selecione um motorista!');
    try { await setListaMotorista(modalLista, selectMotorista); fecharModal(); await carregarPendentes(); }
    catch { alert('Erro ao salvar motorista'); }
  };

  const salvarCtes = async () => {
    if (!entradaCtes.trim()) return alert('Cole os CT-es!');
    const mat = modalListaData?.matricula_motorista;
    if (!mat) return alert('Defina o motorista antes!');
    const ctes = parseCtes(entradaCtes, modalLista, parseInt(mat));
    if (ctes.length === 0) return alert('Nenhum CTe válido!');
    setEnviandoCtes(true);
    try {
      const r = await importCtesDaLista(modalLista, ctes);
      fecharModal();
      alert(`✅ ${r.importados} CT-es salvos!`);
      await carregarPendentes();
    } catch (err) { alert(`Erro: ${err.response?.data?.error || err.message}`); }
    finally { setEnviandoCtes(false); }
  };

  const s = {
    container: { minHeight: '100vh', background: '#0d0f14', color: '#e8eaf0', fontFamily: "'IBM Plex Sans', sans-serif" },
    content: { maxWidth: 1100, margin: '0 auto', padding: '32px 24px' },
    title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '2px', color: '#f0c040', marginBottom: 24 },
    card: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, marginBottom: 20, overflow: 'hidden' },
    cardHeader: (c) => ({ padding: '12px 20px', background: '#1e2230', borderBottom: '1px solid #2a2f3e', borderLeft: `3px solid ${c}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }),
    cardTitle: { margin: 0, fontSize: '0.95rem', color: '#e8eaf0' },
    cardBody: { padding: 20 },
    ta: { width: '100%', background: '#1e2230', border: '1px solid #2a2f3e', color: '#e8eaf0', padding: 12, borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.82rem', resize: 'vertical', boxSizing: 'border-box' },
    btn: (bg, c) => ({ background: bg, color: c, border: 'none', padding: '8px 20px', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', marginTop: 12 }),
    btnSm: (bg, c) => ({ background: bg, color: c, border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, marginRight: 4 }),
    msg: (c) => ({ padding: '8px 14px', borderRadius: 4, fontSize: '0.85rem', marginTop: 12, background: c === '#ff5a5a' ? '#2a1a1a' : '#1a3a2a', border: `1px solid ${c}`, color: c }),
    row: { display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' },
    inp: { background: '#1e2230', border: '1px solid #2a2f3e', color: '#e8eaf0', padding: '8px 12px', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem', width: 160 },
    lab: { fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4, display: 'block' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' },
    th: { padding: '8px 10px', textAlign: 'left', color: '#6b7280', borderBottom: '1px solid #2a2f3e', background: '#1e2230', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' },
    td: { padding: '6px 10px', borderBottom: '1px solid #2a2f3e', color: '#e8eaf0', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' },
    ac: { padding: '6px 6px', borderBottom: '1px solid #2a2f3e', whiteSpace: 'nowrap' },
    sel: { width: '100%', background: '#1e2230', border: '1px solid #2a2f3e', color: '#e8eaf0', padding: '8px 12px', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem', boxSizing: 'border-box' },
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, width: '100%', maxWidth: 520, maxHeight: '80vh', overflow: 'auto' },
    mh: { padding: '16px 20px', borderBottom: '1px solid #2a2f3e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    mt: { fontSize: '1rem', color: '#e8eaf0', margin: 0 },
    mb: { padding: 20 },
    x: { background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 },
    loading: { textAlign: 'center', color: '#f0c040', padding: 20, fontSize: '0.85rem' },
    empty: { textAlign: 'center', color: '#6b7280', padding: 40, fontSize: '0.9rem' },
  };

  const Modal = ({ children }) => (
    <div style={s.overlay} onClick={fecharModal}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );

  const formatDt = (v) => v ? String(v).substring(0, 16).replace('T', ' ') : '';

  return (
    <div style={s.container}>
      <Topbar user={{ nome: 'Admin' }} />
      <div style={s.content}>
        <h2 style={s.title}>Importar Listas</h2>

        <div style={s.card}>
          <div style={s.cardHeader('#0d6efd')}>
            <h5 style={s.cardTitle}>1. Inserir Listas</h5>
          </div>
          <div style={s.cardBody}>
            <textarea style={s.ta} rows={12} placeholder="Cole aqui a tabela completa das listas (tab-separated)..."
              value={entradaListas} onChange={(e) => setEntradaListas(e.target.value)} />
            <button style={s.btn('#f0c040', '#0d0f14')} onClick={handleEnviarListas} disabled={enviandoListas}>
              {enviandoListas ? 'Enviando...' : 'Enviar Listas para o Banco'}
            </button>
            {msgListas && <div style={s.msg(msgListas.includes('✅') ? '#3de8a0' : '#ff5a5a')}>{msgListas}</div>}
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardHeader('#dc3545')}>
            <h5 style={s.cardTitle}>2. Gerenciamento de Listas</h5>
          </div>
          <div style={s.cardBody}>
            <div style={s.row}>
              <div>
                <label style={s.lab}>Número da Lista</label>
                <input style={s.inp} type="number" placeholder="Ex: 1458"
                  value={numeroGestao} onChange={(e) => setNumeroGestao(e.target.value)} />
              </div>
              <button style={s.btnSm('#ffc107', '#0d0f14')} onClick={handleResetar}>Resetar Lista</button>
              <button style={s.btnSm('#dc3545', '#fff')} onClick={handleApagar}>Apagar Lista</button>
            </div>
            {msgGestao && <div style={s.msg(msgGestao.includes('✅') || msgGestao.includes('🗑') ? '#3de8a0' : '#ff5a5a')}>{msgGestao}</div>}
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardHeader('#198754')}>
            <h5 style={s.cardTitle}>3. Listas Pendentes</h5>
            <button style={s.btnSm('#6c757d', '#fff')} onClick={carregarPendentes}>Atualizar</button>
          </div>
          <div style={s.cardBody}>
            {loadingPendentes ? <div style={s.loading}>Carregando...</div>
            : pendentes.length === 0 ? <div style={s.empty}>Todas as listas já possuem CT-es.</div>
            : <div style={{ overflowX: 'auto' }}>
                <table style={s.table}>
                  <thead><tr>
                    <th style={s.th}>Número</th><th style={s.th}>Qtd</th>
                    <th style={s.th}>Data</th><th style={s.th}>Status</th>
                    <th style={s.th}>Rota</th><th style={s.th}>Métrica</th>
                    <th style={s.th}>Motorista</th><th style={s.th}>Ações</th>
                  </tr></thead>
                  <tbody>
                    {pendentes.map(l => {
                      const temMoto = !!l.matricula_motorista;
                      const temMetr = !!l.metrica_da_lista;
                      return (
                        <tr key={l['Número']}>
                          <td style={s.td}><strong>{l['Número']}</strong></td>
                          <td style={s.td}>{l['Qtd']}</td>
                          <td style={s.td}>{formatDt(l['Data Emissão'])}</td>
                          <td style={s.td}>{l.status || ''}</td>
                          <td style={s.td}>{l['Rota']}</td>
                          <td style={s.td}>{l.metrica_da_lista || '—'}</td>
                          <td style={s.td}>{l.nome_completo || '—'}</td>
                          <td style={s.ac}>
                            <button style={s.btnSm('#0dcaf0', '#0d0f14')} onClick={() => abrirModal('metrica', l)}>Métrica</button>
                            <button style={s.btnSm('#ffc107', '#0d0f14')} onClick={() => abrirModal('motorista', l)}>Motorista</button>
                            <button style={{...s.btnSm(temMoto && temMetr ? '#198754' : '#6c757d', temMoto && temMetr ? '#fff' : '#9ca3af'), opacity: temMoto && temMetr ? 1 : 0.5, cursor: temMoto && temMetr ? 'pointer' : 'not-allowed'}}
                              disabled={!(temMoto && temMetr)} onClick={() => abrirModal('ctes', l)}>CTes</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            }
          </div>
        </div>
      </div>

      {modalTipo === 'metrica' && (
        <Modal>
          <div style={s.mh}><h3 style={s.mt}>Métrica — Lista {modalLista}</h3><button style={s.x} onClick={fecharModal}>&times;</button></div>
          <div style={s.mb}>
            <label style={s.lab}>Selecione a Métrica:</label>
            <select style={s.sel} value={selectMetrica} onChange={(e) => setSelectMetrica(e.target.value)}>
              <option value="">Selecione...</option>
              <option value="Por Entrega">Por Entrega</option>
              <option value="Volumoso">Volumoso</option>
              <option value="Alpha">Alpha</option>
              <option value="Baixa">Baixa</option>
            </select>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button style={s.btnSm('#6c757d', '#fff')} onClick={fecharModal}>Cancelar</button>
              <button style={s.btnSm('#198754', '#fff')} onClick={salvarMetrica}>Confirmar</button>
            </div>
          </div>
        </Modal>
      )}

      {modalTipo === 'motorista' && (
        <Modal>
          <div style={s.mh}><h3 style={s.mt}>Motorista — Lista {modalLista}</h3><button style={s.x} onClick={fecharModal}>&times;</button></div>
          <div style={s.mb}>
            <label style={s.lab}>Selecione o Motorista:</label>
            <select style={{...s.sel, height: 200}} size={8} value={selectMotorista} onChange={(e) => setSelectMotorista(e.target.value)}>
              <option value="">Selecione...</option>
              {motoristas.map(m => (
                <option key={m.OperadorMatricula} value={m.OperadorMatricula}>
                  {m.OperadorMatricula} — {m.nome_completo}
                </option>
              ))}
            </select>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button style={s.btnSm('#6c757d', '#fff')} onClick={fecharModal}>Cancelar</button>
              <button style={s.btnSm('#198754', '#fff')} onClick={salvarMotorista}>Confirmar</button>
            </div>
          </div>
        </Modal>
      )}

      {modalTipo === 'ctes' && (
        <Modal>
          <div style={s.mh}><h3 style={s.mt}>CT-es — Lista {modalLista}</h3><button style={s.x} onClick={fecharModal}>&times;</button></div>
          <div style={s.mb}>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: 12 }}>Cole o relatório de CT-es desta lista:</p>
            <textarea style={s.ta} rows={14} placeholder="Dados dos CT-es (tab-separated)..."
              value={entradaCtes} onChange={(e) => setEntradaCtes(e.target.value)} />
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button style={s.btnSm('#6c757d', '#fff')} onClick={fecharModal}>Cancelar</button>
              <button style={s.btnSm('#198754', '#fff')} onClick={salvarCtes} disabled={enviandoCtes}>
                {enviandoCtes ? 'Salvando...' : 'Salvar CT-es'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

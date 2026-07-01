import { useState } from 'react';
import {
  importListas,
  resetLista, deleteLista
} from '../services/api';
import Topbar from '../components/Topbar';

function parseDateToISO(dateStr) {
  if (!dateStr || dateStr.toLowerCase().includes('aberto')) return null;
  try {
    const [data] = dateStr.split(' ');
    const [dia, mes, ano] = data.split('/');
    return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
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

export default function AdminImportarListas() {
  const [entradaListas, setEntradaListas] = useState('');
  const [enviandoListas, setEnviandoListas] = useState(false);
  const [msgListas, setMsgListas] = useState('');
  const [numeroGestao, setNumeroGestao] = useState('');
  const [msgGestao, setMsgGestao] = useState('');

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
    } catch (err) { setMsgListas(`❌ ${err.response?.data?.error || err.message}`); }
    finally { setEnviandoListas(false); }
  };

  const handleResetar = async () => {
    if (!numeroGestao) return;
    if (!confirm(`Resetar lista ${numeroGestao}?`)) return;
    setMsgGestao('');
    try { await resetLista(numeroGestao); setMsgGestao(`✅ Lista ${numeroGestao} resetada!`); setNumeroGestao(''); }
    catch (err) { setMsgGestao(`❌ ${err.response?.data?.error || err.message}`); }
  };

  const handleApagar = async () => {
    if (!numeroGestao) return;
    if (!confirm(`APAGAR lista ${numeroGestao}? Isso não pode ser desfeito!`)) return;
    setMsgGestao('');
    try { await deleteLista(numeroGestao); setMsgGestao(`🗑️ Lista ${numeroGestao} apagada!`); setNumeroGestao(''); }
    catch (err) { setMsgGestao(`❌ ${err.response?.data?.error || err.message}`); }
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
  };

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

      </div>
    </div>
  );
}

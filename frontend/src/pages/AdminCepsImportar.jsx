import { useState } from 'react';
import { importarCepsPlanilha, autoDescobrirCeps, getCepsSemCadastro } from '../services/api';
import Topbar from '../components/Topbar';

export default function AdminCepsImportar() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [resultado, setResultado] = useState(null);

  const handleImport = async () => {
    if (!file) { setMsg('Selecione um arquivo .xlsx'); return; }
    setUploading(true);
    setMsg('');
    setResultado(null);
    try {
      const r = await importarCepsPlanilha(file);
      setResultado(r);
      setMsg(`✅ ${r.importados} CEPs importados de ${r.total_lidas} linhas`);
    } catch (e) {
      setMsg(`❌ ${e.response?.data?.error || e.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleAutoDescobrir = async () => {
    if (!confirm('Consultar ViaCEP para todos os CEPs sem cadastro?')) return;
    setAutoLoading(true);
    setMsg('');
    try {
      const r = await autoDescobrirCeps();
      setMsg(`✅ ${r.sucesso} CEPs descobertos, ${r.falha} falhas, ${r.ignorados} ignorados`);
    } catch (e) {
      setMsg(`❌ ${e.response?.data?.error || e.message}`);
    } finally {
      setAutoLoading(false);
    }
  };

  const s = {
    container: { minHeight: '100vh', background: '#0d0f14', color: '#e8eaf0', fontFamily: "'IBM Plex Sans', sans-serif" },
    content: { maxWidth: 900, margin: '0 auto', padding: '32px 24px' },
    title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '2px', color: '#f0c040', marginBottom: 24 },
    card: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, marginBottom: 20, overflow: 'hidden' },
    cardHeader: (c) => ({ padding: '12px 20px', background: '#1e2230', borderBottom: '1px solid #2a2f3e', borderLeft: `3px solid ${c}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }),
    cardTitle: { margin: 0, fontSize: '0.95rem', color: '#e8eaf0' },
    cardBody: { padding: 20 },
    btn: (bg, c) => ({ background: bg, color: c, border: 'none', padding: '8px 20px', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }),
    inp: { background: '#1e2230', border: '1px solid #2a2f3e', color: '#e8eaf0', padding: '8px 12px', borderRadius: 4, fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' },
    msgBox: (tipo) => ({ padding: '8px 14px', borderRadius: 4, fontSize: '0.85rem', marginBottom: 12, background: tipo === 'ok' ? '#1a3a2a' : '#2a1a1a', border: `1px solid ${tipo === 'ok' ? '#3de8a0' : '#ff5a5a'}`, color: tipo === 'ok' ? '#3de8a0' : '#ff5a5a' }),
    fileZone: { border: '2px dashed #2a2f3e', borderRadius: 8, padding: 32, textAlign: 'center', cursor: 'pointer', transition: 'border 0.2s', marginBottom: 16 },
  };

  return (
    <div style={s.container}>
      <Topbar user={{ nome: 'Admin' }} />
      <div style={s.content}>
        <h2 style={s.title}>Importar CEPs de Planilha</h2>

        {msg && <div style={s.msgBox(msg.includes('✅') ? 'ok' : 'err')}>{msg}</div>}

        <div style={s.card}>
          <div style={s.cardHeader('#0d6efd')}>
            <h5 style={s.cardTitle}>Importar "Tabelas Last mile.xlsx"</h5>
          </div>
          <div style={s.cardBody}>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: 16 }}>
              A planilha deve ter as colunas: <strong>CEP</strong>, <strong>BAIRRO</strong>, <strong>Rota</strong>, <strong>Nome Tabela</strong>
            </p>

            <div style={s.fileZone}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#f0c040'; }}
              onDragLeave={(e) => { e.currentTarget.style.borderColor = '#2a2f3e'; }}
              onDrop={(e) => { e.preventDefault(); setFile(e.dataTransfer.files[0]); }}>
              <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
                id="file-input" onChange={(e) => setFile(e.target.files[0])} />
              <label htmlFor="file-input" style={{ cursor: 'pointer', display: 'block' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8, color: '#f0c040' }}>📂</div>
                <div style={{ fontSize: '0.85rem', color: file ? '#3de8a0' : '#6b7280' }}>
                  {file ? file.name : 'Clique ou arraste o arquivo .xlsx aqui'}
                </div>
              </label>
            </div>

            <button style={s.btn('#f0c040', '#0d0f14')} onClick={handleImport} disabled={!file || uploading}>
              {uploading ? 'Importando...' : 'Importar Planilha'}
            </button>

            {resultado && (
              <div style={{ marginTop: 16, fontSize: '0.85rem', color: '#3de8a0' }}>
                <p>✅ {resultado.importados} CEPs importados de {resultado.total_lidas} linhas</p>
              </div>
            )}
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardHeader('#ff9f40')}>
            <h5 style={s.cardTitle}>Auto-Descobrir CEPs Novos (ViaCEP)</h5>
          </div>
          <div style={s.cardBody}>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: 16 }}>
              Consulta a API ViaCEP para CEPs do relatório de entregas que ainda não estão cadastrados.
            </p>
            <button style={s.btn('#198754', '#fff')} onClick={handleAutoDescobrir} disabled={autoLoading}>
              {autoLoading ? 'Descobrindo...' : 'Auto-Descobrir ViaCEP'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

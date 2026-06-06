import { useState, useEffect } from 'react';
import { getCepsConflitos } from '../services/api';
import Topbar from '../components/Topbar';

export default function AdminCepsConflitos() {
  const [conflitos, setConflitos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCepsConflitos();
        setConflitos(data);
      } catch (e) {
        setMsg('Erro ao carregar conflitos');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatCep = (v) => {
    const s = String(v).padStart(8, '0');
    return `${s.slice(0, 5)}-${s.slice(5)}`;
  };

  const categorias = conflitos.reduce((acc, c) => {
    const mesmaTab = (c.tab_a || null) === (c.tab_b || null);
    if (mesmaTab) acc.mesma.push(c);
    else acc.diferente.push(c);
    return acc;
  }, { mesma: [], diferente: [] });

  const s = {
    container: { minHeight: '100vh', background: '#0d0f14', color: '#e8eaf0', fontFamily: "'IBM Plex Sans', sans-serif" },
    content: { maxWidth: 1200, margin: '0 auto', padding: '32px 24px' },
    title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '2px', color: '#f0c040', marginBottom: 24 },
    card: { background: '#161920', border: '1px solid #2a2f3e', borderRadius: 8, overflow: 'hidden' },
    cardHeader: (color) => ({ padding: '12px 20px', background: '#1e2230', borderBottom: '1px solid #2a2f3e', borderLeft: `3px solid ${color}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }),
    cardTitle: { margin: 0, fontSize: '0.95rem', color: '#e8eaf0' },
    cardBody: { padding: 20 },
    block: { background: '#1a1e2a', border: '1px solid #2a2f3e', borderRadius: 6, padding: 12, flex: 1 },
    vs: { color: '#6b7280', fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', padding: '0 12px' },
    row: { display: 'flex', gap: 16, marginBottom: 12, alignItems: 'stretch', flexWrap: 'wrap' },
    label: { fontSize: '0.62rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 2 },
    val: { fontSize: '0.82rem', color: '#e8eaf0', fontFamily: "'IBM Plex Mono', monospace" },
    badge: (bg, fg, txt) => ({ background: bg, color: fg, padding: '2px 10px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.5px' }),
    msg: (c) => ({ padding: '8px 14px', borderRadius: 4, fontSize: '0.85rem', marginBottom: 12, background: c === '#ff5a5a' ? '#2a1a1a' : '#1a3a2a', border: `1px solid ${c}`, color: c }),
    link: { color: '#5ab4ff', cursor: 'pointer', fontSize: '0.72rem' },
    conflictCard: (tipo) => ({
      border: `1px solid ${tipo === 'grave' ? '#5a1a1a' : '#5a4a1a'}`,
      borderLeft: `4px solid ${tipo === 'grave' ? '#ff5a5a' : '#f0c040'}`,
      borderRadius: 6, padding: 12, marginBottom: 12,
      background: tipo === 'grave' ? '#1a0d0d' : '#1a180d'
    }),
    summaryRow: { display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' },
    summaryCard: (bg, fg) => ({
      background: bg, borderRadius: 6, padding: '12px 20px',
      border: `1px solid ${fg}`, flex: '1 1 200px'
    }),
    summaryNum: { fontSize: '1.6rem', fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: '#e8eaf0' },
    summaryLabel: { fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', marginTop: 4 },
  };

  return (
    <div style={s.container}>
      <Topbar user={{ nome: 'Admin' }} />
      <div style={s.content}>
        <h2 style={s.title}>Conflitos de CEPs</h2>
        {msg && <div style={s.msg('#ff5a5a')}>{msg}</div>}

        {!loading && conflitos.length > 0 && (
          <div style={s.summaryRow}>
            <div style={s.summaryCard('#1a180d', '#f0c04033')}>
              <div style={s.summaryNum}>{categorias.mesma.length}</div>
              <div style={s.summaryLabel}>Mesma tabela (⚠️ baixo risco)</div>
            </div>
            <div style={s.summaryCard('#1a0d0d', '#ff5a5a33')}>
              <div style={{ ...s.summaryNum, color: '#ff5a5a' }}>{categorias.diferente.length}</div>
              <div style={s.summaryLabel}>Tabelas diferentes (🚨 alto risco)</div>
            </div>
            <div style={s.summaryCard('#161920', '#2a2f3e')}>
              <div style={s.summaryNum}>{conflitos.length}</div>
              <div style={s.summaryLabel}>Total de conflitos</div>
            </div>
          </div>
        )}

        {loading ? (
          <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>Carregando...</p>
        ) : conflitos.length === 0 ? (
          <p style={{ color: '#3de8a0', fontSize: '0.85rem' }}>✓ Nenhum conflito encontrado. Todos os ranges de CEP são únicos.</p>
        ) : (
          <>
            {categorias.diferente.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <h3 style={{ color: '#ff5a5a', fontSize: '1rem', marginBottom: 14, letterSpacing: '1px' }}>
                  🚨 Conflitos com tabelas diferentes
                </h3>
                <p style={{ color: '#ff9f40', fontSize: '0.8rem', marginBottom: 12 }}>
                  Um CEP nessas áreas casa com dois ranges de tabelas DIFERENTES, gerando duplicidade no pagamento com valores potencialmente distintos. Resolva editando os ranges.
                </p>
                {categorias.diferente.map((c, i) => renderConflito(c, i, 'grave'))}
              </div>
            )}

            {categorias.mesma.length > 0 && (
              <div>
                <h3 style={{ color: '#f0c040', fontSize: '1rem', marginBottom: 14, letterSpacing: '1px' }}>
                  ⚠️ Conflitos com a mesma tabela
                </h3>
                <p style={{ color: '#b0a080', fontSize: '0.8rem', marginBottom: 12 }}>
                  Ranges sobrepostos mas ambos usam a mesma tabela. Ainda podem gerar duplicidade no valor, mas o valor por CTE é idêntico em ambos os ranges.
                </p>
                {categorias.mesma.map((c, i) => renderConflito(c, i, 'leve'))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  function renderConflito(c, i, tipo) {
    const grave = tipo === 'grave';
    const mesma = (c.tab_a || null) === (c.tab_b || null);
    const badgeColor = grave ? '#ff5a5a' : '#f0c040';
    const badgeBg = grave ? '#2a0d0d' : '#2a220d';
    const badgeText = grave
      ? `Tabelas diferentes (${c.tab_a || 'N/A'} vs ${c.tab_b || 'N/A'})`
      : `Mesma tabela (${c.tab_a || 'Sem tabela'})`;

    return (
      <div key={i} style={s.conflictCard(tipo)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={s.badge(badgeBg, badgeColor, badgeText)}>{badgeText}</span>
          <span style={{ ...s.val, fontSize: '0.7rem', color: '#6b7280' }}>Conflito #{i + 1}</span>
        </div>
        <div style={s.row}>
          <div style={s.block}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <div style={s.label}>Range A (#{c.id_a})</div>
                <div style={s.val}>{formatCep(c.ini_a)} - {formatCep(c.fim_a)}</div>
              </div>
              <div>
                <div style={s.label}>Bairro</div>
                <div style={s.val}>{c.bairro_a}</div>
              </div>
              <div>
                <div style={s.label}>Cidade</div>
                <div style={s.val}>{c.cidade_a}</div>
              </div>
              <div>
                <div style={s.label}>Tabela</div>
                <span style={s.badge(
                  c.tab_a ? (grave ? '#2a0d0d' : '#2a220d') : '#1a1a1a',
                  c.tab_a ? badgeColor : '#6b7280',
                  c.tab_a || 'Sem tabela'
                )}>{c.tab_a || 'Sem tabela'}</span>
              </div>
            </div>
          </div>
          <div style={s.vs}>VS</div>
          <div style={s.block}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <div style={s.label}>Range B (#{c.id_b})</div>
                <div style={s.val}>{formatCep(c.ini_b)} - {formatCep(c.fim_b)}</div>
              </div>
              <div>
                <div style={s.label}>Bairro</div>
                <div style={s.val}>{c.bairro_b}</div>
              </div>
              <div>
                <div style={s.label}>Cidade</div>
                <div style={s.val}>{c.cidade_b}</div>
              </div>
              <div>
                <div style={s.label}>Tabela</div>
                <span style={s.badge(
                  c.tab_b ? (grave ? '#2a0d0d' : '#2a220d') : '#1a1a1a',
                  c.tab_b ? badgeColor : '#6b7280',
                  c.tab_b || 'Sem tabela'
                )}>{c.tab_b || 'Sem tabela'}</span>
              </div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 8, textAlign: 'right' }}>
          <span style={s.link} onClick={() => window.location.href = '/admin/ceps'}>
            Editar ranges →
          </span>
        </div>
      </div>
    );
  }
}
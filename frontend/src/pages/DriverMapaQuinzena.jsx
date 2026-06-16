import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getDriverMapaQuinzena, getQuinzenas } from '../services/api';

function getHeatColor(proporcao) {
  if (proporcao < 0.25) return { fill: 'rgba(59, 130, 246, 0.5)', border: 'rgba(59, 130, 246, 0.9)' };
  if (proporcao < 0.5) return { fill: 'rgba(234, 179, 8, 0.6)', border: 'rgba(234, 179, 8, 0.9)' };
  if (proporcao < 0.75) return { fill: 'rgba(249, 115, 22, 0.75)', border: 'rgba(249, 115, 22, 0.9)' };
  return { fill: 'rgba(239, 68, 68, 0.9)', border: 'rgba(239, 68, 68, 1)' };
}

export default function DriverMapaQuinzena() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dados, setDados] = useState([]);
  const [quinzenas, setQuinzenas] = useState([]);
  const [qzIdx, setQzIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const qzAtual = quinzenas[qzIdx] || null;

  useEffect(() => {
    getQuinzenas().then(setQuinzenas).catch(() => {});
  }, []);

  useEffect(() => {
    if (!qzAtual) return;
    setLoading(true);
    setMsg('');
    getDriverMapaQuinzena(qzAtual.inicio.slice(0, 10), qzAtual.fim.slice(0, 10))
      .then(setDados)
      .catch(err => setMsg('Erro ao carregar dados: ' + (err.response?.data?.error || err.message)))
      .finally(() => setLoading(false));
  }, [qzAtual]);

  useEffect(() => {
    if (!mapInstance.current && mapRef.current) {
      mapInstance.current = L.map(mapRef.current, {
        center: [-12.971, -38.501],
        zoom: 12,
        zoomControl: true,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(mapInstance.current);
    }
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    if (dados.length === 0) return;

    const maxEntregas = Math.max(...dados.map(d => d.total_entregas), 1);

    dados.forEach(d => {
      if (!d.lat || !d.lng) return;
      const prop = d.total_entregas / maxEntregas;
      const raio = 8 + prop * 27;
      const cor = getHeatColor(prop);
      const marker = L.circleMarker([d.lat, d.lng], {
        radius: raio,
        fillColor: cor.fill,
        color: cor.border,
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.7,
      }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: 'IBM Plex Mono', monospace; font-size: 0.8rem;">
          ${d.logradouro ? `<strong>${d.logradouro}</strong><br/>` : ''}
          ${d.bairro_viacep || d.bairro ? `<span style="color:#6b7280">${d.bairro_viacep || d.bairro}</span><br/>` : ''}
          <span style="color:#f0c040">CEP: ${d.cep}</span><br/>
          <strong style="color:#3de8a0">${d.total_entregas} ${d.total_entregas === 1 ? 'entrega' : 'entregas'}</strong>
        </div>
      `);
      markersRef.current.push(marker);
    });

    if (markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current);
      map.fitBounds(group.getBounds().pad(0.15));
    }
  }, [dados]);

  const handlePrev = () => {
    if (qzIdx < quinzenas.length - 1) setQzIdx(qzIdx + 1);
  };
  const handleNext = () => {
    if (qzIdx > 0) setQzIdx(qzIdx - 1);
  };

  return (
    <div style={s.container}>
      {/* ── TOPBAR C/ HAMBURGUER ── */}
      <div style={s.topbar}>
        <div style={s.brand}>DRIVER PIX</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={s.menuBtn} onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      <div style={s.header}>
        <div>
          <h2 style={s.title}>🗺️ Mapa de Entregas</h2>
        </div>
        <div style={s.qzNav}>
          <button onClick={handlePrev} disabled={qzIdx >= quinzenas.length - 1} style={{ ...s.qzBtn, opacity: qzIdx >= quinzenas.length - 1 ? 0.3 : 1 }}>&#8249;</button>
          <span style={s.qzLabel}>
            {qzAtual ? `${qzAtual.inicio.slice(0, 10)} a ${qzAtual.fim.slice(0, 10)}` : '...'}
            {quinzenas.length > 1 && <span style={s.qzPos}> ({qzIdx + 1}/{quinzenas.length})</span>}
          </span>
          <button onClick={handleNext} disabled={qzIdx <= 0} style={{ ...s.qzBtn, opacity: qzIdx <= 0 ? 0.3 : 1 }}>&#8250;</button>
        </div>
      </div>

      {loading && <div style={s.loading}>Carregando...</div>}
      {msg && <div style={s.msg}>{msg}</div>}

      <div style={s.mapWrapper}>
        <div ref={mapRef} style={s.map} />
        <div style={s.legend}>
          <div style={s.legendTitle}>Intensidade</div>
          <div style={s.legendItem}><span style={{ ...s.legendDot, background: 'rgba(59, 130, 246, 0.6)' }} /><span>0-25%</span></div>
          <div style={s.legendItem}><span style={{ ...s.legendDot, background: 'rgba(234, 179, 8, 0.6)' }} /><span>25-50%</span></div>
          <div style={s.legendItem}><span style={{ ...s.legendDot, background: 'rgba(249, 115, 22, 0.75)' }} /><span>50-75%</span></div>
          <div style={s.legendItem}><span style={{ ...s.legendDot, background: 'rgba(239, 68, 68, 0.9)' }} /><span>75-100%</span></div>
          <div style={{ ...s.legendItem, marginTop: 6, fontSize: '0.65rem', color: '#6b7280' }}>Quanto mais entregas,<br />mais intenso</div>
        </div>
      </div>

      {dados.length > 0 && (
        <div style={s.listaCard}>
          <div style={s.listaHeader}>
            <span style={s.listaTitle}>{dados.length} CEPs com entregas</span>
            <span style={s.listaTotal}>{dados.reduce((a, d) => a + d.total_entregas, 0)} entregas no total</span>
          </div>
          <div style={s.listaTabela}>
            {dados.map((d, i) => (
              <div key={d.cep} style={{ ...s.listaRow, borderTop: i > 0 ? '1px solid #1e2230' : 'none' }}>
                <div style={s.listaInfo}>
                  <span style={{ color: '#f0c040', fontSize: '0.88rem' }}>{d.cep}</span>
                  <span style={{ color: '#e8eaf0', fontSize: '0.75rem', opacity: 0.8 }}>{d.logradouro || ''}{d.logradouro && (d.bairro_viacep || d.bairro) ? ', ' : ''}{d.bairro_viacep || d.bairro || ''}</span>
                </div>
                <span style={{ ...s.listaQtd, fontSize: d.total_entregas >= 10 ? '1.1rem' : '0.95rem' }}>{d.total_entregas} {d.total_entregas === 1 ? 'entrega' : 'entregas'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DRAWER ── */}
      {menuOpen && <div style={s.overlay} onClick={() => setMenuOpen(false)} />}
      {menuOpen && (
        <div style={s.drawer}>
          <div style={s.drawerHeader}>
            <div style={s.drawerName}>DRIVER PIX</div>
          </div>
          <div style={s.drawerDivider} />
          <button style={s.drawerItem} onClick={() => { setMenuOpen(false); navigate('/driver/regras-pagamento'); }}>📋 Regras de Pagamento</button>
          <button style={{ ...s.drawerItem, color: '#f0c040' }} onClick={() => { setMenuOpen(false); navigate('/driver/mapa'); }}>🗺️ Mapa de Entregas</button>
          <button style={s.drawerItem} onClick={() => { setMenuOpen(false); navigate('/driver/meus-dados'); }}>👤 Meus Dados</button>
          <div style={s.drawerDivider} />
          <button style={{ ...s.drawerItem, color: '#ff5a5a' }} onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href = '/login'; }}>⏻ Sair</button>
        </div>
      )}
    </div>
  );
}

const s = {
  container: {
    minHeight: '100vh',
    background: '#0d0f14',
    color: '#e8eaf0',
    fontFamily: "'IBM Plex Mono', monospace",
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    padding: '16px 24px',
    borderBottom: '1px solid #1e2230',
  },
  title: {
    margin: 0,
    fontSize: '1.1rem',
    color: '#f0c040',
    letterSpacing: '1px',
  },
  qzNav: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  qzBtn: {
    background: '#1e2230',
    border: '1px solid #2a2f3e',
    color: '#e8eaf0',
    fontSize: '1.2rem',
    padding: '4px 12px',
    borderRadius: 4,
    cursor: 'pointer',
  },
  qzLabel: {
    fontSize: '0.82rem',
    color: '#6b7280',
    whiteSpace: 'nowrap',
  },
  qzPos: {
    color: '#6b7280',
    fontSize: '0.75rem',
  },
  loading: {
    padding: '12px 24px',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  msg: {
    padding: '12px 24px',
    color: '#ff5a5a',
  },
  mapWrapper: {
    position: 'relative',
    width: '100%',
    height: 400,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  legend: {
    position: 'absolute',
    bottom: 20,
    right: 10,
    background: 'rgba(13,15,20,0.9)',
    border: '1px solid #2a2f3e',
    borderRadius: 6,
    padding: '10px 14px',
    fontSize: '0.75rem',
    zIndex: 1000,
  },
  legendTitle: {
    fontSize: '0.7rem',
    color: '#6b7280',
    marginBottom: 6,
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    color: '#e8eaf0',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    display: 'inline-block',
    flexShrink: 0,
  },
  listaCard: {
    margin: '16px 24px 24px',
    background: '#13161d',
    border: '1px solid #1e2230',
    borderRadius: 8,
    overflow: 'hidden',
  },
  listaHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #1e2230',
  },
  listaTitle: {
    fontSize: '0.82rem',
    color: '#f0c040',
  },
  listaTotal: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  listaTabela: {
    maxHeight: 300,
    overflowY: 'auto',
  },
  listaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
  },
  listaInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  listaQtd: {
    fontFamily: "'Bebas Neue', sans-serif",
    letterSpacing: '1px',
    color: '#3de8a0',
  },
  // ── Topbar ──
  topbar: {
    background: '#161920',
    borderBottom: '1px solid #2a2f3e',
    padding: '0 16px',
    height: 56,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  brand: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '1.3rem',
    letterSpacing: '3px',
    color: '#f0c040',
  },
  menuBtn: {
    background: 'transparent',
    border: '1px solid #2a2f3e',
    color: '#e8eaf0',
    width: 36,
    height: 36,
    cursor: 'pointer',
    fontSize: '1rem',
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Drawer ──
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 200 },
  drawer: { position: 'fixed', top: 0, right: 0, width: 260, height: '100%', background: '#161920', borderLeft: '1px solid #2a2f3e', zIndex: 201, display: 'flex', flexDirection: 'column', padding: '20px 0' },
  drawerHeader: { padding: '0 20px 20px' },
  drawerName: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '2px', color: '#e8eaf0' },
  drawerDivider: { height: 1, background: '#2a2f3e', margin: '8px 0' },
  drawerItem: { background: 'transparent', border: 'none', color: '#e8eaf0', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem', letterSpacing: '1px', padding: '14px 20px', cursor: 'pointer', textAlign: 'left', width: '100%' },
};

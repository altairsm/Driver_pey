import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getBairrosRotasMapa, getEstatisticasMapa, geocodificarBairros } from '../services/api';
import Topbar from '../components/Topbar';

const CORES_TABELA = {
  Tab_1: { fill: '#3de8a0', label: 'Verde' },
  Tab_2: { fill: '#5ab4ff', label: 'Azul' },
  Tab_3: { fill: '#f0c040', label: 'Amarelo' },
  Tab_4: { fill: '#ff9f40', label: 'Laranja' },
  Tab_5: { fill: '#ff5a5a', label: 'Vermelho' },
};

export default function AdminMapaBairros() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const [bairros, setBairros] = useState([]);
  const [stats, setStats] = useState({ com_coordenadas: 0, total: 0 });
  const [filtro, setFiltro] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      const [dados, est] = await Promise.all([
        getBairrosRotasMapa(),
        getEstatisticasMapa(),
      ]);
      setBairros(dados);
      setStats(est);
    } catch (err) {
      setMsg('Erro ao carregar dados');
    }
  }

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

    const filtered = filtro
      ? bairros.filter(b => b.bairro.toLowerCase().includes(filtro.toLowerCase()))
      : bairros;

    filtered.forEach(b => {
      if (!b.lat || !b.lng) return;
      const cor = CORES_TABELA[b.nome_tabela] || { fill: '#6b7280' };
      const marker = L.circleMarker([b.lat, b.lng], {
        radius: 10,
        fillColor: cor.fill,
        color: '#fff',
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.7,
      }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: 'IBM Plex Mono', monospace; font-size: 0.8rem;">
          <strong>${b.bairro}</strong><br/>
          Rota: ${b.rota}<br/>
          Tabela: ${b.nome_tabela}
        </div>
      `);
      markersRef.current.push(marker);
    });

    if (markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current);
      map.fitBounds(group.getBounds().pad(0.1));
    }
  }, [bairros, filtro]);

  const handleGeocodificar = async () => {
    setGeocoding(true);
    setMsg('');
    try {
      const res = await geocodificarBairros();
      setMsg(res.message);
      await carregarDados();
    } catch {
      setMsg('Erro ao geocodificar');
    }
    setGeocoding(false);
  };

  const tabelas = [...new Set(bairros.map(b => b.nome_tabela))].sort();
  const bairrosUnicos = [...new Set(bairros.map(b => b.bairro))];

  return (
    <div style={s.container}>
      <Topbar user={{ nome: 'Admin' }} />
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Mapa de Bairros</h2>
          <p style={s.sub}>
            {stats.com_coordenadas} de {stats.total} bairros com coordenadas &middot;{' '}
            {bairrosUnicos.length} bairros únicos
          </p>
        </div>
        <div style={s.headerRight}>
          <input
            type="text"
            placeholder="Filtrar bairro..."
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
            style={s.search}
          />
          <button
            onClick={handleGeocodificar}
            disabled={geocoding}
            style={{ ...s.btn, opacity: geocoding ? 0.5 : 1 }}
          >
            {geocoding ? 'Geocodificando...' : 'Geocodificar Bairros'}
          </button>
        </div>
      </div>
      {msg && <div style={s.msg}>{msg}</div>}
      <div style={s.mapWrapper}>
        <div ref={mapRef} style={s.map} />
        <div style={s.legend}>
          <div style={s.legendTitle}>Tabelas</div>
          {tabelas.map(t => {
            const cor = CORES_TABELA[t] || { fill: '#6b7280' };
            return (
              <div key={t} style={s.legendItem}>
                <span style={{ ...s.legendDot, background: cor.fill }} />
                <span>{t}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const s = {
  container: { minHeight: '100vh', background: '#0d0f14', color: '#e8eaf0', fontFamily: "'IBM Plex Sans', sans-serif" },
  header: { padding: '16px 32px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '3px', color: '#f0c040', margin: 0 },
  sub: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', color: '#6b7280', margin: '4px 0 0' },
  search: {
    background: '#161920', border: '1px solid #2a2f3e', borderRadius: 4,
    padding: '8px 12px', color: '#e8eaf0', fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.75rem', width: 200, outline: 'none',
  },
  btn: {
    background: '#3de8a0', color: '#0d0f14', border: 'none', borderRadius: 4,
    padding: '8px 16px', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600,
    fontSize: '0.7rem', letterSpacing: '1px', cursor: 'pointer', whiteSpace: 'nowrap',
  },
  msg: {
    margin: '0 32px 12px', padding: '8px 16px', background: '#1e2230',
    border: '1px solid #2a2f3e', borderRadius: 4, fontSize: '0.75rem',
    fontFamily: "'IBM Plex Mono', monospace", color: '#5ab4ff',
  },
  mapWrapper: { position: 'relative', margin: '0 32px 32px', height: 'calc(100vh - 200px)', minHeight: 400 },
  map: { width: '100%', height: '100%', borderRadius: 6, zIndex: 1 },
  legend: {
    position: 'absolute', top: 16, right: 16, zIndex: 1000,
    background: 'rgba(22,25,32,0.9)', border: '1px solid #2a2f3e',
    borderRadius: 6, padding: '12px 16px', minWidth: 100,
  },
  legendTitle: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', fontWeight: 600, letterSpacing: '1px', color: '#e8eaf0', marginBottom: 8 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', fontFamily: "'IBM Plex Mono', monospace", color: '#b0b4c0', marginBottom: 4 },
  legendDot: { width: 12, height: 12, borderRadius: '50%', display: 'inline-block' },
};

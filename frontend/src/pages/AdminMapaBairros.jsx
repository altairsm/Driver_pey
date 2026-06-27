import { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { getBairrosRotasMapa, getCepsMapa, getEstatisticasMapa, geocodificarBairros, geocodificarCeps } from '../services/api';
import Topbar from '../components/Topbar';

const CORES_TABELA = {
  Tab_1: { fill: '#3de8a0', label: 'Verde' },
  Tab_2: { fill: '#0008f8', label: 'Azul' },
  Tab_3: { fill: '#f9e506', label: 'Amarelo' },
  Tab_4: { fill: '#fa1e05', label: 'Laranja' },
  Tab_5: { fill: '#050505', label: 'Vermelho' },
};

export default function AdminMapaBairros() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef(null);
  const [bairros, setBairros] = useState([]);
  const [ceps, setCeps] = useState([]);
  const [stats, setStats] = useState({ com_coordenadas: 0, total: 0 });
  const [modo, setModo] = useState('bairros');
  const [filtroBairro, setFiltroBairro] = useState('');
  const [rotasSelecionadas, setRotasSelecionadas] = useState([]);
  const [rotaDropdownAberto, setRotaDropdownAberto] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [msg, setMsg] = useState('');

  const dadosAtivos = modo === 'bairros' ? bairros : ceps;
  const rotasDisponiveis = [...new Set(dadosAtivos.map(d => d.rota).filter(Boolean))].sort();

  const carregarDados = useCallback(async () => {
    try {
      const [dadosBairros, est] = await Promise.all([
        getBairrosRotasMapa(),
        getEstatisticasMapa(),
      ]);
      setBairros(dadosBairros);
      setStats(est);
    } catch {
      setMsg('Erro ao carregar dados');
    }
  }, []);

  const carregarCeps = useCallback(async () => {
    try {
      const dados = await getCepsMapa();
      setCeps(dados);
    } catch {
      setMsg('Erro ao carregar CEPs');
    }
  }, []);

  useEffect(() => {
    carregarDados();
    carregarCeps();
  }, [carregarDados, carregarCeps]);

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

    if (markersRef.current) {
      map.removeLayer(markersRef.current);
    }
    markersRef.current = null;

    const dados = modo === 'bairros' ? bairros : ceps;

    let filtered = dados;
    if (filtroBairro) {
      const q = filtroBairro.toLowerCase();
      filtered = filtered.filter(d =>
        (d.bairro || '').toLowerCase().includes(q) ||
        (d.cep || '').includes(q)
      );
    }
    if (rotasSelecionadas.length > 0) {
      filtered = filtered.filter(d => rotasSelecionadas.includes(d.rota));
    }

    if (filtered.length === 0) return;

    if (modo === 'ceps') {
      const cluster = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
      });
      filtered.forEach(d => {
        if (!d.lat || !d.lng) return;
        const cor = CORES_TABELA[d.nome_tabela] || { fill: '#6b7280' };
        const marker = L.circleMarker([d.lat, d.lng], {
          radius: 6,
          fillColor: cor.fill,
          color: '#fff',
          weight: 1,
          opacity: 0.9,
          fillOpacity: 0.7,
        });
        marker.bindPopup(`
          <div style="font-family: 'IBM Plex Mono', monospace; font-size: 0.75rem;">
            <strong>CEP: ${d.cep}</strong><br/>
            Bairro: ${d.bairro || '-'}<br/>
            Rota: ${d.rota || '-'}<br/>
            Tabela: ${d.nome_tabela || '-'}
          </div>
        `);
        cluster.addLayer(marker);
      });
      map.addLayer(cluster);
      markersRef.current = cluster;

      if (filtered.length <= 200) {
        const group = L.featureGroup(filtered
          .filter(d => d.lat && d.lng)
          .map(d => L.circleMarker([d.lat, d.lng])));
        if (group.getLayers().length > 0) {
          map.fitBounds(group.getBounds().pad(0.1));
        }
      }
    } else {
      const group = L.featureGroup([]);
      filtered.forEach(d => {
        if (!d.lat || !d.lng) return;
        const cor = CORES_TABELA[d.nome_tabela] || { fill: '#6b7280' };
        const marker = L.circleMarker([d.lat, d.lng], {
          radius: 10,
          fillColor: cor.fill,
          color: '#fff',
          weight: 1.5,
          opacity: 0.9,
          fillOpacity: 0.7,
        });
        marker.bindPopup(`
          <div style="font-family: 'IBM Plex Mono', monospace; font-size: 0.8rem;">
            <strong>${d.bairro}</strong><br/>
            Rota: ${d.rota}<br/>
            Tabela: ${d.nome_tabela}
          </div>
        `);
        group.addLayer(marker);
      });
      map.addLayer(group);
      markersRef.current = group;

      if (group.getLayers().length > 0) {
        map.fitBounds(group.getBounds().pad(0.1));
      }
    }
  }, [bairros, ceps, modo, filtroBairro, rotasSelecionadas]);

  const handleGeocodificar = async () => {
    setGeocoding(true);
    setMsg('');
    try {
      if (modo === 'bairros') {
        const res = await geocodificarBairros();
        setMsg(res.message);
        await carregarDados();
      } else {
        const res = await geocodificarCeps(100);
        setMsg(res.message);
        await carregarCeps();
      }
    } catch {
      setMsg('Erro ao geocodificar');
    }
    setGeocoding(false);
  };

  const toggleRota = (rota) => {
    setRotasSelecionadas(prev =>
      prev.includes(rota) ? prev.filter(r => r !== rota) : [...prev, rota]
    );
  };

  const toggleModo = (novoModo) => {
    setModo(novoModo);
    setRotasSelecionadas([]);
    setFiltroBairro('');
  };

  const tabelas = [...new Set(dadosAtivos.map(d => d.nome_tabela))].sort();

  return (
    <div style={s.container}>
      <Topbar user={{ nome: 'Admin' }} />
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Mapa de Bairros</h2>
          <p style={s.sub}>
            {modo === 'bairros'
              ? `${stats.com_coordenadas} de ${stats.total} bairros com coordenadas`
              : `${ceps.length} CEPs com coordenadas`}
          </p>
        </div>
        <div style={s.headerRight}>
          <div style={s.toggleGroup}>
            <button
              onClick={() => toggleModo('bairros')}
              style={modo === 'bairros' ? s.toggleAtivo : s.toggleBtn}
            >
              Bairros
            </button>
            <button
              onClick={() => toggleModo('ceps')}
              style={modo === 'ceps' ? s.toggleAtivo : s.toggleBtn}
            >
              CEPs
            </button>
          </div>
          <input
            type="text"
            placeholder={modo === 'bairros' ? 'Filtrar bairro...' : 'Filtrar CEP ou bairro...'}
            value={filtroBairro}
            onChange={e => setFiltroBairro(e.target.value)}
            style={s.search}
          />
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setRotaDropdownAberto(!rotaDropdownAberto)}
              style={{
                ...s.search,
                cursor: 'pointer',
                minWidth: 140,
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <span style={{ color: rotasSelecionadas.length > 0 ? '#e8eaf0' : '#6b7280', fontSize: '0.75rem' }}>
                {rotasSelecionadas.length > 0
                  ? `${rotasSelecionadas.length} rota(s)`
                  : 'Todas as rotas'}
              </span>
              <span style={{ fontSize: '0.6rem', color: '#6b7280' }}>{rotaDropdownAberto ? '▲' : '▼'}</span>
            </button>
            {rotaDropdownAberto && (
              <div style={s.dropdown}>
                {rotasDisponiveis.length === 0 ? (
                  <div style={s.dropdownItem}>Nenhuma rota</div>
                ) : (
                  rotasDisponiveis.map(rota => (
                    <label key={rota} style={s.dropdownItem}>
                      <input
                        type="checkbox"
                        checked={rotasSelecionadas.includes(rota)}
                        onChange={() => toggleRota(rota)}
                        style={{ accentColor: '#f0c040' }}
                      />
                      <span>{rota}</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
          <button
            onClick={handleGeocodificar}
            disabled={geocoding}
            style={{ ...s.btn, opacity: geocoding ? 0.5 : 1 }}
          >
            {geocoding
              ? 'Geocodificando...'
              : modo === 'bairros' ? 'Geocodificar Bairros' : 'Geocodificar CEPs'}
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
  toggleGroup: {
    display: 'flex', border: '1px solid #2a2f3e', borderRadius: 4, overflow: 'hidden',
  },
  toggleBtn: {
    background: '#161920', color: '#6b7280', border: 'none', padding: '6px 16px',
    fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', cursor: 'pointer', letterSpacing: '1px',
  },
  toggleAtivo: {
    background: '#2a2f3e', color: '#f0c040', border: 'none', padding: '6px 16px',
    fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', cursor: 'pointer', letterSpacing: '1px',
  },
  search: {
    background: '#161920', border: '1px solid #2a2f3e', borderRadius: 4,
    padding: '8px 12px', color: '#e8eaf0', fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.75rem', width: 200, outline: 'none',
  },
  dropdown: {
    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1100,
    marginTop: 4, background: '#1e2230', border: '1px solid #2a2f3e',
    borderRadius: 4, maxHeight: 200, overflowY: 'auto', padding: '4px 0',
  },
  dropdownItem: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
    fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem',
    cursor: 'pointer', color: '#e8eaf0',
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

import { pool } from '../db/index.js';

const VIACEP_URL = 'https://viacep.com.br/ws';
const GMAPS_GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function getApiKey() {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error('GOOGLE_MAPS_API_KEY not set');
  return key;
}

async function viaCep(cep) {
  const url = `${VIACEP_URL}/${cep}/json/`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
}

async function googleGeocode(address) {
  const url = `${GMAPS_GEOCODE_URL}?address=${encodeURIComponent(address)}&key=${getApiKey()}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 'OK' || !data.results?.length) return null;
    const loc = data.results[0].geometry.location;
    return { lat: loc.lat, lng: loc.lng };
  } catch {
    return null;
  }
}

export async function geocodificarBairros() {
  const { rows: bairros } = await pool.query(`
    SELECT DISTINCT bairro FROM bairros_rotas
    WHERE lat IS NULL OR lng IS NULL
    ORDER BY bairro
  `);

  if (bairros.length === 0) {
    return { geocoded: 0, total: 0, message: 'Todos os bairros já possuem coordenadas.' };
  }

  const { rows: total } = await pool.query('SELECT COUNT(*)::int AS cnt FROM bairros_rotas');

  let geocoded = 0;
  for (const { bairro } of bairros) {
    const query = `${bairro}, Salvador, BA`;
    const coord = await googleGeocode(query);
    if (coord) {
      await pool.query(`
        UPDATE bairros_rotas SET lat = $1, lng = $2 WHERE bairro = $3
      `, [coord.lat, coord.lng, bairro]);
      geocoded++;
    }
    await delay(1100);
  }

  const { rows: restantes } = await pool.query(
    'SELECT COUNT(*)::int AS cnt FROM bairros_rotas WHERE lat IS NULL OR lng IS NULL'
  );

  return {
    geocoded,
    total: total[0].cnt,
    restantes: restantes[0].cnt,
    message: `${geocoded} bairros geocodificados. ${restantes[0].cnt} ainda sem coordenadas.`,
  };
}

export async function listarBairrosRotasMapa() {
  const { rows } = await pool.query(`
    SELECT id, bairro, rota, nome_tabela, lat, lng
    FROM bairros_rotas
    WHERE lat IS NOT NULL AND lng IS NOT NULL
    ORDER BY bairro, rota
  `);
  return rows;
}

export async function listarCepsMapa() {
  const { rows } = await pool.query(`
    SELECT id, cep, bairro, rota, nome_tabela, lat, lng
    FROM ceps_especificos
    WHERE lat IS NOT NULL AND lng IS NOT NULL
    ORDER BY bairro, cep
  `);
  return rows;
}

export async function getEstatisticasMapa() {
  const { rows: comCoord } = await pool.query(
    'SELECT COUNT(*)::int AS cnt FROM bairros_rotas WHERE lat IS NOT NULL AND lng IS NOT NULL'
  );
  const { rows: total } = await pool.query(
    'SELECT COUNT(*)::int AS cnt FROM bairros_rotas'
  );
  return {
    com_coordenadas: comCoord[0].cnt,
    total: total[0].cnt,
  };
}

// Correção manual da posição de um CEP, arrastando o marcador no mapa.
// geocode_source = 'manual' marca o ponto como já resolvido: nem a
// geocodificação em lote nem o fallback de bairro podem sobrescrevê-lo.
export async function atualizarLocalizacaoCep(id, lat, lng) {
  // Number(null) e Number('') dão 0, que passaria na validação numérica e
  // gravaria o CEP em (0, 0) — no Golfo da Guiné, não no Brasil.
  const vazio = (v) => v === null || v === undefined || String(v).trim() === '';
  if (vazio(lat) || vazio(lng)) {
    throw new Error('Coordenadas inválidas');
  }
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
    throw new Error('Coordenadas inválidas');
  }
  if (latNum < -90 || latNum > 90) throw new Error('Latitude deve estar entre -90 e 90');
  if (lngNum < -180 || lngNum > 180) throw new Error('Longitude deve estar entre -180 e 180');

  const { rows } = await pool.query(`
    UPDATE ceps_especificos
    SET lat = $1, lng = $2, geocode_source = 'manual'
    WHERE id = $3
    RETURNING id, cep, bairro, rota, nome_tabela, lat, lng, geocode_source
  `, [latNum.toFixed(7), lngNum.toFixed(7), id]);
  return rows[0] || null;
}

export async function geocodificarCeps(limite = 100) {
  const { rows: ceps } = await pool.query(`
    SELECT cep, bairro FROM ceps_especificos
    WHERE geocode_source IS DISTINCT FROM 'individual'
      AND geocode_source IS DISTINCT FROM 'manual'
      AND geocode_source IS DISTINCT FROM 'no_coverage'
    LIMIT $1
  `, [limite]);

  const { rows: total } = await pool.query('SELECT COUNT(*)::int AS cnt FROM ceps_especificos');
  const { rows: semCobertura } = await pool.query(
    "SELECT COUNT(*)::int AS cnt FROM ceps_especificos WHERE geocode_source = 'no_coverage'"
  );
  const { rows: individuais } = await pool.query(
    "SELECT COUNT(*)::int AS cnt FROM ceps_especificos WHERE geocode_source = 'individual'"
  );
  const { rows: manuais } = await pool.query(
    "SELECT COUNT(*)::int AS cnt FROM ceps_especificos WHERE geocode_source = 'manual'"
  );
  const pendentes = total[0].cnt - individuais[0].cnt - semCobertura[0].cnt - manuais[0].cnt;

  if (ceps.length === 0) {
    return {
      geocoded: 0,
      sem_cobertura: semCobertura[0].cnt,
      individuais: individuais[0].cnt,
      manuais: manuais[0].cnt,
      total: total[0].cnt,
      pendentes,
      message: pendentes === 0
        ? `Todos os CEPs processados. ${individuais[0].cnt} com geolocalização individual, ${manuais[0].cnt} corrigidos manualmente, ${semCobertura[0].cnt} sem cobertura.`
        : `${pendentes} CEPs pendentes aguardando.`,
    };
  }

  let geocoded = 0;

  for (const { cep, bairro } of ceps) {
    const via = await viaCep(cep);
    if (!via) {
      await pool.query(`
        UPDATE ceps_especificos SET geocode_source = 'no_coverage' WHERE cep = $1
      `, [cep]);
      await delay(300);
      continue;
    }

    const logradouro = via.logradouro || '';
    const bairroVia = via.bairro || bairro || '';
    const cidade = via.localidade || 'Salvador';
    const uf = via.uf || 'BA';

    await pool.query(`
      UPDATE ceps_especificos SET logradouro = $1, bairro_viacep = $2 WHERE cep = $3
    `, [logradouro || null, bairroVia || null, cep]);

    const parts = [logradouro, bairroVia, cidade, uf].filter(Boolean);
    const address = parts.join(', ');

    let coord = null;
    if (address) {
      coord = await googleGeocode(address);
    }
    if (!coord && bairroVia) {
      coord = await googleGeocode(`${bairroVia}, ${cidade}, ${uf}`);
    }

    if (coord) {
      await pool.query(`
        UPDATE ceps_especificos SET lat = $1, lng = $2, geocode_source = 'individual' WHERE cep = $3
      `, [coord.lat, coord.lng, cep]);
      geocoded++;
    } else {
      await pool.query(`
        UPDATE ceps_especificos SET geocode_source = 'no_coverage' WHERE cep = $1
      `, [cep]);
    }

    await delay(200);
  }

  const { rows: semCobertura2 } = await pool.query(
    "SELECT COUNT(*)::int AS cnt FROM ceps_especificos WHERE geocode_source = 'no_coverage'"
  );
  const { rows: individuais2 } = await pool.query(
    "SELECT COUNT(*)::int AS cnt FROM ceps_especificos WHERE geocode_source = 'individual'"
  );
  const { rows: manuais2 } = await pool.query(
    "SELECT COUNT(*)::int AS cnt FROM ceps_especificos WHERE geocode_source = 'manual'"
  );
  const pendentes2 = total[0].cnt - individuais2[0].cnt - semCobertura2[0].cnt - manuais2[0].cnt;

  return {
    geocoded,
    sem_cobertura: semCobertura2[0].cnt,
    individuais: individuais2[0].cnt,
    manuais: manuais2[0].cnt,
    total: total[0].cnt,
    pendentes: pendentes2,
    message: `${geocoded} geocodificados, ${manuais2[0].cnt} corrigidos manualmente, ${semCobertura2[0].cnt} sem cobertura, ${pendentes2} pendentes.`,
  };
}

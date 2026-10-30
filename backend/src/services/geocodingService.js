import { pool } from '../db/index.js';
import { consultarCep, viaCep, delay } from './cepLookupService.js';

const GMAPS_GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

function getApiKey() {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error('GOOGLE_MAPS_API_KEY not set');
  return key;
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

async function geocodificarEndereco({ logradouro, bairro, cidade, uf }) {
  const parts = [logradouro, bairro, cidade, uf].filter(Boolean);
  if (parts.length > 0) {
    const coord = await googleGeocode(parts.join(', '));
    if (coord) return coord;
  }
  if (bairro) {
    return googleGeocode(`${bairro}, ${cidade || 'Salvador'}, ${uf || 'BA'}`);
  }
  return null;
}

// Resolve um CEP na ordem: BrasilAPI (endereco + coordenadas) -> ViaCEP
// (endereco) -> Google Geocoding (coordenadas). Devolve tambem de qual API
// vieram as coordenadas, para gravar em geocode_api.
export async function resolverCoordenadas(cep, bairroFallback) {
  const dados = await consultarCep(cep);
  if (!dados) return null;

  const endereco = {
    logradouro: dados.logradouro || '',
    bairro: dados.bairro || bairroFallback || '',
    cidade: dados.cidade || 'Salvador',
    uf: dados.uf || 'BA',
  };

  if (dados.lat !== null && dados.lng !== null) {
    return { ...endereco, lat: dados.lat, lng: dados.lng, api: 'brasilapi' };
  }

  let coord = await geocodificarEndereco(endereco);
  if (coord) return { ...endereco, ...coord, api: 'google' };

  // BrasilAPI trouxe endereco mas o Google nao achou: tenta o ViaCEP antes
  // de marcar o CEP como sem cobertura.
  if (dados.fonte === 'brasilapi') {
    const alternativa = await viaCep(cep);
    if (alternativa) {
      const alt = {
        logradouro: alternativa.logradouro || endereco.logradouro,
        bairro: alternativa.bairro || endereco.bairro,
        cidade: alternativa.cidade || endereco.cidade,
        uf: alternativa.uf || endereco.uf,
      };
      coord = await geocodificarEndereco(alt);
      if (coord) return { ...alt, ...coord, api: 'google' };
      return { ...alt, lat: null, lng: null, api: null };
    }
  }

  return { ...endereco, lat: null, lng: null, api: null };
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
    SELECT id, cep, bairro, rota, nome_tabela, lat, lng, geocode_source, geocode_api
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
    SET lat = $1, lng = $2, geocode_source = 'manual', geocode_api = 'manual'
    WHERE id = $3
    RETURNING id, cep, bairro, rota, nome_tabela, lat, lng, geocode_source, geocode_api
  `, [latNum.toFixed(7), lngNum.toFixed(7), id]);
  return rows[0] || null;
}

export async function geocodificarCeps(limite = 50) {
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
    const resultado = await resolverCoordenadas(cep, bairro);

    if (resultado?.lat !== null && resultado?.lat !== undefined
        && resultado?.lng !== null && resultado?.lng !== undefined) {
      await pool.query(`
        UPDATE ceps_especificos
        SET lat = $1, lng = $2, geocode_source = 'individual', geocode_api = $3,
            logradouro = $4, bairro_viacep = $5
        WHERE cep = $6
      `, [
        resultado.lat, resultado.lng, resultado.api,
        resultado.logradouro || null, resultado.bairro || null, cep,
      ]);
      geocoded++;
    } else {
      await pool.query(`
        UPDATE ceps_especificos
        SET geocode_source = 'no_coverage', geocode_api = NULL,
            logradouro = COALESCE($2, logradouro),
            bairro_viacep = COALESCE($3, bairro_viacep)
        WHERE cep = $1
      `, [cep, resultado?.logradouro || null, resultado?.bairro || null]);
    }

    await delay(2000);
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

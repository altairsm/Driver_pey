import { pool } from '../db/index.js';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const VIACEP_URL = 'https://viacep.com.br/ws';

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
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

async function nominatimPorEndereco(logradouro, bairro, cidade, uf) {
  const parts = [logradouro, bairro, cidade, uf].filter(Boolean);
  const query = parts.join(', ');
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=br`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'DriverPey/1.0 (intuitiva.log.br)' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.length > 0 && data[0].lat && data[0].lon) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
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
    const url = `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=1`;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'DriverPey/1.0 (intuitiva.log.br)' },
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.length > 0 && data[0].lat && data[0].lon) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        await pool.query(`
          UPDATE bairros_rotas SET lat = $1, lng = $2 WHERE bairro = $3
        `, [lat, lng, bairro]);
        geocoded++;
      }
    } catch (err) {
      console.error(`  Geocode error for "${bairro}":`, err.message);
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

export async function geocodificarCeps(limite = 50) {
  const { rows: ceps } = await pool.query(`
    SELECT cep, bairro, geocode_attempts FROM ceps_especificos
    WHERE (lat IS NULL OR lng IS NULL)
      AND (geocode_attempts IS NULL OR geocode_attempts < 3)
    LIMIT $1
  `, [limite]);

  const { rows: total } = await pool.query('SELECT COUNT(*)::int AS cnt FROM ceps_especificos');
  const { rows: comCoord } = await pool.query(
    "SELECT COUNT(*)::int AS cnt FROM ceps_especificos WHERE lat IS NOT NULL AND lng IS NOT NULL"
  );
  const { rows: skipped } = await pool.query(
    "SELECT COUNT(*)::int AS cnt FROM ceps_especificos WHERE (lat IS NULL OR lng IS NULL) AND geocode_attempts >= 3"
  );
  const restantes = total[0].cnt - comCoord[0].cnt - skipped[0].cnt;

  if (ceps.length === 0) {
    return {
      geocoded: 0,
      failed: 0,
      skipped: skipped[0].cnt,
      total: total[0].cnt,
      restantes,
      message: restantes === 0 && skipped[0].cnt === 0
        ? 'Todos os CEPs já possuem coordenadas.'
        : `${total[0].cnt - comCoord[0].cnt} CEPs pendentes, mas todos já tentados 3+ vezes.`,
    };
  }

  let geocoded = 0;
  let failed = 0;

  for (const { cep, bairro } of ceps) {
    const via = await viaCep(cep);
    if (!via) {
      await pool.query('UPDATE ceps_especificos SET geocode_attempts = COALESCE(geocode_attempts, 0) + 1 WHERE cep = $1', [cep]);
      failed++;
      await delay(300);
      continue;
    }

    const logradouro = via.logradouro || '';
    const bairroVia = via.bairro || bairro || '';
    const cidade = via.localidade || 'Salvador';
    const uf = via.uf || 'BA';

    let coord = null;
    if (logradouro) {
      coord = await nominatimPorEndereco(logradouro, bairroVia, cidade, uf);
    }
    if (!coord && bairroVia) {
      coord = await nominatimPorEndereco('', bairroVia, cidade, uf);
    }
    if (!coord) {
      coord = await nominatimPorEndereco('', '', cidade, uf);
    }

    if (coord) {
      await pool.query(`
        UPDATE ceps_especificos SET lat = $1, lng = $2, geocode_attempts = COALESCE(geocode_attempts, 0) + 1 WHERE cep = $3
      `, [coord.lat, coord.lng, cep]);
      geocoded++;
    } else {
      await pool.query('UPDATE ceps_especificos SET geocode_attempts = COALESCE(geocode_attempts, 0) + 1 WHERE cep = $1', [cep]);
      failed++;
    }

    await delay(1200);
  }

  const { rows: comCoord2 } = await pool.query(
    "SELECT COUNT(*)::int AS cnt FROM ceps_especificos WHERE lat IS NOT NULL AND lng IS NOT NULL"
  );
  const { rows: skipped2 } = await pool.query(
    "SELECT COUNT(*)::int AS cnt FROM ceps_especificos WHERE (lat IS NULL OR lng IS NULL) AND geocode_attempts >= 3"
  );
  const restantes2 = total[0].cnt - comCoord2[0].cnt - skipped2[0].cnt;

  return {
    geocoded,
    failed,
    skipped: skipped2[0].cnt,
    total: total[0].cnt,
    restantes: restantes2,
    message: `${geocoded} geocodificados, ${failed} falha(s). ${restantes2} pendentes, ${skipped2[0].cnt} pulados (3+ tentativas).`,
  };
}

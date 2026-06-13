import { pool } from '../db/index.js';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
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

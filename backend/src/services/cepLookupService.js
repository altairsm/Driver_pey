// Consulta de CEP com duas bases: BrasilAPI (principal, ja traz coordenadas
// no endpoint v2) e ViaCEP (alternativa). Nenhuma das duas exige chave.
// O timeout curto evita que um lote inteiro trave numa API lenta.

const BRASILAPI_URL = 'https://brasilapi.com.br/api/cep/v2';
const VIACEP_URL = 'https://viacep.com.br/ws';
const FETCH_TIMEOUT_MS = 8000;

export function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function soDigitos(cep) {
  return String(cep ?? '').replace(/\D/g, '');
}

function numero(valor) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

async function fetchJson(url) {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// BrasilAPI v2: { cep, state, city, neighborhood, street, location: { coordinates } }
// location pode vir null; street/neighborhood podem vir vazios em CEPs de
// grande usuario. Aceitamos quando ha endereco OU coordenadas.
export async function brasilApiCep(cep) {
  const limpo = soDigitos(cep);
  if (limpo.length !== 8) return null;

  const data = await fetchJson(`${BRASILAPI_URL}/${limpo}`);
  if (!data) return null;
  if (Array.isArray(data.errors) && data.errors.length > 0) return null;
  if (data.erro) return null;

  const logradouro = data.street || '';
  const bairro = data.neighborhood || '';
  const coords = data.location?.coordinates;
  const lat = numero(coords?.latitude);
  const lng = numero(coords?.longitude);

  if (!logradouro && !bairro && (lat === null || lng === null)) return null;

  return {
    cep: limpo,
    logradouro,
    bairro,
    cidade: data.city || '',
    uf: data.state || '',
    lat,
    lng,
    fonte: 'brasilapi',
  };
}

// ViaCEP: nao retorna coordenadas, apenas o endereco.
export async function viaCep(cep) {
  const limpo = soDigitos(cep);
  if (limpo.length !== 8) return null;

  const data = await fetchJson(`${VIACEP_URL}/${limpo}/json/`);
  if (!data || data.erro) return null;

  return {
    cep: limpo,
    logradouro: data.logradouro || '',
    bairro: data.bairro || '',
    cidade: data.localidade || '',
    uf: data.uf || '',
    lat: null,
    lng: null,
    fonte: 'viacep',
  };
}

// BrasilAPI primeiro; se der erro ou nao trouxer endereco, tenta o mesmo CEP
// no ViaCEP.
export async function consultarCep(cep) {
  const brasil = await brasilApiCep(cep);
  if (brasil) return brasil;
  return viaCep(cep);
}

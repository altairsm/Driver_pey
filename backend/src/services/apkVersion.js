import AdmZip from 'adm-zip';
import { execFileSync } from 'node:child_process';

// Um APK e um zip: o Capacitor copia a build do Vite (dist/) para
// assets/public/ dentro do apk. O version.json gerado em prebuild
// (scripts/set-version.js) vai junto, e e ele que diz qual build o
// app instalado carrega no src/version.js -> COMMIT_HASH.
//
// Ler o commit de dentro do proprio arquivo e o un jeito de o backend
// saber qual versao esta no apk que o admin acabou de enviar, sem
// depender do commit do deploy (que muda toda vez que se roda git push
// e nao tem relacao nenhuma com o binario que o motorista instalou).

const CANDIDATOS = [
  'assets/public/version.json',
  'public/version.json',
  'assets/capacitor.config.json',
];

function extraiJsonAdmZip(zip) {
  for (const entrada of CANDIDATOS) {
    const e = zip.getEntry(entrada);
    if (!e) continue;
    try {
      const texto = e.getData().toString('utf8').trim();
      if (!texto) continue;
      return { dados: JSON.parse(texto), origem: entrada };
    } catch {
      // arquivo ilegivel: tenta o proximo
    }
  }
  return null;
}

// zipinfo/unzip podem nao existir no container. Mantemos o fallback
// para nao depender de binario do sistema.
function extraiJsonUnzip(caminhoApk) {
  for (const entrada of CANDIDATOS) {
    try {
      const saida = execFileSync('unzip', ['-p', caminhoApk, entrada], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        maxBuffer: 1024 * 1024,
      });
      const texto = String(saida || '').trim();
      if (!texto) continue;
      return { dados: JSON.parse(texto), origem: entrada };
    } catch {
      // sem unzip, ou entrada ausente
    }
  }
  return null;
}

// Le a versao embutida no apk. Devolve null em vez de estourar quando
// o arquivo nao tem o version.json: quem chama decide o que fazer
// (o upload usa o commit do servidor como reserva e avisa o admin).
export function lerVersaoApk(caminhoApk) {
  let achado = null;
  try {
    achado = extraiJsonAdmZip(new AdmZip(caminhoApk));
  } catch {
    achado = null;
  }
  if (!achado) {
    try {
      achado = extraiJsonUnzip(caminhoApk);
    } catch {
      achado = null;
    }
  }
  if (!achado) return null;

  const { dados, origem } = achado;
  const commit = typeof dados.commit === 'string' ? dados.commit.trim() : '';
  const versao = typeof dados.version === 'string' ? dados.version.trim() : '';
  if (!commit && !versao) return null;

  return { commit: commit || null, versao: versao || null, origem };
}
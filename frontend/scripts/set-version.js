import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const androidDir = join(__dirname, '..', 'android');

function git(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', cwd: join(__dirname, '..', '..') }).trim();
  } catch {
    return '';
  }
}

// versionCode precisa ser um inteiro estritamente crescente a cada envio ao
// Play. A contagem de commits e monotona e dispensa controle manual. Pode ser
// sobrescrita por VERSION_CODE (util para republicar sem novo commit).
let versionCode = Number(process.env.VERSION_CODE) || 0;
if (!versionCode) {
  const count = Number(git('git rev-list --count HEAD'));
  versionCode = Number.isInteger(count) && count > 0 ? count : 1;
}

// versionName exibido na loja/dispositivo. Prefere a tag mais recente (v3.7.9
// -> 3.7.9). No Docker (sem git) cai para 1.0.
let versionName = (process.env.VERSION || '').replace(/^v/i, '').trim();
if (!versionName || versionName.toLowerCase() === 'unknown') {
  versionName = git('git describe --tags --abbrev=0').replace(/^v/i, '').trim() || '1.0';
}

mkdirSync(androidDir, { recursive: true });
writeFileSync(
  join(androidDir, 'version.properties'),
  `# Gerado por scripts/set-version.js. Nao editar a mao.\nversionCode=${versionCode}\nversionName=${versionName}\n`
);
console.log(`✔ version.properties: versionCode=${versionCode} versionName=${versionName}`);

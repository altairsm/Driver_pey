import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const srcDir = join(__dirname, '..', 'src');

let commit = process.env.COMMIT_HASH || 'DEV';
if (commit === 'DEV') {
  try {
    commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8', cwd: join(__dirname, '..', '..') }).trim();
  } catch {
    commit = 'DEV';
  }
}

let version = process.env.VERSION || '';
if (!version) {
  try {
    version = execSync('git describe --tags --abbrev=0', { encoding: 'utf8', cwd: join(__dirname, '..', '..') }).trim();
  } catch {
    version = '';
  }
}

const json = { commit, version, url_download: '' };
writeFileSync(join(publicDir, 'version.json'), JSON.stringify(json, null, 2));
console.log(`✔ version.json written: commit=${commit} version=${version}`);

mkdirSync(srcDir, { recursive: true });
writeFileSync(join(srcDir, 'version.js'), `export const COMMIT_HASH = '${commit}';\nexport const VERSION = '${version}';\n`);
console.log(`✔ src/version.js written: COMMIT_HASH=${commit} VERSION=${version}`);

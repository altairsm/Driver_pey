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

const json = { commit, url_download: '' };
writeFileSync(join(publicDir, 'version.json'), JSON.stringify(json, null, 2));
console.log(`✔ version.json written: commit=${commit}`);

mkdirSync(srcDir, { recursive: true });
writeFileSync(join(srcDir, 'version.js'), `export const COMMIT_HASH = '${commit}';\n`);
console.log(`✔ src/version.js written: COMMIT_HASH=${commit}`);

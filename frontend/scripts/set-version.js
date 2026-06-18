import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

let commit = 'DEV';
try {
  commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8', cwd: join(__dirname, '..', '..') }).trim();
} catch {
  commit = 'DEV';
}

const version = { commit, url_download: '' };
writeFileSync(join(publicDir, 'version.json'), JSON.stringify(version, null, 2));
console.log(`✔ version.json written: commit=${commit}`);

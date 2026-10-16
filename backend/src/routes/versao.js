import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getVersaoAtiva, setVersaoAtiva } from '../services/versaoService.js';
import { lerVersaoApk } from '../services/apkVersion.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Base publica do servidor. Monta a URL de download servida pelo proprio
// backend (rota /api/download). Vem do compose (PUBLIC_BASE_URL) para nao
// ficarmos com o dominio fixo no codigo.
const BASE_PUBLICA = (process.env.PUBLIC_BASE_URL || 'https://driverpix.intuitiva.log.br').replace(/\/+$/, '');
const NOME_APK = 'DriverPix.apk';
const DOWNLOAD_URL = `${BASE_PUBLICA}/api/download/${NOME_APK}`;

const router = Router();
const publicRouter = Router();

// --- Upload config ---
// Diretorio do APK, resolvido a partir de __dirname (raiz do backend) e nao
// do cwd: assim o caminho e o mesmo com o container e com o backend rodando
// local. No container precisa cair em /app/uploads, que e onde o volume
// nomeado 'apkdata' esta montado (docker-compose). Se o APK for gravado fora
// do volume ele se perde a cada "docker compose up -d" e o download passa a
// responder 404. Mismo caminho usado por upload.js/ceps.js.
const uploadDir = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, NOME_APK),
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.apk') return cb(null, true);
    cb(new Error('Apenas arquivos .apk são permitidos'));
  },
  limits: { fileSize: 200 * 1024 * 1024 },
});

function getCommitHash() {
  try {
    const dir = path.resolve(__dirname, '..', '..');
    try {
      return fs.readFileSync(path.join(dir, '.commit'), 'utf8').trim();
    } catch {}
    const head = fs.readFileSync(path.join(dir, '.git', 'HEAD'), 'utf8').trim();
    if (head.startsWith('ref: ')) {
      const refPath = head.slice(5);
      return fs.readFileSync(path.join(dir, '.git', refPath), 'utf8').trim().slice(0, 7);
    }
    return head.slice(0, 7);
  } catch {
    return 'unknown';
  }
}

// --- Public routes ---

publicRouter.get('/download/:filename', async (req, res) => {
  try {
    // So o APK e servido publicamente (os XLSX ficam no mesmo diretorio mas
    // sao apagados apos o import). basename + checagem de extensao barram
    // path traversal e mantem o diretorio fechado.
    const nome = path.basename(req.params.filename);
    if (nome !== req.params.filename || path.extname(nome).toLowerCase() !== '.apk') {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }
    const filePath = path.join(uploadDir, nome);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }
    res.download(filePath, nome);
  } catch (err) {
    console.error('Erro ao fazer download:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// --- Driver routes ---

router.get('/check-versao', async (req, res) => {
  try {
    const { versao } = req.query;
    if (!versao) return res.json({ atualizado: false, url_download: '' });

    const ativa = await getVersaoAtiva();
    if (!ativa) return res.json({ atualizado: true });

    if (ativa.commit_hash === versao) {
      return res.json({ atualizado: true });
    }

    return res.json({
      atualizado: false,
      url_download: ativa.url_download || DOWNLOAD_URL,
      commit_esperado: ativa.commit_hash,
      versao_esperada: ativa.versao || null,
    });
  } catch (err) {
    console.error('Erro check-versao:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// --- Admin routes ---

router.post('/versao', async (req, res) => {
  try {
    const { commit_hash, url_download, versao } = req.body;
    if (!commit_hash) {
      return res.status(400).json({ error: 'commit_hash é obrigatório' });
    }
    const url = url_download || DOWNLOAD_URL;
    const result = await setVersaoAtiva(commit_hash, url, versao);
    res.json(result);
  } catch (err) {
    console.error('Erro ao salvar versão:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/upload-apk', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' });

    // O commit da versao ativa tem de ser o commit DENTRO do apk. Antes era
    // o commit do servidor, que muda a cada `git push` e nao tem relacao com
    // o binario instalado no celular: por isso o app dizia "atualizar" para
    // sempre. Se nao der para ler, caimos no commit do servidor e avisamos.
    let embutida = null;
    try {
      embutida = lerVersaoApk(req.file.path);
    } catch (e) {
      console.error('Falha ao ler versao embutida do apk:', e);
    }

    const commit_hash = embutida?.commit || getCommitHash();
    const url_download = DOWNLOAD_URL;

    await setVersaoAtiva(commit_hash, url_download, embutida?.versao || null);

    res.json({
      commit_hash,
      versao: embutida?.versao || null,
      url_download,
      origem: embutida ? embutida.origem : null,
      aviso: embutida
        ? null
        : 'Nao foi possivel ler a versao de dentro do APK; registrei o commit do servidor.',
      mensagem: 'APK enviado e versão registrada com sucesso!',
    });
  } catch (err) {
    console.error('Erro upload-apk:', err);
    res.status(500).json({ error: 'Erro ao fazer upload: ' + err.message });
  }
});

export { publicRouter };
export default router;

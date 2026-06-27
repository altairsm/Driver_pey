import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getVersaoAtiva, setVersaoAtiva } from '../services/versaoService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const URL_PADRAO = 'https://driverpix.intuitiva.log.br/DriverPix.apk';
const DOWNLOAD_BASE = 'https://driverpix.intuitiva.log.br/api/download';

const router = Router();
const publicRouter = Router();

// --- Upload config ---
const uploadDir = path.resolve(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, 'DriverPix.apk'),
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
    const filePath = path.join(uploadDir, req.params.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }
    res.download(filePath, req.params.filename);
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
      url_download: ativa.url_download || URL_PADRAO,
      commit_esperado: ativa.commit_hash,
    });
  } catch (err) {
    console.error('Erro check-versao:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// --- Admin routes ---

router.post('/versao', async (req, res) => {
  try {
    const { commit_hash, url_download } = req.body;
    if (!commit_hash) {
      return res.status(400).json({ error: 'commit_hash é obrigatório' });
    }
    const url = url_download || URL_PADRAO;
    const result = await setVersaoAtiva(commit_hash, url);
    res.json(result);
  } catch (err) {
    console.error('Erro ao salvar versão:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/upload-apk', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' });

    const commit_hash = getCommitHash();
    const url_download = `${DOWNLOAD_BASE}/DriverPix.apk`;

    await setVersaoAtiva(commit_hash, url_download);

    res.json({
      commit_hash,
      url_download,
      mensagem: 'APK enviado e versão registrada com sucesso!',
    });
  } catch (err) {
    console.error('Erro upload-apk:', err);
    res.status(500).json({ error: 'Erro ao fazer upload: ' + err.message });
  }
});

export { publicRouter };
export default router;

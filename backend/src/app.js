import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import driverRoutes from './routes/driver.js';
import adminRoutes from './routes/admin.js';
import uploadRoutes from './routes/upload.js';
import listasRoutes from './routes/listas.js';
import tabelasRoutes from './routes/tabelas.js';
import cepsRoutes from './routes/ceps.js';
import reclamacoesRoutes from './routes/reclamacoes.js';
import solicitacoesRoutes from './routes/solicitacoes.js';
import analyticsRoutes from './routes/analytics.js';
import configuracoesRoutes from './routes/configuracoes.js';
import taxasAdiantamentoRoutes from './routes/taxasAdiantamento.js';
import versaoRoutes from './routes/versao.js';
import { authenticateToken, requireAdmin } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

function getCommitHash() {
  try {
    const dir = dirname(fileURLToPath(import.meta.url));
    try {
      return readFileSync(join(dir, '..', '.commit'), 'utf8').trim();
    } catch {}
    const gitDir = join(dir, '..', '..', '.git');
    const head = readFileSync(join(gitDir, 'HEAD'), 'utf8').trim();
    if (head.startsWith('ref: ')) {
      const refPath = head.slice(5);
      return readFileSync(join(gitDir, refPath), 'utf8').trim().slice(0, 7);
    }
    return head.slice(0, 7);
  } catch { return 'unknown'; }
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/version', (req, res) => {
  res.json({ commit: getCommitHash() });
});

app.use('/auth', authRoutes);
app.use('/driver', driverRoutes);
app.use('/admin', authenticateToken, requireAdmin);
app.use('/admin', adminRoutes);
app.use('/upload', uploadRoutes);
app.use('/admin', listasRoutes);
app.use('/admin', tabelasRoutes);
app.use('/admin', cepsRoutes);
app.use('/admin', reclamacoesRoutes);
app.use('/admin', solicitacoesRoutes);
app.use('/admin', analyticsRoutes);
app.use('/configuracoes', authenticateToken, configuracoesRoutes);
app.use('/taxas-adiantamento', authenticateToken, taxasAdiantamentoRoutes);
app.use('/driver', versaoRoutes);
app.use('/admin', versaoRoutes);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Erro interno do servidor' });
});

import { runMigrations } from './db/migrate.js';

async function start() {
  try {
    await runMigrations();
  } catch (err) {
    console.error('Migration failed, starting anyway:', err);
  }
  app.listen(PORT, () => {
    console.log(`Driver_Pey API running on http://localhost:${PORT}`);
  });
}

start();

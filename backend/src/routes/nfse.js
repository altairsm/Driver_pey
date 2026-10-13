import { Router } from 'express';
import { pool } from '../db/index.js';
import {
  salvarCredencial, statusCredencial, apagarCredencial,
  liberarNota, statusNfsePorSolicitacoes, statusNfsePorQuinzena,
} from '../services/nfseService.js';
import { getConfig } from '../services/configuracaoService.js';

const router = Router();

// ── Certificado A1 ────────────────────────────────────────────────────────────
// O arquivo .pfx e a senha são criptografados (AES-256-GCM) antes de irem para o
// banco e nunca são devolvidos por nenhum endpoint nem escritos em log.
router.get('/nfse/credencial', async (req, res) => {
  try {
    res.json(await statusCredencial());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao consultar o certificado' });
  }
});

router.post('/nfse/credencial', async (req, res) => {
  try {
    const { arquivo_base64, senha, cnpj_titular } = req.body;
    if (!arquivo_base64 || !senha) {
      return res.status(400).json({ error: 'Envie o arquivo .pfx (em base64) e a senha do certificado' });
    }
    const resultado = await salvarCredencial({
      arquivoBase64: arquivo_base64,
      senha,
      cnpjTitular: cnpj_titular,
      criadoPor: req.user?.username,
    });
    res.json({
      success: true,
      ...resultado,
      aviso: resultado.chave_derivada
        ? 'NFSE_MASTER_KEY não está definida: a chave foi derivada do JWT_SECRET. Se o JWT_SECRET mudar, o certificado gravado não poderá mais ser lido.'
        : null,
    });
  } catch (err) {
    console.error('Erro ao salvar certificado:', err.message);
    res.status(400).json({ error: err.message || 'Erro ao salvar o certificado' });
  }
});

router.delete('/nfse/credencial', async (req, res) => {
  try {
    res.json(await apagarCredencial());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover o certificado' });
  }
});

// ── Liberação manual (NF inválida, mas o admin decide pagar) ─────────────────
router.post('/nfse/notas/:id/liberar', async (req, res) => {
  try {
    const resultado = await liberarNota(Number(req.params.id), {
      justificativa: req.body?.justificativa,
      usuario: req.user?.username,
    });
    if (!resultado.ok) return res.status(400).json({ error: resultado.motivo });
    res.json({ success: true, ...resultado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao liberar a nota' });
  }
});

router.get('/nfse/notas/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM notas_fiscais WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Nota não encontrada' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar a nota' });
  }
});

// ── Status em lote para as telas ──────────────────────────────────────────────
router.get('/nfse/solicitacoes', async (req, res) => {
  try {
    const ids = String(req.query.ids || '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0);
    const mapa = await statusNfsePorSolicitacoes(ids);
    res.json(Object.fromEntries(mapa));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao consultar NF das solicitações' });
  }
});

router.get('/nfse/quinzena', async (req, res) => {
  try {
    const { inicio, fim } = req.query;
    if (!inicio || !fim) return res.status(400).json({ error: 'inicio e fim são obrigatórios' });
    const mapa = await statusNfsePorQuinzena(inicio, fim);
    res.json(Object.fromEntries(mapa));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao consultar NF da quinzena' });
  }
});

export default router;

import { Router } from 'express';
import { listarSolicitacoes, aprovarSolicitacao, recusarSolicitacao, reenviarSolicitacao, reverificarSolicitacao } from '../services/solicitacoesService.js';

const router = Router();

router.get('/solicitacoes', async (req, res) => {
  try {
    const { status } = req.query;
    const list = await listarSolicitacoes(status || null);
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar solicitações' });
  }
});

router.post('/solicitacoes/:id/aprovar', async (req, res) => {
  try {
    const result = await aprovarSolicitacao(Number(req.params.id));
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao aprovar solicitação' });
  }
});

router.post('/solicitacoes/:id/recusar', async (req, res) => {
  try {
    const result = await recusarSolicitacao(Number(req.params.id));
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao recusar solicitação' });
  }
});

router.post('/solicitacoes/:id/reenviar', async (req, res) => {
  try {
    const result = await reenviarSolicitacao(Number(req.params.id));
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao reenviar solicitação' });
  }
});

router.post('/solicitacoes/:id/reverificar', async (req, res) => {
  try {
    const result = await reverificarSolicitacao(Number(req.params.id));
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao reverificar solicitação' });
  }
});

export default router;

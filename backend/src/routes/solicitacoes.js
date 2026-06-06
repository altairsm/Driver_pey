import { Router } from 'express';
import { listarSolicitacoes, aprovarSolicitacao, recusarSolicitacao } from '../services/solicitacoesService.js';

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
    if (!result.success) return res.status(400).json({ error: result.motivo });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao aprovar solicitação' });
  }
});

router.post('/solicitacoes/:id/recusar', async (req, res) => {
  try {
    const result = await recusarSolicitacao(Number(req.params.id));
    if (!result.success) return res.status(400).json({ error: result.motivo });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao recusar solicitação' });
  }
});

export default router;

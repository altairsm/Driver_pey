import { Router } from 'express';
import { getAnalyticsBairros } from '../services/analyticsService.js';

const router = Router();

router.get('/analytics/bairros', async (req, res) => {
  try {
    const { inicio, fim, matricula } = req.query;
    if (!inicio || !fim) {
      return res.status(400).json({ error: 'inicio e fim são obrigatórios' });
    }
    const data = await getAnalyticsBairros(inicio, fim, matricula);
    res.json(data);
  } catch (err) {
    console.error('Erro ao gerar relatório analítico:', err);
    res.status(500).json({ error: 'Erro ao gerar relatório analítico' });
  }
});

export default router;

import { Router } from 'express';
import {
  getAnalyticsBairros,
  getDistribuicaoRotas,
  getEvolucaoQuinzenal,
  getComparativoMotoristas,
  getEficienciaAllDrivers,
  getEntregasReclamacoesPorData,
} from '../services/analyticsService.js';

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

router.get('/analytics/distribuicao', async (req, res) => {
  try {
    const { inicio, fim } = req.query;
    if (!inicio || !fim) {
      return res.status(400).json({ error: 'inicio e fim são obrigatórios' });
    }
    const data = await getDistribuicaoRotas(inicio, fim);
    res.json(data);
  } catch (err) {
    console.error('Erro ao buscar distribuição por rota:', err);
    res.status(500).json({ error: 'Erro ao buscar distribuição por rota' });
  }
});

router.get('/analytics/evolucao', async (req, res) => {
  try {
    const n = parseInt(req.query.n) || 12;
    const data = await getEvolucaoQuinzenal(n);
    res.json(data);
  } catch (err) {
    console.error('Erro ao buscar evolução quinzenal:', err);
    res.status(500).json({ error: 'Erro ao buscar evolução quinzenal' });
  }
});

router.get('/analytics/comparativo', async (req, res) => {
  try {
    const { inicio, fim } = req.query;
    if (!inicio || !fim) {
      return res.status(400).json({ error: 'inicio e fim são obrigatórios' });
    }
    const data = await getComparativoMotoristas(inicio, fim);
    res.json(data);
  } catch (err) {
    console.error('Erro ao buscar comparativo:', err);
    res.status(500).json({ error: 'Erro ao buscar comparativo' });
  }
});

router.get('/analytics/eficiencia', async (req, res) => {
  try {
    const data = await getEficienciaAllDrivers();
    res.json(data);
  } catch (err) {
    console.error('Erro ao buscar eficiência:', err);
    res.status(500).json({ error: 'Erro ao buscar eficiência' });
  }
});

router.get('/relatorios/entregas-reclamacoes', async (req, res) => {
  try {
    const inicio = req.query.inicio || new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    const fim = req.query.fim || new Date().toISOString().slice(0, 10);
    const data = await getEntregasReclamacoesPorData(inicio, fim);
    res.json(data);
  } catch (err) {
    console.error('Erro ao buscar entregas x reclamações:', err);
    res.status(500).json({ error: 'Erro ao buscar entregas x reclamações' });
  }
});

export default router;

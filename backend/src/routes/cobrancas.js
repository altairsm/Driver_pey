import { Router } from 'express';
import {
  buscarMotoristaPorCTE,
  criarCobranca,
  listarCobrancas,
  getCobrancasDriver,
  desativarCobranca,
} from '../services/cobrancasService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.get('/driver/cobrancas', authenticateToken, async (req, res) => {
  try {
    const cobrancas = await getCobrancasDriver(req.user.matricula);
    res.json(cobrancas);
  } catch (err) {
    console.error('Erro ao buscar cobranças do motorista:', err);
    res.status(500).json({ error: 'Erro ao buscar cobranças' });
  }
});

router.get('/admin/cobrancas', async (req, res) => {
  try {
    const cobrancas = await listarCobrancas();
    res.json(cobrancas);
  } catch (err) {
    console.error('Erro ao listar cobranças:', err);
    res.status(500).json({ error: 'Erro ao listar cobranças' });
  }
});

router.post('/admin/cobrancas', async (req, res) => {
  try {
    const { ncte, matricula, valor_total, parcelas, observacao } = req.body;
    if (!ncte || !matricula || !valor_total || valor_total <= 0) {
      return res.status(400).json({ error: 'ncte, matricula e valor_total (positivo) são obrigatórios' });
    }
    const cobranca = await criarCobranca({
      ncte, matricula, valor_total, parcelas: parcelas || 1, observacao,
    });
    res.status(201).json(cobranca);
  } catch (err) {
    console.error('Erro ao criar cobrança:', err);
    res.status(500).json({ error: 'Erro ao criar cobrança' });
  }
});

router.get('/admin/cobrancas/buscar-motorista/:ncte', async (req, res) => {
  try {
    const { ncte } = req.params;
    const motorista = await buscarMotoristaPorCTE(ncte);
    if (!motorista) {
      return res.status(404).json({ error: 'CTE não encontrado ou não possui entrega registrada' });
    }
    res.json(motorista);
  } catch (err) {
    console.error('Erro ao buscar motorista por CTE:', err);
    res.status(500).json({ error: 'Erro ao buscar motorista' });
  }
});

router.put('/admin/cobrancas/:id/desativar', async (req, res) => {
  try {
    const { id } = req.params;
    const cobranca = await desativarCobranca(id);
    if (!cobranca) {
      return res.status(404).json({ error: 'Cobrança não encontrada' });
    }
    res.json(cobranca);
  } catch (err) {
    console.error('Erro ao desativar cobrança:', err);
    res.status(500).json({ error: 'Erro ao desativar cobrança' });
  }
});

export default router;

import { Router } from 'express';
import { listarTaxas, atualizarTaxas } from '../services/taxasAdiantamentoService.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const taxas = await listarTaxas();
    res.json(taxas);
  } catch (err) {
    console.error('Erro ao listar taxas:', err);
    res.status(500).json({ error: 'Erro ao listar taxas de adiantamento' });
  }
});

router.put('/', async (req, res) => {
  try {
    const taxas = await atualizarTaxas(req.body);
    res.json(taxas);
  } catch (err) {
    console.error('Erro ao atualizar taxas:', err);
    res.status(500).json({ error: 'Erro ao atualizar taxas de adiantamento' });
  }
});

export default router;

import { Router } from 'express';
import { getConfig, atualizarConfig } from '../services/configuracaoService.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const config = await getConfig();
    res.json(config);
  } catch (err) {
    console.error('Erro ao buscar configurações:', err);
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

router.put('/', async (req, res) => {
  try {
    const config = await atualizarConfig(req.body);
    res.json(config);
  } catch (err) {
    console.error('Erro ao atualizar configurações:', err);
    res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
});

export default router;

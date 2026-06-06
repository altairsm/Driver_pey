import { Router } from 'express';
import { buscarBairros, listarCepsPorBairro, atribuirTabela, listarCepsSemRange, adicionarRange, listarCtesSemFaixa, listarConflitosCeps, listarRangesSemTabela } from '../services/cepsService.js';

const router = Router();

router.get('/ceps/bairros', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Digite pelo menos 2 caracteres' });
    }
    const bairros = await buscarBairros(q.trim());
    res.json(bairros);
  } catch (err) {
    console.error('Erro ao buscar bairros:', err);
    res.status(500).json({ error: 'Erro ao buscar bairros' });
  }
});

router.get('/ceps', async (req, res) => {
  try {
    const { bairro } = req.query;
    if (!bairro) {
      return res.status(400).json({ error: 'Parâmetro bairro é obrigatório' });
    }
    const ceps = await listarCepsPorBairro(bairro);
    res.json(ceps);
  } catch (err) {
    console.error('Erro ao listar CEPs:', err);
    res.status(500).json({ error: 'Erro ao listar CEPs' });
  }
});

router.put('/ceps/atribuir-tabela', async (req, res) => {
  try {
    const { bairro, tabela_motorista } = req.body;
    if (!bairro || !tabela_motorista) {
      return res.status(400).json({ error: 'Bairro e tabela_motorista são obrigatórios' });
    }
    const afetados = await atribuirTabela(bairro, tabela_motorista);
    if (afetados === 0) {
      return res.status(404).json({ error: 'Bairro não encontrado' });
    }
    res.json({ success: true, afetados, bairro, tabela_motorista });
  } catch (err) {
    console.error('Erro ao atribuir tabela:', err);
    res.status(500).json({ error: 'Erro ao atribuir tabela' });
  }
});

router.get('/ceps/sem-range', async (req, res) => {
  try {
    const ceps = await listarCepsSemRange();
    res.json(ceps);
  } catch (err) {
    console.error('Erro ao listar CEPs sem range:', err);
    res.status(500).json({ error: 'Erro ao listar CEPs sem range' });
  }
});

router.post('/ceps/adicionar', async (req, res) => {
  try {
    const { cep_ini, cep_fim, bairro, cidade, tabela_motorista } = req.body;
    if (!cep_ini || !cep_fim || !bairro || !cidade) {
      return res.status(400).json({ error: 'cep_ini, cep_fim, bairro e cidade são obrigatórios' });
    }
    await adicionarRange(req.body);
    res.json({ success: true, cep_ini, cep_fim, bairro, cidade, tabela_motorista: tabela_motorista || null });
  } catch (err) {
    console.error('Erro ao adicionar range:', err);
    res.status(500).json({ error: 'Erro ao adicionar range' });
  }
});

router.get('/ceps/ctes-sem-faixa', async (req, res) => {
  try {
    const ctes = await listarCtesSemFaixa();
    res.json(ctes);
  } catch (err) {
    console.error('Erro ao listar CTEs sem faixa:', err);
    res.status(500).json({ error: 'Erro ao listar CTEs sem faixa' });
  }
});

router.get('/ceps/ranges-sem-tabela', async (req, res) => {
  try {
    const ranges = await listarRangesSemTabela();
    res.json(ranges);
  } catch (err) {
    console.error('Erro ao listar ranges sem tabela:', err);
    res.status(500).json({ error: 'Erro ao listar ranges sem tabela' });
  }
});

router.get('/ceps/conflitos', async (req, res) => {
  try {
    const conflitos = await listarConflitosCeps();
    res.json(conflitos);
  } catch (err) {
    console.error('Erro ao listar conflitos de CEPs:', err);
    res.status(500).json({ error: 'Erro ao listar conflitos de CEPs' });
  }
});

export default router;

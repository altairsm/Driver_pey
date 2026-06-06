import { Router } from 'express';
import { listarTabelas, criarTabela, atualizarFaixa, deletarFaixa, deletarTabela } from '../services/tabelasService.js';

const router = Router();

router.get('/tabelas', async (req, res) => {
  try {
    const tabelas = await listarTabelas();
    res.json(tabelas);
  } catch (err) {
    console.error('Erro ao listar tabelas:', err);
    res.status(500).json({ error: 'Erro ao listar tabelas' });
  }
});

router.post('/tabelas', async (req, res) => {
  try {
    const { nome, faixas } = req.body;
    if (!nome || !faixas || !Array.isArray(faixas) || faixas.length === 0) {
      return res.status(400).json({ error: 'Nome e faixas são obrigatórios' });
    }
    await criarTabela(nome, faixas);
    res.status(201).json({ success: true, nome });
  } catch (err) {
    console.error('Erro ao criar tabela:', err);
    res.status(500).json({ error: 'Erro ao criar tabela' });
  }
});

router.put('/tabelas/faixas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const atualizado = await atualizarFaixa(id, req.body);
    if (!atualizado) return res.status(404).json({ error: 'Faixa não encontrada' });
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao atualizar faixa:', err);
    res.status(500).json({ error: 'Erro ao atualizar faixa' });
  }
});

router.delete('/tabelas/faixas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletado = await deletarFaixa(id);
    if (!deletado) return res.status(404).json({ error: 'Faixa não encontrada' });
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao deletar faixa:', err);
    res.status(500).json({ error: 'Erro ao deletar faixa' });
  }
});

router.delete('/tabelas/:nome', async (req, res) => {
  try {
    const { nome } = req.params;
    const deletado = await deletarTabela(nome);
    if (!deletado) return res.status(404).json({ error: 'Tabela não encontrada' });
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao deletar tabela:', err);
    res.status(500).json({ error: 'Erro ao deletar tabela' });
  }
});

export default router;

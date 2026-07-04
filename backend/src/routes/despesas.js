import { Router } from 'express';
import {
  listarDespesas,
  criarDespesa,
  atualizarDespesa,
  deletarDespesa,
  resumoDespesas,
} from '../services/despesasService.js';

const router = Router();

router.get('/despesas', async (req, res) => {
  try {
    const { inicio, fim, categoria } = req.query;
    if (!inicio || !fim) {
      return res.status(400).json({ error: 'inicio e fim são obrigatórios' });
    }
    const data = await listarDespesas(inicio, fim, categoria);
    res.json(data);
  } catch (err) {
    console.error('Erro ao listar despesas:', err);
    res.status(500).json({ error: 'Erro ao listar despesas' });
  }
});

router.post('/despesas', async (req, res) => {
  try {
    const { descricao, valor, categoria, data, observacao } = req.body;
    if (!descricao || valor === undefined || !categoria) {
      return res.status(400).json({ error: 'descricao, valor e categoria são obrigatórios' });
    }
    const result = await criarDespesa({ descricao, valor, categoria, data, observacao });
    res.status(201).json(result);
  } catch (err) {
    console.error('Erro ao criar despesa:', err);
    res.status(500).json({ error: 'Erro ao criar despesa' });
  }
});

router.put('/despesas/:id', async (req, res) => {
  try {
    const { descricao, valor, categoria, data, observacao } = req.body;
    if (!descricao || valor === undefined || !categoria) {
      return res.status(400).json({ error: 'descricao, valor e categoria são obrigatórios' });
    }
    const result = await atualizarDespesa(req.params.id, { descricao, valor, categoria, data, observacao });
    if (!result) {
      return res.status(404).json({ error: 'Despesa não encontrada' });
    }
    res.json(result);
  } catch (err) {
    console.error('Erro ao atualizar despesa:', err);
    res.status(500).json({ error: 'Erro ao atualizar despesa' });
  }
});

router.delete('/despesas/:id', async (req, res) => {
  try {
    const ok = await deletarDespesa(req.params.id);
    if (!ok) {
      return res.status(404).json({ error: 'Despesa não encontrada' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao deletar despesa:', err);
    res.status(500).json({ error: 'Erro ao deletar despesa' });
  }
});

router.get('/despesas/resumo', async (req, res) => {
  try {
    const { inicio, fim } = req.query;
    if (!inicio || !fim) {
      return res.status(400).json({ error: 'inicio e fim são obrigatórios' });
    }
    const data = await resumoDespesas(inicio, fim);
    res.json(data);
  } catch (err) {
    console.error('Erro ao buscar resumo de despesas:', err);
    res.status(500).json({ error: 'Erro ao buscar resumo de despesas' });
  }
});

export default router;

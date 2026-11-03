import { Router } from 'express';
import { listarTabelas, criarTabela, atualizarFaixa, deletarFaixa, deletarTabela, atualizarExcedente, normalizaValorExcedente } from '../services/tabelasService.js';

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
    const { nome, faixas, valor_excedente_kg } = req.body;
    if (!nome || !faixas || !Array.isArray(faixas) || faixas.length === 0) {
      return res.status(400).json({ error: 'Nome e faixas são obrigatórios' });
    }
    let excedente;
    try {
      excedente = normalizaValorExcedente(valor_excedente_kg);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
    await criarTabela(nome, faixas, excedente);
    res.status(201).json({ success: true, nome });
  } catch (err) {
    console.error('Erro ao criar tabela:', err);
    res.status(500).json({ error: 'Erro ao criar tabela' });
  }
});

router.put('/tabelas/:nome/excedente', async (req, res) => {
  try {
    const { nome } = req.params;
    const { valor_excedente_kg } = req.body;
    let excedente;
    try {
      excedente = normalizaValorExcedente(valor_excedente_kg);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
    const atualizado = await atualizarExcedente(nome, excedente);
    if (!atualizado) return res.status(404).json({ error: 'Tabela não encontrada' });
    res.json({ success: true, nome, valor_excedente_kg: excedente });
  } catch (err) {
    console.error('Erro ao atualizar adicional por kg:', err);
    res.status(500).json({ error: 'Erro ao atualizar adicional por kg' });
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

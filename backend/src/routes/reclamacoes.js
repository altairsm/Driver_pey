import { Router } from 'express';
import multer from 'multer';
import { uploadReclamacoes, listarReclamacoes, atualizarCte, deletarReclamacao, listarReclamacoesSemMotorista, getQuinzenasReclamacoes } from '../services/reclamacoesService.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/reclamacoes/quinzenas', async (req, res) => {
  try {
    const quinzenas = await getQuinzenasReclamacoes();
    res.json(quinzenas);
  } catch (err) {
    console.error('Erro ao buscar quinzenas:', err);
    res.status(500).json({ error: 'Erro ao buscar quinzenas' });
  }
});

router.get('/reclamacoes', async (req, res) => {
  try {
    const { inicio, fim } = req.query;
    const { rows, atualizadas } = await listarReclamacoes(inicio, fim);
    res.json({ reclamacoes: rows, atualizadas });
  } catch (err) {
    console.error('Erro ao listar reclamações:', err);
    res.status(500).json({ error: 'Erro ao listar reclamações' });
  }
});

router.get('/reclamacoes/pendentes', async (req, res) => {
  try {
    const pendentes = await listarReclamacoesSemMotorista();
    res.json(pendentes);
  } catch (err) {
    console.error('Erro ao listar reclamações pendentes:', err);
    res.status(500).json({ error: 'Erro ao listar reclamações pendentes' });
  }
});

router.post('/reclamacoes/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' });
    console.log(`Upload: ${req.file.originalname}, size=${req.file.size}, mimetype=${req.file.mimetype}`);
    const resultado = await uploadReclamacoes(req.file.buffer, req.file.originalname);
    console.log(`Upload result: ${JSON.stringify(resultado)}`);
    res.json(resultado);
  } catch (err) {
    console.error('Erro ao importar reclamações:', err);
    res.status(500).json({ error: 'Erro ao importar reclamações: ' + err.message });
  }
});

router.put('/reclamacoes/:id/cte', async (req, res) => {
  try {
    const { id } = req.params;
    const { cte } = req.body;
    if (!cte) return res.status(400).json({ error: 'CTE é obrigatório' });
    const result = await atualizarCte(id, cte);
    res.json(result);
  } catch (err) {
    console.error('Erro ao atualizar CTE:', err);
    res.status(500).json({ error: 'Erro ao atualizar CTE' });
  }
});

router.delete('/reclamacoes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ok = await deletarReclamacao(id);
    if (!ok) return res.status(404).json({ error: 'Reclamação não encontrada' });
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao deletar reclamação:', err);
    res.status(500).json({ error: 'Erro ao deletar reclamação' });
  }
});

export default router;
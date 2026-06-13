import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getDriverData, getDriverDashboard, getDriverTrips, getDriverTripsFaixas,
  getQuinzenasDisponiveis, getProdutividade, getEficiencia, getReclamacoes,
  solicitarPagamento, getUltimaImportacao,
  getDriverDados, atualizarDriverDados, confirmarRegras
} from '../services/driverService.js';

const router = Router();

router.use(authenticateToken);

router.get('/me', async (req, res) => {
  try {
    const driver = await getDriverData(req.user.matricula);
    if (!driver) return res.status(404).json({ error: 'Motorista não encontrado' });
    res.json(driver);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    const { inicio, fim } = req.query;
    const dashboard = await getDriverDashboard(req.user.matricula, inicio || null, fim || null);
    const driver = await getDriverData(req.user.matricula);
    res.json({ ...dashboard, nome: driver?.nome_completo, matricula: req.user.matricula });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/trips', async (req, res) => {
  try {
    const { inicio, fim } = req.query;
    const trips = await getDriverTrips(req.user.matricula, inicio || null, fim || null);
    res.json(trips);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/trips/faixas', async (req, res) => {
  try {
    const { inicio, fim } = req.query;
    const faixas = await getDriverTripsFaixas(req.user.matricula, inicio || null, fim || null);
    res.json(faixas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/quinzenas', async (req, res) => {
  try {
    const quinzenas = await getQuinzenasDisponiveis(req.user.matricula);
    res.json(quinzenas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/produtividade', async (req, res) => {
  try {
    const { inicio, fim } = req.query;
    if (!inicio || !fim) return res.status(400).json({ error: 'inicio e fim são obrigatórios' });
    const data = await getProdutividade(req.user.matricula, inicio, fim);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/eficiencia', async (req, res) => {
  try {
    const { inicio, fim } = req.query;
    if (!inicio || !fim) return res.status(400).json({ error: 'inicio e fim são obrigatórios' });
    const data = await getEficiencia(req.user.matricula, inicio, fim);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/reclamacoes', async (req, res) => {
  try {
    const { inicio, fim } = req.query;
    if (!inicio || !fim) return res.status(400).json({ error: 'inicio e fim são obrigatórios' });
    const reclamacoes = await getReclamacoes(req.user.matricula, inicio, fim);
    res.json(reclamacoes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/ultima-importacao', async (req, res) => {
  try {
    const ultima = await getUltimaImportacao();
    res.json({ ultima_importacao: ultima });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/solicitar-pagamento', async (req, res) => {
  try {
    const { lista_numero, valor_solicitado } = req.body;
    if (!lista_numero || !valor_solicitado) {
      return res.status(400).json({ error: 'lista_numero e valor_solicitado são obrigatórios' });
    }
    const result = await solicitarPagamento(req.user.matricula, lista_numero, Number(valor_solicitado));
    if (!result.success) {
      return res.status(400).json({ error: result.motivo });
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/dados', async (req, res) => {
  try {
    const dados = await getDriverDados(req.user.matricula);
    if (!dados) return res.status(404).json({ error: 'Motorista não encontrado' });
    res.json(dados);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.put('/dados', async (req, res) => {
  try {
    const { cnpj_mei, telefone, pix_tipo } = req.body;
    const result = await atualizarDriverDados(req.user.matricula, { cnpj_mei, telefone, pix_tipo });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/confirmar-regras', async (req, res) => {
  try {
    const result = await confirmarRegras(req.user.matricula);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/fcm-token', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token é obrigatório' });

    await pool.query(`
      INSERT INTO fcm_tokens (matricula, token)
      VALUES ($1, $2)
      ON CONFLICT (matricula) DO UPDATE SET token = $2, atualizado_em = CURRENT_TIMESTAMP
    `, [req.user.matricula, token]);

    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao salvar FCM token:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;

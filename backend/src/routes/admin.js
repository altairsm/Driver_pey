import { Router } from 'express';
import { calcularPagamentos, confirmarPagamento, listarMotoristas } from '../services/paymentService.js';

const router = Router();

router.get('/pagamentos', async (req, res) => {
  try {
    const { inicio, fim } = req.query;
    if (!inicio || !fim) {
      return res.status(400).json({ error: 'Parâmetros inicio e fim são obrigatórios' });
    }

    const resultado = await calcularPagamentos(inicio, fim);
    res.json(resultado);
  } catch (err) {
    console.error('Erro ao calcular pagamentos:', err);
    res.status(500).json({ error: 'Erro ao calcular pagamentos' });
  }
});

router.get('/motoristas', async (req, res) => {
  try {
    const motoristas = await listarMotoristas();
    res.json(motoristas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/confirmar-pagamento', async (req, res) => {
  try {
    const { matricula, inicio, fim } = req.body;
    if (!matricula || !inicio || !fim) {
      return res.status(400).json({ error: 'Matrícula, inicio e fim são obrigatórios' });
    }

    await confirmarPagamento(matricula, { inicio, fim });
    res.json({ success: true, message: 'Pagamento confirmado com sucesso' });
  } catch (err) {
    console.error('Erro ao confirmar pagamento:', err);
    res.status(500).json({ error: 'Erro ao confirmar pagamento' });
  }
});

router.get('/resumo', async (req, res) => {
  try {
    const { inicio, fim } = req.query;
    if (!inicio || !fim) {
      return res.status(400).json({ error: 'Parâmetros inicio e fim são obrigatórios' });
    }

    const pagamentos = await calcularPagamentos(inicio, fim);

    const resumo = {
      total_motoristas: pagamentos.length,
      total_ctes: pagamentos.reduce((acc, p) => acc + Number(p.total_ctes), 0),
      total_receita: pagamentos.reduce((acc, p) => acc + Number(p.receita_total), 0),
      total_pagar: pagamentos.reduce((acc, p) => acc + Number(p.total_quinzena), 0),
      total_margem: pagamentos.reduce((acc, p) => acc + Number(p.margem_bruta), 0),
      motoristas: pagamentos,
    };

    res.json(resumo);
  } catch (err) {
    console.error('Erro ao gerar resumo:', err);
    res.status(500).json({ error: 'Erro ao gerar resumo' });
  }
});

export default router;

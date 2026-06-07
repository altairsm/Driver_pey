import { Router } from 'express';
import { calcularPagamentos, confirmarPagamento, listarMotoristas, criarMotorista, atualizarMotorista, deletarMotorista, getQuinzenasAdmin } from '../services/paymentService.js';

const router = Router();

router.get('/quinzenas', async (req, res) => {
  try {
    const quinzenas = await getQuinzenasAdmin();
    res.json(quinzenas);
  } catch (err) {
    console.error('Erro ao buscar quinzenas:', err);
    res.status(500).json({ error: 'Erro ao buscar quinzenas' });
  }
});

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

router.post('/motoristas', async (req, res) => {
  try {
    const { matricula, nome_completo, cpf, telefone, pgto } = req.body;
    if (!matricula || !nome_completo || !cpf) {
      return res.status(400).json({ error: 'Matrícula, nome e CPF são obrigatórios' });
    }
    const motorista = await criarMotorista(req.body);
    res.status(201).json(motorista);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Matrícula já cadastrada' });
    }
    console.error('Erro ao criar motorista:', err);
    res.status(500).json({ error: 'Erro ao criar motorista' });
  }
});

router.put('/motoristas/:matricula', async (req, res) => {
  try {
    const { matricula } = req.params;
    const atualizado = await atualizarMotorista(matricula, req.body);
    if (!atualizado) return res.status(404).json({ error: 'Motorista não encontrado' });
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao atualizar motorista:', err);
    res.status(500).json({ error: 'Erro ao atualizar motorista' });
  }
});

router.delete('/motoristas/:matricula', async (req, res) => {
  try {
    const { matricula } = req.params;
    const deletado = await deletarMotorista(matricula);
    if (!deletado) return res.status(404).json({ error: 'Motorista não encontrado' });
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao deletar motorista:', err);
    res.status(500).json({ error: 'Erro ao deletar motorista' });
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

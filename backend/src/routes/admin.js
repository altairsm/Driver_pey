import { Router } from 'express';
import { pool } from '../db/index.js';
import {
  calcularPagamentos, confirmarPagamento,
  listarMotoristas, criarMotorista, atualizarMotorista, deletarMotorista,
  getQuinzenasAdmin
} from '../services/paymentService.js';

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
    const { cpf, inicio, fim } = req.body;
    if (!cpf || !inicio || !fim) {
      return res.status(400).json({ error: 'CPF, inicio e fim são obrigatórios' });
    }

    const result = await confirmarPagamento(cpf, { inicio, fim });
    res.json({ success: true, message: 'Pagamento confirmado com sucesso', ...result });
  } catch (err) {
    console.error('Erro ao confirmar pagamento:', err);
    res.status(500).json({ error: 'Erro ao confirmar pagamento' });
  }
});

router.post('/motoristas', async (req, res) => {
  try {
    const { cpf, nome, telefone, pix_tipo } = req.body;
    if (!cpf || !nome) {
      return res.status(400).json({ error: 'CPF e nome são obrigatórios' });
    }
    const motorista = await criarMotorista(req.body);
    res.status(201).json(motorista);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'CPF já cadastrado' });
    }
    console.error('Erro ao criar motorista:', err);
    res.status(500).json({ error: 'Erro ao criar motorista' });
  }
});

router.put('/motoristas/:cpf', async (req, res) => {
  try {
    const { cpf } = req.params;
    const atualizado = await atualizarMotorista(cpf, req.body);
    if (!atualizado) return res.status(404).json({ error: 'Motorista não encontrado' });
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao atualizar motorista:', err);
    res.status(500).json({ error: 'Erro ao atualizar motorista' });
  }
});

router.delete('/motoristas/:cpf', async (req, res) => {
  try {
    const { cpf } = req.params;
    const deletado = await deletarMotorista(cpf);
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
      total_ctrcs: pagamentos.reduce((acc, p) => acc + Number(p.total_ctrcs), 0),
      total_receita: pagamentos.reduce((acc, p) => acc + Number(p.receita_total), 0),
      total_pagar: pagamentos.reduce((acc, p) => acc + Number(p.total_pagar), 0),
      total_adiantado: pagamentos.reduce((acc, p) => acc + Number(p.total_adiantado), 0),
      motoristas: pagamentos,
    };

    res.json(resumo);
  } catch (err) {
    console.error('Erro ao gerar resumo:', err);
    res.status(500).json({ error: 'Erro ao gerar resumo' });
  }
});

router.get('/precos-cidades', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM tabela_preco_cidade ORDER BY cidade');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar preços' });
  }
});

router.put('/precos-cidades', async (req, res) => {
  try {
    const { cidade, valor_entrega } = req.body;
    if (!cidade || valor_entrega === undefined) {
      return res.status(400).json({ error: 'cidade e valor_entrega são obrigatórios' });
    }

    await pool.query(`
      INSERT INTO tabela_preco_cidade (cidade, valor_entrega)
      VALUES ($1, $2)
      ON CONFLICT (cidade) DO UPDATE SET valor_entrega = $2, atualizado_em = CURRENT_TIMESTAMP
    `, [cidade.toUpperCase(), parseFloat(valor_entrega)]);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar preço' });
  }
});

router.delete('/precos-cidades/:cidade', async (req, res) => {
  try {
    const { cidade } = req.params;
    await pool.query('DELETE FROM tabela_preco_cidade WHERE cidade = $1', [cidade.toUpperCase()]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar preço' });
  }
});

export default router;

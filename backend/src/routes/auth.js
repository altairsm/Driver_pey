import { Router } from 'express';
import { pool } from '../db/index.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { cpf, matricula } = req.body;
    if (!cpf || !matricula) {
      return res.status(400).json({ error: 'CPF e matrícula são obrigatórios' });
    }

    const result = await pool.query(`
      SELECT "OperadorMatricula"::bigint AS matricula, nome_completo, cpf, telefone
      FROM matriculos_jad
      WHERE "OperadorMatricula"::bigint = $1 AND cpf = $2
    `, [matricula, cpf]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'CPF ou matrícula inválidos' });
    }

    const driver = result.rows[0];
    const token = generateToken({
      matricula: driver.matricula,
      nome: driver.nome_completo,
      cpf: driver.cpf,
    });

    res.json({ token, driver });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

export default router;

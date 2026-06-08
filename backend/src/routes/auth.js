import bcrypt from 'bcrypt';
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

router.post('/admin-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
    }

    const result = await pool.query(`
      SELECT id, username, password_hash, nome FROM admin_users WHERE username = $1
    `, [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos' });
    }

    const admin = result.rows[0];
    const senhaValida = await bcrypt.compare(password, admin.password_hash);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos' });
    }

    const token = generateToken({
      username: admin.username,
      nome: admin.nome,
      role: 'admin',
    });

    res.json({ token, admin: { username: admin.username, nome: admin.nome } });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

export default router;

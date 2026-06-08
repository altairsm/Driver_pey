import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  buscarBairros, listarBairrosRotas, atualizarBairroRota,
  listarCeps, listarCepsPorBairro, buscarCep,
  adicionarCep, deletarCep,
  listarCepsSemCadastro, importarCepsDaPlanilha,
  autoDescobrirCeps,
  listarCtesSemFaixa,
  migrarCepsDeRanges,
  consultarViaCep,
  listarCepsSemBairro, atualizarCepSemBairro,
  listarCepsSemTabela,
} from '../services/cepsService.js';
import { parseXLSX } from '../services/xlsxService.js';

const router = Router();

const uploadDir = path.resolve('uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = `ceps-${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos .xlsx ou .xls são permitidos'));
    }
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

// ==================== BAIRROS ====================

router.get('/ceps/bairros', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Digite pelo menos 2 caracteres' });
    }
    const bairros = await buscarBairros(q.trim());
    res.json(bairros);
  } catch (err) {
    console.error('Erro ao buscar bairros:', err);
    res.status(500).json({ error: 'Erro ao buscar bairros' });
  }
});

// ==================== BAIRROS_ROTAS ====================

router.get('/bairros-rotas', async (req, res) => {
  try {
    const dados = await listarBairrosRotas();
    res.json(dados);
  } catch (err) {
    console.error('Erro ao listar bairros/rotas:', err);
    res.status(500).json({ error: 'Erro ao listar bairros/rotas' });
  }
});

router.put('/bairros-rotas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome_tabela } = req.body;
    if (!nome_tabela) {
      return res.status(400).json({ error: 'nome_tabela é obrigatório' });
    }
    const atualizado = await atualizarBairroRota(id, nome_tabela);
    if (!atualizado) return res.status(404).json({ error: 'Registro não encontrado' });
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao atualizar bairro/rota:', err);
    res.status(500).json({ error: 'Erro ao atualizar bairro/rota' });
  }
});

// ==================== CEPS ESPECÍFICOS ====================

router.get('/ceps', async (req, res) => {
  try {
    const { bairro } = req.query;
    if (bairro) {
      const ceps = await listarCepsPorBairro(bairro);
      return res.json(ceps);
    }
    const ceps = await listarCeps();
    res.json(ceps);
  } catch (err) {
    console.error('Erro ao listar CEPs:', err);
    res.status(500).json({ error: 'Erro ao listar CEPs' });
  }
});

router.get('/ceps/conflitos', async (req, res) => {
  res.json([]);
});

router.get('/ceps/:cep', async (req, res) => {
  try {
    const { cep } = req.params;
    const encontrado = await buscarCep(cep);
    if (!encontrado) return res.status(404).json({ error: 'CEP não encontrado' });
    res.json(encontrado);
  } catch (err) {
    console.error('Erro ao buscar CEP:', err);
    res.status(500).json({ error: 'Erro ao buscar CEP' });
  }
});

router.post('/ceps', async (req, res) => {
  try {
    const { cep, bairro, rota, nome_tabela } = req.body;
    if (!cep || !bairro || !nome_tabela) {
      return res.status(400).json({ error: 'cep, bairro e nome_tabela são obrigatórios' });
    }
    const criado = await adicionarCep(cep, bairro, rota || null, nome_tabela);
    res.status(201).json(criado);
  } catch (err) {
    console.error('Erro ao adicionar CEP:', err);
    res.status(500).json({ error: 'Erro ao adicionar CEP' });
  }
});

router.put('/ceps/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { cep, bairro, rota, nome_tabela } = req.body;
    if (!cep || !bairro || !nome_tabela) {
      return res.status(400).json({ error: 'cep, bairro e nome_tabela são obrigatórios' });
    }
    const client = await (await import('../db/index.js')).pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`
        UPDATE ceps_especificos
        SET cep = $1, bairro = $2, rota = $3, nome_tabela = $4
        WHERE id = $5
      `, [cep.replace(/\D/g, ''), bairro, rota || null, nome_tabela, id]);

      await client.query(`
        INSERT INTO bairros_rotas (bairro, rota, nome_tabela)
        VALUES ($1, $2, $3)
        ON CONFLICT (bairro, rota) DO UPDATE SET nome_tabela = EXCLUDED.nome_tabela
      `, [bairro, rota || '', nome_tabela]);

      await client.query('COMMIT');
      res.json({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Erro ao atualizar CEP:', err);
    res.status(500).json({ error: 'Erro ao atualizar CEP' });
  }
});

router.delete('/ceps/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletado = await deletarCep(id);
    if (!deletado) return res.status(404).json({ error: 'CEP não encontrado' });
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao deletar CEP:', err);
    res.status(500).json({ error: 'Erro ao deletar CEP' });
  }
});

// ==================== CEPS SEM CADASTRO ====================

router.get('/ceps/sem-cadastro', async (req, res) => {
  try {
    const ceps = await listarCepsSemCadastro();
    res.json(ceps);
  } catch (err) {
    console.error('Erro ao listar CEPs sem cadastro:', err);
    res.status(500).json({ error: 'Erro ao listar CEPs sem cadastro' });
  }
});

// ==================== CTES SEM FAIXA ====================

router.get('/ceps/ctes-sem-faixa', async (req, res) => {
  try {
    const ctes = await listarCtesSemFaixa();
    res.json(ctes);
  } catch (err) {
    console.error('Erro ao listar CTEs sem faixa:', err);
    res.status(500).json({ error: 'Erro ao listar CTEs sem faixa' });
  }
});

// ==================== IMPORTAR PLANILHA ====================

router.post('/ceps/importar-planilha', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const rows = parseXLSX(req.file.path);
    fs.unlink(req.file.path, () => {});

    const result = await importarCepsDaPlanilha(rows);

    res.json({
      success: true,
      total_lidas: rows.length,
      importados: result.importados,
    });
  } catch (err) {
    console.error('Erro ao importar planilha de CEPs:', err);
    res.status(500).json({ error: `Erro ao importar planilha: ${err.message}` });
  }
});

// ==================== AUTO DESCOBRIR CEPS (VIACEP) ====================

router.post('/ceps/auto-descobrir', async (req, res) => {
  try {
    const resultados = await autoDescobrirCeps();
    res.json(resultados);
  } catch (err) {
    console.error('Erro ao auto-descobrir CEPs:', err);
    res.status(500).json({ error: `Erro ao auto-descobrir CEPs: ${err.message}` });
  }
});

// ==================== CONSULTAR VIACEP AVULSO ====================

router.get('/ceps/consultar-viacep/:cep', async (req, res) => {
  try {
    const { cep } = req.params;
    const data = await consultarViaCep(cep);
    if (!data) {
      return res.status(404).json({ error: 'CEP não encontrado no ViaCEP' });
    }
    res.json(data);
  } catch (err) {
    console.error('Erro ao consultar ViaCEP:', err);
    res.status(500).json({ error: 'Erro ao consultar ViaCEP' });
  }
});

// ==================== CEPS SEM BAIRRO ====================

router.get('/ceps/sem-bairro', async (req, res) => {
  try {
    const ceps = await listarCepsSemBairro();
    res.json(ceps);
  } catch (err) {
    console.error('Erro ao listar CEPs sem bairro:', err);
    res.status(500).json({ error: 'Erro ao listar CEPs sem bairro' });
  }
});

router.put('/ceps/:id/definir-bairro', async (req, res) => {
  try {
    const { id } = req.params;
    const { bairro, nome_tabela } = req.body;
    if (!bairro) {
      return res.status(400).json({ error: 'bairro é obrigatório' });
    }
    const atualizado = await atualizarCepSemBairro(id, bairro, nome_tabela || null);
    if (!atualizado) return res.status(404).json({ error: 'CEP não encontrado' });
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao definir bairro do CEP:', err);
    res.status(500).json({ error: 'Erro ao definir bairro do CEP' });
  }
});

// ==================== CEPS SEM TABELA ====================

router.get('/ceps/sem-tabela', async (req, res) => {
  try {
    const ceps = await listarCepsSemTabela();
    res.json(ceps);
  } catch (err) {
    console.error('Erro ao listar CEPs sem tabela:', err);
    res.status(500).json({ error: 'Erro ao listar CEPs sem tabela' });
  }
});

// ==================== MIGRAR LEGADO → NOVO ====================

router.post('/ceps/migrar-legado', async (req, res) => {
  try {
    const migrados = await migrarCepsDeRanges();
    res.json({ success: true, migrados });
  } catch (err) {
    console.error('Erro ao migrar CEPs legados:', err);
    res.status(500).json({ error: `Erro ao migrar CEPs legados: ${err.message}` });
  }
});

// ==================== ROTAS ANTIGAS (COMPATIBILIDADE) ====================

router.get('/ceps/sem-range', async (req, res) => {
  try {
    const ceps = await listarCepsSemCadastro();
    res.json(ceps);
  } catch (err) {
    console.error('Erro ao listar CEPs sem cadastro:', err);
    res.status(500).json({ error: 'Erro ao listar CEPs sem cadastro' });
  }
});

router.post('/ceps/adicionar', async (req, res) => {
  try {
    const { cep_ini, cep_fim, bairro, cidade, tabela_motorista } = req.body;
    if (!cep_ini || !bairro || !tabela_motorista) {
      return res.status(400).json({ error: 'cep, bairro e nome_tabela são obrigatórios' });
    }
    const cep = cep_ini;
    const criado = await adicionarCep(cep, bairro, null, tabela_motorista);
    res.status(201).json(criado);
  } catch (err) {
    console.error('Erro ao adicionar CEP:', err);
    res.status(500).json({ error: 'Erro ao adicionar CEP' });
  }
});

router.get('/ceps/ranges-sem-tabela', async (req, res) => {
  res.json([]);
});

export default router;

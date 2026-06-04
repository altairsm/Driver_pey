import { Router } from 'express';
import { pool } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.post('/listas', async (req, res) => {
  try {
    const listas = req.body;
    if (!Array.isArray(listas) || listas.length === 0) {
      return res.status(400).json({ error: 'Envie um array de listas' });
    }

    let imported = 0;
    for (const l of listas) {
      await pool.query(`
        INSERT INTO lista_entregas ("Número", "Qtd", "Peso", "Valor", "Data Emissão", "Data Baixa", status, "Tipo", "Rota", qtd_ctes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT ("Número") DO UPDATE SET
          "Qtd" = EXCLUDED."Qtd",
          "Peso" = EXCLUDED."Peso",
          "Valor" = EXCLUDED."Valor",
          "Data Emissão" = EXCLUDED."Data Emissão",
          "Data Baixa" = EXCLUDED."Data Baixa",
          status = EXCLUDED.status,
          "Tipo" = EXCLUDED."Tipo",
          "Rota" = EXCLUDED."Rota"
      `, [
        l.numero, l.qtd, l.peso, l.valor,
        l.data_emissao, l.data_baixa, l.status || 'Em aberto',
        l.tipo, l.rota, l.qtd_ctes || 0
      ]);
      imported++;
    }

    res.json({ success: true, importados: imported });
  } catch (err) {
    console.error('Erro ao importar listas:', err);
    res.status(500).json({ error: 'Erro ao importar listas' });
  }
});

router.get('/listas/pendentes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT le.*, mj.nome_completo, mj.cpf
      FROM lista_entregas le
      LEFT JOIN matriculos_jad mj ON mj."OperadorMatricula" = CAST(le.matricula_motorista AS BIGINT)
      WHERE le.qtd_ctes IS NULL OR le.qtd_ctes = 0
      ORDER BY le."Número" DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar listas pendentes:', err);
    res.status(500).json({ error: 'Erro ao buscar listas pendentes' });
  }
});

router.post('/listas/:numero/metrica', async (req, res) => {
  try {
    const { numero } = req.params;
    const { metrica } = req.body;
    if (!metrica) return res.status(400).json({ error: 'Métrica é obrigatória' });

    await pool.query(`
      UPDATE lista_entregas SET metrica_da_lista = $1 WHERE "Número" = $2
    `, [metrica, numero]);

    res.json({ success: true, metrica });
  } catch (err) {
    console.error('Erro ao definir métrica:', err);
    res.status(500).json({ error: 'Erro ao definir métrica' });
  }
});

router.post('/listas/:numero/motorista', async (req, res) => {
  try {
    const { numero } = req.params;
    const { matricula } = req.body;
    if (!matricula) return res.status(400).json({ error: 'Matrícula é obrigatória' });

    await pool.query(`
      UPDATE lista_entregas SET matricula_motorista = $1 WHERE "Número" = $2
    `, [String(matricula), numero]);

    res.json({ success: true, matricula });
  } catch (err) {
    console.error('Erro ao definir motorista:', err);
    res.status(500).json({ error: 'Erro ao definir motorista' });
  }
});

router.post('/listas/:numero/ctes', async (req, res) => {
  try {
    const { numero } = req.params;
    const ctes = req.body;
    if (!Array.isArray(ctes) || ctes.length === 0) {
      return res.status(400).json({ error: 'Envie um array de CT-es' });
    }

    let imported = 0;
    let skipped = 0;

    for (const c of ctes) {
      const controleDuplicidade = `${c.matricula_motorista || 0}${numero}${c.remessa}`;

      const nomeResult = await pool.query(
        `SELECT nome_completo FROM matriculos_jad WHERE "OperadorMatricula" = $1`,
        [c.matricula_motorista]
      );
      const nomeMotorista = nomeResult.rows[0]?.nome_completo || c.operador_nome || null;

      try {
        await pool.query(`
          INSERT INTO relatorioentrega_export (
            "OperadorMatricula", "OperadorNome", "NCTE", "Lista", "Peso",
            "Cep", "BairroDestino", "CidadeDestino", "Data",
            "controle_duplicidade"
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          ON CONFLICT ("controle_duplicidade") DO NOTHING
        `, [
          c.matricula_motorista, nomeMotorista, c.remessa, numero,
          c.peso || 0, c.cep, c.bairro, c.cidade,
          c.data_agendada || null, controleDuplicidade
        ]);

        imported++;
      } catch (e) {
        if (e.code === '23505') {
          skipped++;
        } else {
          throw e;
        }
      }
    }

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) as total FROM relatorioentrega_export WHERE "Lista" = $1`,
      [String(numero)]
    );
    const qtdCtes = parseInt(countRows[0].total);

    await pool.query(
      `UPDATE lista_entregas SET qtd_ctes = $1 WHERE "Número" = $2`,
      [qtdCtes, numero]
    );

    res.json({ success: true, importados: imported, ignorados: skipped, total_lista: qtdCtes });
  } catch (err) {
    console.error('Erro ao importar CT-es:', err);
    res.status(500).json({ error: 'Erro ao importar CT-es' });
  }
});

router.delete('/listas/:numero', async (req, res) => {
  try {
    const { numero } = req.params;

    await pool.query(
      `DELETE FROM relatorioentrega_export WHERE "Lista" = $1`,
      [String(numero)]
    );

    const result = await pool.query(
      `DELETE FROM lista_entregas WHERE "Número" = $1`,
      [numero]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Lista não encontrada' });
    }

    res.json({ success: true, message: `Lista ${numero} apagada` });
  } catch (err) {
    console.error('Erro ao apagar lista:', err);
    res.status(500).json({ error: 'Erro ao apagar lista' });
  }
});

router.post('/listas/:numero/reset', async (req, res) => {
  try {
    const { numero } = req.params;

    await pool.query(
      `DELETE FROM relatorioentrega_export WHERE "Lista" = $1`,
      [String(numero)]
    );

    await pool.query(
      `UPDATE lista_entregas SET qtd_ctes = 0 WHERE "Número" = $1`,
      [numero]
    );

    res.json({ success: true, message: `Lista ${numero} resetada` });
  } catch (err) {
    console.error('Erro ao resetar lista:', err);
    res.status(500).json({ error: 'Erro ao resetar lista' });
  }
});

export default router;

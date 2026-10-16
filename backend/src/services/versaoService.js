import { pool } from '../db/index.js';

export async function getVersaoAtiva() {
  const { rows } = await pool.query(`
    SELECT id, commit_hash, url_download, versao, criado_em
    FROM versao_apk
    WHERE ativo = true
    ORDER BY criado_em DESC
    LIMIT 1
  `);
  return rows[0] || null;
}

export async function setVersaoAtiva(commitHash, urlDownload, versao = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE versao_apk SET ativo = false WHERE ativo = true');
    await client.query(`
      INSERT INTO versao_apk (commit_hash, url_download, versao, ativo)
      VALUES ($1, $2, $3, true)
    `, [commitHash, urlDownload, versao]);
    await client.query('COMMIT');
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
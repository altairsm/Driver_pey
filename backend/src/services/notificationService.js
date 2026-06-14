import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../db/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = join(__dirname, '../../firebase-service-account.json');

try {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.cert(serviceAccount)
  });
  console.log('Firebase Admin inicializado com sucesso.');
} catch (err) {
  console.error('Erro ao inicializar Firebase Admin:', err.message);
}

export async function notifyNewComplaints(matriculas) {
  if (matriculas.length === 0) return;

  try {
    // Buscar tokens dos motoristas afetados
    const { rows } = await pool.query(
      'SELECT token FROM fcm_tokens WHERE matricula = ANY($1::bigint[])',
      [matriculas]
    );

    const tokens = rows.map(r => r.token);
    if (tokens.length === 0) return;

    const message = {
      notification: {
        title: 'Nova Reclamação',
        body: 'Você recebeu uma nova reclamação de entrega. Verifique os detalhes no app.',
      },
      tokens: tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`${response.successCount} notificações enviadas com sucesso.`);

    if (response.failureCount > 0) {
      console.warn(`${response.failureCount} notificações falharam.`);
    }
  } catch (err) {
    console.error('Erro ao enviar notificações push:', err);
  }
}

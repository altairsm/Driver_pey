import pg from 'pg';
import 'dotenv/config';

export const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'jadlog',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

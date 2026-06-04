import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import driverRoutes from './routes/driver.js';
import adminRoutes from './routes/admin.js';
import uploadRoutes from './routes/upload.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`Driver_Pey API running on http://localhost:${PORT}`);
});

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getDriverData, getDriverDashboard, getDriverTrips } from '../services/driverService.js';

const router = Router();

router.use(authenticateToken);

router.get('/me', async (req, res) => {
  try {
    const driver = await getDriverData(req.user.matricula);
    if (!driver) return res.status(404).json({ error: 'Motorista não encontrado' });
    res.json(driver);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    const dashboard = await getDriverDashboard(req.user.matricula);
    const driver = await getDriverData(req.user.matricula);
    res.json({ ...dashboard, nome: driver?.nome_completo, matricula: req.user.matricula });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/trips', async (req, res) => {
  try {
    const trips = await getDriverTrips(req.user.matricula);
    res.json(trips);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;

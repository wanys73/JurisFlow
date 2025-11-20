import express from 'express';
import { getKPIs, getRevenusMensuels } from '../controllers/statistiqueController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Toutes les routes sont protégées
router.use(protect);

// GET /api/statistiques/kpi - Récupérer les KPIs principaux
router.get('/kpi', getKPIs);

// GET /api/statistiques/revenus-mensuels - Récupérer les revenus des 12 derniers mois
router.get('/revenus-mensuels', getRevenusMensuels);

export default router;


import express from 'express';
import { getRapportAnnuel } from '../controllers/rapportController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Route pour le rapport annuel
// GET /api/rapports/annuel - Rapport annuel avec filtres
router.get('/rapports/annuel', protect, getRapportAnnuel);

export default router;


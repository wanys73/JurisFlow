import express from 'express';
import {
  createEvenement,
  getEvenements,
  getEvenementById,
  updateEvenement,
  deleteEvenement
} from '../controllers/evenementController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Routes pour les événements
// POST /api/agenda - Créer un événement
router.post('/agenda', protect, createEvenement);

// GET /api/agenda - Récupérer tous les événements (avec filtrage par dates)
router.get('/agenda', protect, getEvenements);

// GET /api/agenda/:id - Récupérer un événement par ID
router.get('/agenda/:id', protect, getEvenementById);

// PUT /api/agenda/:id - Mettre à jour un événement
router.put('/agenda/:id', protect, updateEvenement);

// DELETE /api/agenda/:id - Supprimer un événement
router.delete('/agenda/:id', protect, deleteEvenement);

export default router;


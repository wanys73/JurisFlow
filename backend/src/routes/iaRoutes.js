import express from 'express';
import {
  generateDocument,
  getTemplates
} from '../controllers/iaController.js';
import { protect } from '../middleware/authMiddleware.js';
import { body } from 'express-validator';
import { validate } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Validation pour la génération de document
const generateDocumentValidation = [
  body('dossierId')
    .notEmpty().withMessage('L\'ID du dossier est requis')
    .isMongoId().withMessage('ID du dossier invalide'),
  
  body('templateType')
    .notEmpty().withMessage('Le type de document est requis')
    .isString().withMessage('Le type de document doit être une chaîne'),
  
  body('promptContextuel')
    .optional()
    .isString().withMessage('Le prompt contextuel doit être une chaîne')
    .isLength({ max: 1000 }).withMessage('Le prompt contextuel ne peut pas dépasser 1000 caractères'),
  
  validate
];

// Routes
// GET /api/documents/templates - Lister les templates disponibles
router.get('/templates', protect, getTemplates);

// POST /api/documents/generate - Générer un document avec l'IA
router.post('/generate', protect, generateDocumentValidation, generateDocument);

export default router;


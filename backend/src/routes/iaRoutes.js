import express from 'express';
import {
  generateDocument,
  getTemplates,
  chatIA
} from '../controllers/iaController.js';
import { protect } from '../middleware/authMiddleware.js';
import { body } from 'express-validator';
import { validate } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Validation pour la génération de document
const generateDocumentValidation = [
  body('dossierId')
    .notEmpty().withMessage('L\'ID du dossier est requis')
    .isString().withMessage('ID du dossier invalide')
    .trim()
    .isLength({ min: 1 }).withMessage('L\'ID du dossier ne peut pas être vide'),
  
  body('templateType')
    .notEmpty().withMessage('Le type de document est requis')
    .isString().withMessage('Le type de document doit être une chaîne')
    .trim(),
  
  body('promptContextuel')
    .optional()
    .isString().withMessage('Le prompt contextuel doit être une chaîne')
    .trim()
    .isLength({ max: 2000 }).withMessage('Le prompt contextuel ne peut pas dépasser 2000 caractères'),
  
  validate
];

// Validation pour le chat IA
const chatIAValidation = [
  body('message')
    .notEmpty().withMessage('Le message est requis')
    .isString().withMessage('Le message doit être une chaîne')
    .isLength({ min: 1, max: 2000 }).withMessage('Le message doit contenir entre 1 et 2000 caractères'),
  
  body('history')
    .optional()
    .isArray().withMessage('L\'historique doit être un tableau'),
  
  validate
];

// Routes
// GET /api/documents/templates - Lister les templates disponibles
router.get('/templates', protect, getTemplates);

// POST /api/documents/generate - Générer un document avec l'IA
router.post('/generate', protect, generateDocumentValidation, generateDocument);

// POST /api/ia/chat - Chat avec l'IA pour conseils juridiques
router.post('/chat', protect, chatIAValidation, chatIA);

export default router;


import express from 'express';
import {
  createFacture,
  getFactures,
  getFactureById,
  updateFacture,
  deleteFacture,
  marquerPayee
} from '../controllers/factureController.js';
import { generateFacturePDF } from '../controllers/facturePDFController.js';
import { protect } from '../middleware/authMiddleware.js';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Validation pour la création de facture
const createFactureValidation = [
  body('dossier')
    .notEmpty().withMessage('Le dossier est requis')
    .isString().withMessage('ID du dossier invalide'),
  
  body('lignes')
    .isArray({ min: 1 }).withMessage('Au moins une ligne de facturation est requise'),
  
  body('lignes.*.description')
    .notEmpty().withMessage('La description de la ligne est requise')
    .trim(),
  
  body('lignes.*.quantite')
    .notEmpty().withMessage('La quantité est requise')
    .isFloat({ min: 0.01 }).withMessage('La quantité doit être supérieure à 0'),
  
  body('lignes.*.prixUnitaire')
    .notEmpty().withMessage('Le prix unitaire est requis')
    .isFloat({ min: 0 }).withMessage('Le prix unitaire doit être positif'),
  
  body('tva')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('La TVA doit être entre 0 et 100'),
  
  body('dateEcheance')
    .notEmpty().withMessage('La date d\'échéance est requise')
    .isISO8601().withMessage('Format de date invalide'),
  
  body('statut')
    .optional()
    .isIn(['Envoyée', 'Payée', 'En retard']).withMessage('Statut invalide'),
  
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 1000 }).withMessage('Les notes ne peuvent pas dépasser 1000 caractères'),
  
  validate
];

// Validation pour la mise à jour
const updateFactureValidation = [
  body('lignes')
    .optional()
    .isArray({ min: 1 }).withMessage('Au moins une ligne de facturation est requise'),
  
  body('lignes.*.description')
    .optional()
    .notEmpty().withMessage('La description de la ligne est requise')
    .trim(),
  
  body('lignes.*.quantite')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('La quantité doit être supérieure à 0'),
  
  body('lignes.*.prixUnitaire')
    .optional()
    .isFloat({ min: 0 }).withMessage('Le prix unitaire doit être positif'),
  
  body('tva')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('La TVA doit être entre 0 et 100'),
  
  body('dateEcheance')
    .optional()
    .isISO8601().withMessage('Format de date invalide'),
  
  body('statut')
    .optional()
    .isIn(['Envoyée', 'Payée', 'En retard']).withMessage('Statut invalide'),
  
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 1000 }).withMessage('Les notes ne peuvent pas dépasser 1000 caractères'),
  
  validate
];

// Validation pour l'ID
const idValidation = [
  param('id')
    .isString().withMessage('ID invalide')
    .notEmpty().withMessage('ID requis'),
  validate
];

// Routes
// POST /api/factures - Créer une facture
router.post('/', protect, createFactureValidation, createFacture);

// GET /api/factures - Lister toutes les factures du cabinet
router.get('/', protect, getFactures);

// IMPORTANT: Les routes spécifiques doivent être définies AVANT les routes génériques avec :id
// GET /api/factures/:id/pdf - Télécharger le PDF de la facture
router.get('/:id/pdf', protect, idValidation, generateFacturePDF);

// PATCH /api/factures/:id/payer - Marquer une facture comme payée
router.patch('/:id/payer', protect, idValidation, marquerPayee);

// GET /api/factures/:id - Récupérer une facture par ID
router.get('/:id', protect, idValidation, getFactureById);

// PUT /api/factures/:id - Mettre à jour une facture
router.put('/:id', protect, idValidation, updateFactureValidation, updateFacture);

// DELETE /api/factures/:id - Supprimer (archiver) une facture
router.delete('/:id', protect, idValidation, deleteFacture);

export default router;


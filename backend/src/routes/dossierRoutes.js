import express from 'express';
import {
  createDossier,
  getDossiers,
  getDossierById,
  updateDossier,
  deleteDossier,
  addNote,
  getUrgentDossiers
} from '../controllers/dossierController.js';
import { protect, isAdmin } from '../middleware/authMiddleware.js';
import { body } from 'express-validator';
import { validate } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Validation pour la création d'un dossier
const createDossierValidation = [
  body('nom')
    .trim()
    .notEmpty().withMessage('Le nom du dossier est requis')
    .isLength({ min: 3, max: 200 }).withMessage('Le nom doit contenir entre 3 et 200 caractères'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('La description ne peut pas dépasser 2000 caractères'),
  
  body('statut')
    .optional()
    .isIn(['Ouvert', 'Fermé', 'En attente']).withMessage('Statut invalide'),
  
  body('responsable')
    .optional()
    .isString().withMessage('ID du responsable invalide'),
  
  body('typeAffaire')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['Civil', 'Pénal', 'Commercial', 'Administratif', 'Travail', 'Familial', 'Immobilier', 'Autre', ''])
    .withMessage('Type d\'affaire invalide'),
  
  validate
];

// Validation pour la mise à jour
const updateDossierValidation = [
  body('nom')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 }).withMessage('Le nom doit contenir entre 3 et 200 caractères'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('La description ne peut pas dépasser 2000 caractères'),
  
  body('statut')
    .optional()
    .isIn(['Ouvert', 'Fermé', 'En attente']).withMessage('Statut invalide'),
  
  body('responsable')
    .optional()
    .isString().withMessage('ID du responsable invalide'),
  
  body('typeAffaire')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['Civil', 'Pénal', 'Commercial', 'Administratif', 'Travail', 'Familial', 'Immobilier', 'Autre', ''])
    .withMessage('Type d\'affaire invalide'),
  
  validate
];

// Validation pour ajouter une note
const addNoteValidation = [
  body('contenu')
    .trim()
    .notEmpty().withMessage('Le contenu de la note est requis')
    .isLength({ max: 2000 }).withMessage('Le contenu ne peut pas dépasser 2000 caractères'),
  
  validate
];

// Routes CRUD de base
// Toutes les routes nécessitent une authentification (middleware protect)

// GET /api/dossiers/urgent - Récupérer les dossiers urgents (< 30 jours d'échéance)
// IMPORTANT : Cette route doit être AVANT '/:id' sinon 'urgent' sera interprété comme un ID
router.get('/urgent', protect, getUrgentDossiers);

// GET /api/dossiers - Lister tous les dossiers du cabinet
router.get('/', protect, getDossiers);

// POST /api/dossiers - Créer un nouveau dossier
router.post('/', protect, createDossierValidation, createDossier);

// GET /api/dossiers/:id - Récupérer un dossier spécifique
router.get('/:id', protect, getDossierById);

// PUT /api/dossiers/:id - Mettre à jour un dossier
router.put('/:id', protect, updateDossierValidation, updateDossier);

// DELETE /api/dossiers/:id - Supprimer (archiver) un dossier
router.delete('/:id', protect, deleteDossier);

// POST /api/dossiers/:id/notes - Ajouter une note à un dossier
router.post('/:id/notes', protect, addNoteValidation, addNote);

export default router;


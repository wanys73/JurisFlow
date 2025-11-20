import express from 'express';
import { body, param } from 'express-validator';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient
} from '../controllers/clientController.js';

const router = express.Router();

const createClientValidation = [
  body('nom')
    .trim()
    .notEmpty().withMessage('Le nom est requis')
    .isLength({ min: 1, max: 100 }).withMessage('Le nom doit faire entre 1 et 100 caractères'),
  body('prenom')
    .trim()
    .notEmpty().withMessage('Le prénom est requis')
    .isLength({ min: 1, max: 100 }).withMessage('Le prénom doit faire entre 1 et 100 caractères'),
  body('email')
    .trim()
    .notEmpty().withMessage('L\'email est requis')
    .isEmail().withMessage('Email invalide'),
  body('telephone')
    .optional()
    .trim()
    .custom((value) => {
      if (!value || value === '') {
        return true; // Le téléphone est optionnel
      }
      // Vérifier que le numéro commence par +33
      if (!value.startsWith('+33')) {
        throw new Error('Le numéro de téléphone doit commencer par +33 (ex: +33612345678). Les numéros commençant par 0 ne sont pas acceptés.');
      }
      // Vérifier que le reste du numéro est composé uniquement de chiffres
      const restOfNumber = value.substring(3);
      if (!/^\d+$/.test(restOfNumber)) {
        throw new Error('Le numéro de téléphone doit contenir uniquement des chiffres après +33');
      }
      // Vérifier la longueur (9 chiffres après +33 pour un numéro français)
      if (restOfNumber.length < 9 || restOfNumber.length > 10) {
        throw new Error('Le numéro de téléphone doit contenir 9 ou 10 chiffres après +33');
      }
      return true;
    }),
  body('sexe')
    .optional()
    .isIn(['Homme', 'Femme', 'Autre', 'HOMME', 'FEMME', 'AUTRE']).withMessage('Sexe invalide'),
  body('adresse')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('L\'adresse ne doit pas dépasser 500 caractères'),
  validate
];

const updateClientValidation = [
  body('nom')
    .optional()
    .trim()
    .notEmpty().withMessage('Le nom ne peut pas être vide')
    .isLength({ min: 1, max: 100 }).withMessage('Le nom doit faire entre 1 et 100 caractères'),
  body('prenom')
    .optional()
    .trim()
    .notEmpty().withMessage('Le prénom ne peut pas être vide')
    .isLength({ min: 1, max: 100 }).withMessage('Le prénom doit faire entre 1 et 100 caractères'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Email invalide'),
  body('telephone')
    .optional()
    .trim()
    .custom((value) => {
      if (!value || value === '') {
        return true; // Le téléphone est optionnel
      }
      // Vérifier que le numéro commence par +33
      if (!value.startsWith('+33')) {
        throw new Error('Le numéro de téléphone doit commencer par +33 (ex: +33612345678). Les numéros commençant par 0 ne sont pas acceptés.');
      }
      // Vérifier que le reste du numéro est composé uniquement de chiffres
      const restOfNumber = value.substring(3);
      if (!/^\d+$/.test(restOfNumber)) {
        throw new Error('Le numéro de téléphone doit contenir uniquement des chiffres après +33');
      }
      // Vérifier la longueur (9 chiffres après +33 pour un numéro français)
      if (restOfNumber.length < 9 || restOfNumber.length > 10) {
        throw new Error('Le numéro de téléphone doit contenir 9 ou 10 chiffres après +33');
      }
      return true;
    }),
  body('sexe')
    .optional()
    .isIn(['Homme', 'Femme', 'Autre', 'HOMME', 'FEMME', 'AUTRE']).withMessage('Sexe invalide'),
  body('adresse')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('L\'adresse ne doit pas dépasser 500 caractères'),
  validate
];

const idValidation = [
  param('id')
    .trim()
    .notEmpty().withMessage('ID requis'),
  validate
];

// Routes
// POST /api/clients - Créer un client
router.post('/', protect, createClientValidation, createClient);

// GET /api/clients - Lister tous les clients du cabinet
router.get('/', protect, getClients);

// GET /api/clients/:id - Récupérer un client par ID
router.get('/:id', protect, idValidation, getClientById);

// PUT /api/clients/:id - Mettre à jour un client
router.put('/:id', protect, idValidation, updateClientValidation, updateClient);

// DELETE /api/clients/:id - Supprimer un client
router.delete('/:id', protect, idValidation, deleteClient);

export default router;


import { body, validationResult } from 'express-validator';

// Middleware pour vérifier les résultats de validation
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Erreur de validation des données',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg
      }))
    });
  }
  
  next();
};

// Validations pour l'inscription
export const registerValidation = [
  body('nom')
    .trim()
    .notEmpty().withMessage('Le nom est requis')
    .isLength({ min: 2, max: 50 }).withMessage('Le nom doit contenir entre 2 et 50 caractères'),
  
  body('prenom')
    .trim()
    .notEmpty().withMessage('Le prénom est requis')
    .isLength({ min: 2, max: 50 }).withMessage('Le prénom doit contenir entre 2 et 50 caractères'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('L\'email est requis')
    .isEmail().withMessage('Format d\'email invalide')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Le mot de passe est requis')
    .isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre'),
  
  body('role')
    .optional()
    .isIn(['admin', 'collaborateur']).withMessage('Rôle invalide'),
  
  body('cabinet.nom')
    .if(body('role').equals('admin'))
    .notEmpty().withMessage('Le nom du cabinet est requis pour un compte administrateur')
    .isLength({ min: 2, max: 100 }).withMessage('Le nom du cabinet doit contenir entre 2 et 100 caractères'),
  
  validate
];

// Validations pour la connexion
export const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('L\'email est requis')
    .isEmail().withMessage('Format d\'email invalide')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Le mot de passe est requis'),
  
  validate
];

// Validation pour le refresh token
export const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty().withMessage('Le refresh token est requis'),
  
  validate
];


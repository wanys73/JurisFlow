import express from 'express';
import { body } from 'express-validator';
import {
  getCabinetSettings,
  updateCabinetSettings,
  changePassword
} from '../controllers/cabinetController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import multer from 'multer';

const router = express.Router();

// Configuration Multer pour l'upload en mémoire
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// Définir les champs pour multer
const cabinetUploadFields = upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'signature', maxCount: 1 },
  { name: 'kbis', maxCount: 1 }
]);

// Route GET /api/cabinet/settings - Récupérer les paramètres du cabinet
router.get('/cabinet/settings', protect, getCabinetSettings);

// Route PUT /api/cabinet/settings - Mettre à jour les paramètres du cabinet
router.put('/cabinet/settings', protect, cabinetUploadFields, updateCabinetSettings);

// Route PUT /api/cabinet/change-password - Changer le mot de passe
router.put('/cabinet/change-password', protect, [
  body('currentPassword').notEmpty().withMessage('Le mot de passe actuel est requis'),
  body('newPassword')
    .isLength({ min: 6 }).withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères'),
  validate
], changePassword);

export default router;


import express from 'express';
import {
  register,
  login,
  refreshToken,
  logout,
  getMe
} from '../controllers/authController.js';
import {
  registerValidation,
  loginValidation,
  refreshTokenValidation
} from '../middleware/validationMiddleware.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Routes publiques
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/refresh', refreshTokenValidation, refreshToken);

// Routes protégées
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

export default router;


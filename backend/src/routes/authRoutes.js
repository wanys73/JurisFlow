import express from 'express';
import {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  confirmEmail,
  resendConfirmationEmail,
  activateAccountManually,
  forgotPassword,
  resetPassword
} from '../controllers/authController.js';
import {
  getPreferences,
  updatePreferences
} from '../controllers/userController.js';
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
router.get('/confirm/:token', confirmEmail);
router.post('/resend-confirmation', resendConfirmationEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
// Route temporaire pour activer manuellement (développement uniquement)
if (process.env.NODE_ENV !== 'production') {
  router.post('/activate-account', activateAccountManually);
}

// Routes protégées
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

// Routes des préférences utilisateur
router.get('/preferences', protect, getPreferences);
router.put('/preferences', protect, updatePreferences);

export default router;


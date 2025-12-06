import express from 'express';
import {
  getNotifications,
  getAllNotifications,
  markAsRead,
  markAllAsRead
} from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Toutes les routes sont protégées
router.use(protect);

router.get('/', getNotifications);
router.get('/all', getAllNotifications);
router.put('/:id/lu', markAsRead);
router.put('/mark-all-read', markAllAsRead);

export default router;


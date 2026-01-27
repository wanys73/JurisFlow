import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getGoogleCalendarEvents,
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent
} from '../services/googleCalendarService.js';

const router = express.Router();

/**
 * @route   GET /api/google-calendar/events
 * @desc    Récupérer les événements Google Calendar de l'utilisateur
 * @access  Private
 */
router.get('/events', protect, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { timeMin, timeMax } = req.query;

    const events = await getGoogleCalendarEvents(
      userId,
      timeMin ? new Date(timeMin) : undefined,
      timeMax ? new Date(timeMax) : undefined
    );

    res.json({
      success: true,
      data: {
        events,
        count: events.length
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des événements Google:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des événements Google Calendar'
    });
  }
});

/**
 * @route   POST /api/google-calendar/events
 * @desc    Créer un événement sur Google Calendar
 * @access  Private
 */
router.post('/events', protect, async (req, res) => {
  try {
    const userId = req.user.userId;
    const eventData = req.body;

    const result = await createGoogleCalendarEvent(userId, eventData);

    if (!result) {
      return res.status(500).json({
        success: false,
        message: 'Impossible de créer l\'événement sur Google Calendar'
      });
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'événement Google:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'événement sur Google Calendar'
    });
  }
});

export default router;

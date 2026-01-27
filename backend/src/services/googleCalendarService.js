import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../lib/prisma.js';
import { refreshGoogleToken } from '../controllers/googleAuthController.js';

/**
 * Service pour interagir avec l'API Google Calendar
 */

/**
 * Obtenir un client OAuth2 configuré pour un utilisateur
 */
const getOAuth2Client = async (userId) => {
  try {
    // Récupérer l'utilisateur avec ses tokens Google
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        googleAccessToken: true,
        googleRefreshToken: true,
        googleTokenExpiry: true,
        email: true
      }
    });

    if (!user || !user.googleAccessToken || !user.googleRefreshToken) {
      console.log(`⚠️ [Google Calendar] Utilisateur ${userId} n'a pas de tokens Google`);
      return null;
    }

    // Vérifier si le token est expiré
    const now = new Date();
    const expiry = user.googleTokenExpiry ? new Date(user.googleTokenExpiry) : null;
    
    if (expiry && expiry <= now) {
      console.log(`🔄 [Google Calendar] Token expiré, rafraîchissement...`);
      user = await refreshGoogleToken(userId);
      if (!user) {
        console.error(`❌ [Google Calendar] Impossible de rafraîchir le token`);
        return null;
      }
    }

    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = process.env;

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('❌ [Google Calendar] Configuration OAuth manquante');
      return null;
    }

    // Nettoyer les valeurs
    const cleanClientId = GOOGLE_CLIENT_ID?.replace(/^["']|["']$/g, '') || GOOGLE_CLIENT_ID;
    const cleanClientSecret = GOOGLE_CLIENT_SECRET?.replace(/^["']|["']$/g, '') || GOOGLE_CLIENT_SECRET;
    const cleanCallbackUrl = GOOGLE_CALLBACK_URL?.replace(/^["']|["']$/g, '') || GOOGLE_CALLBACK_URL;

    const oauth2Client = new OAuth2Client(
      cleanClientId,
      cleanClientSecret,
      cleanCallbackUrl
    );

    // Définir les credentials
    oauth2Client.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken,
      expiry_date: user.googleTokenExpiry ? new Date(user.googleTokenExpiry).getTime() : null
    });

    return oauth2Client;

  } catch (error) {
    console.error(`❌ [Google Calendar] Erreur lors de la création du client OAuth:`, error.message);
    return null;
  }
};

/**
 * Récupérer les événements Google Calendar d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {Date} timeMin - Date de début (par défaut: aujourd'hui)
 * @param {Date} timeMax - Date de fin (par défaut: +1 an)
 * @returns {Array} Liste des événements
 */
export const getGoogleCalendarEvents = async (userId, timeMin = new Date(), timeMax = null) => {
  try {
    console.log(`📅 [Google Calendar] Récupération des événements pour l'utilisateur: ${userId}`);

    const oauth2Client = await getOAuth2Client(userId);
    
    if (!oauth2Client) {
      console.log(`⚠️ [Google Calendar] Impossible d'obtenir le client OAuth2`);
      return [];
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Par défaut, récupérer les événements pour les 12 prochains mois
    if (!timeMax) {
      timeMax = new Date();
      timeMax.setFullYear(timeMax.getFullYear() + 1);
    }

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime'
    });

    const events = response.data.items || [];
    
    console.log(`✅ [Google Calendar] ${events.length} événements récupérés`);

    // Transformer les événements Google au format JurisFlow
    return events.map(event => ({
      id: event.id,
      titre: event.summary || 'Sans titre',
      description: event.description || null,
      dateDebut: event.start.dateTime || event.start.date,
      dateFin: event.end.dateTime || event.end.date,
      source: 'google', // Identifier la source de l'événement
      googleEventId: event.id,
      location: event.location || null,
      htmlLink: event.htmlLink // Lien vers l'événement sur Google Calendar
    }));

  } catch (error) {
    console.error(`❌ [Google Calendar] Erreur lors de la récupération des événements:`, error.message);
    
    // Si le token est invalide, tenter de le rafraîchir
    if (error.code === 401 || error.code === 403) {
      console.log(`🔄 [Google Calendar] Tentative de rafraîchissement du token...`);
      const refreshed = await refreshGoogleToken(userId);
      if (refreshed) {
        // Réessayer une fois après le rafraîchissement
        return getGoogleCalendarEvents(userId, timeMin, timeMax);
      }
    }
    
    return [];
  }
};

/**
 * Créer un événement sur Google Calendar
 * @param {string} userId - ID de l'utilisateur
 * @param {Object} eventData - Données de l'événement
 * @returns {Object} Événement créé
 */
export const createGoogleCalendarEvent = async (userId, eventData) => {
  try {
    console.log(`📅 [Google Calendar] Création d'un événement pour l'utilisateur: ${userId}`);

    const oauth2Client = await getOAuth2Client(userId);
    
    if (!oauth2Client) {
      console.log(`⚠️ [Google Calendar] Impossible d'obtenir le client OAuth2`);
      return null;
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Préparer l'événement au format Google Calendar
    const event = {
      summary: eventData.titre,
      description: eventData.description || '',
      location: eventData.location || '',
      start: {
        dateTime: new Date(eventData.dateDebut).toISOString(),
        timeZone: 'Europe/Paris'
      },
      end: {
        dateTime: new Date(eventData.dateFin).toISOString(),
        timeZone: 'Europe/Paris'
      },
      reminders: {
        useDefault: true
      }
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event
    });

    console.log(`✅ [Google Calendar] Événement créé: ${response.data.id}`);

    return {
      googleEventId: response.data.id,
      htmlLink: response.data.htmlLink
    };

  } catch (error) {
    console.error(`❌ [Google Calendar] Erreur lors de la création de l'événement:`, error.message);
    
    // Si le token est invalide, tenter de le rafraîchir
    if (error.code === 401 || error.code === 403) {
      console.log(`🔄 [Google Calendar] Tentative de rafraîchissement du token...`);
      const refreshed = await refreshGoogleToken(userId);
      if (refreshed) {
        // Réessayer une fois après le rafraîchissement
        return createGoogleCalendarEvent(userId, eventData);
      }
    }
    
    return null;
  }
};

/**
 * Mettre à jour un événement sur Google Calendar
 * @param {string} userId - ID de l'utilisateur
 * @param {string} googleEventId - ID de l'événement Google
 * @param {Object} eventData - Nouvelles données de l'événement
 * @returns {Object} Événement mis à jour
 */
export const updateGoogleCalendarEvent = async (userId, googleEventId, eventData) => {
  try {
    console.log(`📅 [Google Calendar] Mise à jour de l'événement ${googleEventId}`);

    const oauth2Client = await getOAuth2Client(userId);
    
    if (!oauth2Client) {
      return null;
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const event = {
      summary: eventData.titre,
      description: eventData.description || '',
      location: eventData.location || '',
      start: {
        dateTime: new Date(eventData.dateDebut).toISOString(),
        timeZone: 'Europe/Paris'
      },
      end: {
        dateTime: new Date(eventData.dateFin).toISOString(),
        timeZone: 'Europe/Paris'
      }
    };

    const response = await calendar.events.update({
      calendarId: 'primary',
      eventId: googleEventId,
      resource: event
    });

    console.log(`✅ [Google Calendar] Événement mis à jour: ${response.data.id}`);

    return {
      googleEventId: response.data.id,
      htmlLink: response.data.htmlLink
    };

  } catch (error) {
    console.error(`❌ [Google Calendar] Erreur lors de la mise à jour de l'événement:`, error.message);
    return null;
  }
};

/**
 * Supprimer un événement sur Google Calendar
 * @param {string} userId - ID de l'utilisateur
 * @param {string} googleEventId - ID de l'événement Google
 * @returns {boolean} Succès ou échec
 */
export const deleteGoogleCalendarEvent = async (userId, googleEventId) => {
  try {
    console.log(`📅 [Google Calendar] Suppression de l'événement ${googleEventId}`);

    const oauth2Client = await getOAuth2Client(userId);
    
    if (!oauth2Client) {
      return false;
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: googleEventId
    });

    console.log(`✅ [Google Calendar] Événement supprimé: ${googleEventId}`);

    return true;

  } catch (error) {
    console.error(`❌ [Google Calendar] Erreur lors de la suppression de l'événement:`, error.message);
    return false;
  }
};
import { prisma } from '../lib/prisma.js';
import { sendEmail } from './emailService.js';

/**
 * Types de notifications
 */
export const NOTIFICATION_TYPES = {
  AGENDA: 'AGENDA',
  FACTURE: 'FACTURE',
  DOCUMENT: 'DOCUMENT',
  TACHE: 'TACHE',
  ECHEANCE: 'ECHEANCE'
};

/**
 * Crée une notification in-app
 * @param {string} userId - ID de l'utilisateur
 * @param {string} type - Type de notification (AGENDA, FACTURE, DOCUMENT, etc.)
 * @param {string} titre - Titre de la notification
 * @param {string} message - Message de la notification
 * @param {string} referenceId - ID de l'entité référencée (dossierId, factureId, etc.)
 * @param {string} referenceType - Type de référence ('dossier', 'facture', 'document', etc.)
 * @returns {Promise<Object>} Notification créée
 */
export const createNotification = async (userId, type, titre, message, referenceId = null, referenceType = null) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        utilisateurId: userId,
        titre,
        message,
        dateEnvoi: new Date(),
        lu: false,
        // Stocker les métadonnées dans le message ou créer des champs supplémentaires si nécessaire
        // Pour l'instant, on stocke les infos dans le message
      }
    });

    console.log(`✅ Notification créée pour l'utilisateur ${userId}: ${titre}`);
    return notification;
  } catch (error) {
    console.error('❌ Erreur lors de la création de la notification:', error);
    throw error;
  }
};

/**
 * Envoie une notification par email
 * @param {string} userId - ID de l'utilisateur
 * @param {string} subject - Sujet de l'email
 * @param {string} text - Texte de l'email (peut être HTML)
 * @param {boolean} isHtml - Si le texte est en HTML
 * @returns {Promise<Object>} Résultat de l'envoi
 */
export const sendEmailNotification = async (userId, subject, text, isHtml = true) => {
  try {
    // Récupérer l'utilisateur pour obtenir son email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, nom: true, prenom: true, emailVerified: true }
    });

    if (!user) {
      throw new Error(`Utilisateur ${userId} non trouvé`);
    }

    if (!user.emailVerified) {
      console.log(`⚠️ Email non vérifié pour l'utilisateur ${userId}, skip email`);
      return null;
    }

    // Envoyer l'email
    await sendEmail({
      to: user.email,
      subject,
      html: isHtml ? text : null,
      text: isHtml ? null : text
    });

    console.log(`✅ Email de notification envoyé à ${user.email}: ${subject}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email de notification:', error);
    // Ne pas bloquer si l'email échoue
    return null;
  }
};

/**
 * Crée une notification avec email (critique)
 * @param {string} userId - ID de l'utilisateur
 * @param {string} type - Type de notification
 * @param {string} titre - Titre de la notification
 * @param {string} message - Message de la notification
 * @param {string} emailSubject - Sujet de l'email
 * @param {string} emailBody - Corps de l'email (HTML)
 * @param {string} referenceId - ID de l'entité référencée
 * @param {string} referenceType - Type de référence
 * @returns {Promise<Object>} Notification créée
 */
export const createCriticalNotification = async (
  userId,
  type,
  titre,
  message,
  emailSubject,
  emailBody,
  referenceId = null,
  referenceType = null
) => {
  // Créer la notification in-app
  const notification = await createNotification(userId, type, titre, message, referenceId, referenceType);

  // Envoyer l'email (non bloquant)
  try {
    await sendEmailNotification(userId, emailSubject, emailBody);
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email (non bloquant):', error);
  }

  return notification;
};

/**
 * Crée une notification secondaire (cloche uniquement)
 * @param {string} userId - ID de l'utilisateur
 * @param {string} type - Type de notification
 * @param {string} titre - Titre de la notification
 * @param {string} message - Message de la notification
 * @param {string} referenceId - ID de l'entité référencée
 * @param {string} referenceType - Type de référence
 * @returns {Promise<Object>} Notification créée
 */
export const createSecondaryNotification = async (
  userId,
  type,
  titre,
  message,
  referenceId = null,
  referenceType = null
) => {
  return await createNotification(userId, type, titre, message, referenceId, referenceType);
};

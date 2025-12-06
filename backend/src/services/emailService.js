import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configuration du transporteur email
const createTransporter = () => {
  // Configuration pour Gmail (peut être adaptée pour SendGrid, Mailgun, etc.)
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Mot de passe d'application Gmail ou clé API
    },
  });

  return transporter;
};

/**
 * Envoie un email HTML
 * @param {Object} options - Options de l'email
 * @param {string} options.to - Destinataire
 * @param {string} options.subject - Sujet
 * @param {string} options.html - Contenu HTML
 * @param {string} options.text - Contenu texte (optionnel)
 * @returns {Promise} Résultat de l'envoi
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    // Vérifier que les variables d'environnement sont configurées
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('❌ Variables d\'environnement EMAIL_USER et EMAIL_PASS non configurées');
      throw new Error('Configuration email manquante');
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"JurisFlow" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Extraire le texte si pas fourni
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email envoyé:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email:', error);
    throw error;
  }
};

/**
 * Envoie un email de bienvenue après inscription
 * @param {string} email - Email du destinataire
 * @param {string} nom - Nom de l'utilisateur
 * @returns {Promise} Résultat de l'envoi
 */
export const sendWelcomeEmail = async (email, nom) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const loginUrl = `${frontendUrl}/login`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #2563eb;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: #f9fafb;
          padding: 30px;
          border-radius: 0 0 8px 8px;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #2563eb;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
        }
        .footer {
          margin-top: 20px;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Bienvenue sur JurisFlow !</h1>
      </div>
      <div class="content">
        <p>Bonjour ${nom},</p>
        <p>Merci de vous être inscrit sur <strong>JurisFlow</strong>, votre solution de gestion juridique complète.</p>
        <p>Votre compte a été créé avec succès et est maintenant actif. Vous pouvez accéder à votre espace dès maintenant.</p>
        <p style="text-align: center;">
          <a href="${loginUrl}" class="button">Accéder à mon espace</a>
        </p>
        <p>Avec JurisFlow, vous pouvez :</p>
        <ul>
          <li>Gérer vos dossiers juridiques</li>
          <li>Générer des documents avec l'IA</li>
          <li>Suivre vos factures et paiements</li>
          <li>Organiser votre agenda professionnel</li>
        </ul>
        <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
        <p>Bonne journée,<br>L'équipe JurisFlow</p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} JurisFlow. Tous droits réservés.</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Bienvenue sur JurisFlow !',
    html,
  });
};

/**
 * Envoie un email de confirmation d'inscription (pour rétrocompatibilité)
 * @param {string} email - Email du destinataire
 * @param {string} token - Token de confirmation
 * @param {string} nom - Nom de l'utilisateur
 * @returns {Promise} Résultat de l'envoi
 */
export const sendVerificationEmail = async (email, token, nom) => {
  const backendUrl = process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5087';
  const confirmationUrl = `${backendUrl}/api/auth/confirm/${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #2563eb;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: #f9fafb;
          padding: 30px;
          border-radius: 0 0 8px 8px;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #2563eb;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
        }
        .footer {
          margin-top: 20px;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Bienvenue sur JurisFlow</h1>
      </div>
      <div class="content">
        <p>Bonjour ${nom},</p>
        <p>Merci de vous être inscrit sur JurisFlow, votre solution de gestion juridique.</p>
        <p>Pour activer votre compte, veuillez cliquer sur le bouton ci-dessous :</p>
        <p style="text-align: center;">
          <a href="${confirmationUrl}" class="button">Confirmer mon email</a>
        </p>
        <p>Ou copiez ce lien dans votre navigateur :</p>
        <p style="word-break: break-all; color: #2563eb;">${confirmationUrl}</p>
        <p>Ce lien est valide pendant 24 heures.</p>
        <p>Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.</p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} JurisFlow. Tous droits réservés.</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Confirmez votre adresse email - JurisFlow',
    html,
  });
};

/**
 * Envoie un email de rappel d'événement
 * @param {string} email - Email du destinataire
 * @param {Object} evenement - Données de l'événement
 * @returns {Promise} Résultat de l'envoi
 */
export const sendEventReminderEmail = async (email, evenement) => {
  const dateDebut = new Date(evenement.dateDebut).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #2563eb;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: #f9fafb;
          padding: 30px;
          border-radius: 0 0 8px 8px;
        }
        .event-details {
          background-color: white;
          padding: 20px;
          border-radius: 6px;
          margin: 20px 0;
          border-left: 4px solid #2563eb;
        }
        .footer {
          margin-top: 20px;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🔔 Rappel d'événement</h1>
      </div>
      <div class="content">
        <p>Bonjour,</p>
        <p>Vous avez un événement prévu dans <strong>48 heures</strong> :</p>
        <div class="event-details">
          <h2>${evenement.titre}</h2>
          <p><strong>Date :</strong> ${dateDebut}</p>
          ${evenement.description ? `<p><strong>Description :</strong> ${evenement.description}</p>` : ''}
          ${evenement.lieu ? `<p><strong>Lieu :</strong> ${evenement.lieu}</p>` : ''}
        </div>
        <p>N'oubliez pas de vous préparer pour cet événement.</p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} JurisFlow. Tous droits réservés.</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Rappel : ${evenement.titre} - Dans 48 heures`,
    html,
  });
};


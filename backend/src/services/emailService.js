import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configuration du transporteur email
const createTransporter = () => {
  // Configuration pour Gmail avec SMTP explicite (plus fiable)
  const emailService = process.env.EMAIL_SERVICE || 'gmail';
  
  // Si c'est Gmail, utiliser la configuration SMTP explicite
  if (emailService === 'gmail' || !emailService) {
    // Nettoyer les valeurs pour éviter les espaces invisibles
    const emailUser = (process.env.EMAIL_USER || '').trim();
    const emailPass = (process.env.EMAIL_PASS || '').trim();
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true pour 465, false pour les autres ports
      auth: {
        user: emailUser,
        pass: emailPass, // Mot de passe d'application Gmail
      },
      tls: {
        rejectUnauthorized: false // Pour éviter les problèmes de certificat en développement
      }
    });

    return transporter;
  }

  // Pour les autres services (SendGrid, Mailgun, etc.)
  const emailUser = (process.env.EMAIL_USER || '').trim();
  const emailPass = (process.env.EMAIL_PASS || '').trim();

  const transporter = nodemailer.createTransport({
    service: emailService,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
    tls: { rejectUnauthorized: false },
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
    const emailUser = process.env.EMAIL_USER?.trim();
    const emailPass = process.env.EMAIL_PASS?.trim();
    
    if (!emailUser || !emailPass) {
      console.error('❌ Variables d\'environnement EMAIL_USER et EMAIL_PASS non configurées');
      console.error(`   EMAIL_USER: ${emailUser ? 'défini (' + emailUser.length + ' caractères)' : 'UNDEFINED'}`);
      console.error(`   EMAIL_PASS: ${emailPass ? 'défini (' + emailPass.length + ' caractères)' : 'UNDEFINED'}`);
      throw new Error('Configuration email manquante');
    }

    // Log de débogage (sans afficher le mot de passe complet)
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 Envoi d\'email - Configuration:', {
        user: emailUser.substring(0, 10) + '...',
        passLength: emailPass.length,
        service: process.env.EMAIL_SERVICE || 'gmail'
      });
    }

    const transporter = createTransporter();

    // Utiliser les valeurs nettoyées (déjà déclarées plus haut)
    const mailOptions = {
      from: `"JurisFlow" <${emailUser}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Extraire le texte si pas fourni
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email envoyé:', info.messageId);
    return info;
  } catch (error) {
    // En développement, logger l'erreur de manière moins intrusive
    if (process.env.NODE_ENV === 'development') {
      if (error.code === 'EAUTH') {
        console.warn('⚠️  Erreur d\'authentification email (non bloquante):', error.message?.split('\n')[0] || error.message);
        console.warn('💡 Les emails ne seront pas envoyés. Utilisez le script resetPassword.js pour réinitialiser les mots de passe.');
      } else {
        console.error('❌ Erreur lors de l\'envoi de l\'email:', error.message || error);
      }
    } else {
      // En production, logger l'erreur complète
      console.error('❌ Erreur lors de l\'envoi de l\'email:', error.message || error);
    }
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
  // Utiliser le même port que pour le reset (5174)
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
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

/**
 * Envoie un email de réinitialisation de mot de passe
 * Même logique que sendWelcomeEmail : URL construite ici avec process.env.FRONTEND_URL
 * @param {string} email - Email du destinataire
 * @param {string} token - Token de réinitialisation
 * @param {string} nom - Nom de l'utilisateur
 * @returns {Promise} Résultat de l'envoi
 */
export const sendPasswordResetEmail = async (email, token, nom) => {
  // Même base que sendWelcomeEmail (register) : FRONTEND_URL ou localhost:5174
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5174').replace(/\/$/, '');
  const resetUrl = `${frontendUrl}/reset-password/${token}`;

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
        .warning {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
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
        <h1>🔐 Réinitialisation de mot de passe</h1>
      </div>
      <div class="content">
        <p>Bonjour ${nom},</p>
        <p>Vous avez demandé à réinitialiser votre mot de passe pour votre compte JurisFlow.</p>
        <p style="text-align: center;">
          <a href="${resetUrl}" class="button">Réinitialiser mon mot de passe</a>
        </p>
        <p>Ou copiez ce lien dans votre navigateur :</p>
        <p style="word-break: break-all; color: #2563eb; background-color: #e0e7ff; padding: 10px; border-radius: 4px;">${resetUrl}</p>
        <div class="warning">
          <p><strong>⚠️ Important :</strong></p>
          <ul>
            <li>Ce lien est valide pendant <strong>1 heure</strong> uniquement</li>
            <li>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email</li>
            <li>Votre mot de passe actuel restera valide si vous n'utilisez pas ce lien</li>
          </ul>
        </div>
        <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
        <p>Bonne journée,<br>L'équipe JurisFlow</p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} JurisFlow. Tous droits réservés.</p>
        <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Réinitialisation de votre mot de passe - JurisFlow',
    html,
  });
};

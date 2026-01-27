import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';

// Générer un token JWT
const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  );
};

// Générer un refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};

// Helper pour convertir User Prisma en format public
const userToPublicJSON = (user) => {
  return {
    id: user.id,
    nom: user.nom,
    prenom: user.prenom,
    email: user.email,
    role: user.role,
    planType: user.planType || 'PREMIUM',
    cabinet: {
      nom: user.cabinetNom,
      logoUrl: user.cabinetLogoUrl,
      adresse: user.cabinetAdresse,
      siret: user.cabinetSiret,
      telephone: user.cabinetTelephoneContact
    },
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    lastLogin: user.lastLogin,
    preferences: {
      themePreference: user.themePreference || 'clair',
      enableAnimations: user.enableAnimations !== null ? user.enableAnimations : true
    },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
};

/**
 * Rafraîchir le token Google d'un utilisateur
 * Utilise le refresh token pour obtenir un nouveau access token
 */
export const refreshGoogleToken = async (userId) => {
  try {
    console.log(`🔄 [Google OAuth] Rafraîchissement du token pour l'utilisateur: ${userId}`);

    // Récupérer l'utilisateur avec son refresh token
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        googleRefreshToken: true,
        googleTokenExpiry: true,
        email: true
      }
    });

    if (!user || !user.googleRefreshToken) {
      console.log(`⚠️ [Google OAuth] Pas de refresh token pour l'utilisateur: ${userId}`);
      return null;
    }

    // Vérifier si le token est encore valide (avec marge de 5 minutes)
    if (user.googleTokenExpiry && new Date(user.googleTokenExpiry) > new Date(Date.now() + 5 * 60 * 1000)) {
      console.log(`✅ [Google OAuth] Token encore valide pour ${user.email} (expire dans ${Math.round((new Date(user.googleTokenExpiry) - new Date()) / 60000)} min)`);
      return user; // Token encore valide
    }

    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = process.env;

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('❌ [Google OAuth] Configuration manquante pour le refresh');
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

    // Définir le refresh token
    oauth2Client.setCredentials({
      refresh_token: user.googleRefreshToken
    });

    // Obtenir un nouveau access token
    const { credentials } = await oauth2Client.refreshAccessToken();

    // Mettre à jour les tokens en base
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: credentials.access_token,
        googleTokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null
      }
    });

    console.log(`✅ [Google OAuth] Token rafraîchi avec succès pour ${user.email}`);
    console.log(`   - Nouveau token expire le: ${credentials.expiry_date ? new Date(credentials.expiry_date).toLocaleString('fr-FR') : 'inconnu'}`);

    return updatedUser;

  } catch (error) {
    console.error(`❌ [Google OAuth] Erreur lors du rafraîchissement du token:`, error.message);
    return null;
  }
};

/**
 * @desc    Initier l'authentification Google OAuth
 * @route   GET /api/auth/google
 * @access  Public
 */
export const initiateGoogleAuth = async (req, res) => {
  try {
    // Nettoyer les valeurs pour enlever les guillemets éventuels
    let GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID?.replace(/^["']|["']$/g, '') || process.env.GOOGLE_CLIENT_ID;
    let GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET?.replace(/^["']|["']$/g, '') || process.env.GOOGLE_CLIENT_SECRET;
    let GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL?.replace(/^["']|["']$/g, '') || process.env.GOOGLE_CALLBACK_URL;

    // Log de debug pour vérifier la présence des variables (sans afficher le secret complet)
    console.log('🔍 [Google OAuth] Vérification des variables d\'environnement:');
    console.log(`   - GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID ? `✅ Présent (${GOOGLE_CLIENT_ID.substring(0, 20)}...)` : '❌ MANQUANT'}`);
    console.log(`   - GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET ? `✅ Présent (${GOOGLE_CLIENT_SECRET.substring(0, 10)}...)` : '❌ MANQUANT'}`);
    console.log(`   - GOOGLE_CALLBACK_URL: ${GOOGLE_CALLBACK_URL || '❌ MANQUANT'}`);
    console.log(`   - NODE_ENV: ${process.env.NODE_ENV || 'non défini'}`);

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
      console.error('❌ [Google OAuth] Configuration incomplète:');
      console.error(`   - GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID ? '✅' : '❌'}`);
      console.error(`   - GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET ? '✅' : '❌'}`);
      console.error(`   - GOOGLE_CALLBACK_URL: ${GOOGLE_CALLBACK_URL ? '✅' : '❌'}`);
      
      return res.status(500).json({
        success: false,
        message: 'Configuration Google OAuth incomplète. Veuillez contacter l\'administrateur.',
        debug: process.env.NODE_ENV === 'development' ? {
          hasClientId: !!GOOGLE_CLIENT_ID,
          hasClientSecret: !!GOOGLE_CLIENT_SECRET,
          hasCallbackUrl: !!GOOGLE_CALLBACK_URL,
          nodeEnv: process.env.NODE_ENV
        } : undefined
      });
    }

    const oauth2Client = new OAuth2Client(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_CALLBACK_URL
    );

    console.log('✅ [Google OAuth] Client OAuth2 créé avec succès');

    // Scopes nécessaires pour accéder au calendrier Google
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/calendar.readonly' // Accès en lecture seule au calendrier
    ];

    // Générer l'URL d'autorisation
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Pour obtenir un refresh token
      scope: scopes,
      prompt: 'consent' // Forcer le consentement pour obtenir le refresh token
    });

    console.log('✅ [Google OAuth] URL d\'autorisation générée avec succès');
    console.log(`   - Callback URL: ${GOOGLE_CALLBACK_URL}`);

    res.json({
      success: true,
      authUrl
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'initiation Google OAuth:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'initialisation de l\'authentification Google'
    });
  }
};

/**
 * @desc    Callback Google OAuth - Traiter la réponse de Google
 * @route   GET /api/auth/callback/google
 * @access  Public
 */
export const googleCallback = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5174'}/login?error=no_code`);
    }

    // Nettoyer les valeurs pour enlever les guillemets éventuels
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID?.replace(/^["']|["']$/g, '') || process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET?.replace(/^["']|["']$/g, '') || process.env.GOOGLE_CLIENT_SECRET;
    const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL?.replace(/^["']|["']$/g, '') || process.env.GOOGLE_CALLBACK_URL;
    // Nettoyer FRONTEND_URL aussi pour enlever les guillemets éventuels
    const FRONTEND_URL = process.env.FRONTEND_URL?.replace(/^["']|["']$/g, '') || process.env.FRONTEND_URL || 'http://localhost:5174';

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
      console.error('❌ Configuration Google OAuth manquante');
      return res.redirect(`${FRONTEND_URL}/login?error=config_error`);
    }

    // Nettoyer les valeurs pour enlever les guillemets éventuels
    const cleanClientId = GOOGLE_CLIENT_ID?.replace(/^["']|["']$/g, '') || GOOGLE_CLIENT_ID;
    const cleanClientSecret = GOOGLE_CLIENT_SECRET?.replace(/^["']|["']$/g, '') || GOOGLE_CLIENT_SECRET;
    const cleanCallbackUrl = GOOGLE_CALLBACK_URL?.replace(/^["']|["']$/g, '') || GOOGLE_CALLBACK_URL;

    const oauth2Client = new OAuth2Client(
      cleanClientId,
      cleanClientSecret,
      cleanCallbackUrl
    );

    // Échanger le code d'autorisation contre des tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Récupérer les informations de l'utilisateur Google
    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, given_name, family_name, picture } = payload;

    if (!email) {
      return res.redirect(`${FRONTEND_URL}/login?error=no_email`);
    }

    // Chercher ou créer l'utilisateur
    let user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (user) {
      // Utilisateur existant : mettre à jour les tokens Google
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleAccessToken: tokens.access_token,
          googleRefreshToken: tokens.refresh_token,
          googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          lastLogin: new Date()
        }
      });
    } else {
      // Nouvel utilisateur : créer le compte
      // ⚠️ Pour un SaaS juridique, on pourrait vouloir restreindre l'inscription
      // Par défaut PREMIUM pour cohérence avec les autres utilisateurs
      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          prenom: given_name || 'Utilisateur',
          nom: family_name || 'Google',
          password: crypto.randomBytes(32).toString('hex'), // Mot de passe aléatoire (non utilisable)
          role: 'COLLABORATEUR',
          planType: 'PREMIUM', // Par défaut PREMIUM pour accès complet
          emailVerified: true, // Email vérifié via Google
          isActive: true,
          googleAccessToken: tokens.access_token,
          googleRefreshToken: tokens.refresh_token,
          googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null
        }
      });
    }

    // Générer les tokens JWT de l'application
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Sauvegarder le refresh token
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken }
    });

    console.log(`✅ Connexion Google réussie: ${email}`);
    console.log(`🔗 FRONTEND_URL utilisé pour redirection: ${FRONTEND_URL}`);

    // Rediriger vers le frontend avec les tokens dans l'URL (ou via cookie en production)
    // ⚠️ En production, préférer utiliser des cookies httpOnly pour plus de sécurité
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5174'}/auth/google/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`;
    
    console.log("REDIRECTION VERS:", redirectUrl);
    res.redirect(redirectUrl);

  } catch (error) {
    console.error('❌ Erreur lors du callback Google OAuth:', error);
    const frontendUrl = process.env.FRONTEND_URL?.replace(/^["']|["']$/g, '') || process.env.FRONTEND_URL || 'http://localhost:5174';
    console.log(`🔗 FRONTEND_URL utilisé pour redirection d'erreur: ${frontendUrl}`);
    res.redirect(`${frontendUrl}/login?error=oauth_failed&message=${encodeURIComponent(error.message)}`);
  }
};

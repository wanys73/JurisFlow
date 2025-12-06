import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { sendWelcomeEmail, sendVerificationEmail } from '../services/emailService.js';

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

// @desc    Inscription d'un nouvel utilisateur
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { nom, prenom, email, password, role, cabinet } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const userExists = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Un utilisateur avec cet email existe déjà'
      });
    }

    // Validation du rôle admin (seul le nom du cabinet est requis)
    if (role === 'admin' && (!cabinet || !cabinet.nom || !cabinet.nom.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Le nom du cabinet est requis pour un compte administrateur'
      });
    }

    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Préparer les données
    const userData = {
      nom,
      prenom,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role === 'admin' ? 'ADMIN' : 'COLLABORATEUR'
    };

    // Ajouter les infos cabinet si admin
    if (role === 'admin' && cabinet) {
      userData.cabinetNom = cabinet.nom;
      userData.cabinetAdresse = cabinet.adresse || null;
      userData.cabinetSiret = cabinet.siret || null;
      userData.cabinetTelephoneContact = cabinet.telephone || null;
    }

    // Activer le compte immédiatement (pas de validation email)
    userData.emailVerified = true;
    userData.verificationToken = null; // Pas de token de vérification nécessaire

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: userData
    });

    // Générer les tokens JWT pour connexion immédiate
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Mettre à jour le refresh token dans la base
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken }
    });

    // Envoyer l'email de bienvenue (non bloquant)
    try {
      await sendWelcomeEmail(user.email, `${user.prenom} ${user.nom}`);
      console.log('✅ Email de bienvenue envoyé à:', user.email);
    } catch (emailError) {
      console.error('❌ Erreur lors de l\'envoi de l\'email de bienvenue:', emailError);
      // Ne pas bloquer l'inscription si l'email échoue
    }

    // Réponse avec tokens pour connexion immédiate
    res.status(201).json({
      success: true,
      message: 'Inscription réussie. Bienvenue sur JurisFlow !',
      data: {
        user: userToPublicJSON(user),
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    console.error('Type d\'erreur:', error.constructor.name);
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('Données:', { nom: req.body.nom, prenom: req.body.prenom, email: req.body.email, role: req.body.role });
    
    // Gestion des erreurs Prisma
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Un utilisateur avec cet email existe déjà',
        errors: []
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du compte',
      error: error.message,
      errors: []
    });
  }
};

// @desc    Connexion utilisateur
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation des données
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email et mot de passe requis'
      });
    }

    // Trouver l'utilisateur actif avec le mot de passe
    const user = await prisma.user.findUnique({
      where: { 
        email: email.toLowerCase(),
        isActive: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier que l'email est vérifié (RÉTROCOMPATIBILITÉ : autoriser null/undefined pour anciens comptes)
    if (user.emailVerified === false) {
      return res.status(403).json({
        success: false,
        message: 'Votre compte n\'est pas encore activé. Veuillez vérifier votre email pour activer votre compte.'
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Générer les tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Mettre à jour le refresh token et la date de dernière connexion
    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken,
        lastLogin: new Date()
      }
    });

    // Réponse avec les tokens
    res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: userToPublicJSON(user),
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion'
    });
  }
};

// @desc    Rafraîchir le token d'accès
// @route   POST /api/auth/refresh
// @access  Public
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token requis'
      });
    }

    // Vérifier le refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Trouver l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || user.refreshToken !== refreshToken || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token invalide'
      });
    }

    // Générer un nouveau access token
    const newAccessToken = generateAccessToken(user.id);

    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken
      }
    });

  } catch (error) {
    console.error('Erreur lors du rafraîchissement du token:', error);
    res.status(401).json({
      success: false,
      message: 'Refresh token invalide ou expiré'
    });
  }
};

// @desc    Déconnexion utilisateur
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { refreshToken: null }
    });

    res.status(200).json({
      success: true,
      message: 'Déconnexion réussie'
    });

  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la déconnexion'
    });
  }
};

// @desc    Récupérer le profil de l'utilisateur connecté
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: userToPublicJSON(user)
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil'
    });
  }
};

// @desc    Confirmer l'email et activer le compte
// @route   GET /api/auth/confirm/:token
// @access  Public
export const confirmEmail = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token de confirmation requis'
      });
    }

    // Trouver l'utilisateur avec ce token de vérification
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Token de confirmation invalide ou expiré'
      });
    }

    // Vérifier si le compte est déjà vérifié
    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Ce compte est déjà activé'
      });
    }

    // Activer le compte
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null // Supprimer le token après utilisation
      }
    });

    console.log('✅ Compte activé pour:', user.email);

    // Rediriger vers le frontend si la requête vient d'un navigateur
    const userAgent = req.headers['user-agent'] || '';
    const isBrowser = userAgent.includes('Mozilla') || userAgent.includes('Safari') || userAgent.includes('Chrome');
    
    if (isBrowser) {
      // Rediriger vers le frontend avec un message de succès
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/login?confirmed=true`);
    }

    // Sinon, retourner du JSON (pour les appels API)
    res.status(200).json({
      success: true,
      message: 'Votre compte a été activé avec succès. Vous pouvez maintenant vous connecter.'
    });
  } catch (error) {
    console.error('Erreur lors de la confirmation de l\'email:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'activation du compte'
    });
  }
};

// @desc    Renvoyer l'email de confirmation
// @route   POST /api/auth/resend-confirmation
// @access  Public
export const resendConfirmationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email requis'
      });
    }

    // Trouver l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      // Ne pas révéler si l'email existe ou non (sécurité)
      return res.status(200).json({
        success: true,
        message: 'Si cet email existe et n\'est pas encore vérifié, un email de confirmation a été envoyé.'
      });
    }

    // Si le compte est déjà vérifié
    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Ce compte est déjà activé'
      });
    }

    // Générer un nouveau token de vérification
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    await prisma.user.update({
      where: { id: user.id },
      data: { verificationToken }
    });

    // Envoyer l'email de confirmation
    try {
      await sendVerificationEmail(user.email, verificationToken, `${user.prenom} ${user.nom}`);
      console.log('✅ Email de confirmation renvoyé à:', user.email);
      
      res.status(200).json({
        success: true,
        message: 'Email de confirmation envoyé. Vérifiez votre boîte mail (et les spams).'
      });
    } catch (emailError) {
      console.error('❌ Erreur lors de l\'envoi de l\'email de confirmation:', emailError);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'envoi de l\'email. Vérifiez la configuration email du serveur.'
      });
    }
  } catch (error) {
    console.error('Erreur lors du renvoi de l\'email de confirmation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du renvoi de l\'email de confirmation'
    });
  }
};

// @desc    Activer manuellement un compte (pour développement/test si email ne fonctionne pas)
// @route   POST /api/auth/activate-account
// @access  Public (À protéger en production !)
export const activateAccountManually = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email requis'
      });
    }

    // Trouver l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Activer le compte
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null
      }
    });

    console.log('✅ Compte activé manuellement pour:', user.email);

    res.status(200).json({
      success: true,
      message: 'Compte activé avec succès. Vous pouvez maintenant vous connecter.'
    });
  } catch (error) {
    console.error('Erreur lors de l\'activation manuelle:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'activation du compte'
    });
  }
};

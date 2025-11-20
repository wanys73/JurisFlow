import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
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
    cabinet: {
      nom: user.cabinetNom,
      logo: user.cabinetLogo,
      adresse: user.cabinetAdresse,
      telephone: user.cabinetTelephone,
      siren: user.cabinetSiren
    },
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    lastLogin: user.lastLogin,
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

    // Validation du rôle admin (doit avoir des infos cabinet)
    if (role === 'admin' && (!cabinet || !cabinet.nom)) {
      return res.status(400).json({
        success: false,
        message: 'Les informations du cabinet sont requises pour un compte administrateur'
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
      userData.cabinetLogo = cabinet.logo || null;
      userData.cabinetAdresse = cabinet.adresse || null;
      userData.cabinetTelephone = cabinet.telephone || null;
      userData.cabinetSiren = cabinet.siren || null;
    }

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: userData
    });

    // Générer les tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Sauvegarder le refresh token
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken }
    });

    // Réponse avec les tokens
    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
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
    
    // Gestion des erreurs Prisma
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Un utilisateur avec cet email existe déjà'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du compte'
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

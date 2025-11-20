import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

// Middleware pour protéger les routes
export const protect = async (req, res, next) => {
  try {
    let token;

    // Vérifier si le token est présent dans les headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Vérifier si le token existe
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Accès non autorisé. Token manquant.'
      });
    }

    try {
      // Vérifier et décoder le token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Vérifier que l'utilisateur existe et est actif
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Accès non autorisé. Utilisateur non trouvé ou inactif.'
        });
      }

      // Ajouter l'utilisateur à la requête
      req.user = {
        userId: decoded.userId,
        role: user.role,
        email: user.email
      };

      next();

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expiré. Veuillez vous reconnecter.'
        });
      }
      
      return res.status(401).json({
        success: false,
        message: 'Token invalide.'
      });
    }

  } catch (error) {
    console.error('Erreur dans le middleware d\'authentification:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'authentification'
    });
  }
};

// Middleware pour restreindre l'accès aux admins
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Accès interdit. Permissions insuffisantes.'
      });
    }
    next();
  };
};

// Middleware pour vérifier si l'utilisateur est admin
export const isAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Accès réservé aux administrateurs'
    });
  }
  next();
};

// Middleware pour vérifier si l'utilisateur accède à ses propres données
export const isOwnerOrAdmin = (paramName = 'userId') => {
  return (req, res, next) => {
    const resourceUserId = req.params[paramName];
    
    if (req.user.role === 'ADMIN' || req.user.userId === resourceUserId) {
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: 'Accès interdit. Vous ne pouvez accéder qu\'à vos propres données.'
      });
    }
  };
};


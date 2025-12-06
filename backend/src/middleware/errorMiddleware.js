// Middleware pour gérer les erreurs 404
export const notFound = (req, res, next) => {
  const error = new Error(`Non trouvé - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Middleware pour gérer toutes les erreurs
export const errorHandler = (err, req, res, next) => {
  // Si la réponse a déjà été envoyée, ne rien faire
  if (res.headersSent) {
    return next(err);
  }
  
  // Statut de l'erreur (si déjà défini, sinon 500)
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  // Si l'erreur a déjà été formatée (avec details), la renvoyer telle quelle
  if (err.details || err.error) {
    return res.status(statusCode).json({
      success: false,
      message: err.message || 'Erreur serveur',
      error: err.error || err.message,
      details: err.details
    });
  }
  
  // Sinon, formater l'erreur standard
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Erreur serveur',
    error: err.message,
    details: {
      code: err.code,
      name: err.name,
      message: err.message
    },
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

// Middleware pour les erreurs Prisma (cast/invalid ID)
export const handleCastError = (err, req, res, next) => {
  // Erreur Prisma pour ID invalide
  if (err.code === 'P2023' || err.code === 'P2025') {
    const message = `Ressource non trouvée avec l'ID fourni`;
    return res.status(404).json({
      success: false,
      message
    });
  }
  next(err);
};

// Middleware pour les erreurs de duplication Prisma
export const handleDuplicateKeyError = (err, req, res, next) => {
  // Erreur Prisma pour contrainte unique violée
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'champ';
    const message = `${field} existe déjà. Veuillez utiliser une autre valeur.`;
    return res.status(400).json({
      success: false,
      message
    });
  }
  next(err);
};

// Middleware pour les erreurs de validation Prisma
export const handleValidationError = (err, req, res, next) => {
  // Erreurs Prisma de validation
  if (err.code === 'P2003' || err.code === 'P2011') {
    const message = err.meta?.message || 'Erreur de validation des données';
    return res.status(400).json({
      success: false,
      message,
      errors: [message]
    });
  }
  next(err);
};


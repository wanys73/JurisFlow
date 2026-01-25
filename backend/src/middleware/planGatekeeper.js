/**
 * Middleware pour restreindre l'accès aux fonctionnalités IA selon le plan
 * Segmentation Business : BASIC (gratuit) vs PREMIUM (payant)
 */

export const requirePremium = async (req, res, next) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Non authentifié'
    });
  }

  // Charger les informations du plan depuis la base si pas dans le token
  // Note: req.user vient du JWT et peut ne pas contenir planType
  // On doit vérifier en base pour être sûr
  
  try {
    const { prisma } = await import('../lib/prisma.js');
    const userWithPlan = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { planType: true }
    });

    if (!userWithPlan) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    if (userWithPlan.planType !== 'PREMIUM') {
      return res.status(403).json({
        success: false,
        message: '⭐ Cette fonctionnalité est réservée aux utilisateurs PREMIUM',
        requiresPremium: true,
        currentPlan: userWithPlan.planType,
        upgradeUrl: '/upgrade' // À adapter selon votre flow d'upgrade
      });
    }

    // L'utilisateur est PREMIUM, on continue
    next();
  } catch (error) {
    console.error('❌ Erreur vérification plan:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la vérification du plan'
    });
  }
};

/**
 * Middleware optionnel pour logger les tentatives d'accès aux features premium
 * Utile pour l'analytics et identifier la demande
 */
export const trackPremiumAttempt = async (req, res, next) => {
  const user = req.user;
  
  if (user) {
    try {
      const { prisma } = await import('../lib/prisma.js');
      const userWithPlan = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { planType: true, email: true }
      });

      if (userWithPlan && userWithPlan.planType === 'BASIC') {
        console.log(`⚠️ Tentative d'accès PREMIUM par utilisateur BASIC: ${userWithPlan.email}`);
        // TODO: Ajouter analytics (Mixpanel, Amplitude, etc.) pour tracker la demande
        // analytics.track('Premium Feature Attempted', { userId: user.userId, path: req.path });
      }
    } catch (error) {
      console.error('❌ Erreur tracking premium attempt:', error);
    }
  }

  next();
};

/**
 * Middleware pour vérifier les limites d'usage selon le plan
 * Ex: BASIC limité à X dossiers, PREMIUM illimité
 */
export const checkUsageLimits = (resource, basicLimit) => {
  return async (req, res, next) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié'
      });
    }

    try {
      const { prisma } = await import('../lib/prisma.js');
      const userWithPlan = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { planType: true }
      });

      // PREMIUM = illimité, on passe
      if (userWithPlan.planType === 'PREMIUM') {
        return next();
      }

      // BASIC = vérifier la limite
      let count = 0;
      switch (resource) {
        case 'dossiers':
          count = await prisma.dossier.count({ where: { cabinetId: user.userId } });
          break;
        case 'clients':
          count = await prisma.client.count({ where: { cabinetId: user.userId } });
          break;
        case 'factures':
          count = await prisma.facture.count({ where: { cabinetId: user.userId } });
          break;
        default:
          return next(); // Pas de limite pour ce resource
      }

      if (count >= basicLimit) {
        return res.status(403).json({
          success: false,
          message: `⭐ Limite atteinte pour le plan BASIC (${basicLimit} ${resource} max). Passez à PREMIUM pour un usage illimité.`,
          requiresPremium: true,
          currentPlan: 'BASIC',
          currentCount: count,
          limit: basicLimit
        });
      }

      next();
    } catch (error) {
      console.error('❌ Erreur vérification limites d\'usage:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  };
};

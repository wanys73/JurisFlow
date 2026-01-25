import { api } from './api';

/**
 * Service pour gérer les plans utilisateur (BASIC vs PREMIUM)
 * Segmentation Business pour les fonctionnalités IA
 */

// Vérifier si l'utilisateur a un plan PREMIUM
export const isPremiumUser = (user) => {
  return user?.planType === 'PREMIUM';
};

// Upgrader vers PREMIUM (placeholder pour future intégration Stripe)
export const upgradeToPremium = async () => {
  try {
    const response = await api.post('/user/upgrade-premium');
    return response.data;
  } catch (error) {
    console.error('❌ Erreur upgrade premium:', error);
    throw error;
  }
};

// Vérifier l'accès aux features premium
export const checkPremiumAccess = (user, featureName = 'Studio IA') => {
  if (!isPremiumUser(user)) {
    return {
      hasAccess: false,
      message: `⭐ ${featureName} est une fonctionnalité PREMIUM. Passez à l'offre PRO pour y accéder.`,
      currentPlan: user?.planType || 'BASIC'
    };
  }
  return { hasAccess: true };
};

// Obtenir les limites selon le plan
export const getPlanLimits = (planType) => {
  const limits = {
    BASIC: {
      dossiers: 10,
      clients: 20,
      factures: 30,
      studioIA: false,
      generationDocuments: false,
      support: 'Email uniquement'
    },
    PREMIUM: {
      dossiers: Infinity,
      clients: Infinity,
      factures: Infinity,
      studioIA: true,
      generationDocuments: true,
      support: 'Email + Chat prioritaire'
    }
  };

  return limits[planType] || limits.BASIC;
};

// Formater le nom du plan pour l'affichage
export const formatPlanName = (planType) => {
  const names = {
    BASIC: 'Basique',
    PREMIUM: 'Premium ⭐'
  };
  return names[planType] || planType;
};

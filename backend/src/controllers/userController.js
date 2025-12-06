import { prisma } from '../lib/prisma.js';

// @desc    Récupérer les préférences utilisateur
// @route   GET /api/users/preferences
// @access  Private
export const getPreferences = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        themePreference: true,
        enableAnimations: true
      }
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
        themePreference: user.themePreference || 'clair',
        enableAnimations: user.enableAnimations !== null ? user.enableAnimations : true
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des préférences:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des préférences'
    });
  }
};

// @desc    Mettre à jour les préférences utilisateur
// @route   PUT /api/users/preferences
// @access  Private
export const updatePreferences = async (req, res) => {
  try {
    const { themePreference, enableAnimations } = req.body;

    // Validation
    if (themePreference && !['clair', 'sombre', 'systeme'].includes(themePreference)) {
      return res.status(400).json({
        success: false,
        message: 'Valeur de thème invalide. Valeurs acceptées: clair, sombre, systeme'
      });
    }

    if (enableAnimations !== undefined && typeof enableAnimations !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'enableAnimations doit être un booléen'
      });
    }

    // Construire l'objet de mise à jour
    const updateData = {};
    if (themePreference !== undefined) {
      updateData.themePreference = themePreference;
    }
    if (enableAnimations !== undefined) {
      updateData.enableAnimations = enableAnimations;
    }

    // Mettre à jour l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: updateData,
      select: {
        themePreference: true,
        enableAnimations: true
      }
    });

    res.status(200).json({
      success: true,
      message: 'Préférences mises à jour avec succès',
      data: {
        themePreference: updatedUser.themePreference || 'clair',
        enableAnimations: updatedUser.enableAnimations !== null ? updatedUser.enableAnimations : true
      }
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des préférences:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour des préférences'
    });
  }
};


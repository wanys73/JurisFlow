import { prisma } from '../lib/prisma.js';

// Helper pour obtenir le cabinetId
const getCabinetId = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  return user.role === 'ADMIN' ? user.id : user.id;
};

// Helper pour convertir le type d'événement
const convertTypeEvenement = (type) => {
  if (!type) return 'TACHE';
  const typeMap = {
    'Audience': 'AUDIENCE',
    'Rendez-vous': 'RENDEZ_VOUS',
    'Rendez vous': 'RENDEZ_VOUS',
    'Échéance': 'ECHEANCE',
    'Echeance': 'ECHEANCE',
    'Tâche': 'TACHE',
    'Tache': 'TACHE'
  };
  return typeMap[type] || type.toUpperCase().replace(/-/g, '_').replace(/É/g, 'E').replace(/Â/g, 'A');
};

// Helper pour formater le type d'événement de l'API
const formatTypeEvenementFromAPI = (type) => {
  const formatMap = {
    'AUDIENCE': 'Audience',
    'RENDEZ_VOUS': 'Rendez-vous',
    'ECHEANCE': 'Échéance',
    'TACHE': 'Tâche'
  };
  return formatMap[type] || type;
};

// Helper pour convertir Evenement en format public
const evenementToPublicJSON = (evenement) => {
  return {
    id: evenement.id,
    titre: evenement.titre,
    description: evenement.description,
    dateDebut: evenement.dateDebut?.toISOString(),
    dateFin: evenement.dateFin?.toISOString(),
    typeEvenement: formatTypeEvenementFromAPI(evenement.typeEvenement),
    dossier: evenement.dossier ? {
      id: evenement.dossier.id,
      nom: evenement.dossier.nom
    } : null,
    dossierId: evenement.dossierId,
    utilisateur: evenement.utilisateur ? {
      id: evenement.utilisateur.id,
      nom: evenement.utilisateur.nom,
      prenom: evenement.utilisateur.prenom
    } : null,
    isArchived: evenement.isArchived,
    createdAt: evenement.createdAt?.toISOString(),
    updatedAt: evenement.updatedAt?.toISOString()
  };
};

// @desc    Créer un événement
// @route   POST /api/agenda
// @access  Private
export const createEvenement = async (req, res) => {
  try {
    const {
      titre,
      description,
      dateDebut,
      dateFin,
      typeEvenement,
      dossierId
    } = req.body;

    // Validation
    if (!titre || !dateDebut || !dateFin) {
      return res.status(400).json({
        success: false,
        message: 'Le titre, la date de début et la date de fin sont requis'
      });
    }

    const cabinetId = await getCabinetId(req.user.userId);

    // Vérifier que la date de fin est après la date de début
    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);
    if (fin < debut) {
      return res.status(400).json({
        success: false,
        message: 'La date de fin doit être après la date de début'
      });
    }

    // Vérifier que le dossier existe si fourni
    if (dossierId) {
      const dossier = await prisma.dossier.findFirst({
        where: {
          id: dossierId,
          cabinetId
        }
      });
      if (!dossier) {
        return res.status(400).json({
          success: false,
          message: 'Le dossier spécifié n\'existe pas ou n\'appartient pas à votre cabinet'
        });
      }
    }

    // Créer l'événement
    const evenement = await prisma.evenement.create({
      data: {
        titre,
        description: description || null,
        dateDebut: new Date(dateDebut),
        dateFin: new Date(dateFin),
        typeEvenement: convertTypeEvenement(typeEvenement),
        dossierId: dossierId || null,
        utilisateurId: req.user.userId,
        cabinetId
      },
      include: {
        dossier: {
          select: {
            id: true,
            nom: true
          }
        },
        utilisateur: {
          select: {
            id: true,
            nom: true,
            prenom: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: {
        evenement: evenementToPublicJSON(evenement)
      }
    });

  } catch (error) {
    console.error('Erreur lors de la création de l\'événement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'événement',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Récupérer les événements (avec filtrage par plage de dates)
// @route   GET /api/agenda
// @access  Private
export const getEvenements = async (req, res) => {
  try {
    const cabinetId = await getCabinetId(req.user.userId);

    // Récupérer les paramètres de filtrage
    const { start, end } = req.query;

    // Construire le filtre de base
    const where = {
      cabinetId,
      isArchived: false
    };

    // Ajouter le filtrage par plage de dates si fourni
    if (start || end) {
      where.dateDebut = {};
      if (start) {
        where.dateDebut.gte = new Date(start);
      }
      if (end) {
        where.dateDebut.lte = new Date(end);
      }
    }

    const evenements = await prisma.evenement.findMany({
      where,
      include: {
        dossier: {
          select: {
            id: true,
            nom: true
          }
        },
        utilisateur: {
          select: {
            id: true,
            nom: true,
            prenom: true
          }
        }
      },
      orderBy: {
        dateDebut: 'asc'
      }
    });

    res.status(200).json({
      success: true,
      data: {
        evenements: evenements.map(evenementToPublicJSON),
        total: evenements.length
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des événements:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des événements',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Récupérer un événement par ID
// @route   GET /api/agenda/:id
// @access  Private
export const getEvenementById = async (req, res) => {
  try {
    const cabinetId = await getCabinetId(req.user.userId);

    const evenement = await prisma.evenement.findFirst({
      where: {
        id: req.params.id,
        cabinetId
      },
      include: {
        dossier: {
          select: {
            id: true,
            nom: true
          }
        },
        utilisateur: {
          select: {
            id: true,
            nom: true,
            prenom: true
          }
        }
      }
    });

    if (!evenement) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        evenement: evenementToPublicJSON(evenement)
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération de l\'événement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'événement',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Mettre à jour un événement
// @route   PUT /api/agenda/:id
// @access  Private
export const updateEvenement = async (req, res) => {
  try {
    const cabinetId = await getCabinetId(req.user.userId);

    // Vérifier que l'événement existe et appartient au cabinet
    const evenementExistant = await prisma.evenement.findFirst({
      where: {
        id: req.params.id,
        cabinetId
      }
    });

    if (!evenementExistant) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé'
      });
    }

    // Préparer les données de mise à jour
    const updateData = {};

    if (req.body.titre !== undefined) updateData.titre = req.body.titre;
    if (req.body.description !== undefined) updateData.description = req.body.description || null;
    if (req.body.dateDebut !== undefined) updateData.dateDebut = new Date(req.body.dateDebut);
    if (req.body.dateFin !== undefined) updateData.dateFin = new Date(req.body.dateFin);
    if (req.body.typeEvenement !== undefined) updateData.typeEvenement = convertTypeEvenement(req.body.typeEvenement);
    if (req.body.dossierId !== undefined) updateData.dossierId = req.body.dossierId || null;

    // Vérifier que la date de fin est après la date de début
    const dateDebut = updateData.dateDebut || evenementExistant.dateDebut;
    const dateFin = updateData.dateFin || evenementExistant.dateFin;
    if (dateFin < dateDebut) {
      return res.status(400).json({
        success: false,
        message: 'La date de fin doit être après la date de début'
      });
    }

    // Vérifier que le dossier existe si fourni
    if (updateData.dossierId) {
      const dossier = await prisma.dossier.findFirst({
        where: {
          id: updateData.dossierId,
          cabinetId
        }
      });
      if (!dossier) {
        return res.status(400).json({
          success: false,
          message: 'Le dossier spécifié n\'existe pas ou n\'appartient pas à votre cabinet'
        });
      }
    }

    // Mettre à jour l'événement
    const evenementUpdated = await prisma.evenement.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        dossier: {
          select: {
            id: true,
            nom: true
          }
        },
        utilisateur: {
          select: {
            id: true,
            nom: true,
            prenom: true
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        evenement: evenementToPublicJSON(evenementUpdated)
      }
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'événement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de l\'événement',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Supprimer un événement
// @route   DELETE /api/agenda/:id
// @access  Private
export const deleteEvenement = async (req, res) => {
  try {
    const cabinetId = await getCabinetId(req.user.userId);

    // Vérifier que l'événement existe et appartient au cabinet
    const evenement = await prisma.evenement.findFirst({
      where: {
        id: req.params.id,
        cabinetId
      }
    });

    if (!evenement) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé'
      });
    }

    // Supprimer l'événement (soft delete)
    await prisma.evenement.update({
      where: { id: req.params.id },
      data: { isArchived: true }
    });

    res.status(200).json({
      success: true,
      message: 'Événement supprimé avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la suppression de l\'événement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'événement',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


import { prisma } from '../lib/prisma.js';

// Helper pour convertir Dossier Prisma en format public
const dossierToPublicJSON = (dossier) => {
  // Si on a une relation client, l'utiliser, sinon utiliser les anciens champs
  let clientData = null;
  if (dossier.client) {
    // Utiliser la relation client si elle existe
    clientData = {
      id: dossier.client.id,
      nom: dossier.client.nom,
      prenom: dossier.client.prenom,
      email: dossier.client.email,
      telephone: dossier.client.telephone,
      adresse: dossier.client.adresse || null
    };
  } else if (dossier.clientId) {
    // Si on a un clientId mais pas la relation, créer un objet minimal
    clientData = {
      id: dossier.clientId,
      nom: dossier.clientNom,
      prenom: dossier.clientPrenom,
      email: dossier.clientEmail,
      telephone: dossier.clientTelephone,
      adresse: dossier.clientAdresse || null
    };
  } else if (dossier.clientNom || dossier.clientPrenom) {
    // Anciens dossiers avec les champs texte
    clientData = {
      id: null,
      nom: dossier.clientNom,
      prenom: dossier.clientPrenom,
      email: dossier.clientEmail,
      telephone: dossier.clientTelephone,
      adresse: dossier.clientAdresse || null
    };
  }

  return {
    id: dossier.id,
    nom: dossier.nom,
    description: dossier.description,
    statut: dossier.statut,
    responsable: dossier.responsable,
    cabinet: dossier.cabinet,
    client: clientData,
    clientId: dossier.clientId,
    typeAffaire: dossier.typeAffaire,
    numeroAffaire: dossier.numeroAffaire,
    juridiction: dossier.juridiction,
    dateOuverture: dossier.dateOuverture,
    dateCloture: dossier.dateCloture,
    dateProchainEvenement: dossier.dateProchainEvenement,
    notesCount: dossier.notes?.length || 0,
    timelineCount: dossier.timeline?.length || 0,
    isArchived: dossier.isArchived,
    createdAt: dossier.createdAt,
    updatedAt: dossier.updatedAt
  };
};

// Helper pour obtenir le cabinetId d'un utilisateur
const getCabinetId = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  
  if (!user) {
    throw new Error('Utilisateur non trouvé');
  }
  
  // Si admin, son ID est le cabinetId
  // Si collaborateur, on cherche l'admin du cabinet (pour l'instant, on utilise son ID)
  return user.role === 'ADMIN' ? user.id : user.id;
};

// Helper pour convertir le type d'affaire français vers l'enum Prisma
const convertTypeAffaire = (typeAffaire) => {
  if (!typeAffaire) return null;
  
  const mapping = {
    'CIVIL': 'CIVIL',
    'PÉNAL': 'PENAL',
    'PENAL': 'PENAL',
    'COMMERCIAL': 'COMMERCIAL',
    'ADMINISTRATIF': 'ADMINISTRATIF',
    'TRAVAIL': 'TRAVAIL',
    'FAMILIAL': 'FAMILIAL',
    'FAMILLE': 'FAMILIAL', // Ancien format pour compatibilité
    'IMMOBILIER': 'IMMOBILIER',
    'AUTRE': 'AUTRE'
  };
  
  const upper = typeAffaire.toUpperCase();
  return mapping[upper] || null;
};

// @desc    Créer un nouveau dossier
// @route   POST /api/dossiers
// @access  Private
export const createDossier = async (req, res) => {
  try {
    const {
      nom,
      description,
      statut,
      responsable,
      client,
      clientId,
      typeAffaire,
      numeroAffaire,
      juridiction,
      dateProchainEvenement
    } = req.body;

    // Récupérer l'utilisateur connecté et déterminer le cabinet
    const cabinetId = await getCabinetId(req.user.userId);

    // Vérifier que le responsable existe
    if (responsable) {
      const responsableUser = await prisma.user.findUnique({
        where: { id: responsable }
      });
      if (!responsableUser) {
        return res.status(400).json({
          success: false,
          message: 'Le responsable spécifié n\'existe pas'
        });
      }
    }

    // Vérifier que le client existe et appartient au cabinet si clientId est fourni
    if (clientId) {
      const client = await prisma.client.findFirst({
        where: {
          id: clientId,
          cabinetId
        }
      });
      if (!client) {
        return res.status(400).json({
          success: false,
          message: 'Le client spécifié n\'existe pas ou n\'appartient pas à votre cabinet'
        });
      }
    }

    // Créer le dossier avec la timeline initiale
    const dossier = await prisma.dossier.create({
      data: {
        nom,
        description,
        statut: statut ? statut.toUpperCase().replace(' ', '_').replace('É', 'E') : 'OUVERT',
        responsableId: responsable || req.user.userId,
        cabinetId,
        clientId: clientId || null,
        // Garder les anciens champs pour compatibilité si clientId n'est pas fourni
        clientNom: !clientId && client?.nom ? client.nom : null,
        clientPrenom: !clientId && client?.prenom ? client.prenom : null,
        clientEmail: !clientId && client?.email ? client.email : null,
        clientTelephone: !clientId && client?.telephone ? client.telephone : null,
        clientAdresse: !clientId && client?.adresse ? client.adresse : null,
        typeAffaire: convertTypeAffaire(typeAffaire),
        numeroAffaire,
        juridiction,
        dateProchainEvenement: dateProchainEvenement ? new Date(dateProchainEvenement) : null,
        createdById: req.user.userId,
        timeline: {
          create: {
            action: 'Création du dossier',
            description: `Le dossier "${nom}" a été créé`,
            auteurId: req.user.userId,
            date: new Date()
          }
        }
      },
      include: {
        responsable: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true
          }
        },
        client: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
            telephone: true
          }
        },
        createdBy: {
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
      message: 'Dossier créé avec succès',
      data: {
        dossier: dossierToPublicJSON(dossier)
      }
    });

  } catch (error) {
    console.error('Erreur lors de la création du dossier:', error);
    console.error('Détails de l\'erreur:', error.message);
    console.error('Stack:', error.stack);
    
    // Gestion des erreurs Prisma
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Ce numéro d\'affaire existe déjà'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du dossier',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Récupérer tous les dossiers du cabinet
// @route   GET /api/dossiers
// @access  Private
export const getDossiers = async (req, res) => {
  try {
    const cabinetId = await getCabinetId(req.user.userId);

    // Récupérer les filtres de la query string
    const { statut, responsable, includeArchived, search } = req.query;

    // Construire la requête
    const where = {
      cabinetId,
      isArchived: includeArchived === 'true' ? undefined : false
    };
    
    if (statut) {
      where.statut = statut.toUpperCase().replace(' ', '_').replace('É', 'E');
    }
    
    if (responsable) {
      where.responsableId = responsable;
    }

    // Recherche textuelle
    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Récupérer les dossiers
    const [dossiers, total] = await Promise.all([
      prisma.dossier.findMany({
        where,
        include: {
          responsable: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              email: true
            }
          },
          client: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              email: true,
              telephone: true
            }
          },
          createdBy: {
            select: {
              id: true,
              nom: true,
              prenom: true
            }
          },
          updatedBy: {
            select: {
              id: true,
              nom: true,
              prenom: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.dossier.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: {
        dossiers: dossiers.map(d => dossierToPublicJSON(d)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des dossiers:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des dossiers'
    });
  }
};

// @desc    Récupérer un dossier spécifique
// @route   GET /api/dossiers/:id
// @access  Private
export const getDossierById = async (req, res) => {
  try {
    const cabinetId = await getCabinetId(req.user.userId);

    const dossier = await prisma.dossier.findFirst({
      where: {
        id: req.params.id,
        cabinetId
      },
      include: {
        responsable: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
            role: true
          }
        },
        client: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
            telephone: true
          }
        },
        createdBy: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true
          }
        },
        updatedBy: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true
          }
        },
        notes: {
          include: {
            auteur: {
              select: {
                id: true,
                nom: true,
                prenom: true
              }
            }
          },
          orderBy: { dateCreation: 'desc' }
        },
        timeline: {
          include: {
            auteur: {
              select: {
                id: true,
                nom: true,
                prenom: true
              }
            }
          },
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!dossier) {
      return res.status(404).json({
        success: false,
        message: 'Dossier non trouvé'
      });
    }

    // Formater la réponse
    const dossierFormatted = {
      ...dossierToPublicJSON(dossier),
      notes: dossier.notes,
      timeline: dossier.timeline
      // Le client est déjà géré par dossierToPublicJSON qui utilise la relation ou les anciens champs
    };

    res.status(200).json({
      success: true,
      data: {
        dossier: dossierFormatted
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du dossier:', error);
    
    if (error.code === 'P2023' || error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Dossier non trouvé'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du dossier'
    });
  }
};

// @desc    Mettre à jour un dossier
// @route   PUT /api/dossiers/:id
// @access  Private
export const updateDossier = async (req, res) => {
  try {
    const cabinetId = await getCabinetId(req.user.userId);

    // Trouver le dossier
    const dossier = await prisma.dossier.findFirst({
      where: {
        id: req.params.id,
        cabinetId
      }
    });

    if (!dossier) {
      return res.status(404).json({
        success: false,
        message: 'Dossier non trouvé'
      });
    }

    // Champs autorisés à la modification
    const allowedUpdates = [
      'nom',
      'description',
      'statut',
      'responsableId',
      'clientId',
      'clientNom',
      'clientPrenom',
      'clientEmail',
      'clientTelephone',
      'clientAdresse',
      'typeAffaire',
      'numeroAffaire',
      'juridiction',
      'dateProchainEvenement',
      'dateCloture'
    ];

    // Préparer les données de mise à jour
    const updateData = {};
    const timelineEntries = [];

    // Détecter les changements importants
    if (req.body.statut) {
      const nouveauStatut = req.body.statut.toUpperCase().replace(' ', '_').replace('É', 'E');
      if (nouveauStatut !== dossier.statut) {
        updateData.statut = nouveauStatut;
        // Convertir pour l'affichage dans la timeline
        const statutDisplay = {
          'OUVERT': 'Ouvert',
          'EN_ATTENTE': 'En attente',
          'FERME': 'Fermé'
        };
        const ancienStatutDisplay = statutDisplay[dossier.statut] || dossier.statut;
        const nouveauStatutDisplay = statutDisplay[nouveauStatut] || req.body.statut;
        timelineEntries.push({
          action: 'Changement de statut',
          description: `Statut modifié de "${ancienStatutDisplay}" à "${nouveauStatutDisplay}"`,
          auteurId: req.user.userId,
          date: new Date()
        });
      }
    }

    if (req.body.responsable && req.body.responsable !== dossier.responsableId) {
      updateData.responsableId = req.body.responsable;
      timelineEntries.push({
        action: 'Changement de responsable',
        description: 'Le responsable du dossier a été modifié',
        auteurId: req.user.userId,
        date: new Date()
      });
    }

    // Gérer clientId spécifiquement
    if (req.body.clientId !== undefined) {
      updateData.clientId = req.body.clientId || null;
      // Si on définit un clientId, on peut vider les anciens champs client
      if (req.body.clientId) {
        updateData.clientNom = null;
        updateData.clientPrenom = null;
        updateData.clientEmail = null;
        updateData.clientTelephone = null;
        updateData.clientAdresse = null;
      }
    }

    // Ajouter les autres champs
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        if (key === 'statut' && !updateData.statut) {
          updateData.statut = req.body[key].toUpperCase().replace(' ', '_').replace('É', 'E');
        } else if (key === 'responsable' && !updateData.responsableId) {
          updateData.responsableId = req.body[key];
        } else if (key.startsWith('client') && key !== 'clientId') {
          const clientKey = key.replace('client', 'client');
          updateData[clientKey] = req.body[key];
        } else if (key === 'typeAffaire') {
          updateData.typeAffaire = convertTypeAffaire(req.body[key]);
        } else if (key !== 'statut' && key !== 'responsable' && key !== 'clientId') {
          updateData[key] = req.body[key];
        }
      }
    });

    updateData.updatedById = req.user.userId;

    // Si pas de changements importants, ajouter une entrée générique
    if (timelineEntries.length === 0) {
      timelineEntries.push({
        action: 'Modification du dossier',
        description: 'Le dossier a été modifié',
        auteurId: req.user.userId,
        date: new Date()
      });
    }

    // Mettre à jour le dossier
    const dossierUpdated = await prisma.dossier.update({
      where: { id: req.params.id },
      data: {
        ...updateData,
        timeline: {
          create: timelineEntries
        }
      },
      include: {
        responsable: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true
          }
        },
        client: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
            telephone: true
          }
        },
        updatedBy: {
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
      message: 'Dossier mis à jour avec succès',
      data: {
        dossier: dossierToPublicJSON(dossierUpdated)
      }
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour du dossier:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Ce numéro d\'affaire existe déjà'
      });
    }

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Dossier non trouvé'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du dossier'
    });
  }
};

// @desc    Supprimer un dossier (archivage)
// @route   DELETE /api/dossiers/:id
// @access  Private
export const deleteDossier = async (req, res) => {
  try {
    const cabinetId = await getCabinetId(req.user.userId);
    const dossier = await prisma.dossier.findFirst({
      where: {
        id: req.params.id,
        cabinetId
      }
    });

    if (!dossier) {
      return res.status(404).json({
        success: false,
        message: 'Dossier non trouvé'
      });
    }

    // Archiver plutôt que supprimer (soft delete)
    await prisma.dossier.update({
      where: { id: req.params.id },
      data: {
        isArchived: true,
        updatedById: req.user.userId,
        timeline: {
          create: {
            action: 'Archivage du dossier',
            description: 'Le dossier a été archivé',
            auteurId: req.user.userId,
            date: new Date()
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      message: 'Dossier archivé avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la suppression du dossier:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Dossier non trouvé'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du dossier'
    });
  }
};

// @desc    Ajouter une note à un dossier
// @route   POST /api/dossiers/:id/notes
// @access  Private
export const addNote = async (req, res) => {
  try {
    const { contenu } = req.body;

    if (!contenu) {
      return res.status(400).json({
        success: false,
        message: 'Le contenu de la note est requis'
      });
    }

    const cabinetId = await getCabinetId(req.user.userId);

    // Vérifier que le dossier existe
    const dossier = await prisma.dossier.findFirst({
      where: {
        id: req.params.id,
        cabinetId
      }
    });

    if (!dossier) {
      return res.status(404).json({
        success: false,
        message: 'Dossier non trouvé'
      });
    }

    // Créer la note
    const note = await prisma.dossierNote.create({
      data: {
        contenu,
        auteurId: req.user.userId,
        dossierId: req.params.id
      },
      include: {
        auteur: {
          select: {
            id: true,
            nom: true,
            prenom: true
          }
        }
      }
    });

    // Ajouter à la timeline
    await prisma.dossierTimeline.create({
      data: {
        action: 'Note ajoutée',
        description: 'Une nouvelle note a été ajoutée au dossier',
        auteurId: req.user.userId,
        dossierId: req.params.id,
        date: new Date()
      }
    });

    res.status(201).json({
      success: true,
      message: 'Note ajoutée avec succès',
      data: {
        note
      }
    });

  } catch (error) {
    console.error('Erreur lors de l\'ajout de la note:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout de la note'
    });
  }
};

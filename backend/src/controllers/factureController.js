import { prisma } from '../lib/prisma.js';

// Helper pour obtenir le cabinetId
const getCabinetId = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  return user.role === 'ADMIN' ? user.id : user.id;
};

// Helper pour générer un numéro de facture unique
const generateNumeroFacture = async (cabinetId) => {
  const year = new Date().getFullYear();
  const prefix = `FAC-${year}-`;
  
  // Trouver le dernier numéro de facture de l'année pour ce cabinet
  const lastFacture = await prisma.facture.findFirst({
    where: {
      cabinetId,
      numeroFacture: {
        startsWith: prefix
      }
    },
    orderBy: {
      numeroFacture: 'desc'
    }
  });

  let numero = 1;
  if (lastFacture) {
    const lastNum = parseInt(lastFacture.numeroFacture.split('-')[2]);
    numero = lastNum + 1;
  }

  return `${prefix}${numero.toString().padStart(4, '0')}`;
};

// Helper pour calculer les totaux
const calculateTotals = (lignes, tva = 20) => {
  const totalHT = lignes.reduce((sum, ligne) => {
    return sum + (ligne.quantite * ligne.prixUnitaire);
  }, 0);
  const totalTTC = totalHT * (1 + tva / 100);
  return { totalHT, totalTTC };
};

// Helper pour convertir Facture en format public
const factureToPublicJSON = (facture) => {
  return {
    id: facture.id,
    numeroFacture: facture.numeroFacture,
    dossier: facture.dossier,
    cabinet: facture.cabinet,
    lignes: facture.lignes,
    totalHT: facture.totalHT,
    tva: facture.tva,
    totalTTC: facture.totalTTC,
    statut: facture.statut,
    dateEmission: facture.dateEmission?.toISOString(),
    dateEcheance: facture.dateEcheance?.toISOString(),
    datePaiement: facture.datePaiement?.toISOString(),
    notes: facture.notes,
    isArchived: facture.isArchived,
    createdAt: facture.createdAt?.toISOString(),
    updatedAt: facture.updatedAt?.toISOString()
  };
};

// @desc    Créer une nouvelle facture
// @route   POST /api/factures
// @access  Private
export const createFacture = async (req, res) => {
  try {
    const cabinetId = await getCabinetId(req.user.userId);

    // Vérifier que le dossier existe et appartient au cabinet
    const dossier = await prisma.dossier.findFirst({
      where: {
        id: req.body.dossier,
        cabinetId
      }
    });

    if (!dossier) {
      return res.status(404).json({
        success: false,
        message: 'Dossier non trouvé ou n\'appartient pas à votre cabinet'
      });
    }

    // Générer un numéro de facture unique
    const numeroFacture = await generateNumeroFacture(cabinetId);

    // Calculer les totaux
    const { totalHT, totalTTC } = calculateTotals(req.body.lignes, req.body.tva || 20);

    // Préparer les lignes avec totalLigne
    const lignesData = req.body.lignes.map(ligne => ({
      description: ligne.description,
      quantite: ligne.quantite,
      prixUnitaire: ligne.prixUnitaire,
      totalLigne: ligne.quantite * ligne.prixUnitaire
    }));

    // Déterminer le clientId (priorité: clientId fourni > clientId du dossier)
    let clientId = req.body.clientId || null;
    if (!clientId && dossier.clientId) {
      clientId = dossier.clientId;
    }

    // Créer la facture
    const facture = await prisma.facture.create({
      data: {
        numeroFacture,
        dossierId: req.body.dossier,
        clientId,
        cabinetId,
        lignes: {
          create: lignesData
        },
        totalHT,
        tva: req.body.tva || 20,
        totalTTC,
        statut: req.body.statut ? req.body.statut.toUpperCase().replace(/ /g, '_').replace('É', 'E') : 'ENVOYEE',
        dateEcheance: new Date(req.body.dateEcheance),
        notes: req.body.notes || null
      },
      include: {
        dossier: {
          select: {
            id: true,
            nom: true,
            clientNom: true,
            clientPrenom: true
          }
        },
        cabinet: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true
          }
        },
        lignes: true
      }
    });

    // Mettre à jour la timeline du dossier
    await prisma.dossierTimeline.create({
      data: {
        action: 'Facture créée',
        description: `Facture ${numeroFacture} créée`,
        auteurId: req.user.userId,
        dossierId: req.body.dossier,
        date: new Date()
      }
    });

    res.status(201).json({
      success: true,
      message: 'Facture créée avec succès',
      data: {
        facture: factureToPublicJSON(facture)
      }
    });

  } catch (error) {
    console.error('Erreur lors de la création de la facture:', error);

    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Ce numéro de facture existe déjà'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la facture'
    });
  }
};

// @desc    Lister toutes les factures du cabinet
// @route   GET /api/factures
// @access  Private
export const getFactures = async (req, res) => {
  try {
    const cabinetId = await getCabinetId(req.user.userId);

    // Filtres
    const { statut, dossierId, dateDebut, dateFin } = req.query;
    const where = {
      cabinetId,
      isArchived: false
    };

    if (statut) {
      where.statut = statut.toUpperCase().replace(' ', '_');
    }

    if (dossierId) {
      where.dossierId = dossierId;
    }

    if (dateDebut || dateFin) {
      where.dateEmission = {};
      if (dateDebut) {
        where.dateEmission.gte = new Date(dateDebut);
      }
      if (dateFin) {
        where.dateEmission.lte = new Date(dateFin);
      }
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Récupérer les factures
    const [factures, total] = await Promise.all([
      prisma.facture.findMany({
        where,
        include: {
          dossier: {
            select: {
              id: true,
              nom: true,
              clientNom: true,
              clientPrenom: true
            }
          },
          cabinet: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              email: true
            }
          },
          lignes: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.facture.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: {
        factures: factures.map(f => factureToPublicJSON(f)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des factures:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des factures'
    });
  }
};

// @desc    Récupérer une facture par ID
// @route   GET /api/factures/:id
// @access  Private
export const getFactureById = async (req, res) => {
  try {
    const cabinetId = await getCabinetId(req.user.userId);

    const facture = await prisma.facture.findFirst({
      where: {
        id: req.params.id,
        cabinetId,
        isArchived: false
      },
      include: {
        dossier: {
          select: {
            id: true,
            nom: true,
            description: true,
            clientNom: true,
            clientPrenom: true
          }
        },
        cabinet: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true
          }
        },
        lignes: true
      }
    });

    if (!facture) {
      return res.status(404).json({
        success: false,
        message: 'Facture non trouvée'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        facture: factureToPublicJSON(facture)
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération de la facture:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la facture'
    });
  }
};

// @desc    Mettre à jour une facture
// @route   PUT /api/factures/:id
// @access  Private
export const updateFacture = async (req, res) => {
  try {
    const cabinetId = await getCabinetId(req.user.userId);

    const facture = await prisma.facture.findFirst({
      where: {
        id: req.params.id,
        cabinetId,
        isArchived: false
      },
      include: {
        lignes: true
      }
    });

    if (!facture) {
      return res.status(404).json({
        success: false,
        message: 'Facture non trouvée'
      });
    }

    // Vérifier si on change le statut
    const ancienStatut = facture.statut;
    const nouveauStatut = req.body.statut;

    // Préparer les données de mise à jour
    const updateData = {};

    // Mettre à jour clientId si fourni
    if (req.body.clientId !== undefined) {
      updateData.clientId = req.body.clientId || null;
    }

    // Si les lignes sont modifiées, recalculer les totaux
    if (req.body.lignes) {
      const lignesData = req.body.lignes.map(ligne => ({
        description: ligne.description,
        quantite: ligne.quantite,
        prixUnitaire: ligne.prixUnitaire,
        totalLigne: ligne.quantite * ligne.prixUnitaire
      }));

      const { totalHT, totalTTC } = calculateTotals(req.body.lignes, req.body.tva || facture.tva);
      
      updateData.totalHT = totalHT;
      updateData.totalTTC = totalTTC;

      // Supprimer les anciennes lignes et créer les nouvelles
      await prisma.factureLigne.deleteMany({
        where: { factureId: facture.id }
      });

      updateData.lignes = {
        create: lignesData
      };
    }

    // Autres champs
    if (req.body.tva !== undefined) {
      updateData.tva = req.body.tva;
      if (!req.body.lignes) {
        // Recalculer avec les lignes existantes
        const { totalHT, totalTTC } = calculateTotals(facture.lignes, req.body.tva);
        updateData.totalHT = totalHT;
        updateData.totalTTC = totalTTC;
      }
    }

    if (req.body.statut) {
      updateData.statut = req.body.statut.toUpperCase().replace(/ /g, '_').replace('É', 'E');
      
      // Si le statut passe à "Payée", enregistrer la date de paiement
      if (updateData.statut === 'PAYEE' && !facture.datePaiement) {
        updateData.datePaiement = new Date();
      }
      
      // Si le statut n'est plus "Payée", supprimer la date de paiement
      if (updateData.statut !== 'PAYEE' && facture.datePaiement) {
        updateData.datePaiement = null;
      }
    }

    if (req.body.dateEcheance) {
      updateData.dateEcheance = new Date(req.body.dateEcheance);
    }

    if (req.body.notes !== undefined) {
      updateData.notes = req.body.notes;
    }

    // Mettre à jour la facture
    const factureUpdated = await prisma.facture.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        dossier: {
          select: {
            id: true,
            nom: true,
            clientNom: true,
            clientPrenom: true
          }
        },
        cabinet: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true
          }
        },
        lignes: true
      }
    });

    // Mettre à jour la timeline du dossier si le statut change et que le dossier existe
    if (req.body.statut && facture.dossierId) {
      const nouveauStatutFormate = req.body.statut.toUpperCase().replace(/ /g, '_').replace('É', 'E');
      if (nouveauStatutFormate !== ancienStatut) {
        try {
          await prisma.dossierTimeline.create({
            data: {
              action: 'Statut de facture modifié',
              description: `Facture ${facture.numeroFacture} : statut modifié`,
              auteurId: req.user.userId,
              dossierId: facture.dossierId,
              date: new Date()
            }
          });
        } catch (timelineError) {
          // Ne pas bloquer la mise à jour de la facture si la timeline échoue
          console.error('Erreur lors de la création de la timeline:', timelineError);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Facture mise à jour avec succès',
      data: {
        facture: factureToPublicJSON(factureUpdated)
      }
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour de la facture:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Facture non trouvée'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la facture'
    });
  }
};

// @desc    Supprimer une facture (soft delete si brouillon)
// @route   DELETE /api/factures/:id
// @access  Private
export const deleteFacture = async (req, res) => {
  try {
    const cabinetId = await getCabinetId(req.user.userId);

    const facture = await prisma.facture.findFirst({
      where: {
        id: req.params.id,
        cabinetId,
        isArchived: false
      }
    });

    if (!facture) {
      return res.status(404).json({
        success: false,
        message: 'Facture non trouvée'
      });
    }

    // Soft delete (archivage) - toutes les factures peuvent être supprimées
    await prisma.facture.update({
      where: { id: req.params.id },
      data: { isArchived: true }
    });

    // Mettre à jour la timeline du dossier
    await prisma.dossierTimeline.create({
      data: {
        action: 'Facture supprimée',
        description: `Facture ${facture.numeroFacture} supprimée`,
        auteurId: req.user.userId,
        dossierId: facture.dossierId,
        date: new Date()
      }
    });

    res.status(200).json({
      success: true,
      message: 'Facture supprimée avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la suppression de la facture:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la facture'
    });
  }
};

// @desc    Marquer une facture comme payée
// @route   PATCH /api/factures/:id/payer
// @access  Private
export const marquerPayee = async (req, res) => {
  try {
    const cabinetId = await getCabinetId(req.user.userId);

    const facture = await prisma.facture.findFirst({
      where: {
        id: req.params.id,
        cabinetId,
        isArchived: false
      }
    });

    if (!facture) {
      return res.status(404).json({
        success: false,
        message: 'Facture non trouvée'
      });
    }

    const factureUpdated = await prisma.facture.update({
      where: { id: req.params.id },
      data: {
        statut: 'PAYEE',
        datePaiement: new Date()
      },
      include: {
        dossier: {
          select: {
            id: true,
            nom: true,
            clientNom: true,
            clientPrenom: true
          }
        },
        cabinet: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true
          }
        },
        lignes: true
      }
    });

    // Mettre à jour la timeline du dossier si le dossier existe
    if (facture.dossierId) {
      try {
        await prisma.dossierTimeline.create({
          data: {
            action: 'Facture payée',
            description: `Facture ${facture.numeroFacture} marquée comme payée`,
            auteurId: req.user.userId,
            dossierId: facture.dossierId,
            date: new Date()
          }
        });
      } catch (timelineError) {
        // Ne pas bloquer la mise à jour de la facture si la timeline échoue
        console.error('Erreur lors de la création de la timeline:', timelineError);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Facture marquée comme payée',
      data: {
        facture: factureToPublicJSON(factureUpdated)
      }
    });

  } catch (error) {
    console.error('Erreur lors du marquage de la facture:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du marquage de la facture',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

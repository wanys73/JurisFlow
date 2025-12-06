import { prisma } from '../lib/prisma.js';

// Helper pour obtenir le cabinetId
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

// Helper pour normaliser les statuts de facture (mapping frontend -> backend)
// Mapping robuste et explicite des valeurs du frontend vers les valeurs de l'enum Prisma
const statusMapping = {
  // Valeurs exactes du frontend (avec accents) - cas le plus courant
  'Envoyée': 'ENVOYEE',
  'Payée': 'PAYEE',
  'En retard': 'EN_RETARD',
  // Variantes avec casse différente
  'En Retard': 'EN_RETARD',
  'EN RETARD': 'EN_RETARD',
  // Variantes sans accents
  'Envoyee': 'ENVOYEE',
  'Payee': 'PAYEE',
  'En Retard': 'EN_RETARD',
  // Valeurs déjà normalisées
  'ENVOYEE': 'ENVOYEE',
  'PAYEE': 'PAYEE',
  'EN_RETARD': 'EN_RETARD',
  // Variantes avec accents en majuscules
  'ENVOYÉE': 'ENVOYEE',
  'PAYÉE': 'PAYEE',
  // Autres variantes possibles
  'RETARD': 'EN_RETARD',
  'ENVOYÉ': 'ENVOYEE',
  'PAYÉ': 'PAYEE',
  'envoyée': 'ENVOYEE',
  'payée': 'PAYEE',
  'en retard': 'EN_RETARD'
};

const normalizeFactureStatut = (statut) => {
  if (!statut) return null;
  
  // Nettoyer le statut (trim)
  const cleaned = String(statut).trim();
  
  // Vérifier d'abord le mapping direct (sans normalisation)
  if (statusMapping[cleaned]) {
    return statusMapping[cleaned];
  }
  
  // Si pas trouvé, normaliser puis chercher
  const normalized = cleaned
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
    .replace(/\s+/g, '_') // Remplacer espaces par underscore
    .trim();
  
  // Vérifier dans le map après normalisation
  if (statusMapping[normalized]) {
    return statusMapping[normalized];
  }
  
  // Si toujours pas trouvé, retourner la version normalisée
  return normalized;
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
        statut: req.body.statut ? normalizeFactureStatut(req.body.statut) : 'ENVOYEE',
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
  // LOG IMMÉDIAT - Si vous ne voyez pas ça, la fonction n'est pas appelée
  console.log('🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵');
  console.log('🔵 [FACTURES] FONCTION APPELÉE !');
  console.log('🔵 [FACTURES] userId:', req.user?.userId);
  console.log('🔵 [FACTURES] Query:', req.query);
  console.log('🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵');
  
  try {
    const cabinetId = await getCabinetId(req.user.userId);
    console.log('🔵 [FACTURES] cabinetId:', cabinetId);

    // Filtres
    let { statut, dossierId, dateDebut, dateFin, search } = req.query;
    
    console.log('🔵 [FACTURES] Statut brut reçu:', statut);
    console.log('🔵 [FACTURES] Type de statut:', typeof statut);
    
    // Traitement du statut - SIMPLIFIÉ et ROBUSTE
    let normalizedStatut = undefined;
    if (statut && typeof statut === 'string' && statut.trim() !== '') {
      // Express décode déjà les paramètres URL automatiquement
      let decodedStatut = statut.trim();
      
      // Mapping direct et simple
      if (decodedStatut === 'Envoyée' || decodedStatut === 'Envoyee' || decodedStatut === 'Envoyé') {
        normalizedStatut = 'ENVOYEE';
      } else if (decodedStatut === 'Payée' || decodedStatut === 'Payee' || decodedStatut === 'Payé') {
        normalizedStatut = 'PAYEE';
      } else if (decodedStatut === 'En retard' || decodedStatut === 'En Retard') {
        normalizedStatut = 'EN_RETARD';
      } else if (decodedStatut === 'ENVOYEE' || decodedStatut === 'PAYEE' || decodedStatut === 'EN_RETARD') {
        normalizedStatut = decodedStatut;
      }
      
      console.log('🔵 [FACTURES] Statut reçu:', decodedStatut, '-> Normalisé:', normalizedStatut);
    }
    
    const where = {
      cabinetId,
      isArchived: false
    };

    // Appliquer le filtre de statut si valide
    if (normalizedStatut) {
      where.statut = normalizedStatut;
      console.log('🔵 [FACTURES] ✅ Filtre appliqué:', where.statut);
    } else {
      console.log('🔵 [FACTURES] Pas de filtre de statut appliqué');
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

    // Filtre par recherche textuelle (si fourni)
    // Note: La recherche dans les relations (dossier, client) est gérée côté frontend
    if (search && search.trim() !== '') {
      try {
        where.numeroFacture = {
          contains: search.trim(),
          mode: 'insensitive'
        };
      } catch (searchError) {
        console.warn('[WARN] Erreur lors de l\'application du filtre de recherche:', searchError);
        // Ignorer le filtre de recherche en cas d'erreur
      }
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Récupérer les factures
    console.log('🔵 [FACTURES] Where object:', JSON.stringify(where, null, 2));
    
    let factures, total;
    try {
      console.log('🔵 [FACTURES] Début de la requête Prisma...');
      
      [factures, total] = await Promise.all([
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
      
      console.log('🔵 [FACTURES] ✅ Succès:', factures.length, 'factures sur', total);
    } catch (prismaError) {
      console.error('🔴 [FACTURES] ❌ ERREUR PRISMA:');
      console.error('🔴 [FACTURES] Code:', prismaError.code);
      console.error('🔴 [FACTURES] Message:', prismaError.message);
      console.error('🔴 [FACTURES] Name:', prismaError.name);
      console.error('🔴 [FACTURES] Where:', JSON.stringify(where, null, 2));
      
      // Si l'erreur vient du statut, essayer sans
      if (where.statut) {
        console.log('🔵 [FACTURES] Tentative SANS filtre de statut...');
        const whereWithoutStatut = { ...where };
        delete whereWithoutStatut.statut;
        
        try {
          [factures, total] = await Promise.all([
            prisma.facture.findMany({
              where: whereWithoutStatut,
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
            prisma.facture.count({ where: whereWithoutStatut })
          ]);
          console.log('🔵 [FACTURES] ✅ Succès sans filtre:', factures.length, 'factures');
        } catch (retryError) {
          console.error('🔴 [FACTURES] ❌ Erreur même sans filtre:', retryError.message);
          throw prismaError;
        }
      } else {
        throw prismaError;
      }
    }

    // Transformer les factures en JSON public
    let facturesJSON;
    try {
      facturesJSON = factures.map(f => {
        try {
          return factureToPublicJSON(f);
        } catch (mapError) {
          console.error('[ERROR] Erreur lors de la transformation d\'une facture:', mapError);
          console.error('[ERROR] Facture problématique:', f);
          // Retourner une version minimale en cas d'erreur
          return {
            id: f.id,
            numeroFacture: f.numeroFacture || '',
            totalTTC: f.totalTTC || 0,
            statut: f.statut || 'ENVOYEE',
            dateEmission: f.dateEmission?.toISOString() || new Date().toISOString(),
            dateEcheance: f.dateEcheance?.toISOString() || new Date().toISOString()
          };
        }
      });
    } catch (transformError) {
      console.error('[ERROR] Erreur lors de la transformation des factures:', transformError);
      throw transformError;
    }

    res.status(200).json({
      success: true,
      data: {
        factures: facturesJSON,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴');
    console.error('🔴 [FACTURES] ❌ ERREUR CAPTURÉE');
    console.error('🔴 [FACTURES] Message:', error.message);
    console.error('🔴 [FACTURES] Code:', error.code);
    console.error('🔴 [FACTURES] Name:', error.name);
    console.error('🔴 [FACTURES] Stack:', error.stack);
    console.error('🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴');
    
    // Envoyer DIRECTEMENT la réponse avec TOUS les détails
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des factures',
      error: error.message || 'Erreur inconnue',
      details: {
        code: error.code || 'NO_CODE',
        name: error.name || 'Error',
        message: error.message || 'Erreur inconnue',
        stack: error.stack || 'Pas de stack'
      }
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
      const normalizedStatut = normalizeFactureStatut(req.body.statut);
      const validStatuts = ['ENVOYEE', 'PAYEE', 'EN_RETARD'];
      if (validStatuts.includes(normalizedStatut)) {
        updateData.statut = normalizedStatut;
        
        // Si le statut passe à "Payée", enregistrer la date de paiement
        if (normalizedStatut === 'PAYEE' && !facture.datePaiement) {
          updateData.datePaiement = new Date();
        }
        
        // Si le statut n'est plus "Payée", supprimer la date de paiement
        if (normalizedStatut !== 'PAYEE' && facture.datePaiement) {
          updateData.datePaiement = null;
        }
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
      const nouveauStatutFormate = normalizeFactureStatut(req.body.statut);
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

    // Créer une notification si la facture passe à "Payée" (critique/positif -> Email + Cloche)
    if (req.body.statut) {
      const nouveauStatutFormate = normalizeFactureStatut(req.body.statut);
      if (ancienStatut !== 'PAYEE' && nouveauStatutFormate === 'PAYEE') {
        try {
          const { createCriticalNotification, NOTIFICATION_TYPES } = await import('../services/notificationService.js');
          
          const clientNom = factureUpdated.dossier 
            ? `${factureUpdated.dossier.clientPrenom || ''} ${factureUpdated.dossier.clientNom || ''}`.trim() 
            : 'Client inconnu';
          
          const titre = '💶 Paiement reçu';
          const message = `La facture ${facture.numeroFacture} (${clientNom}) a été marquée comme payée. Montant : ${factureUpdated.totalTTC.toFixed(2)} €.`;
          
          const emailSubject = `Paiement reçu : Facture ${facture.numeroFacture}`;
          const emailBody = `
            <h2>Paiement reçu</h2>
            <p>Bonjour ${factureUpdated.cabinet.prenom},</p>
            <p>La facture suivante a été marquée comme <strong>payée</strong> :</p>
            <ul>
              <li><strong>Numéro :</strong> ${facture.numeroFacture}</li>
              <li><strong>Client :</strong> ${clientNom}</li>
              <li><strong>Montant TTC :</strong> ${factureUpdated.totalTTC.toFixed(2)} €</li>
              <li><strong>Date de paiement :</strong> ${new Date().toLocaleDateString('fr-FR')}</li>
            </ul>
            <p>Merci pour votre suivi.</p>
          `;
          
          await createCriticalNotification(
            factureUpdated.cabinet.id,
            NOTIFICATION_TYPES.FACTURE,
            titre,
            message,
            emailSubject,
            emailBody,
            factureUpdated.id,
            'facture'
          );
        } catch (notificationError) {
          console.error('Erreur lors de la création de la notification (non bloquant):', notificationError);
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

    // Créer une notification (critique/positif -> Email + Cloche)
    try {
      const { createCriticalNotification, NOTIFICATION_TYPES } = await import('../services/notificationService.js');
      
      const clientNom = factureUpdated.dossier 
        ? `${factureUpdated.dossier.clientPrenom || ''} ${factureUpdated.dossier.clientNom || ''}`.trim() 
        : 'Client inconnu';
      
      const titre = '💶 Paiement reçu';
      const message = `La facture ${facture.numeroFacture} (${clientNom}) a été marquée comme payée. Montant : ${factureUpdated.totalTTC.toFixed(2)} €.`;
      
      const emailSubject = `Paiement reçu : Facture ${facture.numeroFacture}`;
      const emailBody = `
        <h2>Paiement reçu</h2>
        <p>Bonjour ${factureUpdated.cabinet.prenom},</p>
        <p>La facture suivante a été marquée comme <strong>payée</strong> :</p>
        <ul>
          <li><strong>Numéro :</strong> ${facture.numeroFacture}</li>
          <li><strong>Client :</strong> ${clientNom}</li>
          <li><strong>Montant TTC :</strong> ${factureUpdated.totalTTC.toFixed(2)} €</li>
          <li><strong>Date de paiement :</strong> ${new Date().toLocaleDateString('fr-FR')}</li>
        </ul>
        <p>Merci pour votre suivi.</p>
      `;
      
      await createCriticalNotification(
        factureUpdated.cabinet.id,
        NOTIFICATION_TYPES.FACTURE,
        titre,
        message,
        emailSubject,
        emailBody,
        factureUpdated.id,
        'facture'
      );
    } catch (notificationError) {
      console.error('Erreur lors de la création de la notification (non bloquant):', notificationError);
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

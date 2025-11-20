import { prisma } from '../lib/prisma.js';

// Helper pour obtenir le cabinetId
const getCabinetId = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  return user.role === 'ADMIN' ? user.id : user.id;
};

// @desc    Générer un rapport annuel détaillé
// @route   GET /api/rapports/annuel
// @access  Private
export const getRapportAnnuel = async (req, res) => {
  try {
    const cabinetId = await getCabinetId(req.user.userId);
    const { annee, responsableId } = req.query;

    // Par défaut, année en cours
    const year = annee ? parseInt(annee) : new Date().getFullYear();
    
    // Dates de début et fin de l'année
    const startDate = new Date(year, 0, 1); // 1er janvier
    const endDate = new Date(year, 11, 31, 23, 59, 59); // 31 décembre

    // Construire le filtre de base
    const factureWhere = {
      cabinetId,
      statut: 'PAYEE',
      datePaiement: {
        gte: startDate,
        lte: endDate
      },
      isArchived: false
    };

    const dossierWhere = {
      cabinetId,
      createdAt: {
        gte: startDate,
        lte: endDate
      },
      isArchived: false
    };

    // Ajouter le filtre par responsable si fourni
    if (responsableId) {
      dossierWhere.responsableId = responsableId;
    }

    // 1. Revenus mensuels (factures payées)
    const factures = await prisma.facture.findMany({
      where: factureWhere,
      select: {
        totalTTC: true,
        datePaiement: true
      }
    });

    // Initialiser le tableau des revenus mensuels
    const revenusMensuels = Array.from({ length: 12 }, (_, i) => ({
      mois: new Date(year, i).toLocaleDateString('fr-FR', { month: 'short' }),
      revenus: 0
    }));

    // Agréger les revenus par mois
    factures.forEach(facture => {
      if (facture.datePaiement) {
        const mois = new Date(facture.datePaiement).getMonth();
        revenusMensuels[mois].revenus += facture.totalTTC;
      }
    });

    // 2. Nouveaux dossiers mensuels
    const dossiers = await prisma.dossier.findMany({
      where: dossierWhere,
      select: {
        createdAt: true,
        typeAffaire: true,
        clientId: true,
        client: {
          select: {
            id: true,
            nom: true,
            prenom: true
          }
        }
      }
    });

    // Initialiser le tableau des nouveaux dossiers mensuels
    const nouveauxDossiersMensuels = Array.from({ length: 12 }, (_, i) => ({
      mois: new Date(year, i).toLocaleDateString('fr-FR', { month: 'short' }),
      dossiers: 0
    }));

    // Agréger les dossiers par mois
    dossiers.forEach(dossier => {
      const mois = new Date(dossier.createdAt).getMonth();
      nouveauxDossiersMensuels[mois].dossiers += 1;
    });

    // 3. Répartition par type d'affaire
    const repartitionTypes = {};
    const typeAffaireMap = {
      'CIVIL': 'Civil',
      'PENAL': 'Pénal',
      'COMMERCIAL': 'Commercial',
      'ADMINISTRATIF': 'Administratif',
      'TRAVAIL': 'Travail',
      'FAMILIAL': 'Familial',
      'IMMOBILIER': 'Immobilier',
      'AUTRE': 'Autre'
    };

    dossiers.forEach(dossier => {
      if (dossier.typeAffaire) {
        const typeFormate = typeAffaireMap[dossier.typeAffaire] || dossier.typeAffaire;
        repartitionTypes[typeFormate] = (repartitionTypes[typeFormate] || 0) + 1;
      }
    });

    // Convertir en tableau pour Recharts
    const repartitionTypesDossiers = Object.entries(repartitionTypes).map(([type, count]) => ({
      type,
      value: count
    }));

    // 4. Top 5 Clients (par revenus générés)
    // Récupérer toutes les factures payées avec les infos client
    const facturesAvecClients = await prisma.facture.findMany({
      where: factureWhere,
      select: {
        totalTTC: true,
        clientId: true,
        client: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true
          }
        },
        dossier: {
          select: {
            client: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                email: true
              }
            },
            clientNom: true,
            clientPrenom: true
          }
        }
      }
    });

    // Agréger les revenus par client
    const clientsRevenues = {};
    facturesAvecClients.forEach(facture => {
      // Déterminer le client (via facture.client ou dossier.client)
      const client = facture.client || facture.dossier?.client;
      
      if (client && client.id) {
        if (!clientsRevenues[client.id]) {
          clientsRevenues[client.id] = {
            id: client.id,
            nom: `${client.prenom || ''} ${client.nom || ''}`.trim(),
            email: client.email,
            revenus: 0,
            nombreFactures: 0
          };
        }
        clientsRevenues[client.id].revenus += facture.totalTTC;
        clientsRevenues[client.id].nombreFactures += 1;
      } else if (facture.dossier?.clientNom || facture.dossier?.clientPrenom) {
        // Client ancien format (sans ID)
        const nomComplet = `${facture.dossier.clientPrenom || ''} ${facture.dossier.clientNom || ''}`.trim();
        if (!clientsRevenues[nomComplet]) {
          clientsRevenues[nomComplet] = {
            id: null,
            nom: nomComplet,
            email: null,
            revenus: 0,
            nombreFactures: 0
          };
        }
        clientsRevenues[nomComplet].revenus += facture.totalTTC;
        clientsRevenues[nomComplet].nombreFactures += 1;
      }
    });

    // Trier et prendre les 5 premiers
    const topClients = Object.values(clientsRevenues)
      .sort((a, b) => b.revenus - a.revenus)
      .slice(0, 5);

    // Calculer les totaux
    const totalRevenus = revenusMensuels.reduce((sum, m) => sum + m.revenus, 0);
    const totalDossiers = nouveauxDossiersMensuels.reduce((sum, m) => sum + m.dossiers, 0);

    res.status(200).json({
      success: true,
      data: {
        annee: year,
        responsableId: responsableId || null,
        revenusMensuels,
        nouveauxDossiersMensuels,
        repartitionTypesDossiers,
        topClients,
        totaux: {
          revenus: totalRevenus,
          dossiers: totalDossiers
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la génération du rapport annuel:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération du rapport annuel',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


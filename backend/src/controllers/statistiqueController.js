import { prisma } from '../lib/prisma.js';

// Helper pour obtenir le cabinetId
const getCabinetId = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  return user.role === 'ADMIN' ? user.id : user.id;
};

// Noms des mois en français
const moisNoms = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'
];

// @desc    Récupérer les KPIs principaux du cabinet
// @route   GET /api/statistiques/kpi
// @access  Private
export const getKPIs = async (req, res) => {
  try {
    const cabinetId = await getCabinetId(req.user.userId);

    // Calculer le total des revenus (factures payées)
    const facturesPayees = await prisma.facture.aggregate({
      where: {
        cabinetId,
        statut: 'PAYEE',
        isArchived: false
      },
      _sum: {
        totalTTC: true
      }
    });

    const totalRevenus = facturesPayees._sum.totalTTC || 0;

    // Calculer le total des impayés (factures en retard)
    const facturesEnRetard = await prisma.facture.aggregate({
      where: {
        cabinetId,
        statut: 'EN_RETARD',
        isArchived: false
      },
      _sum: {
        totalTTC: true
      }
    });

    const totalImpayes = facturesEnRetard._sum.totalTTC || 0;

    // Compter les dossiers ouverts
    const dossiersOuverts = await prisma.dossier.count({
      where: {
        cabinetId,
        statut: 'OUVERT',
        isArchived: false
      }
    });

    // Compter tous les dossiers (pour le graphique)
    const totalDossiers = await prisma.dossier.count({
      where: {
        cabinetId,
        isArchived: false
      }
    });

    const dossiersFermes = await prisma.dossier.count({
      where: {
        cabinetId,
        statut: 'FERME',
        isArchived: false
      }
    });

    const dossiersEnAttente = await prisma.dossier.count({
      where: {
        cabinetId,
        statut: 'EN_ATTENTE',
        isArchived: false
      }
    });

    res.status(200).json({
      success: true,
      data: {
        totalRevenus: Number(totalRevenus),
        totalImpayes: Number(totalImpayes),
        dossiersOuverts,
        repartitionDossiers: {
          ouverts: dossiersOuverts,
          fermes: dossiersFermes,
          enAttente: dossiersEnAttente,
          total: totalDossiers
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des KPIs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
};

// @desc    Récupérer les revenus mensuels des 12 derniers mois
// @route   GET /api/statistiques/revenus-mensuels
// @access  Private
export const getRevenusMensuels = async (req, res) => {
  try {
    const cabinetId = await getCabinetId(req.user.userId);

    // Calculer la date d'il y a 12 mois
    const dateDebut = new Date();
    dateDebut.setMonth(dateDebut.getMonth() - 12);
    dateDebut.setDate(1); // Premier jour du mois
    dateDebut.setHours(0, 0, 0, 0);

    // Récupérer toutes les factures payées des 12 derniers mois
    const factures = await prisma.facture.findMany({
      where: {
        cabinetId,
        statut: 'PAYEE',
        isArchived: false,
        datePaiement: {
          gte: dateDebut
        }
      },
      select: {
        totalTTC: true,
        datePaiement: true
      }
    });

    // Initialiser les 12 derniers mois avec 0
    const revenusParMois = [];
    const maintenant = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(maintenant.getFullYear(), maintenant.getMonth() - i, 1);
      revenusParMois.push({
        mois: moisNoms[date.getMonth()],
        moisNumero: date.getMonth(),
        annee: date.getFullYear(),
        revenus: 0
      });
    }

    // Agréger les revenus par mois
    factures.forEach(facture => {
      if (facture.datePaiement) {
        const datePaiement = new Date(facture.datePaiement);
        const moisIndex = revenusParMois.findIndex(
          item => item.moisNumero === datePaiement.getMonth() && 
                  item.annee === datePaiement.getFullYear()
        );
        
        if (moisIndex !== -1) {
          revenusParMois[moisIndex].revenus += Number(facture.totalTTC);
        }
      }
    });

    // Formater pour le frontend (garder seulement mois et revenus)
    const resultat = revenusParMois.map(item => ({
      mois: item.mois,
      revenus: Number(item.revenus.toFixed(2))
    }));

    res.status(200).json({
      success: true,
      data: resultat
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des revenus mensuels:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des revenus mensuels'
    });
  }
};


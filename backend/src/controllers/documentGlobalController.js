import { prisma } from '../lib/prisma.js';

// Helper pour obtenir le cabinetId
const getCabinetId = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  return user.role === 'ADMIN' ? user.id : user.id;
};

// @desc    Récupérer tous les documents et factures agrégés
// @route   GET /api/documents/global
// @access  Private
export const getDocumentsGlobaux = async (req, res) => {
  try {
    const cabinetId = await getCabinetId(req.user.userId);

    // Récupérer les filtres de la query string
    const { type, sort = 'desc' } = req.query;

    // Récupérer tous les documents du cabinet
    const documents = await prisma.document.findMany({
      where: {
        dossier: {
          cabinetId,
          isArchived: false
        },
        isArchived: false
      },
      include: {
        dossier: {
          select: {
            id: true,
            nom: true,
            client: {
              select: {
                id: true,
                nom: true,
                prenom: true
              }
            },
            clientNom: true,
            clientPrenom: true
          }
        }
      },
      orderBy: {
        createdAt: sort === 'asc' ? 'asc' : 'desc'
      }
    });

    // Récupérer toutes les factures du cabinet
    const factures = await prisma.facture.findMany({
      where: {
        cabinetId,
        isArchived: false
      },
      include: {
        dossier: {
          select: {
            id: true,
            nom: true,
            client: {
              select: {
                id: true,
                nom: true,
                prenom: true
              }
            },
            clientNom: true,
            clientPrenom: true
          }
        },
        client: {
          select: {
            id: true,
            nom: true,
            prenom: true
          }
        }
      },
      orderBy: {
        createdAt: sort === 'asc' ? 'asc' : 'desc'
      }
    });

    // Transformer les documents en format unifié
    const documentsFormates = documents.map(doc => {
      const client = doc.dossier?.client || (doc.dossier?.clientNom || doc.dossier?.clientPrenom ? {
        id: null,
        nom: doc.dossier.clientNom,
        prenom: doc.dossier.clientPrenom
      } : null);

      return {
        id: doc.id,
        type: 'Document',
        nom: doc.nomFichier,
        dateAjout: doc.createdAt?.toISOString() || new Date().toISOString(),
        dossier: doc.dossier ? {
          id: doc.dossier.id,
          nom: doc.dossier.nom
        } : null,
        client: client ? {
          id: client.id,
          nom: `${client.prenom || ''} ${client.nom || ''}`.trim()
        } : null,
        url: doc.urlS3,
        taille: doc.taille,
        typeMime: doc.typeMime
      };
    });

    // Transformer les factures en format unifié
    const facturesFormatees = factures.map(facture => {
      const client = facture.client || facture.dossier?.client || (facture.dossier?.clientNom || facture.dossier?.clientPrenom ? {
        id: null,
        nom: facture.dossier.clientNom,
        prenom: facture.dossier.clientPrenom
      } : null);

      return {
        id: facture.id,
        type: 'Facture',
        nom: `Facture ${facture.numeroFacture}`,
        dateAjout: facture.createdAt?.toISOString() || new Date().toISOString(),
        dossier: facture.dossier ? {
          id: facture.dossier.id,
          nom: facture.dossier.nom
        } : null,
        client: client ? {
          id: client.id,
          nom: `${client.prenom || ''} ${client.nom || ''}`.trim()
        } : null,
        url: null, // Les factures sont générées à la volée
        numeroFacture: facture.numeroFacture,
        totalTTC: facture.totalTTC,
        statut: facture.statut
      };
    });

    // Fusionner les deux listes
    let resultats = [...documentsFormates, ...facturesFormatees];

    // Filtrer par type si spécifié
    if (type && type !== 'Tous') {
      resultats = resultats.filter(item => item.type === type);
    }

    // Trier par date (déjà trié individuellement, mais on peut re-trier après fusion)
    resultats.sort((a, b) => {
      const dateA = new Date(a.dateAjout);
      const dateB = new Date(b.dateAjout);
      return sort === 'asc' ? dateA - dateB : dateB - dateA;
    });

    res.status(200).json({
      success: true,
      data: {
        documents: resultats,
        total: resultats.length
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des documents globaux:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des documents globaux',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


import { prisma } from '../lib/prisma.js';

// Helper pour obtenir le cabinetId
const getCabinetId = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  return user.role === 'ADMIN' ? user.id : user.id;
};

// Helper pour convertir Client en format public
const clientToPublicJSON = (client) => {
  return {
    id: client.id,
    nom: client.nom,
    prenom: client.prenom,
    email: client.email,
    telephone: client.telephone,
    sexe: client.sexe,
    adresse: client.adresse,
    nombreDossiers: client._count?.dossiers || 0,
    facturesEnAttente: client._count?.factures || 0,
    createdAt: client.createdAt?.toISOString(),
    updatedAt: client.updatedAt?.toISOString()
  };
};

// @desc    Créer un nouveau client
// @route   POST /api/clients
// @access  Private
export const createClient = async (req, res) => {
  try {
    const cabinetId = await getCabinetId(req.user.userId);

    // Vérifier si l'email existe déjà pour ce cabinet
    const existingClient = await prisma.client.findFirst({
      where: {
        email: req.body.email,
        cabinetId
      }
    });

    if (existingClient) {
      return res.status(400).json({
        success: false,
        message: 'Un client avec cet email existe déjà'
      });
    }

    // Créer le client
    const client = await prisma.client.create({
      data: {
        nom: req.body.nom,
        prenom: req.body.prenom,
        email: req.body.email,
        telephone: req.body.telephone || null,
        sexe: req.body.sexe ? req.body.sexe.toUpperCase().replace(/ /g, '_') : null,
        adresse: req.body.adresse || null,
        cabinetId
      }
    });

    res.status(201).json({
      success: true,
      message: 'Client créé avec succès',
      data: {
        client: clientToPublicJSON(client)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la création du client:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du client',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Lister tous les clients du cabinet
// @route   GET /api/clients
// @access  Private
export const getClients = async (req, res) => {
  try {
    const cabinetId = await getCabinetId(req.user.userId);

    // Recherche optionnelle
    const search = req.query.search || '';
    const where = {
      cabinetId,
      isArchived: false
    };

    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { prenom: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { telephone: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Récupérer les clients avec agrégations
    const clients = await prisma.client.findMany({
      where,
      include: {
        _count: {
          select: {
            dossiers: {
              where: {
                isArchived: false
              }
            },
            factures: {
              where: {
                isArchived: false,
                statut: {
                  in: ['ENVOYEE', 'EN_RETARD']
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transformer les résultats pour inclure les compteurs
    const clientsWithCounts = clients.map(client => ({
      ...clientToPublicJSON(client),
      nombreDossiers: client._count.dossiers,
      facturesEnAttente: client._count.factures
    }));

    res.status(200).json({
      success: true,
      data: {
        clients: clientsWithCounts
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des clients:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des clients',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Récupérer un client par ID
// @route   GET /api/clients/:id
// @access  Private
export const getClientById = async (req, res) => {
  try {
    const cabinetId = await getCabinetId(req.user.userId);

    const client = await prisma.client.findFirst({
      where: {
        id: req.params.id,
        cabinetId
      },
      include: {
        _count: {
          select: {
            dossiers: {
              where: {
                isArchived: false
              }
            },
            factures: {
              where: {
                isArchived: false,
                statut: {
                  in: ['ENVOYEE', 'EN_RETARD']
                }
              }
            }
          }
        }
      }
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client non trouvé'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        client: {
          ...clientToPublicJSON(client),
          nombreDossiers: client._count.dossiers,
          facturesEnAttente: client._count.factures
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du client:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du client',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Mettre à jour un client
// @route   PUT /api/clients/:id
// @access  Private
export const updateClient = async (req, res) => {
  try {
    const cabinetId = await getCabinetId(req.user.userId);

    const client = await prisma.client.findFirst({
      where: {
        id: req.params.id,
        cabinetId
      }
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client non trouvé'
      });
    }

    // Vérifier si l'email existe déjà pour un autre client
    if (req.body.email && req.body.email !== client.email) {
      const existingClient = await prisma.client.findFirst({
        where: {
          email: req.body.email,
          cabinetId,
          id: { not: req.params.id }
        }
      });

      if (existingClient) {
        return res.status(400).json({
          success: false,
          message: 'Un client avec cet email existe déjà'
        });
      }
    }

    // Préparer les données de mise à jour
    const updateData = {};
    if (req.body.nom) updateData.nom = req.body.nom;
    if (req.body.prenom) updateData.prenom = req.body.prenom;
    if (req.body.email) updateData.email = req.body.email;
    if (req.body.telephone !== undefined) updateData.telephone = req.body.telephone || null;
    if (req.body.sexe !== undefined) {
      updateData.sexe = req.body.sexe ? req.body.sexe.toUpperCase().replace(/ /g, '_') : null;
    }
    if (req.body.adresse !== undefined) updateData.adresse = req.body.adresse || null;

    // Mettre à jour le client
    const clientUpdated = await prisma.client.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        _count: {
          select: {
            dossiers: {
              where: {
                isArchived: false
              }
            },
            factures: {
              where: {
                isArchived: false,
                statut: {
                  in: ['ENVOYEE', 'EN_RETARD']
                }
              }
            }
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      message: 'Client mis à jour avec succès',
      data: {
        client: {
          ...clientToPublicJSON(clientUpdated),
          nombreDossiers: clientUpdated._count.dossiers,
          facturesEnAttente: clientUpdated._count.factures
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du client:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du client',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Supprimer (archiver) un client
// @route   DELETE /api/clients/:id
// @access  Private
export const deleteClient = async (req, res) => {
  try {
    const cabinetId = await getCabinetId(req.user.userId);

    const client = await prisma.client.findFirst({
      where: {
        id: req.params.id,
        cabinetId
      },
      include: {
        _count: {
          select: {
            dossiers: true,
            factures: true
          }
        }
      }
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client non trouvé'
      });
    }

    // Vérifier si le client a des dossiers ou factures actifs
    if (client._count.dossiers > 0 || client._count.factures > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer un client ayant des dossiers ou factures associés'
      });
    }

    // Archiver le client (soft delete)
    await prisma.client.update({
      where: { id: req.params.id },
      data: { isArchived: true }
    });

    res.status(200).json({
      success: true,
      message: 'Client supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du client:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du client',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


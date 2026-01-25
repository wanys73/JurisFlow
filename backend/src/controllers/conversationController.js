import { prisma } from '../lib/prisma.js';

// @desc    Créer une nouvelle conversation
// @route   POST /api/studio-ia/conversations
// @access  Private
export const createConversation = async (req, res) => {
  try {
    const { title, dossierId } = req.body;
    const userId = req.user.userId;

    const conversation = await prisma.conversation.create({
      data: {
        title: title || 'Nouvelle conversation',
        userId,
        dossierId: dossierId || null
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: { conversation }
    });
  } catch (error) {
    console.error('Erreur création conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la conversation'
    });
  }
};

// @desc    Récupérer toutes les conversations de l'utilisateur
// @route   GET /api/studio-ia/conversations
// @access  Private
export const getConversations = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20, dossierId } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      userId,
      isArchived: false
    };

    if (dossierId) {
      where.dossierId = dossierId;
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 1 // Seulement le premier message pour la preview
          },
          dossier: {
            select: {
              id: true,
              nom: true
            }
          },
          _count: {
            select: { messages: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.conversation.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: {
        conversations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erreur récupération conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des conversations'
    });
  }
};

// @desc    Récupérer une conversation avec son historique complet
// @route   GET /api/studio-ia/conversations/:id
// @access  Private
export const getConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        },
        dossier: {
          select: {
            id: true,
            nom: true,
            numeroAffaire: true
          }
        }
      }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation non trouvée'
      });
    }

    res.status(200).json({
      success: true,
      data: { conversation }
    });
  } catch (error) {
    console.error('Erreur récupération conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la conversation'
    });
  }
};

// @desc    Ajouter un message à une conversation
// @route   POST /api/studio-ia/conversations/:id/messages
// @access  Private
export const addMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, content } = req.body;
    const userId = req.user.userId;

    // Vérifier que la conversation appartient à l'utilisateur
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation non trouvée'
      });
    }

    const message = await prisma.message.create({
      data: {
        conversationId: id,
        role,
        content
      }
    });

    // Mettre à jour le updatedAt de la conversation
    await prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() }
    });

    res.status(201).json({
      success: true,
      data: { message }
    });
  } catch (error) {
    console.error('Erreur ajout message:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout du message'
    });
  }
};

// @desc    Mettre à jour le titre d'une conversation
// @route   PATCH /api/studio-ia/conversations/:id
// @access  Private
export const updateConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    const userId = req.user.userId;

    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation non trouvée'
      });
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data: { title }
    });

    res.status(200).json({
      success: true,
      data: { conversation: updated }
    });
  } catch (error) {
    console.error('Erreur mise à jour conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour'
    });
  }
};

// @desc    Supprimer une conversation
// @route   DELETE /api/studio-ia/conversations/:id
// @access  Private
export const deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation non trouvée'
      });
    }

    // Archiver plutôt que supprimer
    await prisma.conversation.update({
      where: { id },
      data: { isArchived: true }
    });

    res.status(200).json({
      success: true,
      message: 'Conversation archivée'
    });
  } catch (error) {
    console.error('Erreur suppression conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression'
    });
  }
};

import { prisma } from '../lib/prisma.js';

// @desc    Récupérer les notifications non lues de l'utilisateur
// @route   GET /api/notifications
// @access  Private
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Récupérer les notifications non lues
    const notifications = await prisma.notification.findMany({
      where: {
        utilisateurId: userId,
        lu: false
      },
      orderBy: {
        dateEnvoi: 'desc'
      }
    });
    
    res.status(200).json({
      success: true,
      data: {
        notifications,
        count: notifications.length
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des notifications'
    });
  }
};

// @desc    Récupérer toutes les notifications de l'utilisateur (lues et non lues)
// @route   GET /api/notifications/all
// @access  Private
export const getAllNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 50 } = req.query;
    
    const notifications = await prisma.notification.findMany({
      where: {
        utilisateurId: userId
      },
      orderBy: {
        dateEnvoi: 'desc'
      },
      take: parseInt(limit)
    });
    
    const unreadCount = await prisma.notification.count({
      where: {
        utilisateurId: userId,
        lu: false
      }
    });
    
    res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des notifications'
    });
  }
};

// @desc    Marquer une notification comme lue
// @route   PUT /api/notifications/:id/lu
// @access  Private
export const markAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    
    // Vérifier que la notification appartient à l'utilisateur
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        utilisateurId: userId
      }
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification non trouvée'
      });
    }
    
    // Marquer comme lue
    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: { lu: true }
    });
    
    res.status(200).json({
      success: true,
      data: updatedNotification
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la notification:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la notification'
    });
  }
};

// @desc    Marquer toutes les notifications comme lues
// @route   PUT /api/notifications/mark-all-read
// @access  Private
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    await prisma.notification.updateMany({
      where: {
        utilisateurId: userId,
        lu: false
      },
      data: {
        lu: true
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'Toutes les notifications ont été marquées comme lues'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour des notifications'
    });
  }
};


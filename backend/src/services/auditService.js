import { prisma } from '../lib/prisma.js';

/**
 * Service d'audit pour tracer toutes les actions
 * Conforme aux exigences RGPD pour les avocats
 */

export const logActivity = async (userId, action, target, targetId = null, metadata = null) => {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action, // "CREATE", "UPDATE", "DELETE"
        target, // "Dossier", "Client", "Facture", etc.
        targetId,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null
      }
    });
    console.log(`📝 Audit Log: ${action} ${target} by user ${userId}`);
  } catch (error) {
    console.error('❌ Erreur audit log:', error);
    // Ne pas bloquer l'opération principale en cas d'erreur d'audit
  }
};

export const getActivityLogs = async (userId, filters = {}) => {
  try {
    const { action, target, limit = 100 } = filters;
    
    const where = { userId };
    if (action) where.action = action;
    if (target) where.target = target;

    const logs = await prisma.activityLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            email: true,
            nom: true,
            prenom: true
          }
        }
      }
    });

    return logs;
  } catch (error) {
    console.error('❌ Erreur récupération logs:', error);
    throw error;
  }
};

/**
 * Obtenir un résumé des activités par type
 */
export const getActivitySummary = async (userId, days = 30) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await prisma.activityLog.findMany({
      where: {
        userId,
        timestamp: { gte: since }
      },
      select: {
        action: true,
        target: true
      }
    });

    // Grouper par action et target
    const summary = logs.reduce((acc, log) => {
      const key = `${log.action}_${log.target}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return summary;
  } catch (error) {
    console.error('❌ Erreur résumé d\'activités:', error);
    throw error;
  }
};

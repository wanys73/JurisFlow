import { logActivity } from '../services/auditService.js';

/**
 * Middleware d'audit qui trace toutes les modifications de données
 * Conforme aux exigences de traçabilité pour les avocats
 * 
 * ⚠️ IMPORTANT : Ce middleware ne doit JAMAIS bloquer une requête
 * Toutes les erreurs sont catchées et loggées sans être propagées
 */
export const auditMiddleware = (req, res, next) => {
  const originalSend = res.send;
  const originalJson = res.json;

  // Intercepter les réponses réussies
  const logIfSuccess = (data, statusCode) => {
    // Wrapper dans un try-catch pour éviter tout blocage
    try {
      if (statusCode >= 200 && statusCode < 300 && req.user) {
        const method = req.method;
        const path = req.route?.path || req.path;

        // Mapper les méthodes HTTP aux actions d'audit
        let action = null;
        if (method === 'POST') action = 'CREATE';
        else if (method === 'PUT' || method === 'PATCH') action = 'UPDATE';
        else if (method === 'DELETE') action = 'DELETE';

        // Extraire la ressource cible depuis le path
        let target = null;
        let targetId = null;

        if (path.includes('/dossiers')) {
          target = 'Dossier';
          targetId = req.params.id || req.body?.id;
        } else if (path.includes('/clients')) {
          target = 'Client';
          targetId = req.params.id || req.body?.id;
        } else if (path.includes('/factures')) {
          target = 'Facture';
          targetId = req.params.id || req.body?.id;
        } else if (path.includes('/documents')) {
          target = 'Document';
          targetId = req.params.docId || req.params.id || req.body?.id;
        } else if (path.includes('/studio-ia') || path.includes('/conversations')) {
          target = 'StudioIA';
          targetId = req.body?.conversationId || req.body?.dossierId;
        } else if (path.includes('/evenements') || path.includes('/agenda')) {
          target = 'Evenement';
          targetId = req.params.id || req.body?.id;
        }

        // Logger uniquement si on a détecté une action de modification
        if (action && target) {
          const metadata = {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            path,
            method
          };

          // Asynchrone et non bloquant
          logActivity(req.user.userId, action, target, targetId, metadata)
            .catch(err => console.error('⚠️ Erreur audit log (non bloquante):', err.message));
        }
      }
    } catch (error) {
      // Ne JAMAIS propager l'erreur
      console.error('⚠️ Erreur audit middleware (non bloquante):', error.message);
    }
  };

  // Override res.send avec protection
  res.send = function (data) {
    try {
      logIfSuccess(data, res.statusCode);
    } catch (error) {
      console.error('⚠️ Erreur res.send audit (non bloquante):', error.message);
    }
    return originalSend.call(this, data);
  };

  // Override res.json avec protection
  res.json = function (data) {
    try {
      logIfSuccess(data, res.statusCode);
    } catch (error) {
      console.error('⚠️ Erreur res.json audit (non bloquante):', error.message);
    }
    return originalJson.call(this, data);
  };

  next();
};

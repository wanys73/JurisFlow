import { logActivity } from '../services/auditService.js';

/**
 * Middleware d'audit qui trace toutes les modifications de données
 * Conforme aux exigences de traçabilité pour les avocats
 */
export const auditMiddleware = (req, res, next) => {
  const originalSend = res.send;
  const originalJson = res.json;

  // Intercepter les réponses réussies
  const logIfSuccess = (data, statusCode) => {
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

        logActivity(req.user.userId, action, target, targetId, metadata)
          .catch(err => console.error('❌ Erreur async audit log:', err));
      }
    }
  };

  // Override res.send
  res.send = function (data) {
    logIfSuccess(data, res.statusCode);
    return originalSend.call(this, data);
  };

  // Override res.json
  res.json = function (data) {
    logIfSuccess(data, res.statusCode);
    return originalJson.call(this, data);
  };

  next();
};

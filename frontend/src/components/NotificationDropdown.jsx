import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, Check, Calendar, Euro, FileText, CheckCircle } from 'lucide-react';
import { notificationService } from '../services/api.js';

const NotificationDropdown = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Charger les notifications
  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationService.getAllNotifications(20);
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Charger les notifications au montage et toutes les 30 secondes
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // Rafraîchir toutes les 30 secondes
    return () => clearInterval(interval);
  }, []);

  // Fermer le dropdown si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Marquer une notification comme lue
  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, lu: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la notification:', error);
    }
  };

  // Marquer toutes comme lues
  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(notif => ({ ...notif, lu: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Erreur lors de la mise à jour des notifications:', error);
    }
  };

  // Formater la date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  // Déterminer le type de notification et l'icône
  const getNotificationIcon = (titre, message) => {
    const titreLower = titre.toLowerCase();
    const messageLower = message.toLowerCase();
    
    if (titreLower.includes('agenda') || titreLower.includes('audience') || titreLower.includes('rendez-vous') || titreLower.includes('tâche') || titreLower.includes('échéance')) {
      return <Calendar className="w-5 h-5 text-blue-500" />;
    }
    if (titreLower.includes('facture') || titreLower.includes('paiement') || messageLower.includes('facture')) {
      if (titreLower.includes('paiement reçu') || messageLower.includes('payée')) {
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      }
      return <Euro className="w-5 h-5 text-yellow-500" />;
    }
    if (titreLower.includes('document') || messageLower.includes('document')) {
      return <FileText className="w-5 h-5 text-purple-500" />;
    }
    return <Bell className="w-5 h-5 text-secondary-500" />;
  };

  // Déterminer la route de redirection
  const getNotificationRoute = (titre, message) => {
    const titreLower = titre.toLowerCase();
    const messageLower = message.toLowerCase();
    
    if (titreLower.includes('agenda') || titreLower.includes('audience') || titreLower.includes('rendez-vous') || titreLower.includes('tâche') || titreLower.includes('échéance')) {
      return '/agenda';
    }
    if (titreLower.includes('facture') || messageLower.includes('facture')) {
      return '/facturation';
    }
    if (titreLower.includes('document') || messageLower.includes('document')) {
      return '/documents';
    }
    return null;
  };

  // Gérer le clic sur une notification
  const handleNotificationClick = async (notification) => {
    // Marquer comme lue si elle ne l'est pas déjà
    if (!notification.lu) {
      await handleMarkAsRead(notification.id);
    }
    
    // Rediriger vers la page concernée
    const route = getNotificationRoute(notification.titre, notification.message);
    if (route) {
      setIsOpen(false);
      navigate(route);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bouton avec badge */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            loadNotifications();
          }
        }}
        className="relative p-2 text-secondary-600 dark:text-secondary-300 hover:text-secondary-900 dark:hover:text-white hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg transition-colors"
        title="Notifications"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-secondary-800 rounded-lg shadow-lg border border-secondary-200 dark:border-secondary-700 z-50 max-h-[500px] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-secondary-200 dark:border-secondary-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 text-sm font-normal text-secondary-500 dark:text-secondary-400">
                  ({unreadCount} non lue{unreadCount > 1 ? 's' : ''})
                </span>
              )}
            </h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                  title="Tout marquer comme lu"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-secondary-400 dark:text-secondary-500 hover:text-secondary-600 dark:hover:text-secondary-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Liste des notifications */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-4 text-center text-secondary-500 dark:text-secondary-400">
                Chargement...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-secondary-500 dark:text-secondary-400">
                Aucune notification
              </div>
            ) : (
              <div className="divide-y divide-secondary-200 dark:divide-secondary-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors cursor-pointer ${
                      !notification.lu ? 'bg-primary-50/50 dark:bg-primary-900/20' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Icône */}
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.titre, notification.message)}
                      </div>
                      
                      {/* Contenu */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start space-x-2">
                              {!notification.lu && (
                                <div className="mt-1.5 w-2 h-2 bg-primary-600 rounded-full flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${
                                  !notification.lu
                                    ? 'text-secondary-900 dark:text-white'
                                    : 'text-secondary-700 dark:text-secondary-300'
                                }`}>
                                  {notification.titre}
                                </p>
                                <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1 line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-2">
                                  {formatDate(notification.dateEnvoi)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;


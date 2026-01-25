import axios from 'axios';

// Configuration de base d'axios
// S'assurer que la baseURL se termine par /api et ne contient pas de slash final
const getBaseURL = () => {
  const envURL = import.meta.env.VITE_API_URL;
  if (envURL) {
    // Nettoyer l'URL : enlever le slash final s'il existe
    return envURL.endsWith('/') ? envURL.slice(0, -1) : envURL;
  }
  // Utiliser 5087 comme fallback (port par défaut du backend)
  return 'http://localhost:5087/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token à chaque requête
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs de réponse
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si le token est expiré (401) et qu'on n'a pas déjà essayé de rafraîchir
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (refreshToken) {
          // Utiliser l'instance api configurée au lieu d'axios directement
          const response = await api.post('/auth/refresh', { refreshToken });

          const { accessToken } = response.data.data;
          localStorage.setItem('accessToken', accessToken);

          // Réessayer la requête originale avec le nouveau token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Si le refresh échoue, déconnecter l'utilisateur
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Service d'authentification
export const authService = {
  // Inscription
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    if (response.data.success && response.data.data) {
      const { user, tokens } = response.data.data;
      
      // Inscription avec connexion automatique (tokens toujours présents)
      if (tokens) {
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        localStorage.setItem('user', JSON.stringify(user));
        console.log('✅ Inscription et connexion automatique réussies');
      }
    }
    return response.data;
  },

  // Connexion
  login: async (credentials) => {
    try {
      console.log('🔐 Tentative de connexion vers:', api.defaults.baseURL + '/auth/login');
      const response = await api.post('/auth/login', credentials);
      console.log('✅ Réponse reçue:', response.data);
      if (response.data.success && response.data.data) {
        const { user, tokens } = response.data.data;
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        localStorage.setItem('user', JSON.stringify(user));
        console.log('✅ Tokens sauvegardés, utilisateur:', user.email);
      }
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la connexion:', error);
      console.error('❌ Détails:', error.response?.data || error.message);
      throw error;
    }
  },

  // Déconnexion
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },

  // Récupérer le profil
  getProfile: async () => {
    const response = await api.get('/auth/me');
    if (response.data.success && response.data.data) {
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  },

  // Récupérer les préférences utilisateur
  getPreferences: async () => {
    const response = await api.get('/auth/preferences');
    return response.data;
  },

  // Mettre à jour les préférences utilisateur
  updatePreferences: async (preferences) => {
    const response = await api.put('/auth/preferences', preferences);
    return response.data;
  },

  // Rafraîchir le token
  refreshToken: async (refreshToken) => {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  // Demander une réinitialisation de mot de passe
  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  // Réinitialiser le mot de passe avec un token
  resetPassword: async (token, password) => {
    const response = await api.post(`/auth/reset-password/${token}`, { password });
    return response.data;
  },
};

// Service utilisateur (à étendre plus tard)
export const userService = {
  // À implémenter
};

// Service dossiers
export const dossierService = {
  // Lister tous les dossiers
  getDossiers: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const response = await api.get(`/dossiers${queryParams ? `?${queryParams}` : ''}`);
    return response.data;
  },

  // Récupérer un dossier par ID
  getDossierById: async (id) => {
    const response = await api.get(`/dossiers/${id}`);
    return response.data;
  },

  // Créer un nouveau dossier
  createDossier: async (dossierData) => {
    const response = await api.post('/dossiers', dossierData);
    return response.data;
  },

  // Mettre à jour un dossier
  updateDossier: async (id, dossierData) => {
    const response = await api.put(`/dossiers/${id}`, dossierData);
    return response.data;
  },

  // Supprimer un dossier
  deleteDossier: async (id) => {
    const response = await api.delete(`/dossiers/${id}`);
    return response.data;
  },

  // Ajouter une note à un dossier
  addNote: async (id, contenu) => {
    const response = await api.post(`/dossiers/${id}/notes`, { contenu });
    return response.data;
  },

  // Récupérer les dossiers urgents (échéance < 30 jours)
  getUrgentDossiers: async () => {
    const response = await api.get('/dossiers/urgent');
    return response.data;
  }
};

// Service clients
export const clientService = {
  // Récupérer tous les clients
  getClients: async (params = {}) => {
    const response = await api.get('/clients', { params });
    return response.data;
  },

  // Récupérer un client par ID
  getClientById: async (id) => {
    const response = await api.get(`/clients/${id}`);
    return response.data;
  },

  // Créer un client
  createClient: async (clientData) => {
    const response = await api.post('/clients', clientData);
    return response.data;
  },

  // Mettre à jour un client
  updateClient: async (id, clientData) => {
    const response = await api.put(`/clients/${id}`, clientData);
    return response.data;
  },

  // Supprimer un client
  deleteClient: async (id) => {
    const response = await api.delete(`/clients/${id}`);
    return response.data;
  }
};

// Service documents
export const documentService = {
  // Uploader des documents dans un dossier
  uploadDocuments: async (dossierId, files, metadata = {}) => {
    const formData = new FormData();
    
    // Ajouter les fichiers
    if (Array.isArray(files)) {
      files.forEach(file => {
        formData.append('documents', file);
      });
    } else {
      formData.append('documents', files);
    }
    
    // Ajouter les métadonnées (description, catégorie)
    if (metadata.description) {
      formData.append('description', metadata.description);
    }
    if (metadata.categorie) {
      formData.append('categorie', metadata.categorie);
    }
    
    const response = await api.post(`/dossiers/${dossierId}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Récupérer les documents d'un dossier
  getDocumentsByDossier: async (dossierId) => {
    const response = await api.get(`/dossiers/${dossierId}/documents`);
    return response.data;
  },

  // Obtenir l'URL de téléchargement d'un document
  getDownloadUrl: async (documentId) => {
    const response = await api.get(`/documents/${documentId}/download`);
    return response.data;
  },

  // Supprimer un document
  deleteDocument: async (documentId) => {
    const response = await api.delete(`/documents/${documentId}`);
    return response.data;
  },

  // Récupérer tous les documents et factures globaux (agrégés)
  getDocumentsGlobaux: async (params = {}) => {
    const response = await api.get('/documents/global', { params });
    return response.data;
  }
};

// Service factures
export const factureService = {
  // Récupérer toutes les factures
  getFactures: async (params = {}) => {
    // Nettoyer les paramètres : ne garder que les valeurs non vides
    const cleanParams = {};
    Object.keys(params).forEach(key => {
      const value = params[key];
      if (value !== null && value !== undefined && value !== '') {
        cleanParams[key] = value;
      }
    });
    
    // Utiliser URLSearchParams comme pour getDossiers pour un encodage cohérent
    console.log('[DEBUG API] Paramètres nettoyés pour getFactures:', cleanParams);
    console.log('[DEBUG API] Statut brut:', cleanParams.statut);
    console.log('[DEBUG API] Type de statut:', typeof cleanParams.statut);
    
    const queryParams = new URLSearchParams(cleanParams).toString();
    const url = `/factures${queryParams ? `?${queryParams}` : ''}`;
    console.log('[DEBUG API] URL complète:', url);
    console.log('[DEBUG API] Statut dans l\'URL:', queryParams);
    
    const response = await api.get(url);
    console.log('[DEBUG API] Réponse reçue:', response.data);
    return response.data;
  },

  // Récupérer une facture par ID
  getFactureById: async (id) => {
    const response = await api.get(`/factures/${id}`);
    return response.data;
  },

  // Créer une facture
  createFacture: async (factureData) => {
    const response = await api.post('/factures', factureData);
    return response.data;
  },

  // Mettre à jour une facture
  updateFacture: async (id, factureData) => {
    const response = await api.put(`/factures/${id}`, factureData);
    return response.data;
  },

  // Supprimer une facture
  deleteFacture: async (id) => {
    const response = await api.delete(`/factures/${id}`);
    return response.data;
  },

  // Marquer une facture comme payée
  marquerPayee: async (id) => {
    const response = await api.patch(`/factures/${id}/payer`);
    return response.data;
  },

  // Télécharger le PDF d'une facture
  downloadPDF: async (id) => {
    const response = await api.get(`/factures/${id}/pdf`, {
      responseType: 'blob'
    });
    return response.data;
  }
};

// Service événements (agenda)
export const evenementService = {
  // Récupérer tous les événements (avec filtrage par plage de dates)
  getEvenements: async (params = {}) => {
    const response = await api.get('/agenda', { params });
    return response.data;
  },

  // Récupérer un événement par ID
  getEvenementById: async (id) => {
    const response = await api.get(`/agenda/${id}`);
    return response.data;
  },

  // Créer un événement
  createEvenement: async (evenementData) => {
    const response = await api.post('/agenda', evenementData);
    return response.data;
  },

  // Mettre à jour un événement
  updateEvenement: async (id, evenementData) => {
    const response = await api.put(`/agenda/${id}`, evenementData);
    return response.data;
  },

  // Supprimer un événement
  deleteEvenement: async (id) => {
    const response = await api.delete(`/agenda/${id}`);
    return response.data;
  }
};

// Exporter l'instance axios pour les cas spéciaux (comme les PDFs)
export { api };

// Service IA - Génération de documents et Chat
export const iaService = {
  // Récupérer les templates disponibles
  getTemplates: async () => {
    const response = await api.get('/documents/templates');
    return response.data;
  },

  // Générer un document avec l'IA
  generateDocument: async (dossierId, templateType, promptContextuel = '') => {
    const response = await api.post('/documents/generate', {
      dossierId,
      templateType,
      promptContextuel
    });
    return response.data;
  },

  // Chat avec l'IA pour conseils juridiques
  chat: async (message, history = []) => {
    const response = await api.post('/ia/chat', {
      message,
      history
    });
    return response.data;
  }
};

// Service Statistiques - Tableau de bord
export const statistiqueService = {
  // Récupérer les KPIs principaux
  getKPIs: async () => {
    const response = await api.get('/statistiques/kpi');
    return response.data;
  },

  // Récupérer les revenus mensuels des 12 derniers mois
  getRevenusMensuels: async () => {
    const response = await api.get('/statistiques/revenus-mensuels');
    return response.data;
  }
};

// Service Rapports - Statistiques avancées
export const rapportService = {
  // Récupérer le rapport annuel avec filtres
  getRapportAnnuel: async (params = {}) => {
    const response = await api.get('/rapports/annuel', { params });
    return response.data;
  }
};

// Service Cabinet - Paramètres
export const notificationService = {
  // Récupérer les notifications non lues
  getNotifications: async () => {
    const response = await api.get('/notifications');
    return response.data;
  },

  // Récupérer toutes les notifications
  getAllNotifications: async (limit = 50) => {
    const response = await api.get('/notifications/all', { params: { limit } });
    return response.data;
  },

  // Marquer une notification comme lue
  markAsRead: async (notificationId) => {
    const response = await api.put(`/notifications/${notificationId}/lu`);
    return response.data;
  },

  // Marquer toutes les notifications comme lues
  markAllAsRead: async () => {
    const response = await api.put('/notifications/mark-all-read');
    return response.data;
  }
};

export const cabinetService = {
  // Récupérer les paramètres du cabinet
  getSettings: async () => {
    const response = await api.get('/cabinet/settings');
    return response.data;
  },

  // Mettre à jour les paramètres du cabinet
  updateSettings: async (formData) => {
    const response = await api.put('/cabinet/settings', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Changer le mot de passe
  changePassword: async (passwordData) => {
    const response = await api.put('/cabinet/change-password', passwordData);
    return response.data;
  }
};

export default api;


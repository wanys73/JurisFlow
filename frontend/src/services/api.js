import axios from 'axios';

// Configuration de base d'axios
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
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
          const response = await axios.post(
            `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/refresh`,
            { refreshToken }
          );

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
    if (response.data.success) {
      const { user, tokens } = response.data.data;
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
    }
    return response.data;
  },

  // Connexion
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data.success) {
      const { user, tokens } = response.data.data;
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
    }
    return response.data;
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
    return response.data;
  },

  // Rafraîchir le token
  refreshToken: async (refreshToken) => {
    const response = await api.post('/auth/refresh', { refreshToken });
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
    const response = await api.get('/factures', { params });
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

// Service IA - Génération de documents
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

export default api;


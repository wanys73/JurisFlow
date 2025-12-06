import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Charger l'utilisateur au démarrage
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('accessToken');

        if (storedUser && token) {
          // Vérifier que le token est toujours valide
          try {
            const response = await authService.getProfile();
            if (response.success && response.data && response.data.user) {
              setUser(response.data.user);
            }
          } catch (error) {
            // Token invalide, nettoyer le localStorage
            localStorage.removeItem('user');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement de l\'utilisateur:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // Connexion
  const login = async (credentials) => {
    try {
      console.log('🔐 AuthContext: Tentative de connexion pour:', credentials.email);
      const response = await authService.login(credentials);
      console.log('📦 AuthContext: Réponse reçue:', response);
      if (response.success && response.data && response.data.user) {
        console.log('✅ AuthContext: Utilisateur trouvé:', response.data.user.email);
        setUser(response.data.user);
        return { success: true };
      }
      console.warn('⚠️ AuthContext: Réponse invalide:', response);
      return { success: false, message: response.message || 'Erreur lors de la connexion' };
    } catch (error) {
      console.error('❌ AuthContext: Erreur de connexion:', error);
      const message = error.response?.data?.message || error.message || 'Erreur lors de la connexion';
      return { success: false, message };
    }
  };

  // Inscription
  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      if (response.success && response.data) {
        const { user } = response.data;
        
        // Inscription avec connexion automatique (tokens toujours présents)
        setUser(user);
        console.log('✅ Inscription réussie et utilisateur connecté:', user.email);
        return { 
          success: true,
          message: response.message || 'Inscription réussie. Bienvenue sur JurisFlow !'
        };
      }
      return { success: false, message: response.message || 'Erreur lors de l\'inscription' };
    } catch (error) {
      console.error('Erreur d\'inscription:', error);
      const message = error.response?.data?.message || error.message || 'Erreur lors de l\'inscription';
      const errors = error.response?.data?.errors;
      return { success: false, message, errors };
    }
  };

  // Déconnexion
  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      setUser(null);
    }
  };

  // Mettre à jour l'utilisateur
  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};


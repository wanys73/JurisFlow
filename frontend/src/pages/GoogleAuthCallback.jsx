import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';

const GoogleAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updateUser } = useAuth();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const error = searchParams.get('error');

    if (error) {
      console.error('Erreur Google OAuth:', error);
      navigate('/login', { 
        state: { 
          error: 'Échec de l\'authentification Google. Veuillez réessayer.' 
        } 
      });
      return;
    }

    if (accessToken && refreshToken) {
      // Sauvegarder les tokens dans localStorage
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      // Récupérer les informations utilisateur
      authService.getProfile()
        .then(response => {
          if (response.success && response.data?.user) {
            // Sauvegarder l'utilisateur dans localStorage et contexte
            localStorage.setItem('user', JSON.stringify(response.data.user));
            updateUser(response.data.user);
            navigate('/dashboard');
          } else {
            throw new Error('Impossible de récupérer les informations utilisateur');
          }
        })
        .catch(error => {
          console.error('Erreur lors de la récupération des informations utilisateur:', error);
          // Nettoyer les tokens en cas d'erreur
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          navigate('/login', { 
            state: { 
              error: 'Erreur lors de la connexion. Veuillez réessayer.' 
            } 
          });
        });
    } else {
      navigate('/login', { 
        state: { 
          error: 'Paramètres d\'authentification manquants.' 
        } 
      });
    }
  }, [searchParams, navigate, updateUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-secondary-900 dark:to-secondary-800">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-secondary-700 dark:text-secondary-300">
          Connexion en cours...
        </p>
      </div>
    </div>
  );
};

export default GoogleAuthCallback;

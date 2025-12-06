import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Scale, CheckCircle, XCircle, Loader } from 'lucide-react';
import api from '../services/api';

const ConfirmEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const confirmEmail = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Token de confirmation manquant');
        return;
      }

      try {
        const response = await api.get(`/auth/confirm/${token}`);
        
        if (response.data.success) {
          setStatus('success');
          setMessage(response.data.message || 'Votre compte a été activé avec succès !');
          
          // Rediriger vers la page de login après 3 secondes
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(response.data.message || 'Erreur lors de l\'activation du compte');
        }
      } catch (error) {
        setStatus('error');
        setMessage(
          error.response?.data?.message || 
          'Erreur lors de l\'activation du compte. Le lien peut être invalide ou expiré.'
        );
      }
    };

    confirmEmail();
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-50 px-4">
      <div className="max-w-md w-full bg-white dark:bg-secondary-800 rounded-lg shadow-lg p-8 text-center">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-lg bg-primary-600 flex items-center justify-center">
            <Scale className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Titre */}
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white mb-6">
          Confirmation de votre email
        </h1>

        {/* Contenu selon le statut */}
        {status === 'loading' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <Loader className="w-12 h-12 text-primary-600 animate-spin" />
            </div>
            <p className="text-secondary-600 dark:text-secondary-400">
              Activation de votre compte en cours...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <p className="text-green-600 dark:text-green-400 font-medium">
              {message}
            </p>
            <p className="text-sm text-secondary-500 dark:text-secondary-400">
              Redirection vers la page de connexion dans quelques secondes...
            </p>
            <Link
              to="/login"
              className="inline-block mt-4 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Se connecter maintenant
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <XCircle className="w-16 h-16 text-red-500" />
            </div>
            <p className="text-red-600 dark:text-red-400 font-medium">
              {message}
            </p>
            <div className="space-y-2 mt-6">
              <Link
                to="/login"
                className="block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Aller à la page de connexion
              </Link>
              <Link
                to="/register"
                className="block px-6 py-2 bg-secondary-200 dark:bg-secondary-700 text-secondary-900 dark:text-white rounded-lg hover:bg-secondary-300 dark:hover:bg-secondary-600 transition-colors"
              >
                Créer un nouveau compte
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfirmEmail;


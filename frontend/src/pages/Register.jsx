import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Scale } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'admin',
    cabinet: {
      nom: '',
      adresse: '',
      telephone: '',
    },
  });
  const [error, setError] = useState('');
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('cabinet.')) {
      const cabinetField = name.split('.')[1];
      setFormData({
        ...formData,
        cabinet: {
          ...formData.cabinet,
          [cabinetField]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
    
    setError('');
    setErrors([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setErrors([]);
  
    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }
  
    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      setLoading(false);
      return;
    }
  
    if (formData.role === 'admin' && !formData.cabinet.nom) {
      setError('Le nom du cabinet est requis pour un compte administrateur');
      setLoading(false);
      return;
    }
  
    // Préparer les données
    const { confirmPassword, ...dataToSend } = formData;
  
    try {
      if (!register) {
        setError('Erreur: fonction d\'inscription non disponible. Veuillez recharger la page.');
        setLoading(false);
        return;
      }
      const result = await register(dataToSend);
  
      if (result.success) {
        // Inscription réussie avec connexion automatique
        setError(''); // Effacer les erreurs précédentes
        // Rediriger vers le dashboard
        navigate('/dashboard');
      } else {
        // Afficher le message d'erreur
        setError(result.message || 'Erreur lors de l\'inscription');
        if (result.errors) {
          setErrors(result.errors);
        }
        // Afficher dans la console pour le débogage
        console.error('Erreur d\'inscription:', result);
      }
    } catch (err) {
      // Capturer les erreurs réseau ou autres
      console.error('Erreur lors de l\'inscription:', err);
      setError(err.message || 'Erreur de connexion au serveur. Vérifiez que le backend est lancé.');
    }
  
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-50 px-4 py-12">
      <div className="max-w-2xl w-full">
        {/* Logo et titre */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-600 mb-4">
            <Scale className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-secondary-900 mb-2">
            Créer votre compte <span className="text-gradient">JurisFlow</span>
          </h1>
          <p className="text-secondary-600">
            Commencez à digitaliser votre cabinet
          </p>
        </div>

        {/* Formulaire */}
        <div className="card p-8 shadow-elegant animate-fade-in">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informations personnelles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="prenom" className="label">
                  Prénom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="prenom"
                  name="prenom"
                  value={formData.prenom}
                  onChange={handleChange}
                  className="input"
                  placeholder="Jean"
                  required
                />
              </div>

              <div>
                <label htmlFor="nom" className="label">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="nom"
                  name="nom"
                  value={formData.nom}
                  onChange={handleChange}
                  className="input"
                  placeholder="Dupont"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="label">
                Adresse email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input"
                placeholder="nom@cabinet.fr"
                required
                autoComplete="email"
              />
            </div>

            {/* Mot de passe */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="label">
                  Mot de passe <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input"
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
                <p className="text-xs text-secondary-500 mt-1">
                  Minimum 6 caractères
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="label">
                  Confirmer le mot de passe <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input"
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            {/* Rôle */}
            <div>
              <label htmlFor="role" className="label">
                Type de compte
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="input"
              >
                <option value="admin">Administrateur (Cabinet)</option>
                <option value="collaborateur">Collaborateur</option>
              </select>
            </div>

            {/* Informations du cabinet (si admin) */}
            {formData.role === 'admin' && (
              <div className="border-t border-secondary-200 pt-6 space-y-4">
                <h3 className="text-lg font-semibold text-secondary-900 mb-4">
                  Informations du cabinet
                </h3>

                <div>
                  <label htmlFor="cabinet.nom" className="label">
                    Nom du cabinet <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="cabinet.nom"
                    name="cabinet.nom"
                    value={formData.cabinet.nom}
                    onChange={handleChange}
                    className="input"
                    placeholder="Cabinet Dupont & Associés"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="cabinet.adresse" className="label">
                    Adresse
                  </label>
                  <input
                    type="text"
                    id="cabinet.adresse"
                    name="cabinet.adresse"
                    value={formData.cabinet.adresse}
                    onChange={handleChange}
                    className="input"
                    placeholder="15 Avenue des Champs-Élysées, 75008 Paris"
                  />
                </div>

                <div>
                  <label htmlFor="cabinet.telephone" className="label">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    id="cabinet.telephone"
                    name="cabinet.telephone"
                    value={formData.cabinet.telephone}
                    onChange={handleChange}
                    className="input"
                    placeholder="+33 1 42 56 78 90"
                  />
                </div>
              </div>
            )}

            {/* Erreurs */}
{error && (
  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
    <div className="font-semibold mb-2">{error}</div>
    {errors.length > 0 && (
      <ul className="mt-2 list-disc list-inside space-y-1">
        {errors.map((err, index) => (
          <li key={index} className="text-sm">{err}</li>
        ))}
      </ul>
    )}
    {/* Afficher plus de détails en mode développement */}
    {process.env.NODE_ENV === 'development' && (
      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-red-600 hover:text-red-800">
          Détails techniques (développement)
        </summary>
        <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">
          {JSON.stringify({ error, errors }, null, 2)}
        </pre>
      </details>
    )}
  </div>
)}

            {/* Bouton d'inscription */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-lg font-semibold"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Création en cours...
                </span>
              ) : (
                'Créer mon compte'
              )}
            </button>
          </form>

          {/* Lien connexion */}
          <div className="mt-6 text-center text-sm text-secondary-600">
            Vous avez déjà un compte ?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Se connecter
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-secondary-500">
          © 2024 JurisFlow. Tous droits réservés.
        </div>
      </div>
    </div>
  );
};

export default Register;


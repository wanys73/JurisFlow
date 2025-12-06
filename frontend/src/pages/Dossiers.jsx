import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dossierService, clientService } from '../services/api';
import { Link, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import {
  Folder,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  X,
  Loader2
} from 'lucide-react';

const Dossiers = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [dossiers, setDossiers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' ou 'edit'
  const [selectedDossier, setSelectedDossier] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    statut: 'Ouvert',
    typeAffaire: '',
    clientId: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Filtres - initialiser avec le terme de recherche de la navigation si présent
  const [filters, setFilters] = useState({
    statut: '',
    search: location.state?.search || ''
  });

  // Charger les dossiers et clients au montage
  useEffect(() => {
    loadDossiers();
    loadClients();
  }, [filters]);

  const loadClients = async () => {
    try {
      const response = await clientService.getClients();
      setClients(response.data.clients || []);
    } catch (err) {
      console.error('Erreur lors du chargement des clients:', err);
    }
  };

  // Écouter l'événement de recherche globale depuis le Layout
  useEffect(() => {
    const handleGlobalSearch = (event) => {
      setFilters(prev => ({ ...prev, search: event.detail }));
    };

    window.addEventListener('globalSearch', handleGlobalSearch);
    return () => {
      window.removeEventListener('globalSearch', handleGlobalSearch);
    };
  }, []);

  // Si on arrive avec un terme de recherche dans le state, l'appliquer
  useEffect(() => {
    if (location.state?.search) {
      setFilters(prev => ({ ...prev, search: location.state.search }));
      // Nettoyer le state pour éviter de réappliquer à chaque navigation
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadDossiers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await dossierService.getDossiers(filters);
      setDossiers(response.data.dossiers);
    } catch (err) {
      console.error('Erreur lors du chargement des dossiers:', err);
      setError('Impossible de charger les dossiers');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (mode = 'create', dossier = null) => {
    setModalMode(mode);
    setSelectedDossier(dossier);
    
    if (mode === 'edit' && dossier) {
      setFormData({
        nom: dossier.nom,
        description: dossier.description || '',
        statut: formatStatutFromAPI(dossier.statut),
        typeAffaire: formatTypeAffaireFromAPI(dossier.typeAffaire),
        clientId: dossier.clientId || ''
      });
    } else {
      // Réinitialiser le formulaire
      setFormData({
        nom: '',
        description: '',
        statut: 'Ouvert',
        typeAffaire: '',
        clientId: ''
      });
    }
    
    setFormError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDossier(null);
    setFormError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      // Préparer les données à envoyer
      const dataToSend = {
        ...formData,
        // S'assurer que typeAffaire est null si vide
        typeAffaire: formData.typeAffaire || null
      };

      if (modalMode === 'create') {
        await dossierService.createDossier(dataToSend);
      } else {
        await dossierService.updateDossier(selectedDossier.id, dataToSend);
      }
      
      // Recharger la liste
      await loadDossiers();
      handleCloseModal();
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      setFormError(err.response?.data?.message || err.response?.data?.errors?.join(', ') || 'Erreur lors de la sauvegarde du dossier');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer (archiver) ce dossier ?\n\nLe dossier sera archivé et ne sera plus visible dans la liste principale.')) {
      return;
    }

    try {
      await dossierService.deleteDossier(id);
      await loadDossiers();
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      alert('Erreur lors de la suppression du dossier');
    }
  };

  // Fonction pour convertir le statut de l'API vers le format d'affichage
  const formatStatutFromAPI = (statut) => {
    if (!statut) return 'Ouvert';
    const mapping = {
      'OUVERT': 'Ouvert',
      'EN_ATTENTE': 'En attente',
      'FERME': 'Fermé'
    };
    return mapping[statut] || statut;
  };

  // Fonction pour convertir le type d'affaire de l'API vers le format d'affichage
  const formatTypeAffaireFromAPI = (typeAffaire) => {
    if (!typeAffaire) return '';
    const mapping = {
      'CIVIL': 'Civil',
      'PENAL': 'Pénal',
      'COMMERCIAL': 'Commercial',
      'ADMINISTRATIF': 'Administratif',
      'TRAVAIL': 'Travail',
      'FAMILIAL': 'Familial',
      'FAMILLE': 'Familial', // Ancien format pour compatibilité
      'IMMOBILIER': 'Immobilier',
      'AUTRE': 'Autre'
    };
    return mapping[typeAffaire] || typeAffaire;
  };

  const handleChangeStatut = async (dossierId, nouveauStatut) => {
    try {
      await dossierService.updateDossier(dossierId, { statut: nouveauStatut });
      // Mettre à jour l'état local immédiatement avec le format API
      const statutAPI = nouveauStatut.toUpperCase().replace(' ', '_');
      setDossiers(prevDossiers => 
        prevDossiers.map(dossier => 
          dossier.id === dossierId 
            ? { ...dossier, statut: statutAPI }
            : dossier
        )
      );
      // Recharger pour avoir les données à jour depuis le serveur
      await loadDossiers();
    } catch (err) {
      console.error('Erreur lors du changement de statut:', err);
      alert('Erreur lors du changement de statut');
      // Recharger en cas d'erreur pour restaurer l'état
      await loadDossiers();
    }
  };

  const getStatutColor = (statut) => {
    switch (statut) {
      case 'Ouvert':
        return 'bg-green-100 text-green-800';
      case 'Fermé':
        return 'bg-gray-100 text-gray-800';
      case 'En attente':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout>
      <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-secondary-900 dark:text-white mb-2 font-display">
              Dossiers
            </h1>
            <p className="text-secondary-600">
              Gérez vos dossiers juridiques
            </p>
          </div>
          
          <button
            onClick={() => handleOpenModal('create')}
            className="btn-primary flex items-center space-x-2 px-6 py-3"
          >
            <Plus className="w-5 h-5" />
            <span>Nouveau Dossier</span>
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-md p-4 mb-6 hover:shadow-lg transition-all duration-300">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
            <input
              type="text"
              placeholder="Rechercher un dossier..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="input pl-10"
            />
          </div>

          {/* Filtre par statut */}
          <select
            value={filters.statut}
            onChange={(e) => setFilters(prev => ({ ...prev, statut: e.target.value }))}
            className="input"
          >
            <option value="">Tous les statuts</option>
            <option value="Ouvert">Ouvert</option>
            <option value="Fermé">Fermé</option>
            <option value="En attente">En attente</option>
          </select>

          {/* Bouton réinitialiser */}
          <button
            onClick={() => setFilters({ statut: '', search: '' })}
            className="btn-secondary"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Tableau des dossiers */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : error ? (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg p-8 text-center text-red-600">
          {error}
        </div>
      ) : dossiers.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-md p-12 text-center hover:shadow-lg transition-all duration-300">
          <Folder className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-secondary-900 mb-2">
            Aucun dossier
          </h3>
          <p className="text-secondary-600 mb-6">
            Commencez par créer votre premier dossier
          </p>
          <button
            onClick={() => handleOpenModal('create')}
            className="btn-primary"
          >
            <Plus className="w-5 h-5 inline mr-2" />
            Créer un dossier
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300">
          <div className="overflow-x-auto">
            <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Nom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
              {dossiers.map((dossier) => (
                <tr key={dossier.id} className="table-row-interactive hover:shadow-md hover:shadow-cyan-500/20 cursor-pointer border-l-2 border-transparent hover:border-primary-500/60 transition-all duration-300">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Folder className="w-5 h-5 text-primary-600 mr-3" />
                      <div>
                        <Link 
                          to={`/dossiers/${dossier.id}`}
                          className="text-sm font-medium text-primary-600 hover:text-primary-800 hover:underline"
                        >
                          {dossier.nom}
                        </Link>
                        {dossier.description && (
                          <div className="text-sm text-secondary-500 truncate max-w-xs">
                            {dossier.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-secondary-900">
                    {dossier.client?.prenom && dossier.client?.nom 
                      ? `${dossier.client.prenom} ${dossier.client.nom}`
                      : dossier.client?.prenom || dossier.client?.nom || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-secondary-900">
                    {formatTypeAffaireFromAPI(dossier.typeAffaire) || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={formatStatutFromAPI(dossier.statut)}
                      onChange={(e) => handleChangeStatut(dossier.id, e.target.value)}
                      className={`inline-flex text-xs font-semibold rounded-full px-2 py-1 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 ${getStatutColor(formatStatutFromAPI(dossier.statut))}`}
                      onClick={(e) => e.stopPropagation()}
                      title="Cliquez pour changer le statut"
                    >
                      <option value="Ouvert">Ouvert</option>
                      <option value="En attente">En attente</option>
                      <option value="Fermé">Fermé</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm text-secondary-500">
                    {new Date(dossier.dateOuverture).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleOpenModal('edit', dossier)}
                        className="text-primary-600 hover:text-primary-900 p-2 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(dossier.id)}
                        className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer (Archiver)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Modal avec glassmorphism */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-elegant max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header du modal */}
            <div className="flex items-center justify-between p-6 border-b border-secondary-200">
              <h2 className="text-xl font-bold text-secondary-900">
                {modalMode === 'create' ? 'Nouveau Dossier' : 'Modifier le Dossier'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-secondary-400 hover:text-secondary-600 p-2 hover:bg-secondary-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Nom du dossier */}
              <div>
                <label htmlFor="nom" className="label">
                  Nom du dossier <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="nom"
                  name="nom"
                  value={formData.nom}
                  onChange={handleChange}
                  className="input"
                  placeholder="Ex: Divorce Martin vs. Dubois"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="label">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="input"
                  rows="3"
                  placeholder="Description du dossier..."
                />
              </div>

              {/* Statut et Type d'affaire */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="statut" className="label">
                    Statut
                  </label>
                  <select
                    id="statut"
                    name="statut"
                    value={formData.statut}
                    onChange={handleChange}
                    className="input"
                  >
                    <option value="Ouvert">Ouvert</option>
                    <option value="En attente">En attente</option>
                    <option value="Fermé">Fermé</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="typeAffaire" className="label">
                    Type d'affaire
                  </label>
                  <select
                    id="typeAffaire"
                    name="typeAffaire"
                    value={formData.typeAffaire}
                    onChange={handleChange}
                    className="input"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="Civil">Civil</option>
                    <option value="Pénal">Pénal</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Administratif">Administratif</option>
                    <option value="Travail">Travail</option>
                    <option value="Familial">Familial</option>
                    <option value="Immobilier">Immobilier</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
              </div>

              {/* Client */}
              <div className="border-t border-secondary-200 pt-6">
                <div>
                  <label htmlFor="clientId" className="label">
                    Client
                  </label>
                  <select
                    id="clientId"
                    name="clientId"
                    value={formData.clientId}
                    onChange={handleChange}
                    className="input"
                  >
                    <option value="">Sélectionner un client...</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.prenom} {client.nom} - {client.email}
                      </option>
                    ))}
                  </select>
                  {clients.length === 0 && (
                    <p className="text-sm text-secondary-500 mt-2">
                      Aucun client disponible. <a href="/clients" className="text-primary-600 hover:underline">Créer un client</a>
                    </p>
                  )}
                </div>
              </div>

              {/* Erreur */}
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-secondary-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-secondary px-6"
                  disabled={formLoading}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-primary px-6"
                  disabled={formLoading}
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                      {modalMode === 'create' ? 'Création...' : 'Enregistrement...'}
                    </>
                  ) : (
                    modalMode === 'create' ? 'Créer le dossier' : 'Enregistrer'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </Layout>
  );
};

export default Dossiers;


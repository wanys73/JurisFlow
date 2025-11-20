import { useState, useEffect } from 'react';
import { clientService } from '../services/api';
import Layout from '../components/Layout';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Loader2
} from 'lucide-react';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' ou 'edit'
  const [selectedClient, setSelectedClient] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    sexe: '',
    adresse: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Filtres
  const [filters, setFilters] = useState({
    search: ''
  });

  // Charger les clients au montage
  useEffect(() => {
    loadClients();
  }, [filters]);

  const loadClients = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (filters.search) params.search = filters.search;
      const response = await clientService.getClients(params);
      setClients(response.data.clients || []);
    } catch (err) {
      console.error('Erreur lors du chargement des clients:', err);
      setError('Impossible de charger les clients');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (mode = 'create', client = null) => {
    setModalMode(mode);
    setSelectedClient(client);
    setFormError('');
    
    if (mode === 'edit' && client) {
      setFormData({
        nom: client.nom || '',
        prenom: client.prenom || '',
        email: client.email || '',
        telephone: client.telephone || '',
        sexe: formatSexeFromAPI(client.sexe) || '',
        adresse: client.adresse || ''
      });
    } else {
      setFormData({
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        sexe: '',
        adresse: ''
      });
    }
    
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      sexe: '',
      adresse: ''
    });
    setFormError('');
    setSelectedClient(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      if (modalMode === 'create') {
        await clientService.createClient(formData);
      } else {
        await clientService.updateClient(selectedClient.id, formData);
      }
      
      handleCloseModal();
      await loadClients();
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      
      // Gérer les erreurs de validation détaillées
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const errorMessages = err.response.data.errors.map(e => e.message || e.msg || e).join(', ');
        setFormError(errorMessages);
      } else {
        const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Erreur lors de la sauvegarde';
        setFormError(errorMessage);
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (clientId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      return;
    }

    try {
      await clientService.deleteClient(clientId);
      await loadClients();
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      const errorMessage = err.response?.data?.message || 'Erreur lors de la suppression';
      alert(errorMessage);
    }
  };

  // Fonction pour convertir le sexe de l'API vers le format d'affichage
  const formatSexeFromAPI = (sexe) => {
    if (!sexe) return '';
    const mapping = {
      'HOMME': 'Homme',
      'FEMME': 'Femme',
      'AUTRE': 'Autre'
    };
    return mapping[sexe] || sexe;
  };

  // Fonction pour convertir le sexe du format d'affichage vers l'API
  const formatSexeToAPI = (sexe) => {
    if (!sexe) return null;
    return sexe.toUpperCase().replace(/ /g, '_');
  };

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-secondary-900 mb-2">
                Clients
              </h1>
              <p className="text-secondary-600">
                Gérez vos clients et leurs informations
              </p>
            </div>
            
            <button
              onClick={() => handleOpenModal('create')}
              className="btn-primary flex items-center space-x-2 px-6 py-3"
            >
              <Plus className="w-5 h-5" />
              <span>Nouveau Client</span>
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div className="card p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
              <input
                type="text"
                placeholder="Rechercher un client..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="input pl-10"
              />
            </div>

            {/* Bouton réinitialiser */}
            <button
              onClick={() => setFilters({ search: '' })}
              className="btn-secondary"
            >
              Réinitialiser
            </button>
          </div>
        </div>

        {/* Tableau des clients */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : error ? (
          <div className="card p-8 text-center text-red-600">
            {error}
          </div>
        ) : clients.length === 0 ? (
          <div className="card p-12 text-center">
            <Users className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-secondary-900 mb-2">
              Aucun client
            </h3>
            <p className="text-secondary-600 mb-6">
              Commencez par créer votre premier client
            </p>
            <button
              onClick={() => handleOpenModal('create')}
              className="btn-primary"
            >
              <Plus className="w-5 h-5 inline mr-2" />
              Créer un client
            </button>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Nom complet
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Téléphone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Sexe
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Nb. Dossiers
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Factures en attente
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-secondary-200">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-secondary-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-secondary-900">
                          {client.prenom} {client.nom}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-secondary-600">
                          {client.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-secondary-600">
                          {client.telephone || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-secondary-600">
                          {formatSexeFromAPI(client.sexe) || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-secondary-600">
                          {client.nombreDossiers || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-secondary-600">
                          {client.facturesEnAttente || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleOpenModal('edit', client)}
                            className="text-primary-600 hover:text-primary-900 p-2 hover:bg-primary-50 rounded"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(client.id)}
                            className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded"
                            title="Supprimer"
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

        {/* Modal de création/édition */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-secondary-200">
                <h2 className="text-2xl font-bold text-secondary-900">
                  {modalMode === 'create' ? 'Nouveau Client' : 'Modifier le Client'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-secondary-400 hover:text-secondary-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6">
                {formError && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nom */}
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Nom <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nom}
                      onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                      className="input w-full"
                      placeholder="Nom du client"
                    />
                  </div>

                  {/* Prénom */}
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Prénom <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.prenom}
                      onChange={(e) => setFormData(prev => ({ ...prev, prenom: e.target.value }))}
                      className="input w-full"
                      placeholder="Prénom du client"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="input w-full"
                      placeholder="email@exemple.com"
                    />
                  </div>

                  {/* Téléphone */}
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={formData.telephone}
                      onChange={(e) => setFormData(prev => ({ ...prev, telephone: e.target.value }))}
                      className="input w-full"
                      placeholder="+33 6 12 34 56 78"
                    />
                  </div>

                  {/* Sexe */}
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Sexe
                    </label>
                    <select
                      value={formData.sexe}
                      onChange={(e) => setFormData(prev => ({ ...prev, sexe: e.target.value }))}
                      className="input w-full"
                    >
                      <option value="">Sélectionner...</option>
                      <option value="Homme">Homme</option>
                      <option value="Femme">Femme</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>

                  {/* Adresse */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Adresse
                    </label>
                    <textarea
                      value={formData.adresse}
                      onChange={(e) => setFormData(prev => ({ ...prev, adresse: e.target.value }))}
                      className="input w-full"
                      rows="3"
                      placeholder="Adresse complète du client"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end space-x-4 mt-6 pt-6 border-t border-secondary-200">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="btn-secondary"
                    disabled={formLoading}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={formLoading}
                  >
                    {formLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      modalMode === 'create' ? 'Créer' : 'Enregistrer'
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

export default Clients;

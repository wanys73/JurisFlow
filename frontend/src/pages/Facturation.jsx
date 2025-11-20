import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { factureService, dossierService, clientService } from '../services/api';
import Layout from '../components/Layout';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Loader2,
  Calendar,
  DollarSign,
  FileCheck
} from 'lucide-react';

const Facturation = () => {
  const navigate = useNavigate();
  const [factures, setFactures] = useState([]);
  const [dossiers, setDossiers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDossiers, setLoadingDossiers] = useState(false);
  const [error, setError] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedFacture, setSelectedFacture] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    dossier: '',
    clientId: '',
    lignes: [
      { description: '', quantite: 1, prixUnitaire: 0 }
    ],
    tva: 20,
    dateEcheance: '',
    statut: 'Envoyée',
    notes: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Filtres
  const [filters, setFilters] = useState({
    statut: '',
    search: ''
  });

  // Charger les factures au montage
  useEffect(() => {
    loadFactures();
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

  const loadFactures = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (filters.statut) params.statut = filters.statut;
      const response = await factureService.getFactures(params);
      setFactures(response.data.factures || []);
    } catch (err) {
      console.error('Erreur lors du chargement des factures:', err);
      setError('Impossible de charger les factures');
    } finally {
      setLoading(false);
    }
  };

  const loadDossiers = async () => {
    try {
      setLoadingDossiers(true);
      const response = await dossierService.getDossiers();
      setDossiers(response.data.dossiers || []);
    } catch (err) {
      console.error('Erreur lors du chargement des dossiers:', err);
    } finally {
      setLoadingDossiers(false);
    }
  };

  // Fonction pour convertir le statut de l'API vers le format d'affichage
  const formatStatutFromAPI = (statut) => {
    if (!statut) return 'Envoyée';
    const mapping = {
      'ENVOYEE': 'Envoyée',
      'PAYEE': 'Payée',
      'EN_RETARD': 'En retard'
    };
    return mapping[statut] || statut;
  };

  const handleOpenModal = (mode = 'create', facture = null) => {
    setModalMode(mode);
    setSelectedFacture(facture);
    setFormError('');
    
    if (mode === 'edit' && facture) {
      // Formater la date d'échéance pour l'input date
      const dateEcheance = facture.dateEcheance 
        ? new Date(facture.dateEcheance).toISOString().split('T')[0]
        : '';
      
      setFormData({
        dossier: facture.dossier?.id || facture.dossier?._id || facture.dossier || '',
        clientId: facture.clientId || facture.client?.id || '',
        lignes: facture.lignes || [{ description: '', quantite: 1, prixUnitaire: 0 }],
        tva: facture.tva || 20,
        dateEcheance: dateEcheance,
        statut: formatStatutFromAPI(facture.statut),
        notes: facture.notes || ''
      });
    } else {
      // Réinitialiser le formulaire
      setFormData({
        dossier: '',
        clientId: '',
        lignes: [
          { description: '', quantite: 1, prixUnitaire: 0 }
        ],
        tva: 20,
        dateEcheance: '',
        statut: 'Envoyée',
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormError('');
    setSelectedFacture(null);
  };

  const handleAddLigne = () => {
    setFormData({
      ...formData,
      lignes: [...formData.lignes, { description: '', quantite: 1, prixUnitaire: 0 }]
    });
  };

  const handleRemoveLigne = (index) => {
    if (formData.lignes.length > 1) {
      const newLignes = formData.lignes.filter((_, i) => i !== index);
      setFormData({ ...formData, lignes: newLignes });
    }
  };

  const handleLigneChange = (index, field, value) => {
    const newLignes = [...formData.lignes];
    newLignes[index][field] = field === 'description' ? value : parseFloat(value) || 0;
    setFormData({ ...formData, lignes: newLignes });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      // Validation
      if (!formData.dossier) {
        setFormError('Veuillez sélectionner un dossier');
        setFormLoading(false);
        return;
      }

      if (!formData.dateEcheance) {
        setFormError('Veuillez sélectionner une date d\'échéance');
        setFormLoading(false);
        return;
      }

      // Vérifier que toutes les lignes ont une description
      const lignesInvalides = formData.lignes.some(l => !l.description.trim());
      if (lignesInvalides) {
        setFormError('Toutes les lignes doivent avoir une description');
        setFormLoading(false);
        return;
      }

      // Préparer les données à envoyer
      const dataToSend = {
        ...formData,
        // S'assurer que la date est au format ISO8601
        dateEcheance: formData.dateEcheance ? new Date(formData.dateEcheance).toISOString() : null,
        // S'assurer que les quantités et prix sont des nombres
        lignes: formData.lignes.map(ligne => ({
          description: ligne.description.trim(),
          quantite: parseFloat(ligne.quantite) || 0,
          prixUnitaire: parseFloat(ligne.prixUnitaire) || 0
        }))
      };

      if (modalMode === 'create') {
        await factureService.createFacture(dataToSend);
      } else {
        await factureService.updateFacture(selectedFacture.id, dataToSend);
      }

      handleCloseModal();
      loadFactures();
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      // Afficher les erreurs de validation détaillées
      if (err.response?.data?.errors) {
        const errorMessages = err.response.data.errors.map(e => e.message || e.msg || e).join(', ');
        setFormError(`Erreur de validation: ${errorMessages}`);
      } else {
        setFormError(err.response?.data?.message || 'Erreur lors de la sauvegarde de la facture');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (facture) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer la facture ${facture.numeroFacture} ?`)) {
      return;
    }

    try {
      await factureService.deleteFacture(facture.id);
      loadFactures();
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      alert('Erreur lors de la suppression de la facture');
    }
  };

  const handleMarquerPayee = async (facture) => {
    try {
      await factureService.marquerPayee(facture.id);
      loadFactures();
    } catch (err) {
      console.error('Erreur lors du marquage:', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Erreur lors du marquage de la facture';
      alert(`Erreur: ${errorMessage}`);
    }
  };

  const getStatutBadge = (statut) => {
    const statutFormate = formatStatutFromAPI(statut);
    const styles = {
      'Envoyée': 'bg-blue-100 text-blue-800',
      'Payée': 'bg-green-100 text-green-800',
      'En retard': 'bg-red-100 text-red-800'
    };
    return styles[statutFormate] || 'bg-secondary-200 text-secondary-800';
  };

  // Filtrer les factures par recherche
  const filteredFactures = factures.filter(facture => {
    if (filters.search) {
      const search = filters.search.toLowerCase();
      return (
        facture.numeroFacture?.toLowerCase().includes(search) ||
        facture.dossier?.nom?.toLowerCase().includes(search) ||
        facture.dossier?.client?.nom?.toLowerCase().includes(search) ||
        facture.dossier?.client?.prenom?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Calculer les totaux pour l'affichage
  const calculateTotals = (lignes, tva) => {
    const totalHT = lignes.reduce((sum, ligne) => {
      return sum + (ligne.quantite * ligne.prixUnitaire);
    }, 0);
    const totalTTC = totalHT * (1 + tva / 100);
    return { totalHT, totalTTC };
  };

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-secondary-900 mb-2">
              Facturation
            </h1>
            <p className="text-secondary-600">
              Gérez vos factures et suivez les paiements
            </p>
          </div>
          <button
            onClick={() => handleOpenModal('create')}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Nouvelle Facture</span>
          </button>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
              <input
                type="text"
                placeholder="Rechercher par numéro, dossier ou client..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="input pl-10 w-full"
              />
            </div>
            <select
              value={filters.statut}
              onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
              className="input"
            >
              <option value="">Tous les statuts</option>
              <option value="Envoyée">Envoyée</option>
              <option value="Payée">Payée</option>
              <option value="En retard">En retard</option>
            </select>
          </div>
        </div>

        {/* Tableau des factures */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        ) : filteredFactures.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-12 text-center">
            <FileText className="w-16 h-16 text-secondary-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-secondary-900 mb-2">
              Aucune facture
            </h3>
            <p className="text-secondary-600 mb-6">
              Créez votre première facture pour commencer
            </p>
            <button
              onClick={() => handleOpenModal('create')}
              className="btn-primary"
            >
              Créer une facture
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-secondary-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary-50 border-b border-secondary-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                      N° Facture
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                      Dossier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                      Date Émission
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                      Total TTC
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-secondary-200">
                  {filteredFactures.map((facture) => (
                    <tr key={facture.id} className="hover:bg-secondary-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/factures/${facture.id}`)}
                          className="text-sm font-medium text-primary-600 hover:text-primary-800 hover:underline"
                        >
                          {facture.numeroFacture}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-secondary-900">
                          {facture.dossier?.nom || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-secondary-600">
                          {facture.dossier?.client?.prenom} {facture.dossier?.client?.nom}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-secondary-600">
                          {facture.dateEmission 
                            ? new Date(facture.dateEmission).toLocaleDateString('fr-FR')
                            : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={formatStatutFromAPI(facture.statut)}
                          onChange={(e) => handleChangeStatut(facture.id, e.target.value)}
                          className={`inline-flex text-xs font-semibold rounded-full px-2 py-1 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 ${getStatutBadge(facture.statut)}`}
                          onClick={(e) => e.stopPropagation()}
                          title="Cliquez pour changer le statut"
                        >
                          <option value="Envoyée">Envoyée</option>
                          <option value="Payée">Payée</option>
                          <option value="En retard">En retard</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-semibold text-secondary-900">
                          {facture.totalTTC?.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) || '0,00 €'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleOpenModal('edit', facture)}
                            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(facture)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer (Archiver)"
                          >
                            <Trash2 className="w-5 h-5" />
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
            <div className="bg-white rounded-xl shadow-elegant max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-secondary-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-secondary-900">
                      {modalMode === 'create' ? 'Nouvelle Facture' : 'Modifier la Facture'}
                    </h2>
                    <p className="text-sm text-secondary-600">
                      {modalMode === 'create' ? 'Créer une nouvelle facture' : 'Modifier les informations de la facture'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  disabled={formLoading}
                  className="text-secondary-400 hover:text-secondary-600 p-2 hover:bg-secondary-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Formulaire */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Dossier */}
                <div>
                  <label htmlFor="dossier" className="label">
                    Dossier <span className="text-red-500">*</span>
                  </label>
                  {loadingDossiers ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                      <span className="text-sm text-secondary-600">Chargement des dossiers...</span>
                    </div>
                  ) : (
                    <select
                      id="dossier"
                      value={formData.dossier}
                      onChange={(e) => setFormData({ ...formData, dossier: e.target.value })}
                      className="input"
                      required
                      disabled={formLoading || modalMode === 'edit'}
                    >
                      <option value="">Sélectionner un dossier...</option>
                      {dossiers.map((dossier) => (
                        <option key={dossier.id} value={dossier.id}>
                          {dossier.nom} - {dossier.client?.prenom} {dossier.client?.nom}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Client */}
                <div>
                  <label htmlFor="clientId" className="label">
                    Client
                  </label>
                  <select
                    id="clientId"
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    className="input"
                  >
                    <option value="">Sélectionner un client (optionnel)...</option>
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

                {/* Lignes de facturation */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="label mb-0">Lignes de facturation <span className="text-red-500">*</span></label>
                    <button
                      type="button"
                      onClick={handleAddLigne}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                      disabled={formLoading}
                    >
                      + Ajouter une ligne
                    </button>
                  </div>
                  <div className="space-y-4">
                    {formData.lignes.map((ligne, index) => {
                      const totalLigne = ligne.quantite * ligne.prixUnitaire;
                      return (
                        <div key={index} className="border border-secondary-200 rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-secondary-700">Ligne {index + 1}</span>
                            {formData.lignes.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveLigne(index)}
                                className="text-red-600 hover:text-red-700"
                                disabled={formLoading}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="md:col-span-3">
                              <input
                                type="text"
                                placeholder="Description..."
                                value={ligne.description}
                                onChange={(e) => handleLigneChange(index, 'description', e.target.value)}
                                className="input"
                                required
                                disabled={formLoading}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-secondary-600 mb-1 block">Quantité</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                placeholder="1"
                                value={ligne.quantite}
                                onChange={(e) => handleLigneChange(index, 'quantite', e.target.value)}
                                className="input"
                                required
                                disabled={formLoading}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-secondary-600 mb-1 block">Prix unitaire (€)</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={ligne.prixUnitaire}
                                onChange={(e) => handleLigneChange(index, 'prixUnitaire', e.target.value)}
                                className="input"
                                required
                                disabled={formLoading}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-secondary-600 mb-1 block">Total</label>
                              <div className="input bg-secondary-50 font-semibold">
                                {totalLigne.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Totaux */}
                {(() => {
                  const { totalHT, totalTTC } = calculateTotals(formData.lignes, formData.tva);
                  return (
                    <div className="bg-secondary-50 rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-secondary-600">Total HT</span>
                        <span className="text-sm font-semibold text-secondary-900">
                          {totalHT.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-secondary-600">TVA</span>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={formData.tva}
                            onChange={(e) => setFormData({ ...formData, tva: parseFloat(e.target.value) || 20 })}
                            className="w-20 px-2 py-1 text-sm border border-secondary-300 rounded"
                            disabled={formLoading}
                          />
                          <span className="text-sm text-secondary-600">%</span>
                        </div>
                        <span className="text-sm font-semibold text-secondary-900">
                          {(totalTTC - totalHT).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-secondary-200">
                        <span className="text-base font-bold text-secondary-900">Total TTC</span>
                        <span className="text-lg font-bold text-primary-600">
                          {totalTTC.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Date d'échéance */}
                <div>
                  <label htmlFor="dateEcheance" className="label">
                    Date d'échéance <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="dateEcheance"
                    value={formData.dateEcheance}
                    onChange={(e) => setFormData({ ...formData, dateEcheance: e.target.value })}
                    className="input"
                    required
                    disabled={formLoading}
                  />
                </div>

                {/* Statut */}
                <div>
                  <label htmlFor="statut" className="label">
                    Statut
                  </label>
                  <select
                    id="statut"
                    value={formData.statut}
                    onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                    className="input"
                    disabled={formLoading}
                  >
                    <option value="Envoyée">Envoyée</option>
                    <option value="Payée">Payée</option>
                    <option value="En retard">En retard</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label htmlFor="notes" className="label">
                    Notes (optionnel)
                  </label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="input"
                    rows="3"
                    placeholder="Notes internes sur cette facture..."
                    disabled={formLoading}
                  />
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
                    className="btn-primary px-6 flex items-center space-x-2"
                    disabled={formLoading}
                  >
                    {formLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Enregistrement...</span>
                      </>
                    ) : (
                      <>
                        <FileCheck className="w-4 h-4" />
                        <span>{modalMode === 'create' ? 'Créer la facture' : 'Enregistrer les modifications'}</span>
                      </>
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

export default Facturation;


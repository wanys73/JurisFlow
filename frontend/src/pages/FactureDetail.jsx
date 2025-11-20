import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { factureService, api } from '../services/api';
import Layout from '../components/Layout';
import {
  ArrowLeft,
  FileText,
  Calendar,
  DollarSign,
  User,
  Edit2,
  Trash2,
  Loader2,
  Download
} from 'lucide-react';

const FactureDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [facture, setFacture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFacture();
  }, [id]);

  const loadFacture = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await factureService.getFactureById(id);
      if (response.success) {
        setFacture(response.data.facture);
      } else {
        setError('Facture non trouvée');
      }
    } catch (err) {
      console.error('Erreur lors du chargement de la facture:', err);
      setError('Erreur lors du chargement de la facture');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer (archiver) la facture ${facture.numeroFacture} ?`)) {
      return;
    }

    try {
      await factureService.deleteFacture(facture.id);
      navigate('/facturation');
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      alert('Erreur lors de la suppression de la facture');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      // Utiliser l'instance axios configurée qui gère automatiquement l'authentification
      const response = await api.get(`/factures/${id}/pdf`, {
        responseType: 'blob' // Important pour les fichiers binaires
      });
      
      // Créer un blob et télécharger
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Facture_${facture.numeroFacture}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Erreur lors du téléchargement:', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Erreur lors du téléchargement du PDF';
      alert(`Erreur: ${errorMessage}`);
    }
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatEuro = (montant) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(montant);
  };

  const getStatutBadge = (statut) => {
    const statutFormate = formatStatutFromAPI(statut);
    switch (statutFormate) {
      case 'Envoyée':
        return 'bg-blue-100 text-blue-800';
      case 'Payée':
        return 'bg-green-100 text-green-800';
      case 'En retard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatutFromAPI = (statut) => {
    if (!statut) return 'Envoyée';
    const mapping = {
      'ENVOYEE': 'Envoyée',
      'PAYEE': 'Payée',
      'EN_RETARD': 'En retard'
    };
    return mapping[statut] || statut;
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-secondary-600">Chargement de la facture...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !facture) {
    return (
      <Layout>
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error || 'Facture non trouvée'}</p>
            <button
              onClick={() => navigate('/facturation')}
              className="mt-4 text-primary-600 hover:text-primary-800"
            >
              ← Retour à la liste
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8">
        {/* Bouton retour */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/facturation')}
            className="flex items-center text-secondary-600 hover:text-secondary-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à la liste
          </button>
        </div>

        {/* En-tête */}
        <div className="bg-white rounded-xl shadow-elegant p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-secondary-900 mb-2">
                {facture.numeroFacture}
              </h1>
              <div className="flex items-center space-x-4">
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatutBadge(facture.statut)}`}>
                  {formatStatutFromAPI(facture.statut)}
                </span>
                {facture.dossier && (
                  <button
                    onClick={() => navigate(`/dossiers/${facture.dossier.id || facture.dossier}`)}
                    className="text-sm text-primary-600 hover:text-primary-800 hover:underline"
                  >
                    Dossier: {facture.dossier.nom || facture.dossier}
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDownloadPDF}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Télécharger PDF
              </button>
              <button
                onClick={() => navigate(`/facturation?edit=${facture.id}`)}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Modifier
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </button>
            </div>
          </div>
        </div>

        {/* Informations principales */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Informations du dossier */}
          <div className="bg-white rounded-xl shadow-elegant p-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-primary-600" />
              Informations
            </h3>
            <div className="space-y-3">
              {facture.dossier && (
                <>
                  <div>
                    <p className="text-sm text-secondary-500">Dossier</p>
                    <p className="text-base font-medium text-secondary-900">
                      {facture.dossier.nom || facture.dossier}
                    </p>
                  </div>
                  {facture.dossier.clientNom && (
                    <div>
                      <p className="text-sm text-secondary-500">Client</p>
                      <p className="text-base font-medium text-secondary-900">
                        {facture.dossier.clientPrenom} {facture.dossier.clientNom}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="bg-white rounded-xl shadow-elegant p-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-primary-600" />
              Dates
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-secondary-500">Date d'émission</p>
                <p className="text-base font-medium text-secondary-900">
                  {formatDate(facture.dateEmission)}
                </p>
              </div>
              <div>
                <p className="text-sm text-secondary-500">Date d'échéance</p>
                <p className="text-base font-medium text-secondary-900">
                  {formatDate(facture.dateEcheance)}
                </p>
              </div>
              {facture.datePaiement && (
                <div>
                  <p className="text-sm text-secondary-500">Date de paiement</p>
                  <p className="text-base font-medium text-green-600">
                    {formatDate(facture.datePaiement)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Totaux */}
          <div className="bg-white rounded-xl shadow-elegant p-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-primary-600" />
              Montants
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-secondary-500">Total HT</p>
                <p className="text-2xl font-bold text-secondary-900">
                  {formatEuro(facture.totalHT || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-secondary-500">TVA ({facture.tva || 20}%)</p>
                <p className="text-lg font-semibold text-secondary-700">
                  {formatEuro((facture.totalHT || 0) * (facture.tva || 20) / 100)}
                </p>
              </div>
              <div className="pt-3 border-t border-secondary-200">
                <p className="text-sm text-secondary-500">Total TTC</p>
                <p className="text-3xl font-bold text-primary-600">
                  {formatEuro(facture.totalTTC || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Lignes de facturation */}
        <div className="bg-white rounded-xl shadow-elegant p-6 mb-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">Lignes de facturation</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                    Quantité
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                    Prix unitaire
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-secondary-700 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-200">
                {facture.lignes && facture.lignes.length > 0 ? (
                  facture.lignes.map((ligne, index) => (
                    <tr key={index} className="hover:bg-secondary-50">
                      <td className="px-6 py-4 text-sm text-secondary-900">
                        {ligne.description}
                      </td>
                      <td className="px-6 py-4 text-sm text-secondary-900 text-right">
                        {ligne.quantite}
                      </td>
                      <td className="px-6 py-4 text-sm text-secondary-900 text-right">
                        {formatEuro(ligne.prixUnitaire || 0)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-secondary-900 text-right">
                        {formatEuro((ligne.quantite || 0) * (ligne.prixUnitaire || 0))}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-sm text-secondary-500">
                      Aucune ligne de facturation
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notes */}
        {facture.notes && (
          <div className="bg-white rounded-xl shadow-elegant p-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">Notes</h3>
            <p className="text-sm text-secondary-700 whitespace-pre-wrap">{facture.notes}</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default FactureDetail;


import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { documentService, factureService } from '../services/api';
import Layout from '../components/Layout';
import {
  FileText,
  Receipt,
  Search,
  Download,
  Trash2,
  Loader2,
  Calendar,
  Filter
} from 'lucide-react';

const Documents = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtres
  const [filters, setFilters] = useState({
    type: 'Tous',
    search: ''
  });

  // Charger les documents au montage
  useEffect(() => {
    loadDocuments();
  }, [filters]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (filters.type && filters.type !== 'Tous') {
        params.type = filters.type;
      }
      const response = await documentService.getDocumentsGlobaux(params);
      setDocuments(response.data.documents || []);
    } catch (err) {
      console.error('Erreur lors du chargement des documents:', err);
      setError('Impossible de charger les documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (item) => {
    try {
      if (item.type === 'Document') {
        // Pour les documents, utiliser l'URL S3
        if (item.url) {
          window.open(item.url, '_blank');
        } else {
          // Sinon, utiliser l'endpoint de téléchargement
          const response = await documentService.getDownloadUrl(item.id);
          if (response.data.url) {
            window.open(response.data.url, '_blank');
          }
        }
      } else if (item.type === 'Facture') {
        // Pour les factures, télécharger le PDF
        const response = await factureService.downloadPDF(item.id);
        const blob = new Blob([response], { type: 'application/pdf' });
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${item.nom}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }
    } catch (err) {
      console.error('Erreur lors du téléchargement:', err);
      alert('Erreur lors du téléchargement');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer "${item.nom}" ?`)) {
      return;
    }

    try {
      if (item.type === 'Document') {
        await documentService.deleteDocument(item.id);
      } else if (item.type === 'Facture') {
        await factureService.deleteFacture(item.id);
      }
      await loadDocuments();
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      const errorMessage = err.response?.data?.message || 'Erreur lors de la suppression';
      alert(errorMessage);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTaille = (bytes) => {
    if (!bytes) return '—';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // Filtrer les documents par recherche
  const filteredDocuments = documents.filter(doc => {
    if (filters.search) {
      const search = filters.search.toLowerCase();
      return (
        doc.nom?.toLowerCase().includes(search) ||
        doc.dossier?.nom?.toLowerCase().includes(search) ||
        doc.client?.nom?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-secondary-900 mb-2">
                Documents
              </h1>
              <p className="text-secondary-600">
                Consultez tous vos documents et factures en un seul endroit
              </p>
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="card p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
              <input
                type="text"
                placeholder="Rechercher un document..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="input pl-10"
              />
            </div>

            {/* Filtre par type */}
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="input"
            >
              <option value="Tous">Tous les types</option>
              <option value="Document">Documents</option>
              <option value="Facture">Factures</option>
            </select>

            {/* Bouton réinitialiser */}
            <button
              onClick={() => setFilters({ type: 'Tous', search: '' })}
              className="btn-secondary"
            >
              Réinitialiser
            </button>
          </div>
        </div>

        {/* Tableau des documents */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : error ? (
          <div className="card p-8 text-center text-red-600">
            {error}
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="card p-12 text-center">
            <FileText className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-secondary-900 mb-2">
              Aucun document
            </h3>
            <p className="text-secondary-600">
              {filters.type !== 'Tous' || filters.search
                ? 'Aucun document ne correspond à vos critères'
                : 'Aucun document ou facture disponible'}
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Nom
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Dossier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Date d'ajout
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-secondary-200">
                  {filteredDocuments.map((item) => (
                    <tr key={`${item.type}-${item.id}`} className="hover:bg-secondary-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {item.type === 'Document' ? (
                            <FileText className="w-5 h-5 text-primary-600" />
                          ) : (
                            <Receipt className="w-5 h-5 text-green-600" />
                          )}
                          <span className="ml-2 text-sm text-secondary-600">
                            {item.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-secondary-900">
                          {item.nom}
                        </div>
                        {item.type === 'Document' && item.taille && (
                          <div className="text-sm text-secondary-500">
                            {formatTaille(item.taille)}
                          </div>
                        )}
                        {item.type === 'Facture' && item.totalTTC && (
                          <div className="text-sm text-secondary-500">
                            {item.totalTTC.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.dossier ? (
                          <Link
                            to={`/dossiers/${item.dossier.id}`}
                            className="text-sm text-primary-600 hover:text-primary-800 hover:underline"
                          >
                            {item.dossier.nom}
                          </Link>
                        ) : (
                          <span className="text-sm text-secondary-500">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-secondary-600">
                          {item.client?.nom || '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-secondary-600">
                          {formatDate(item.dateAjout)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleDownload(item)}
                            className="text-primary-600 hover:text-primary-900 p-2 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Télécharger"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
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
      </div>
    </Layout>
  );
};

export default Documents;

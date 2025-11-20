import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { dossierService, documentService } from '../services/api';
import Layout from '../components/Layout';
import GenerationDocumentModal from '../components/GenerationDocumentModal';
import {
  ArrowLeft,
  Folder,
  User,
  Calendar,
  FileText,
  Clock,
  MessageSquare,
  Upload,
  Edit2,
  Loader2,
  Send,
  Download,
  Trash2,
  File,
  Image,
  FileType,
  Sparkles
} from 'lucide-react';

const DossierDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('resume');
  
  // État pour l'ajout de note
  const [noteContent, setNoteContent] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [noteError, setNoteError] = useState('');
  
  // État pour les documents
  const [documents, setDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
  // État pour la génération IA
  const [isGenerationModalOpen, setIsGenerationModalOpen] = useState(false);

  useEffect(() => {
    loadDossier();
    loadDocuments();
  }, [id]);

  const loadDossier = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await dossierService.getDossierById(id);
      setDossier(response.data.dossier);
    } catch (err) {
      console.error('Erreur lors du chargement du dossier:', err);
      setError('Impossible de charger le dossier');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    
    if (!noteContent.trim()) {
      setNoteError('Le contenu de la note est requis');
      return;
    }

    try {
      setAddingNote(true);
      setNoteError('');
      await dossierService.addNote(id, noteContent);
      setNoteContent('');
      await loadDossier(); // Recharger le dossier pour afficher la nouvelle note
    } catch (err) {
      console.error('Erreur lors de l\'ajout de la note:', err);
      setNoteError('Erreur lors de l\'ajout de la note');
    } finally {
      setAddingNote(false);
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

  const getStatutColor = (statut) => {
    const statutFormate = formatStatutFromAPI(statut);
    switch (statutFormate) {
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

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatDateTime = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const loadDocuments = async () => {
    try {
      setLoadingDocuments(true);
      const response = await documentService.getDocumentsByDossier(id);
      setDocuments(response.data.documents);
    } catch (err) {
      console.error('Erreur lors du chargement des documents:', err);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;

    try {
      setUploadingDocuments(true);
      setUploadError('');
      
      await documentService.uploadDocuments(id, files);
      
      // Recharger les documents
      await loadDocuments();
      
      // Réinitialiser l'input
      e.target.value = '';
      
    } catch (err) {
      console.error('Erreur lors de l\'upload:', err);
      setUploadError(err.response?.data?.message || 'Erreur lors de l\'upload des fichiers');
    } finally {
      setUploadingDocuments(false);
    }
  };

  const handleDownload = async (documentId, nomFichier) => {
    try {
      const response = await documentService.getDownloadUrl(documentId);
      
      // Télécharger le fichier via fetch pour éviter les pop-up blockers
      const fileResponse = await fetch(response.data.url);
      const blob = await fileResponse.blob();
      
      // Créer un lien de téléchargement avec le blob
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nomFichier;
      document.body.appendChild(link);
      link.click();
      
      // Nettoyer
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Erreur lors du téléchargement:', err);
      alert('Erreur lors du téléchargement du fichier');
    }
  };

  const handleDeleteDocument = async (documentId, nomFichier) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le document "${nomFichier}" ?`)) {
      return;
    }

    try {
      await documentService.deleteDocument(documentId);
      await loadDocuments();
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      alert('Erreur lors de la suppression du document');
    }
  };

  const getFileIcon = (typeMime) => {
    if (typeMime.includes('pdf')) return '📄';
    if (typeMime.includes('word') || typeMime.includes('document')) return '📝';
    if (typeMime.includes('excel') || typeMime.includes('spreadsheet')) return '📊';
    if (typeMime.includes('image')) return '🖼️';
    return '📎';
  };

  const handleGenerationSuccess = () => {
    // Recharger les documents après génération
    loadDocuments();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </Layout>
    );
  }

  if (error || !dossier) {
    return (
      <Layout>
        <div className="p-8">
          <div className="card p-8 text-center text-red-600">
            {error || 'Dossier non trouvé'}
            <div className="mt-4">
              <Link to="/dossiers" className="btn-primary">
                Retour à la liste
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const tabs = [
    { id: 'resume', label: 'Résumé', icon: FileText },
    { id: 'notes', label: 'Notes', icon: MessageSquare, badge: dossier.notes?.length || 0 },
    { id: 'timeline', label: 'Timeline', icon: Clock, badge: dossier.timeline?.length || 0 },
    { id: 'documents', label: 'Documents', icon: Upload }
  ];

  return (
    <Layout>
      <div className="p-8">
        {/* Bouton retour */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/dossiers')}
            className="flex items-center text-secondary-600 hover:text-secondary-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à la liste
          </button>
        </div>

        {/* Header du dossier */}
        <div className="card p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center">
                <Folder className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-secondary-900 mb-2">
                  {dossier.nom}
                </h1>
                <div className="flex items-center space-x-4">
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatutColor(dossier.statut)}`}>
                    {formatStatutFromAPI(dossier.statut)}
                  </span>
                  {dossier.typeAffaire && (
                    <span className="text-sm text-secondary-600">
                      {formatTypeAffaireFromAPI(dossier.typeAffaire)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <button
              onClick={() => navigate(`/dossiers`)}
              className="btn-secondary flex items-center space-x-2"
            >
              <Edit2 className="w-4 h-4" />
              <span>Modifier</span>
            </button>
          </div>

        </div>

        {/* Onglets */}
        <div className="card">
          {/* Navigation des onglets */}
          <div className="border-b border-secondary-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                      ${activeTab === tab.id
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className={`
                        inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full
                        ${activeTab === tab.id ? 'bg-primary-100 text-primary-600' : 'bg-secondary-100 text-secondary-600'}
                      `}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Contenu des onglets */}
          <div className="p-6">
            {/* Onglet Résumé */}
            {activeTab === 'resume' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-secondary-900 mb-4">
                    Informations générales
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Description */}
                    {dossier.description && (
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-secondary-500">Description</label>
                        <p className="mt-1 text-base text-secondary-900">{dossier.description}</p>
                      </div>
                    )}

                    {/* Date d'ouverture */}
                    <div>
                      <label className="text-sm font-medium text-secondary-500 flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        Date d'ouverture
                      </label>
                      <p className="mt-1 text-base text-secondary-900">
                        {formatDate(dossier.dateOuverture)}
                      </p>
                    </div>

                    {/* Numéro d'affaire */}
                    {dossier.numeroAffaire && (
                      <div>
                        <label className="text-sm font-medium text-secondary-500">Numéro d'affaire</label>
                        <p className="mt-1 text-base text-secondary-900">{dossier.numeroAffaire}</p>
                      </div>
                    )}

                    {/* Juridiction */}
                    {dossier.juridiction && (
                      <div>
                        <label className="text-sm font-medium text-secondary-500">Juridiction</label>
                        <p className="mt-1 text-base text-secondary-900">{dossier.juridiction}</p>
                      </div>
                    )}

                    {/* Date de clôture */}
                    {dossier.dateCloture && (
                      <div>
                        <label className="text-sm font-medium text-secondary-500">Date de clôture</label>
                        <p className="mt-1 text-base text-secondary-900">{formatDate(dossier.dateCloture)}</p>
                      </div>
                    )}

                    {/* Prochain événement */}
                    {dossier.dateProchainEvenement && (
                      <div>
                        <label className="text-sm font-medium text-secondary-500">Prochain événement</label>
                        <p className="mt-1 text-base text-secondary-900">
                          {formatDate(dossier.dateProchainEvenement)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Informations du client */}
                {(dossier.client || (dossier.clientNom || dossier.clientPrenom)) && (
                  <div className="border-t border-secondary-200 pt-6 mt-6">
                    <h3 className="text-lg font-semibold text-secondary-900 mb-4">
                      Informations du client
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {(dossier.client?.prenom || dossier.clientPrenom) && (
                        <div>
                          <label className="text-sm font-medium text-secondary-500">Prénom</label>
                          <p className="mt-1 text-base text-secondary-900">
                            {dossier.client?.prenom || dossier.clientPrenom}
                          </p>
                        </div>
                      )}
                      {(dossier.client?.nom || dossier.clientNom) && (
                        <div>
                          <label className="text-sm font-medium text-secondary-500">Nom</label>
                          <p className="mt-1 text-base text-secondary-900">
                            {dossier.client?.nom || dossier.clientNom}
                          </p>
                        </div>
                      )}
                      {(dossier.client?.email || dossier.clientEmail) && (
                        <div>
                          <label className="text-sm font-medium text-secondary-500">Email</label>
                          <p className="mt-1 text-base text-secondary-900">
                            {dossier.client?.email || dossier.clientEmail}
                          </p>
                        </div>
                      )}
                      {(dossier.client?.telephone || dossier.clientTelephone) && (
                        <div>
                          <label className="text-sm font-medium text-secondary-500">Téléphone</label>
                          <p className="mt-1 text-base text-secondary-900">
                            {dossier.client?.telephone || dossier.clientTelephone}
                          </p>
                        </div>
                      )}
                      {(dossier.client?.adresse || dossier.clientAdresse) && (
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-secondary-500">Adresse</label>
                          <p className="mt-1 text-base text-secondary-900">
                            {dossier.client?.adresse || dossier.clientAdresse}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Onglet Notes */}
            {activeTab === 'notes' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-secondary-900 mb-4">
                    Ajouter une note
                  </h3>
                  <form onSubmit={handleAddNote} className="space-y-4">
                    <textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      className="input"
                      rows="4"
                      placeholder="Écrivez votre note ici..."
                      disabled={addingNote}
                    />
                    {noteError && (
                      <p className="text-sm text-red-600">{noteError}</p>
                    )}
                    <button
                      type="submit"
                      disabled={addingNote || !noteContent.trim()}
                      className="btn-primary flex items-center space-x-2"
                    >
                      {addingNote ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Ajout en cours...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Ajouter la note</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Liste des notes */}
                <div className="border-t border-secondary-200 pt-6">
                  <h3 className="text-lg font-semibold text-secondary-900 mb-4">
                    Notes ({dossier.notes?.length || 0})
                  </h3>
                  
                  {dossier.notes && dossier.notes.length > 0 ? (
                    <div className="space-y-4">
                      {dossier.notes.slice().reverse().map((note, index) => (
                        <div key={note._id || index} className="bg-secondary-50 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center">
                                <span className="text-white text-sm font-medium">
                                  {note.auteur?.prenom?.charAt(0)}{note.auteur?.nom?.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-secondary-900">
                                  {note.auteur?.prenom} {note.auteur?.nom}
                                </p>
                                <p className="text-xs text-secondary-500">
                                  {formatDateTime(note.dateCreation)}
                                </p>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-secondary-700 whitespace-pre-wrap">
                            {note.contenu}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-secondary-500 py-8">
                      Aucune note pour le moment
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Onglet Timeline */}
            {activeTab === 'timeline' && (
              <div>
                <h3 className="text-lg font-semibold text-secondary-900 mb-4">
                  Historique des actions
                </h3>
                
                {dossier.timeline && dossier.timeline.length > 0 ? (
                  <div className="relative">
                    {/* Ligne verticale */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-secondary-200"></div>
                    
                    <div className="space-y-6">
                      {dossier.timeline.slice().reverse().map((event, index) => (
                        <div key={event._id || index} className="relative flex items-start space-x-4">
                          {/* Point sur la timeline */}
                          <div className="relative z-10 w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                            <Clock className="w-4 h-4 text-white" />
                          </div>
                          
                          {/* Contenu */}
                          <div className="flex-1 bg-white rounded-lg border border-secondary-200 p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="text-sm font-semibold text-secondary-900">
                                {event.action}
                              </h4>
                              <span className="text-xs text-secondary-500">
                                {formatDateTime(event.date)}
                              </span>
                            </div>
                            {event.description && (
                              <p className="text-sm text-secondary-600 mb-2">
                                {event.description}
                              </p>
                            )}
                            {event.auteur && (
                              <p className="text-xs text-secondary-500">
                                Par {event.auteur.prenom} {event.auteur.nom}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-secondary-500 py-8">
                    Aucun événement dans la timeline
                  </p>
                )}
              </div>
            )}

            {/* Onglet Documents */}
            {activeTab === 'documents' && (
              <div className="space-y-6">
                {/* Bouton de génération IA */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-secondary-900">
                    Documents
                  </h3>
                  <button
                    onClick={() => setIsGenerationModalOpen(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-primary-600 text-white rounded-lg hover:from-purple-700 hover:to-primary-700 transition-all shadow-sm"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Générer avec l'IA</span>
                  </button>
                </div>

                {/* Zone d'upload */}
                <div>
                  <h3 className="text-lg font-semibold text-secondary-900 mb-4">
                    Ajouter des documents manuellement
                  </h3>
                  
                  <div className="border-2 border-dashed border-secondary-300 rounded-lg p-8 text-center hover:border-primary-400 transition-colors">
                    <input
                      type="file"
                      id="file-upload"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.txt,.zip"
                      disabled={uploadingDocuments}
                    />
                    <label
                      htmlFor="file-upload"
                      className={`cursor-pointer ${uploadingDocuments ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {uploadingDocuments ? (
                        <>
                          <Loader2 className="w-12 h-12 text-primary-600 mx-auto mb-4 animate-spin" />
                          <p className="text-base font-medium text-primary-600 mb-2">
                            Upload en cours...
                          </p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
                          <p className="text-base font-medium text-secondary-900 mb-2">
                            Cliquez pour sélectionner des fichiers
                          </p>
                          <p className="text-sm text-secondary-500">
                            ou glissez-déposez vos fichiers ici
                          </p>
                          <p className="text-xs text-secondary-400 mt-2">
                            PDF, Word, Excel, Images (max 50 MB par fichier)
                          </p>
                        </>
                      )}
                    </label>
                  </div>
                  
                  {uploadError && (
                    <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {uploadError}
                    </div>
                  )}
                </div>

                {/* Liste des documents */}
                <div className="border-t border-secondary-200 pt-6">
                  <h3 className="text-lg font-semibold text-secondary-900 mb-4">
                    Documents ({documents.length})
                  </h3>
                  
                  {loadingDocuments ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="text-center py-8 bg-secondary-50 rounded-lg">
                      <FileText className="w-12 h-12 text-secondary-300 mx-auto mb-3" />
                      <p className="text-secondary-600">Aucun document pour le moment</p>
                      <p className="text-sm text-secondary-500 mt-1">
                        Uploadez votre premier fichier ci-dessus
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-secondary-50 border-b border-secondary-200">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                              Fichier
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                              Taille
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                              Ajouté par
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-secondary-200">
                          {documents.map((doc) => (
                            <tr key={doc.id} className="hover:bg-secondary-50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center">
                                  <span className="text-2xl mr-3">{getFileIcon(doc.typeMime)}</span>
                                  <div>
                                    <div className="text-sm font-medium text-secondary-900">
                                      {doc.nomFichier}
                                    </div>
                                    <div className="text-xs text-secondary-500">
                                      {doc.typeMime}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-secondary-900">
                                {doc.tailleFormatee}
                              </td>
                              <td className="px-6 py-4 text-sm text-secondary-900">
                                {doc.uploader?.prenom} {doc.uploader?.nom}
                              </td>
                              <td className="px-6 py-4 text-sm text-secondary-500">
                                {formatDate(doc.createdAt)}
                              </td>
                              <td className="px-6 py-4 text-right text-sm font-medium">
                                <div className="flex items-center justify-end space-x-2">
                                  <button
                                    onClick={() => handleDownload(doc.id, doc.nomFichier)}
                                    className="text-primary-600 hover:text-primary-900 p-2 hover:bg-primary-50 rounded-lg transition-colors"
                                    title="Télécharger"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDocument(doc.id, doc.nomFichier)}
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
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de génération IA */}
      <GenerationDocumentModal
        isOpen={isGenerationModalOpen}
        onClose={() => setIsGenerationModalOpen(false)}
        dossierId={id}
        onSuccess={handleGenerationSuccess}
      />
    </Layout>
  );
};

export default DossierDetail;


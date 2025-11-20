import { useState, useEffect } from 'react';
import { iaService } from '../services/api';
import { X, Sparkles, Loader2, FileText } from 'lucide-react';

const GenerationDocumentModal = ({ isOpen, onClose, dossierId, onSuccess }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [promptContextuel, setPromptContextuel] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const response = await iaService.getTemplates();
      setTemplates(response.data.templates);
      
      // Sélectionner le premier template par défaut
      if (response.data.templates.length > 0) {
        setSelectedTemplate(response.data.templates[0].id);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des templates:', err);
      setError('Impossible de charger les templates');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    
    if (!selectedTemplate) {
      setError('Veuillez sélectionner un type de document');
      return;
    }

    try {
      setGenerating(true);
      setError('');
      
      await iaService.generateDocument(dossierId, selectedTemplate, promptContextuel);
      
      // Succès - fermer le modal et notifier le parent
      onSuccess();
      handleClose();
      
    } catch (err) {
      console.error('Erreur lors de la génération:', err);
      setError(err.response?.data?.message || 'Erreur lors de la génération du document');
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = () => {
    setSelectedTemplate('');
    setPromptContextuel('');
    setError('');
    setGenerating(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-elegant max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-secondary-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-primary-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-secondary-900">
                Générer un document avec l'IA
              </h2>
              <p className="text-sm text-secondary-600">
                Création automatique de documents juridiques
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={generating}
            className="text-secondary-400 hover:text-secondary-600 p-2 hover:bg-secondary-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleGenerate} className="p-6 space-y-6">
          {/* Information */}
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Sparkles className="w-5 h-5 text-primary-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-primary-900 mb-1">
                  Génération intelligente
                </h4>
                <p className="text-sm text-primary-700">
                  L'IA va générer un document professionnel en utilisant les informations de votre dossier (nom, description, client). 
                  Le document sera automatiquement converti en PDF et sauvegardé dans ce dossier.
                </p>
              </div>
            </div>
          </div>

          {/* Sélection du template */}
          <div>
            <label htmlFor="template" className="label">
              Type de document <span className="text-red-500">*</span>
            </label>
            {loadingTemplates ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
              </div>
            ) : (
              <select
                id="template"
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="input"
                required
                disabled={generating}
              >
                <option value="">Sélectionner un type...</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.nom} — {template.description}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Prompt contextuel */}
          <div>
            <label htmlFor="promptContextuel" className="label">
              Instructions supplémentaires (optionnel)
            </label>
            <textarea
              id="promptContextuel"
              value={promptContextuel}
              onChange={(e) => setPromptContextuel(e.target.value)}
              className="input"
              rows="4"
              placeholder="Ex: Ajouter une clause de confidentialité renforcée, mentionner les articles 1231-1 et suivants du Code civil..."
              disabled={generating}
            />
            <p className="text-xs text-secondary-500 mt-1">
              Ajoutez des précisions pour personnaliser le document généré
            </p>
          </div>

          {/* Erreur */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-secondary-200">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary px-6"
              disabled={generating}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn-primary px-6 flex items-center space-x-2"
              disabled={generating || !selectedTemplate}
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Génération en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Générer le document</span>
                </>
              )}
            </button>
          </div>

          {/* Info génération */}
          {generating && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Loader2 className="w-5 h-5 text-purple-600 mt-0.5 animate-spin" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-purple-900 mb-1">
                    Génération en cours...
                  </h4>
                  <p className="text-sm text-purple-700">
                    L'IA analyse votre dossier et rédige le document. Cela peut prendre 10-30 secondes.
                  </p>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default GenerationDocumentModal;


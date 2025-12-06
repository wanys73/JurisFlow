import { useState, useEffect } from 'react';
import { iaService } from '../services/api';
import { X, Sparkles, Loader2, FileText, User, Euro, Calendar, AlertCircle, ChevronDown, ChevronUp, Settings } from 'lucide-react';

const GenerationDocumentModal = ({ isOpen, onClose, dossierId, onSuccess }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  
  // Nouveaux états pour le formulaire détaillé
  const [montant, setMontant] = useState('');
  const [destinataireNom, setDestinataireNom] = useState('');
  const [destinatairePrenom, setDestinatairePrenom] = useState('');
  const [destinataireAdresse, setDestinataireAdresse] = useState('');
  const [destinataireEmail, setDestinataireEmail] = useState('');
  const [destinataireTelephone, setDestinataireTelephone] = useState('');
  const [delai, setDelai] = useState('8 jours francs à compter de la réception de la présente mise en demeure');
  const [consequences, setConsequences] = useState('');
  const [exposeFait, setExposeFait] = useState('');
  const [fondementJuridique, setFondementJuridique] = useState('');
  const [promptContextuel, setPromptContextuel] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

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

  // Construire le prompt contextuel à partir des champs du formulaire
  const buildPromptContextuel = () => {
    const parts = [];
    
    // Le montant est envoyé sans € car le backend l'ajoutera
    if (montant) {
      // Nettoyer le montant (enlever € s'il est déjà présent)
      const montantNettoye = montant.toString().replace(/\s*€\s*/g, '').trim();
      parts.push(`Montant réclamé : ${montantNettoye} €`);
    }
    if (destinataireNom || destinatairePrenom) {
      const nomComplet = `${destinatairePrenom} ${destinataireNom}`.trim();
      if (nomComplet) parts.push(`Destinataire - Nom : ${nomComplet}`);
    }
    if (destinataireAdresse) parts.push(`Destinataire - Adresse : ${destinataireAdresse}`);
    if (destinataireEmail) parts.push(`Destinataire - Email : ${destinataireEmail}`);
    if (destinataireTelephone) parts.push(`Destinataire - Téléphone : ${destinataireTelephone}`);
    if (exposeFait) parts.push(`Exposé des faits : ${exposeFait}`);
    if (fondementJuridique) parts.push(`Fondement juridique : ${fondementJuridique}`);
    if (delai) parts.push(`Délai de régularisation : ${delai}`);
    if (consequences) parts.push(`Conséquences en cas de non-réponse : ${consequences}`);
    if (promptContextuel) parts.push(`Instructions supplémentaires : ${promptContextuel}`);
    
    return parts.join('\n');
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
      
      const promptFinal = buildPromptContextuel();
      await iaService.generateDocument(dossierId, selectedTemplate, promptFinal);
      
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
    setMontant('');
    setDestinataireNom('');
    setDestinatairePrenom('');
    setDestinataireAdresse('');
    setDestinataireEmail('');
    setDestinataireTelephone('');
    setDelai('8 jours francs à compter de la réception de la présente mise en demeure');
    setConsequences('');
    setExposeFait('');
    setFondementJuridique('');
    setPromptContextuel('');
    setShowAdvancedOptions(false);
    setError('');
    setGenerating(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-elegant max-w-3xl w-full max-h-[90vh] overflow-y-auto">
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

          {/* Bouton pour ouvrir les options avancées */}
          <div className="border-t border-secondary-200 dark:border-secondary-700 pt-4">
            <button
              type="button"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="w-full flex items-center justify-between p-3 bg-secondary-50 dark:bg-secondary-700/50 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg transition-colors"
              disabled={generating}
            >
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                <span className="text-sm font-medium text-secondary-900 dark:text-white">
                  Options avancées
                </span>
              </div>
              {showAdvancedOptions ? (
                <ChevronUp className="w-4 h-4 text-secondary-600 dark:text-secondary-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-secondary-600 dark:text-secondary-400" />
              )}
            </button>
          </div>

          {/* Panneau des options avancées (s'ouvre au-dessus) */}
          {showAdvancedOptions && (
            <div className="fixed inset-0 bg-black bg-opacity-30 flex items-start justify-center z-[60] p-4 pt-20">
              <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-secondary-200 dark:border-secondary-700">
                {/* Header du panneau */}
                <div className="sticky top-0 bg-white dark:bg-secondary-800 border-b border-secondary-200 dark:border-secondary-700 p-4 flex items-center justify-between z-10">
                  <h3 className="text-lg font-semibold text-secondary-900 dark:text-white flex items-center space-x-2">
                    <Settings className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    <span>Options avancées</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedOptions(false)}
                    className="text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 p-1 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Contenu du panneau */}
                <div className="p-6 space-y-6">
                  {/* Section : Informations du document */}
                  <div>
                    <h4 className="text-sm font-semibold text-secondary-900 dark:text-white mb-4 flex items-center space-x-2">
                      <FileText className="w-4 h-4" />
                      <span>Informations du document</span>
                    </h4>
                    
                    <div>
                      <label htmlFor="montant" className="label flex items-center space-x-2">
                        <Euro className="w-4 h-4" />
                        <span>Montant réclamé (€)</span>
                      </label>
                      <input
                        type="number"
                        id="montant"
                        value={montant}
                        onChange={(e) => setMontant(e.target.value)}
                        className="input"
                        placeholder="Ex: 1500.00"
                        step="0.01"
                        min="0"
                        disabled={generating}
                      />
                    </div>
                  </div>

                  {/* Section : Destinataire */}
                  <div className="border-t border-secondary-200 dark:border-secondary-700 pt-4">
                    <h4 className="text-sm font-semibold text-secondary-900 dark:text-white mb-4 flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span>Destinataire (si différent du client du dossier)</span>
                    </h4>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="destinatairePrenom" className="label">
                            Prénom
                          </label>
                          <input
                            type="text"
                            id="destinatairePrenom"
                            value={destinatairePrenom}
                            onChange={(e) => setDestinatairePrenom(e.target.value)}
                            className="input"
                            placeholder="Prénom"
                            disabled={generating}
                          />
                        </div>
                        <div>
                          <label htmlFor="destinataireNom" className="label">
                            Nom
                          </label>
                          <input
                            type="text"
                            id="destinataireNom"
                            value={destinataireNom}
                            onChange={(e) => setDestinataireNom(e.target.value)}
                            className="input"
                            placeholder="Nom"
                            disabled={generating}
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="destinataireAdresse" className="label">
                          Adresse complète
                        </label>
                        <textarea
                          id="destinataireAdresse"
                          value={destinataireAdresse}
                          onChange={(e) => setDestinataireAdresse(e.target.value)}
                          className="input"
                          rows="2"
                          placeholder="Numéro, rue, code postal, ville"
                          disabled={generating}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="destinataireEmail" className="label">
                            Email
                          </label>
                          <input
                            type="email"
                            id="destinataireEmail"
                            value={destinataireEmail}
                            onChange={(e) => setDestinataireEmail(e.target.value)}
                            className="input"
                            placeholder="email@exemple.fr"
                            disabled={generating}
                          />
                        </div>
                        <div>
                          <label htmlFor="destinataireTelephone" className="label">
                            Téléphone
                          </label>
                          <input
                            type="tel"
                            id="destinataireTelephone"
                            value={destinataireTelephone}
                            onChange={(e) => setDestinataireTelephone(e.target.value)}
                            className="input"
                            placeholder="06 12 34 56 78"
                            disabled={generating}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section : Contenu du document */}
                  <div className="border-t border-secondary-200 dark:border-secondary-700 pt-4">
                    <h4 className="text-sm font-semibold text-secondary-900 dark:text-white mb-4">
                      Contenu du document
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="exposeFait" className="label">
                          Exposé des faits
                        </label>
                        <textarea
                          id="exposeFait"
                          value={exposeFait}
                          onChange={(e) => setExposeFait(e.target.value)}
                          className="input"
                          rows="4"
                          placeholder="Décrivez les faits qui justifient cette mise en demeure..."
                          disabled={generating}
                        />
                        <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                          Si vide, l'IA utilisera la description du dossier
                        </p>
                      </div>

                      <div>
                        <label htmlFor="fondementJuridique" className="label">
                          Fondement juridique
                        </label>
                        <textarea
                          id="fondementJuridique"
                          value={fondementJuridique}
                          onChange={(e) => setFondementJuridique(e.target.value)}
                          className="input"
                          rows="3"
                          placeholder="Ex: Articles 1231-1 et suivants du Code civil..."
                          disabled={generating}
                        />
                        <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                          Si vide, l'IA générera automatiquement les fondements juridiques appropriés
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section : Délais et conséquences */}
                  <div className="border-t border-secondary-200 dark:border-secondary-700 pt-4">
                    <h4 className="text-sm font-semibold text-secondary-900 dark:text-white mb-4 flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>Délais et conséquences</span>
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="delai" className="label">
                          Délai de régularisation
                        </label>
                        <input
                          type="text"
                          id="delai"
                          value={delai}
                          onChange={(e) => setDelai(e.target.value)}
                          className="input"
                          placeholder="Ex: 8 jours francs à compter de la réception"
                          disabled={generating}
                        />
                      </div>

                      <div>
                        <label htmlFor="consequences" className="label flex items-center space-x-2">
                          <AlertCircle className="w-4 h-4" />
                          <span>Conséquences en cas de non-réponse</span>
                        </label>
                        <textarea
                          id="consequences"
                          value={consequences}
                          onChange={(e) => setConsequences(e.target.value)}
                          className="input"
                          rows="3"
                          placeholder="Ex: Saisie des juridictions compétentes, condamnation au paiement des sommes dues..."
                          disabled={generating}
                        />
                        <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                          Si vide, l'IA générera automatiquement les conséquences standard
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Instructions supplémentaires */}
                  <div className="border-t border-secondary-200 dark:border-secondary-700 pt-4">
                    <label htmlFor="promptContextuel" className="label">
                      Instructions supplémentaires (optionnel)
                    </label>
                    <textarea
                      id="promptContextuel"
                      value={promptContextuel}
                      onChange={(e) => setPromptContextuel(e.target.value)}
                      className="input"
                      rows="3"
                      placeholder="Ex: Ajouter une clause de confidentialité renforcée, mentionner spécifiquement..."
                      disabled={generating}
                    />
                    <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                      Ajoutez des précisions supplémentaires pour personnaliser le document
                    </p>
                  </div>

                  {/* Bouton de fermeture */}
                  <div className="flex justify-end pt-4 border-t border-secondary-200 dark:border-secondary-700">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedOptions(false)}
                      className="btn-primary px-6"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

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


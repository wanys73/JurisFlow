import { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { iaService, dossierService } from '../services/api';
import { 
  Sparkles, 
  Send, 
  Loader2, 
  FileText, 
  MessageSquare,
  Bot,
  User,
  CheckCircle2,
  AlertCircle,
  Euro,
  Calendar,
  Settings,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';

const IA_Studio = () => {
  // État pour le chat
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const chatEndRef = useRef(null);

  // État pour la génération de documents
  const [dossiers, setDossiers] = useState([]);
  const [selectedDossier, setSelectedDossier] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [generationSuccess, setGenerationSuccess] = useState(false);
  const [loadingDossiers, setLoadingDossiers] = useState(true);
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

  // Charger les dossiers et templates au montage
  useEffect(() => {
    loadDossiers();
    loadTemplates();
  }, []);

  // Scroll automatique vers le bas du chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

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

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const response = await iaService.getTemplates();
      setTemplates(response.data.templates || []);
      if (response.data.templates && response.data.templates.length > 0) {
        setSelectedTemplate(response.data.templates[0].id);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    
    if (!chatMessage.trim() || chatLoading) return;

    const userMessage = chatMessage.trim();
    setChatMessage('');
    setChatError('');

    // Ajouter le message utilisateur à l'historique
    const newUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    setChatHistory(prev => [...prev, newUserMessage]);

    try {
      setChatLoading(true);

      // Préparer l'historique pour l'API (format simplifié)
      const historyForAPI = chatHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Appeler l'API de chat
      const response = await iaService.chat(userMessage, historyForAPI);

      // Ajouter la réponse de l'IA à l'historique
      const aiMessage = {
        role: 'assistant',
        content: response.data.response,
        timestamp: response.data.timestamp
      };
      setChatHistory(prev => [...prev, aiMessage]);

    } catch (err) {
      console.error('Erreur lors du chat:', err);
      setChatError(err.response?.data?.message || 'Erreur lors de la communication avec l\'IA');
      
      // Ajouter un message d'erreur à l'historique
      const errorMessage = {
        role: 'assistant',
        content: 'Désolé, une erreur est survenue. Veuillez réessayer.',
        error: true,
        timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
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

  const handleGenerateDocument = async (e) => {
    e.preventDefault();
    
    if (!selectedDossier) {
      setGenerationError('Veuillez sélectionner un dossier');
      return;
    }

    if (!selectedTemplate) {
      setGenerationError('Veuillez sélectionner un type de document');
      return;
    }

    try {
      setGenerating(true);
      setGenerationError('');
      setGenerationSuccess(false);

      const promptFinal = buildPromptContextuel();
      await iaService.generateDocument(selectedDossier, selectedTemplate, promptFinal);
      
      setGenerationSuccess(true);
      
      // Réinitialiser les champs
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
      
      // Réinitialiser après 3 secondes
      setTimeout(() => {
        setGenerationSuccess(false);
      }, 3000);

    } catch (err) {
      console.error('Erreur lors de la génération:', err);
      setGenerationError(err.response?.data?.message || 'Erreur lors de la génération du document');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-primary-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">
                Studio IA
              </h1>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">
                Assistant juridique et génération de documents
              </p>
            </div>
          </div>
        </div>

        {/* Layout en deux colonnes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section A : Chat IA */}
          <div className="bg-white dark:bg-secondary-800 rounded-lg border border-secondary-200 dark:border-secondary-700 shadow-sm flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
            {/* En-tête du chat */}
            <div className="p-4 border-b border-secondary-200 dark:border-secondary-700">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                  Assistant IA
                </h2>
              </div>
              <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">
                Posez vos questions juridiques
              </p>
            </div>

            {/* Zone de conversation */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Bot className="w-12 h-12 text-secondary-400 dark:text-secondary-500 mb-4" />
                  <p className="text-secondary-600 dark:text-secondary-400">
                    Bonjour ! Je suis votre assistant juridique.
                  </p>
                  <p className="text-sm text-secondary-500 dark:text-secondary-500 mt-2">
                    Posez-moi une question sur le droit français, la jurisprudence, ou demandez des conseils.
                  </p>
                </div>
              ) : (
                chatHistory.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-primary-600 text-white'
                          : message.error
                          ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                          : 'bg-secondary-100 dark:bg-secondary-700 text-secondary-900 dark:text-white'
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        {message.role === 'assistant' && !message.error && (
                          <Bot className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        )}
                        {message.error && (
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-secondary-100 dark:bg-secondary-700 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <Bot className="w-4 h-4 text-secondary-600 dark:text-secondary-400" />
                      <Loader2 className="w-4 h-4 animate-spin text-secondary-600 dark:text-secondary-400" />
                      <span className="text-sm text-secondary-600 dark:text-secondary-400">
                        L'IA réfléchit...
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Zone de saisie */}
            <div className="p-4 border-t border-secondary-200 dark:border-secondary-700">
              {chatError && (
                <div className="mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg text-sm">
                  {chatError}
                </div>
              )}
              <form onSubmit={handleChatSubmit} className="flex space-x-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Posez votre question..."
                  className="flex-1 input"
                  disabled={chatLoading}
                />
                <button
                  type="submit"
                  disabled={!chatMessage.trim() || chatLoading}
                  className="btn-primary px-4 flex items-center space-x-2"
                >
                  {chatLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Section B : Génération de Documents */}
          <div className="bg-white dark:bg-secondary-800 rounded-lg border border-secondary-200 dark:border-secondary-700 shadow-sm">
            {/* En-tête */}
            <div className="p-4 border-b border-secondary-200 dark:border-secondary-700">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                  Génération de Documents
                </h2>
              </div>
              <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">
                Créez des documents juridiques en quelques clics
              </p>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleGenerateDocument} className="p-4 space-y-4">
              {/* Sélection du dossier */}
              <div>
                <label htmlFor="dossier" className="label">
                  Dossier <span className="text-red-500">*</span>
                </label>
                {loadingDossiers ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
                  </div>
                ) : (
                  <select
                    id="dossier"
                    value={selectedDossier}
                    onChange={(e) => setSelectedDossier(e.target.value)}
                    className="input"
                    required
                    disabled={generating}
                  >
                    <option value="">Sélectionner un dossier...</option>
                    {dossiers.map((dossier) => (
                      <option key={dossier.id} value={dossier.id}>
                        {dossier.nom} - {dossier.clientNom} {dossier.clientPrenom}
                      </option>
                    ))}
                  </select>
                )}
                {dossiers.length === 0 && !loadingDossiers && (
                  <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                    Aucun dossier disponible. Créez d'abord un dossier.
                  </p>
                )}
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
                <div className="fixed inset-0 bg-black bg-opacity-30 flex items-start justify-center z-[60] p-4 pt-20" onClick={(e) => e.target === e.currentTarget && setShowAdvancedOptions(false)}>
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
                          <span>Destinataire (si différent du client)</span>
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

                      {/* Section : Contenu */}
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
                              placeholder="Décrivez les faits..."
                              disabled={generating}
                            />
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
                              placeholder="Ex: Articles 1231-1 du Code civil..."
                              disabled={generating}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section : Délais */}
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
                              placeholder="Ex: 8 jours francs"
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
                              placeholder="Ex: Saisie des juridictions..."
                              disabled={generating}
                            />
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
                          placeholder="Ex: Ajouter une clause..."
                          disabled={generating}
                        />
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

              {/* Messages d'erreur/succès */}
              {generationError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                  {generationError}
                </div>
              )}

              {generationSuccess && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg text-sm flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Document généré avec succès ! Il a été ajouté au dossier sélectionné.</span>
                </div>
              )}

              {/* Bouton de génération */}
              <button
                type="submit"
                className="btn-primary w-full flex items-center justify-center space-x-2"
                disabled={generating || !selectedDossier || !selectedTemplate}
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Génération en cours...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Générer et Sauvegarder</span>
                  </>
                )}
              </button>

              {/* Info génération */}
              {generating && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Loader2 className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 animate-spin" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-1">
                        Génération en cours...
                      </h4>
                      <p className="text-sm text-purple-700 dark:text-purple-400">
                        L'IA analyse votre dossier et rédige le document. Cela peut prendre 10-30 secondes.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default IA_Studio;


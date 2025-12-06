import { useState, useEffect, useRef } from 'react';
import { cabinetService } from '../services/api';
import { useCabinetSettings } from '../context/CabinetSettingsContext';
import { useTheme } from '../context/ThemeContext';
import { Sparkles } from 'lucide-react';
import Layout from '../components/Layout';
import SignatureCanvas from 'react-signature-canvas';
import {
  Settings,
  User,
  Building2,
  Bell,
  Upload,
  Loader2,
  Eye,
  EyeOff,
  Save,
  X,
  Image as ImageIcon,
  Trash2,
  PenTool,
  Sun,
  Moon,
  Info,
  Mail
} from 'lucide-react';

const Parametres = () => {
  const { cabinet, refreshCabinetSettings } = useCabinetSettings();
  const { theme, themePreference, setThemeMode, isDark, enableAnimations, setAnimationsEnabled } = useTheme();
  const signatureRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('profil');
  const [saving, setSaving] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  // Form states
  const [profilData, setProfilData] = useState({
    nom: '',
    prenom: '',
    email: ''
  });

  const [cabinetData, setCabinetData] = useState({
    cabinetNom: '',
    cabinetAdresse: '',
    cabinetSiret: '',
    cabinetTvaIntracom: '',
    cabinetEmailContact: '',
    cabinetTelephoneContact: '',
    cabinetMentionsLegales: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Files
  const [logoFile, setLogoFile] = useState(null);
  const [signatureFile, setSignatureFile] = useState(null);
  const [kbisFile, setKbisFile] = useState(null);

  // Preview URLs
  const [logoPreview, setLogoPreview] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState(null);

  useEffect(() => {
    if (cabinet) {
      setProfilData({
        nom: cabinet.nom || '',
        prenom: cabinet.prenom || '',
        email: cabinet.email || ''
      });

      setCabinetData({
        cabinetNom: cabinet.cabinetNom || '',
        cabinetAdresse: cabinet.cabinetAdresse || '',
        cabinetSiret: cabinet.cabinetSiret || '',
        cabinetTvaIntracom: cabinet.cabinetTvaIntracom || '',
        cabinetEmailContact: cabinet.cabinetEmailContact || '',
        cabinetTelephoneContact: cabinet.cabinetTelephoneContact || '',
        cabinetMentionsLegales: cabinet.cabinetMentionsLegales || ''
      });

      // Set preview URLs for existing images
      if (cabinet.cabinetLogoUrl) {
        setLogoPreview(cabinet.cabinetLogoUrl);
      }
      if (cabinet.cabinetSignatureUrl) {
        setSignaturePreview(cabinet.cabinetSignatureUrl);
      }
      
      setLoading(false);
    }
  }, [cabinet]);

  const handleProfilChange = (e) => {
    const { name, value } = e.target;
    setProfilData(prev => ({ ...prev, [name]: value }));
  };

  const handleCabinetChange = (e) => {
    const { name, value } = e.target;
    setCabinetData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type for images
    if (type === 'logo' || type === 'signature') {
      if (!file.type.startsWith('image/')) {
        alert('Veuillez sélectionner une image');
        return;
      }
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'logo') {
        setLogoFile(file);
        setLogoPreview(reader.result);
      } else if (type === 'signature') {
        setSignatureFile(file);
        setSignaturePreview(reader.result);
      } else if (type === 'kbis') {
        setKbisFile(file);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = async (type) => {
    if (type === 'logo') {
      try {
        console.log('🗑️ Suppression du logo...');
        setSaving(true);
        
        // Appeler l'API pour supprimer le logo
        const formData = new FormData();
        formData.append('removeLogo', 'true');
        
        await cabinetService.updateSettings(formData);
        
        setLogoFile(null);
        setLogoPreview(null);
        setSuccess('Logo supprimé avec succès');
        
        // Rafraîchir le contexte
        await refreshCabinetSettings();
      } catch (err) {
        console.error('❌ Erreur suppression logo:', err);
        setError('Erreur lors de la suppression du logo');
      } finally {
        setSaving(false);
      }
    } else if (type === 'signature') {
      try {
        console.log('🗑️ Suppression de la signature...');
        setSaving(true);
        
        // Appeler l'API pour supprimer la signature
        const formData = new FormData();
        formData.append('removeSignature', 'true');
        
        await cabinetService.updateSettings(formData);
        
        setSignatureFile(null);
        setSignaturePreview(null);
        setSuccess('Signature supprimée avec succès');
        
        // Rafraîchir le contexte
        await refreshCabinetSettings();
      } catch (err) {
        console.error('❌ Erreur suppression signature:', err);
        setError('Erreur lors de la suppression de la signature');
      } finally {
        setSaving(false);
      }
    } else if (type === 'kbis') {
      setKbisFile(null);
    }
  };

  const handleSaveProfil = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const formData = new FormData();
      formData.append('nom', profilData.nom);
      formData.append('prenom', profilData.prenom);

      await cabinetService.updateSettings(formData);
      
      setSuccess('Profil mis à jour avec succès');
      await refreshCabinetSettings();
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCabinet = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const formData = new FormData();
      
      console.log('💾 Préparation de la sauvegarde des paramètres cabinet...');
      
      // Add text fields
      Object.keys(cabinetData).forEach(key => {
        if (cabinetData[key]) {
          formData.append(key, cabinetData[key]);
          console.log(`  - ${key}:`, cabinetData[key].substring(0, 50));
        }
      });

      // Add files
      console.log('🔍 État des fichiers avant envoi:');
      console.log('  - logoFile:', logoFile ? `${logoFile.name} (${logoFile.size} bytes)` : 'null');
      console.log('  - signatureFile:', signatureFile ? `${signatureFile.name} (${signatureFile.size} bytes)` : 'null');
      console.log('  - kbisFile:', kbisFile ? `${kbisFile.name} (${kbisFile.size} bytes)` : 'null');
      
      if (logoFile) {
        formData.append('logo', logoFile);
        console.log('✅ Logo ajouté au FormData');
      }
      if (signatureFile) {
        formData.append('signature', signatureFile);
        console.log('✅ Signature ajoutée au FormData');
      }
      if (kbisFile) {
        formData.append('kbis', kbisFile);
        console.log('✅ KBIS ajouté au FormData');
      }

      console.log('📤 Envoi de la requête à l\'API...');
      const response = await cabinetService.updateSettings(formData);
      console.log('✅ Réponse API:', response);
      
      setSuccess('Paramètres du cabinet mis à jour avec succès');
      setLogoFile(null);
      setSignatureFile(null);
      setKbisFile(null);
      setShowSignaturePad(false);
      
      // Rafraîchir le contexte global
      console.log('🔄 Rafraîchissement du contexte...');
      await refreshCabinetSettings();
      console.log('✅ Contexte rafraîchi');
    } catch (err) {
      console.error('❌ Erreur lors de la sauvegarde:', err);
      console.error('Détails:', err.response?.data);
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // Gérer la signature dessinée
  const handleClearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
    }
  };

  const handleSaveSignatureDrawing = async () => {
    console.log('🖊️ Tentative de sauvegarde de la signature...');
    
    if (!signatureRef.current) {
      console.error('❌ Référence au canvas non trouvée');
      setError('Erreur : Canvas de signature non disponible');
      return;
    }
    
    if (signatureRef.current.isEmpty()) {
      console.warn('⚠️ Canvas vide');
      setError('Veuillez dessiner votre signature avant de l\'enregistrer');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    try {
      console.log('🖊️ Méthode alternative: utilisation de toDataURL()...');
      
      // Utiliser toDataURL() au lieu de getTrimmedCanvas() (problème de compatibilité)
      const dataUrl = signatureRef.current.toDataURL('image/png');
      console.log('✅ DataURL généré, longueur:', dataUrl.length);
      
      // Convertir DataURL en Blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      console.log('✅ Blob créé:', blob.size, 'bytes, type:', blob.type);
      
      // Créer un File à partir du Blob
      const file = new File([blob], 'signature.png', { type: 'image/png' });
      console.log('✅ File créé:', file.name, file.size, 'bytes');
      
      // Mettre à jour le state
      setSignatureFile(file);
      setSignaturePreview(dataUrl);
      setShowSignaturePad(false);
      setSuccess('Signature enregistrée. N\'oubliez pas de cliquer sur "Enregistrer les modifications"');
      
      console.log('🎯 Signature prête à être sauvegardée:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
      
    } catch (err) {
      console.error('❌ Exception dans handleSaveSignatureDrawing:', err);
      console.error('Message:', err.message);
      console.error('Stack:', err.stack);
      setError(`Erreur technique: ${err.message}`);
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleChangePassword = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      if (!passwordData.currentPassword || !passwordData.newPassword) {
        setError('Veuillez remplir tous les champs');
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setError('Les mots de passe ne correspondent pas');
        return;
      }

      if (passwordData.newPassword.length < 6) {
        setError('Le mot de passe doit contenir au moins 6 caractères');
        return;
      }

      await cabinetService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      setSuccess('Mot de passe modifié avec succès');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      console.error('Erreur lors du changement de mot de passe:', err);
      setError(err.response?.data?.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'profil', label: 'Profil', icon: User },
    { id: 'cabinet', label: 'Cabinet', icon: Building2 },
    { id: 'preferences', label: 'Préférences', icon: Bell },
    { id: 'about', label: 'À propos', icon: Info }
  ];

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Settings className="w-8 h-8 text-primary-600" />
            <h1 className="text-3xl font-bold text-secondary-900">
              Paramètres
            </h1>
          </div>
          <p className="text-secondary-600">
            Gérez les paramètres de votre cabinet et votre profil
          </p>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-800 hover:text-red-900">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-600 flex items-center justify-between">
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="text-green-800 hover:text-green-900">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : (
          <div className="card">
            {/* Tabs Navigation */}
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
                          : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'}
                      `}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* Onglet Profil */}
              {activeTab === 'profil' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-secondary-900 mb-4">
                      Informations personnelles
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="nom" className="label">
                          Nom
                        </label>
                        <input
                          type="text"
                          id="nom"
                          name="nom"
                          value={profilData.nom}
                          onChange={handleProfilChange}
                          className="input"
                        />
                      </div>
                      <div>
                        <label htmlFor="prenom" className="label">
                          Prénom
                        </label>
                        <input
                          type="text"
                          id="prenom"
                          name="prenom"
                          value={profilData.prenom}
                          onChange={handleProfilChange}
                          className="input"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label htmlFor="email" className="label">
                          Email
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={profilData.email}
                          disabled
                          className="input bg-secondary-50 cursor-not-allowed"
                        />
                        <p className="text-xs text-secondary-500 mt-1">
                          L'email ne peut pas être modifié
                        </p>
                      </div>
                    </div>
                    <div className="mt-6">
                      <button
                        onClick={handleSaveProfil}
                        disabled={saving}
                        className="btn-primary flex items-center space-x-2"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Enregistrement...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Enregistrer</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-secondary-200 pt-6">
                    <h2 className="text-xl font-bold text-secondary-900 mb-4">
                      Modifier le mot de passe
                    </h2>
                    <div className="space-y-4 max-w-md">
                      <div>
                        <label htmlFor="currentPassword" className="label">
                          Mot de passe actuel
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword.current ? 'text' : 'password'}
                            id="currentPassword"
                            name="currentPassword"
                            value={passwordData.currentPassword}
                            onChange={handlePasswordChange}
                            className="input pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(prev => ({ ...prev, current: !prev.current }))}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-500 hover:text-secondary-700"
                          >
                            {showPassword.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="newPassword" className="label">
                          Nouveau mot de passe
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword.new ? 'text' : 'password'}
                            id="newPassword"
                            name="newPassword"
                            value={passwordData.newPassword}
                            onChange={handlePasswordChange}
                            className="input pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(prev => ({ ...prev, new: !prev.new }))}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-500 hover:text-secondary-700"
                          >
                            {showPassword.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="confirmPassword" className="label">
                          Confirmer le nouveau mot de passe
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword.confirm ? 'text' : 'password'}
                            id="confirmPassword"
                            name="confirmPassword"
                            value={passwordData.confirmPassword}
                            onChange={handlePasswordChange}
                            className="input pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(prev => ({ ...prev, confirm: !prev.confirm }))}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-500 hover:text-secondary-700"
                          >
                            {showPassword.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={handleChangePassword}
                        disabled={saving}
                        className="btn-primary flex items-center space-x-2"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Modification...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Modifier le mot de passe</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Onglet Cabinet */}
              {activeTab === 'cabinet' && (
                <div className="space-y-8">
                  {/* Section Visuelle */}
                  <div>
                    <h2 className="text-xl font-bold text-secondary-900 mb-4">
                      Identité visuelle
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Logo */}
                      <div>
                        <label className="label mb-2">Logo du cabinet</label>
                        <div className="border-2 border-dashed border-secondary-300 rounded-lg p-4 text-center">
                          {logoPreview ? (
                            <div className="space-y-3">
                              <img
                                src={logoPreview}
                                alt="Logo"
                                className="max-h-32 mx-auto object-contain"
                              />
                              <div className="flex justify-center space-x-2">
                                <label className="btn-secondary cursor-pointer text-sm">
                                  <Upload className="w-4 h-4 inline mr-1" />
                                  Changer
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFileChange(e, 'logo')}
                                    className="hidden"
                                  />
                                </label>
                                <button
                                  onClick={() => handleRemoveFile('logo')}
                                  className="btn-secondary text-sm text-red-600 hover:text-red-800"
                                >
                                  <X className="w-4 h-4 inline mr-1" />
                                  Retirer
                                </button>
                              </div>
                            </div>
                          ) : (
                            <label className="cursor-pointer block">
                              <ImageIcon className="w-12 h-12 text-secondary-400 mx-auto mb-2" />
                              <p className="text-sm text-secondary-600 mb-2">
                                Cliquez pour télécharger un logo
                              </p>
                              <p className="text-xs text-secondary-500">
                                PNG, JPG jusqu'à 2MB
                              </p>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileChange(e, 'logo')}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      </div>

                      {/* Signature */}
                      <div>
                        <label className="label mb-2">Signature</label>
                        <div className="border-2 border-dashed border-secondary-300 rounded-lg p-4">
                          {signaturePreview && !showSignaturePad ? (
                            <div className="space-y-3">
                              <img
                                src={signaturePreview}
                                alt="Signature"
                                className="max-h-32 mx-auto object-contain bg-white border border-secondary-200 rounded p-2"
                              />
                              <div className="flex justify-center space-x-2">
                                <button
                                  onClick={() => setShowSignaturePad(true)}
                                  className="btn-secondary text-sm"
                                >
                                  <PenTool className="w-4 h-4 inline mr-1" />
                                  Dessiner nouvelle signature
                                </button>
                                <button
                                  onClick={() => handleRemoveFile('signature')}
                                  className="btn-secondary text-sm text-red-600 hover:text-red-800"
                                >
                                  <X className="w-4 h-4 inline mr-1" />
                                  Retirer
                                </button>
                              </div>
                            </div>
                          ) : showSignaturePad ? (
                            <div className="space-y-3">
                              <div className="border border-secondary-300 rounded-lg bg-white">
                                <SignatureCanvas
                                  ref={signatureRef}
                                  canvasProps={{
                                    className: 'w-full h-40 rounded-lg',
                                    style: { border: '1px solid #e2e8f0' }
                                  }}
                                  backgroundColor="white"
                                />
                              </div>
                              <div className="flex justify-center space-x-2">
                                <button
                                  onClick={handleClearSignature}
                                  className="btn-secondary text-sm"
                                >
                                  <Trash2 className="w-4 h-4 inline mr-1" />
                                  Effacer
                                </button>
                                <button
                                  onClick={handleSaveSignatureDrawing}
                                  className="btn-primary text-sm"
                                >
                                  <Save className="w-4 h-4 inline mr-1" />
                                  Valider la signature
                                </button>
                                <button
                                  onClick={() => setShowSignaturePad(false)}
                                  className="btn-secondary text-sm"
                                >
                                  <X className="w-4 h-4 inline mr-1" />
                                  Annuler
                                </button>
                              </div>
                              <p className="text-xs text-center text-secondary-500">
                                Dessinez votre signature avec la souris ou le doigt
                              </p>
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <PenTool className="w-12 h-12 text-secondary-400 mx-auto mb-2" />
                              <button
                                onClick={() => setShowSignaturePad(true)}
                                className="btn-primary text-sm"
                              >
                                <PenTool className="w-4 h-4 inline mr-1" />
                                Dessiner ma signature
                              </button>
                              <p className="text-xs text-secondary-500 mt-2">
                                Utilisez la souris ou le doigt pour signer
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section Légale */}
                  <div className="border-t border-secondary-200 pt-6">
                    <h2 className="text-xl font-bold text-secondary-900 mb-4">
                      Informations légales
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label htmlFor="cabinetNom" className="label">
                          Nom commercial du cabinet
                        </label>
                        <input
                          type="text"
                          id="cabinetNom"
                          name="cabinetNom"
                          value={cabinetData.cabinetNom}
                          onChange={handleCabinetChange}
                          className="input"
                          placeholder="Cabinet d'Avocats..."
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label htmlFor="cabinetAdresse" className="label">
                          Adresse complète
                        </label>
                        <textarea
                          id="cabinetAdresse"
                          name="cabinetAdresse"
                          value={cabinetData.cabinetAdresse}
                          onChange={handleCabinetChange}
                          rows={3}
                          className="input"
                          placeholder="123 Rue de la Justice, 75001 Paris"
                        />
                      </div>
                      <div>
                        <label htmlFor="cabinetSiret" className="label">
                          N° SIRET
                        </label>
                        <input
                          type="text"
                          id="cabinetSiret"
                          name="cabinetSiret"
                          value={cabinetData.cabinetSiret}
                          onChange={handleCabinetChange}
                          className="input"
                          placeholder="123 456 789 00010"
                        />
                      </div>
                      <div>
                        <label htmlFor="cabinetTvaIntracom" className="label">
                          N° TVA Intracommunautaire
                        </label>
                        <input
                          type="text"
                          id="cabinetTvaIntracom"
                          name="cabinetTvaIntracom"
                          value={cabinetData.cabinetTvaIntracom}
                          onChange={handleCabinetChange}
                          className="input"
                          placeholder="FR 12 345 678 901"
                        />
                      </div>
                      <div>
                        <label htmlFor="cabinetEmailContact" className="label">
                          Email de contact
                        </label>
                        <input
                          type="email"
                          id="cabinetEmailContact"
                          name="cabinetEmailContact"
                          value={cabinetData.cabinetEmailContact}
                          onChange={handleCabinetChange}
                          className="input"
                          placeholder="contact@cabinet.fr"
                        />
                      </div>
                      <div>
                        <label htmlFor="cabinetTelephoneContact" className="label">
                          Téléphone de contact
                        </label>
                        <input
                          type="tel"
                          id="cabinetTelephoneContact"
                          name="cabinetTelephoneContact"
                          value={cabinetData.cabinetTelephoneContact}
                          onChange={handleCabinetChange}
                          className="input"
                          placeholder="+33 1 23 45 67 89"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label htmlFor="cabinetMentionsLegales" className="label">
                          Mentions légales (pied de page)
                        </label>
                        <textarea
                          id="cabinetMentionsLegales"
                          name="cabinetMentionsLegales"
                          value={cabinetData.cabinetMentionsLegales}
                          onChange={handleCabinetChange}
                          rows={3}
                          className="input"
                          placeholder="Ex: Société d'Exercice Libéral à Responsabilité Limitée..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section Documents */}
                  <div className="border-t border-secondary-200 pt-6">
                    <h2 className="text-xl font-bold text-secondary-900 mb-4">
                      Documents légaux
                    </h2>
                    <div>
                      <label className="label mb-2">Extrait KBIS (optionnel)</label>
                      <div className="border-2 border-dashed border-secondary-300 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            {kbisFile ? (
                              <div className="flex items-center space-x-2">
                                <Upload className="w-5 h-5 text-green-600" />
                                <span className="text-sm text-secondary-900">{kbisFile.name}</span>
                              </div>
                            ) : cabinet?.cabinetKbisUrl ? (
                              <div className="flex items-center space-x-2">
                                <Upload className="w-5 h-5 text-primary-600" />
                                <span className="text-sm text-secondary-600">KBIS déjà téléchargé</span>
                              </div>
                            ) : (
                              <p className="text-sm text-secondary-500">Aucun fichier sélectionné</p>
                            )}
                          </div>
                          <label className="btn-secondary cursor-pointer text-sm">
                            <Upload className="w-4 h-4 inline mr-1" />
                            {kbisFile || cabinet?.cabinetKbisUrl ? 'Changer' : 'Télécharger'}
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleFileChange(e, 'kbis')}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                      <p className="text-xs text-secondary-500 mt-2">
                        PDF, JPG, PNG jusqu'à 5MB
                      </p>
                    </div>
                  </div>

                  {/* Bouton sauvegarder */}
                  <div className="border-t border-secondary-200 pt-6">
                    <button
                      onClick={handleSaveCabinet}
                      disabled={saving}
                      className="btn-primary flex items-center space-x-2"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Enregistrement...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Enregistrer les modifications</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Onglet Préférences */}
              {activeTab === 'preferences' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-bold text-secondary-900 mb-4">
                      Apparence
                    </h2>
                    
                    <div className="max-w-md">
                      <label className="label mb-3">
                        Thème de l'application
                      </label>
                      
                      <div className="grid grid-cols-3 gap-4">
                        {/* Thème Clair */}
                        <button
                          onClick={() => setThemeMode('clair')}
                          className={`
                            relative p-4 rounded-lg border-2 transition-all
                            ${themePreference === 'clair' 
                              ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/30' 
                              : 'border-secondary-300 dark:border-secondary-600 hover:border-secondary-400'}
                          `}
                        >
                          <div className="flex flex-col items-center space-y-3">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border-2 border-secondary-200">
                              <Sun className="w-6 h-6 text-yellow-500" />
                            </div>
                            <span className="font-medium text-secondary-900 dark:text-white">
                              Clair
                            </span>
                            {themePreference === 'clair' && (
                              <div className="absolute top-2 right-2 w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </button>

                        {/* Thème Sombre */}
                        <button
                          onClick={() => setThemeMode('sombre')}
                          className={`
                            relative p-4 rounded-lg border-2 transition-all
                            ${themePreference === 'sombre' 
                              ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/30' 
                              : 'border-secondary-300 dark:border-secondary-600 hover:border-secondary-400'}
                          `}
                        >
                          <div className="flex flex-col items-center space-y-3">
                            <div className="w-12 h-12 bg-secondary-800 rounded-full flex items-center justify-center border-2 border-secondary-600">
                              <Moon className="w-6 h-6 text-blue-400" />
                            </div>
                            <span className="font-medium text-secondary-900 dark:text-white">
                              Sombre
                            </span>
                            {themePreference === 'sombre' && (
                              <div className="absolute top-2 right-2 w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </button>

                        {/* Thème Système */}
                        <button
                          onClick={() => setThemeMode('systeme')}
                          className={`
                            relative p-4 rounded-lg border-2 transition-all
                            ${themePreference === 'systeme' 
                              ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/30' 
                              : 'border-secondary-300 dark:border-secondary-600 hover:border-secondary-400'}
                          `}
                        >
                          <div className="flex flex-col items-center space-y-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-full flex items-center justify-center border-2 border-secondary-200 dark:border-secondary-600">
                              <Settings className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                            </div>
                            <span className="font-medium text-secondary-900 dark:text-white">
                              Système
                            </span>
                            {themePreference === 'systeme' && (
                              <div className="absolute top-2 right-2 w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </button>
                      </div>
                      
                      <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-4">
                        {themePreference === 'systeme' 
                          ? `Le thème suit votre système (actuellement ${theme === 'clair' ? 'clair' : 'sombre'}). Les modifications sont appliquées immédiatement.`
                          : `Le thème ${theme === 'clair' ? 'clair' : 'sombre'} est activé. Les modifications sont appliquées immédiatement.`
                        }
                      </p>
                    </div>

                    {/* Mode Immersif */}
                    <div className="mt-8">
                      <label className="label mb-3">
                        Mode Immersif (Fond animé)
                      </label>
                      
                      <div className="flex items-center justify-between p-4 bg-secondary-50 dark:bg-secondary-800/50 rounded-lg border border-secondary-200 dark:border-secondary-700">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                          </div>
                          <div>
                            <p className="font-medium text-secondary-900 dark:text-white">
                              Fond animé
                            </p>
                            <p className="text-sm text-secondary-500 dark:text-secondary-400">
                              Active un fond animé subtil pour une expérience plus immersive
                            </p>
                          </div>
                        </div>
                        
                        {/* Switch Toggle */}
                        <button
                          type="button"
                          onClick={() => setAnimationsEnabled(!enableAnimations)}
                          className={`
                            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                            ${enableAnimations 
                              ? 'bg-primary-600' 
                              : 'bg-secondary-300 dark:bg-secondary-600'
                            }
                          `}
                          role="switch"
                          aria-checked={enableAnimations}
                        >
                          <span
                            className={`
                              pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                              ${enableAnimations ? 'translate-x-5' : 'translate-x-0'}
                            `}
                          />
                        </button>
                      </div>
                      
                      <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-3">
                        {enableAnimations 
                          ? 'Le fond animé est activé. Vous pouvez le désactiver pour un fond uni.'
                          : 'Le fond animé est désactivé. Activez-le pour une expérience plus immersive.'
                        }
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-secondary-200 pt-6">
                    <h2 className="text-xl font-bold text-secondary-900 mb-4">
                      Notifications
                    </h2>
                    <p className="text-secondary-600">
                      Les paramètres de notifications seront disponibles dans une prochaine version.
                    </p>
                  </div>
                </div>
              )}

              {/* Onglet À propos */}
              {activeTab === 'about' && (
                <div className="flex items-center justify-center py-12">
                  <div className="w-full max-w-md">
                    {/* Carte de visite */}
                    <div className="bg-white dark:bg-secondary-800 rounded-xl border-2 border-primary-200 dark:border-primary-800 shadow-lg p-8 text-center space-y-6">
                      {/* Titre */}
                      <div>
                        <h2 className="text-lg font-semibold text-secondary-600 dark:text-secondary-400 mb-1">
                          Développé avec passion par
                        </h2>
                      </div>

                      {/* Noms */}
                      <div className="space-y-2">
                        <h3 className="text-2xl font-bold text-secondary-900 dark:text-white">
                          BABA Wanys
                        </h3>
                        <h3 className="text-2xl font-bold text-secondary-900 dark:text-white">
                          Kalfallah Sabri
                        </h3>
                      </div>

                      {/* Rôle */}
                      <div className="pt-2">
                        <p className="text-base text-secondary-700 dark:text-secondary-300 font-medium">
                          Concepteurs & Développeurs Fullstack
                        </p>
                      </div>

                      {/* Séparateur */}
                      <div className="border-t border-secondary-200 dark:border-secondary-700 pt-6">
                        {/* Contact */}
                        <div className="space-y-3">
                          <a
                            href="mailto:ninisius@gmail.com"
                            className="inline-flex items-center space-x-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors group"
                          >
                            <Mail className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            <span className="font-medium">ninisius@gmail.com</span>
                          </a>
                          <p className="text-sm text-secondary-500 dark:text-secondary-400 italic">
                            Pour toute demande de support ou d'évolution.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Parametres;


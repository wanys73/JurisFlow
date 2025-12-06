import { createContext, useContext, useState, useEffect } from 'react';
import { cabinetService } from '../services/api';
import { useAuth } from './AuthContext';

const CabinetSettingsContext = createContext();

export const useCabinetSettings = () => {
  const context = useContext(CabinetSettingsContext);
  if (!context) {
    throw new Error('useCabinetSettings doit être utilisé dans un CabinetSettingsProvider');
  }
  return context;
};

export const CabinetSettingsProvider = ({ children }) => {
  const { user } = useAuth();
  const [cabinet, setCabinet] = useState(null);
  const [loading, setLoading] = useState(true);

  // Charger les paramètres du cabinet au montage et quand l'utilisateur change
  useEffect(() => {
    if (user) {
      loadCabinetSettings();
    } else {
      setCabinet(null);
      setLoading(false);
    }
  }, [user]);

  const loadCabinetSettings = async () => {
    try {
      setLoading(true);
      console.log('🔄 CabinetContext: Chargement des paramètres...');
      const response = await cabinetService.getSettings();
      console.log('✅ CabinetContext: Paramètres reçus:', {
        nom: response.data.cabinet?.cabinetNom,
        logo: response.data.cabinet?.cabinetLogoUrl,
        signature: response.data.cabinet?.cabinetSignatureUrl
      });
      setCabinet(response.data.cabinet);
    } catch (error) {
      console.error('❌ CabinetContext: Erreur lors du chargement:', error);
      setCabinet(null);
    } finally {
      setLoading(false);
    }
  };

  const updateCabinetSettings = (newSettings) => {
    console.log('🔄 CabinetContext: Mise à jour locale:', newSettings);
    setCabinet(prev => {
      const updated = {
        ...prev,
        ...newSettings
      };
      console.log('✅ CabinetContext: État mis à jour:', {
        nom: updated.cabinetNom,
        logo: updated.cabinetLogoUrl,
        signature: updated.cabinetSignatureUrl
      });
      return updated;
    });
  };

  const refreshCabinetSettings = async () => {
    await loadCabinetSettings();
  };

  const value = {
    cabinet,
    loading,
    updateCabinetSettings,
    refreshCabinetSettings
  };

  return (
    <CabinetSettingsContext.Provider value={value}>
      {children}
    </CabinetSettingsContext.Provider>
  );
};


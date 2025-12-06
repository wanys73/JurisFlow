import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';
import { useAuth } from './AuthContext';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme doit être utilisé dans un ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const { user } = useAuth();
  const [themePreference, setThemePreference] = useState(() => {
    // Récupérer la préférence depuis localStorage ou 'clair' par défaut
    return localStorage.getItem('themePreference') || 'clair';
  });

  const [enableAnimations, setEnableAnimations] = useState(() => {
    // Récupérer la préférence depuis localStorage ou true par défaut
    const stored = localStorage.getItem('enableAnimations');
    return stored !== null ? stored === 'true' : true;
  });

  const [effectiveTheme, setEffectiveTheme] = useState('clair');
  const [loadingPreferences, setLoadingPreferences] = useState(false);

  // Charger les préférences depuis la BDD lors de la connexion
  useEffect(() => {
    const loadPreferencesFromDB = async () => {
      if (user && user.preferences) {
        setLoadingPreferences(true);
        try {
          // Utiliser les préférences de l'utilisateur connecté
          const { themePreference: dbTheme, enableAnimations: dbAnimations } = user.preferences;
          
          if (dbTheme) {
            setThemePreference(dbTheme);
            localStorage.setItem('themePreference', dbTheme);
          }
          
          if (dbAnimations !== undefined && dbAnimations !== null) {
            setEnableAnimations(dbAnimations);
            localStorage.setItem('enableAnimations', dbAnimations.toString());
          }
        } catch (error) {
          console.error('Erreur lors du chargement des préférences:', error);
        } finally {
          setLoadingPreferences(false);
        }
      }
    };

    loadPreferencesFromDB();
  }, [user]);

  // Détecter la préférence système
  const getSystemTheme = () => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'sombre' : 'clair';
  };

  useEffect(() => {
    // Calculer le thème effectif
    let theme;
    if (themePreference === 'systeme') {
      theme = getSystemTheme();
    } else {
      theme = themePreference;
    }
    
    setEffectiveTheme(theme);
    
    // Appliquer le thème au document
    if (theme === 'sombre') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Sauvegarder la préférence dans localStorage
    localStorage.setItem('themePreference', themePreference);
  }, [themePreference]);

  // Écouter les changements de préférence système
  useEffect(() => {
    if (themePreference === 'systeme') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e) => {
        const newTheme = e.matches ? 'sombre' : 'clair';
        setEffectiveTheme(newTheme);
        
        if (newTheme === 'sombre') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [themePreference]);

  const toggleTheme = () => {
    setThemePreference(prev => prev === 'clair' ? 'sombre' : 'clair');
  };

  const setThemeMode = async (mode) => {
    if (mode === 'clair' || mode === 'sombre' || mode === 'systeme') {
      setThemePreference(mode);
      localStorage.setItem('themePreference', mode);
      
      // Sauvegarder dans la BDD si l'utilisateur est connecté
      if (user) {
        try {
          await authService.updatePreferences({ themePreference: mode });
        } catch (error) {
          console.error('Erreur lors de la sauvegarde du thème:', error);
        }
      }
    }
  };

  const toggleAnimations = async () => {
    const newValue = !enableAnimations;
    setEnableAnimations(newValue);
    localStorage.setItem('enableAnimations', newValue.toString());
    
    // Sauvegarder dans la BDD si l'utilisateur est connecté
    if (user) {
      try {
        await authService.updatePreferences({ enableAnimations: newValue });
      } catch (error) {
        console.error('Erreur lors de la sauvegarde des animations:', error);
      }
    }
  };

  const setAnimationsEnabled = async (enabled) => {
    setEnableAnimations(enabled);
    localStorage.setItem('enableAnimations', enabled.toString());
    
    // Sauvegarder dans la BDD si l'utilisateur est connecté
    if (user) {
      try {
        await authService.updatePreferences({ enableAnimations: enabled });
      } catch (error) {
        console.error('Erreur lors de la sauvegarde des animations:', error);
      }
    }
  };

  const value = {
    theme: effectiveTheme,
    themePreference,
    toggleTheme,
    setThemeMode,
    isDark: effectiveTheme === 'sombre',
    enableAnimations,
    toggleAnimations,
    setAnimationsEnabled
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};


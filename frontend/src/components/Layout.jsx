import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCabinetSettings } from '../context/CabinetSettingsContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, useLocation } from 'react-router-dom';
import SoftAuroraBackground from './AnimatedBackground';
import {
  Scale,
  LogOut,
  Folder,
  Users,
  FileText,
  Calendar,
  Euro,
  BarChart3,
  Settings,
  Search,
  Sparkles,
  PanelLeft,
  X
} from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { cabinet } = useCabinetSettings();
  const { enableAnimations, isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  
  // État de la sidebar : ouverte par défaut sur desktop, fermée sur mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    // Détecter si on est sur mobile au chargement
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768; // md breakpoint de Tailwind
    }
    return true;
  });
  
  // Détecter les changements de taille d'écran
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false); // Fermer sur mobile
      } else {
        setIsSidebarOpen(true); // Ouvrir sur desktop
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    // Si on est déjà sur la page des dossiers, on peut passer le terme de recherche via l'état
    if (location.pathname === '/dossiers') {
      // Émettre un événement personnalisé pour déclencher la recherche sur la page Dossiers
      window.dispatchEvent(new CustomEvent('globalSearch', { detail: searchQuery }));
    } else {
      // Sinon, rediriger vers la page des dossiers avec le terme de recherche
      navigate('/dossiers', { state: { search: searchQuery } });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className={`min-h-screen relative ${
      enableAnimations 
        ? 'bg-transparent' 
        : isDark 
          ? 'bg-slate-950' 
          : 'bg-slate-50'
    }`}>
      {/* Fond animé Soft & Clean - Uniquement si activé */}
      {enableAnimations && <SoftAuroraBackground />}
      
      {/* Overlay pour mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar avec glassmorphism - Verre givré */}
      <aside className={`
        fixed left-0 top-0 h-full z-50
        bg-white dark:bg-slate-800 shadow-sm
        border-r border-slate-100 dark:border-slate-700
        flex flex-col
        transition-all duration-300 ease-in-out
        ${isSidebarOpen 
          ? 'w-64 translate-x-0' 
          : 'w-20 -translate-x-full md:translate-x-0 md:w-20'
        }
      `}>
        {/* Logo et Toggle */}
        <div className="p-4 md:p-6 border-b border-secondary-200 dark:border-secondary-700">
          <div className="flex items-center justify-between">
            <div className={`flex items-center space-x-3 transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
              {cabinet?.cabinetLogoUrl ? (
                <img 
                  src={cabinet.cabinetLogoUrl} 
                  alt="Logo" 
                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
                  <Scale className="w-6 h-6 text-white" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-secondary-900 dark:text-white truncate">
                  {cabinet?.cabinetNom || 'JurisFlow'}
                </h1>
              </div>
            </div>
            {/* Logo seul quand sidebar réduite (desktop uniquement) */}
            <div className={`hidden md:block ${!isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
              {cabinet?.cabinetLogoUrl ? (
                <img 
                  src={cabinet.cabinetLogoUrl} 
                  alt="Logo" 
                  className="w-10 h-10 rounded-lg object-cover mx-auto"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center mx-auto">
                  <Scale className="w-6 h-6 text-white" />
                </div>
              )}
            </div>
            {/* Bouton Toggle */}
            <button
              onClick={toggleSidebar}
              className="p-2 text-secondary-400 dark:text-secondary-500 hover:text-secondary-900 dark:hover:text-white hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg transition-colors flex-shrink-0"
              title={isSidebarOpen ? 'Réduire la sidebar' : 'Agrandir la sidebar'}
            >
              {isSidebarOpen ? (
                <PanelLeft className="w-5 h-5" />
              ) : (
                <PanelLeft className="w-5 h-5 rotate-180" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 md:p-4 space-y-2 overflow-y-auto">
          <NavItem
            icon={BarChart3}
            label="Dashboard"
            active={location.pathname === '/dashboard'}
            onClick={() => navigate('/dashboard')}
            isSidebarOpen={isSidebarOpen}
          />
          <NavItem
            icon={Folder}
            label="Dossiers"
            active={location.pathname === '/dossiers'}
            onClick={() => navigate('/dossiers')}
            isSidebarOpen={isSidebarOpen}
          />
          <NavItem 
            icon={Users} 
            label="Clients"
            active={location.pathname === '/clients'}
            onClick={() => navigate('/clients')}
            isSidebarOpen={isSidebarOpen}
          />
          <NavItem 
            icon={Sparkles} 
            label="Studio IA"
            active={location.pathname === '/ia-studio'}
            onClick={() => navigate('/ia-studio')}
            isSidebarOpen={isSidebarOpen}
          />
          <NavItem 
            icon={FileText} 
            label="Documents"
            active={location.pathname === '/documents'}
            onClick={() => navigate('/documents')}
            isSidebarOpen={isSidebarOpen}
          />
          <NavItem 
            icon={Calendar} 
            label="Agenda"
            active={location.pathname === '/agenda'}
            onClick={() => navigate('/agenda')}
            isSidebarOpen={isSidebarOpen}
          />
          <NavItem
            icon={Euro}
            label="Facturation"
            active={location.pathname === '/facturation'}
            onClick={() => navigate('/facturation')}
            isSidebarOpen={isSidebarOpen}
          />
          <NavItem
            icon={BarChart3}
            label="Statistiques"
            active={location.pathname === '/statistiques'}
            onClick={() => navigate('/statistiques')}
            isSidebarOpen={isSidebarOpen}
          />
          <NavItem 
            icon={Settings} 
            label="Paramètres"
            active={location.pathname === '/parametres'}
            onClick={() => navigate('/parametres')}
            isSidebarOpen={isSidebarOpen}
          />
        </nav>

        {/* User info */}
        <div className="p-2 md:p-4 border-t border-secondary-200 dark:border-secondary-700">
          <div className={`flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center flex-col space-y-2'}`}>
            <div className={`min-w-0 transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100 flex-1' : 'opacity-0 w-0 overflow-hidden'}`}>
              <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">
                {user?.prenom} {user?.nom}
              </p>
              <p className="text-xs text-secondary-500 dark:text-secondary-400 truncate">{user?.email}</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-400 mt-1">
                {user?.role}
              </span>
            </div>
            {/* Avatar seul quand sidebar réduite (desktop uniquement) */}
            <div className={`hidden md:block ${!isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
              <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold mx-auto">
                {user?.prenom?.[0]}{user?.nom?.[0]}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className={`p-2 text-secondary-400 dark:text-secondary-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0 ${!isSidebarOpen ? 'mx-auto' : 'ml-2'}`}
              title="Déconnexion"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content - Transparent pour voir le fond animé */}
      <main className={`
        transition-all duration-300 ease-in-out relative z-10
        bg-transparent
        ${isSidebarOpen ? 'md:ml-64 ml-0' : 'md:ml-20 ml-0'}
      `}>
        {/* Header avec glassmorphism - Verre givré */}
        <header className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 px-4 md:px-8 py-4 sticky top-0 z-50">
          <div className="flex items-center justify-between">
            {/* Bouton Toggle pour mobile */}
            <button
              onClick={toggleSidebar}
              className="md:hidden p-2 text-secondary-400 dark:text-secondary-500 hover:text-secondary-900 dark:hover:text-white hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg transition-colors mr-2"
              title="Ouvrir le menu"
            >
              <PanelLeft className="w-5 h-5" />
            </button>
            
            {/* Search */}
            <div className="flex-1 max-w-2xl">
              <div className="relative flex items-center">
                <Search className="absolute left-3 w-5 h-5 text-secondary-400 dark:text-secondary-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Rechercher un dossier, client, document..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full pl-10 pr-12 py-2 border border-gray-300 dark:border-slate-600 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/60 bg-white dark:bg-slate-800 text-secondary-900 dark:text-white placeholder-secondary-400 dark:placeholder-secondary-500"
                />
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-gradient-to-r from-primary-600 to-cyan-600 text-white rounded-r-lg hover:from-primary-700 hover:to-cyan-700 transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-primary-500/30"
                  title="Rechercher"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-4 ml-4">
              <NotificationDropdown />
            </div>
          </div>
        </header>

        {/* Content */}
        {children}
      </main>
    </div>
  );
};

// Composant pour les items de navigation avec micro-interactions
const NavItem = ({ icon: Icon, label, active = false, onClick, isSidebarOpen = true }) => {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center rounded-lg menu-item
        ${isSidebarOpen ? 'px-4 py-3 space-x-3' : 'px-2 py-3 justify-center'}
        ${
          active
            ? 'bg-gradient-to-r from-primary-600/20 to-cyan-600/20 dark:from-primary-500/30 dark:to-cyan-500/30 text-primary-600 dark:text-primary-400 border-l-2 border-primary-500 shadow-lg shadow-primary-500/20'
            : 'text-secondary-600 dark:text-secondary-300 hover:bg-white/50 dark:hover:bg-white/5 hover:text-primary-600 dark:hover:text-cyan-400 hover:shadow-md'
        }
      `}
      title={!isSidebarOpen ? label : ''}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${active ? 'scale-110' : ''}`} />
      <span className={`font-medium transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
        {label}
      </span>
    </button>
  );
};

export default Layout;


import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Bell
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

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
    <div className="min-h-screen bg-secondary-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-secondary-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-secondary-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center">
              <Scale className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-secondary-900">JurisFlow</h1>
              <p className="text-xs text-secondary-500">Version 1.0 MVP</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <NavItem
            icon={BarChart3}
            label="Dashboard"
            active={location.pathname === '/dashboard'}
            onClick={() => navigate('/dashboard')}
          />
          <NavItem
            icon={Folder}
            label="Dossiers"
            active={location.pathname === '/dossiers'}
            onClick={() => navigate('/dossiers')}
          />
          <NavItem 
            icon={Users} 
            label="Clients"
            active={location.pathname === '/clients'}
            onClick={() => navigate('/clients')}
          />
          <NavItem 
            icon={FileText} 
            label="Documents"
            active={location.pathname === '/documents'}
            onClick={() => navigate('/documents')}
          />
          <NavItem 
            icon={Calendar} 
            label="Agenda"
            active={location.pathname === '/agenda'}
            onClick={() => navigate('/agenda')}
          />
          <NavItem
            icon={Euro}
            label="Facturation"
            active={location.pathname === '/facturation'}
            onClick={() => navigate('/facturation')}
          />
          <NavItem 
            icon={BarChart3} 
            label="Statistiques"
            active={location.pathname === '/statistiques'}
            onClick={() => navigate('/statistiques')}
          />
          <NavItem icon={Settings} label="Paramètres" />
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-secondary-200">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-secondary-900 truncate">
                {user?.prenom} {user?.nom}
              </p>
              <p className="text-xs text-secondary-500 truncate">{user?.email}</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800 mt-1">
                {user?.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="ml-2 p-2 text-secondary-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Déconnexion"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64">
        {/* Header */}
        <header className="bg-white border-b border-secondary-200 px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Search */}
            <div className="flex-1 max-w-2xl">
              <div className="relative flex items-center">
                <Search className="absolute left-3 w-5 h-5 text-secondary-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Rechercher un dossier, client, document..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full pl-10 pr-12 py-2 border border-secondary-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-primary-600 text-white rounded-r-lg hover:bg-primary-700 transition-colors"
                  title="Rechercher"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-4 ml-4">
              <button className="relative p-2 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 rounded-lg transition-colors">
                <Bell className="w-6 h-6" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        {children}
      </main>
    </div>
  );
};

// Composant pour les items de navigation
const NavItem = ({ icon: Icon, label, active = false, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
        active
          ? 'bg-primary-50 text-primary-600'
          : 'text-secondary-600 hover:bg-secondary-100 hover:text-secondary-900'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </button>
  );
};

export default Layout;


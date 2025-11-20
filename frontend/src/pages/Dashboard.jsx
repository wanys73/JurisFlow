import { useState, useEffect } from 'react';
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
  Bell,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { statistiqueService } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [kpis, setKpis] = useState({
    totalRevenus: 0,
    totalImpayes: 0,
    dossiersOuverts: 0,
    repartitionDossiers: {
      ouverts: 0,
      fermes: 0,
      enAttente: 0,
      total: 0
    }
  });
  const [revenusMensuels, setRevenusMensuels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Charger les KPIs et les revenus mensuels en parallèle
      const [kpisResponse, revenusResponse] = await Promise.all([
        statistiqueService.getKPIs(),
        statistiqueService.getRevenusMensuels()
      ]);

      if (kpisResponse.success) {
        setKpis(kpisResponse.data);
      }

      if (revenusResponse.success) {
        setRevenusMensuels(revenusResponse.data);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
      setError('Erreur lors du chargement des données du tableau de bord');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Formatage des montants en euros
  const formatEuro = (montant) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(montant);
  };

  // Données pour le graphique circulaire
  const pieData = [
    { name: 'Ouverts', value: kpis.repartitionDossiers.ouverts, color: '#3b82f6' },
    { name: 'Fermés', value: kpis.repartitionDossiers.fermes, color: '#10b981' },
    { name: 'En attente', value: kpis.repartitionDossiers.enAttente, color: '#f59e0b' }
  ].filter(item => item.value > 0);

  // Composant personnalisé pour la légende du graphique circulaire
  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-sm font-semibold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
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
          <NavItem icon={Users} label="Clients" />
          <NavItem icon={FileText} label="Documents" />
          <NavItem icon={Calendar} label="Agenda" />
          <NavItem 
            icon={Euro} 
            label="Facturation"
            active={location.pathname === '/facturation'}
            onClick={() => navigate('/facturation')}
          />
          <NavItem icon={BarChart3} label="Statistiques" />
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
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
                <input
                  type="text"
                  placeholder="Rechercher un dossier, client, document..."
                  className="w-full pl-10 pr-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
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
        <div className="p-8">
          {/* Welcome message */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-secondary-900 mb-2">
              Tableau de bord, {user?.prenom} 👋
            </h2>
            <p className="text-secondary-600">
              Vue d'ensemble de votre activité juridique
            </p>
            {user?.role === 'admin' && user?.cabinet?.nom && (
              <p className="text-sm text-primary-600 mt-1">
                Cabinet : {user.cabinet.nom}
              </p>
            )}
          </div>

          {/* Loading state */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              <p className="mt-4 text-secondary-600">Chargement des données...</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* KPIs Cards */}
          {!loading && (
            <>
              {/* Section Revenus */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-secondary-900 mb-4">Revenus</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Total Revenus */}
                  <div className="bg-white rounded-lg border border-secondary-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-secondary-900 mb-1">
                      {formatEuro(kpis.totalRevenus)}
                    </p>
                    <p className="text-sm text-secondary-600">Total des revenus</p>
                    <p className="text-xs text-green-600 mt-2">Factures payées</p>
                  </div>

                  {/* Total Impayés */}
                  <div className="bg-white rounded-lg border border-secondary-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-red-600" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-secondary-900 mb-1">
                      {formatEuro(kpis.totalImpayes)}
                    </p>
                    <p className="text-sm text-secondary-600">Total des impayés</p>
                    <p className="text-xs text-red-600 mt-2">Factures en retard</p>
                  </div>
                </div>
              </div>

              {/* Section Dossiers */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-secondary-900 mb-4">Dossiers</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Total Dossiers */}
                  <div className="bg-white rounded-lg border border-secondary-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Folder className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-secondary-900 mb-1">
                      {kpis.repartitionDossiers.total}
                    </p>
                    <p className="text-sm text-secondary-600">Total des dossiers</p>
                    <p className="text-xs text-purple-600 mt-2">Tous statuts confondus</p>
                  </div>

                  {/* Dossiers Ouverts */}
                  <div className="bg-white rounded-lg border border-secondary-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                        <Folder className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-secondary-900 mb-1">
                      {kpis.repartitionDossiers.ouverts}
                    </p>
                    <p className="text-sm text-secondary-600">Dossiers ouverts</p>
                    <p className="text-xs text-green-600 mt-2">En cours de traitement</p>
                  </div>

                  {/* Dossiers En Attente */}
                  <div className="bg-white rounded-lg border border-secondary-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                        <Folder className="w-6 h-6 text-yellow-600" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-secondary-900 mb-1">
                      {kpis.repartitionDossiers.enAttente}
                    </p>
                    <p className="text-sm text-secondary-600">En attente</p>
                    <p className="text-xs text-yellow-600 mt-2">En attente de traitement</p>
                  </div>

                  {/* Dossiers Fermés */}
                  <div className="bg-white rounded-lg border border-secondary-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Folder className="w-6 h-6 text-gray-600" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-secondary-900 mb-1">
                      {kpis.repartitionDossiers.fermes}
                    </p>
                    <p className="text-sm text-secondary-600">Dossiers fermés</p>
                    <p className="text-xs text-gray-600 mt-2">Clôturés</p>
                  </div>
                </div>
              </div>

              {/* Graphiques */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Graphique 1: Revenus mensuels */}
                <div className="bg-white rounded-lg border border-secondary-200 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-secondary-900 mb-6">
                    Revenus des 12 derniers mois
                  </h3>
                  {revenusMensuels.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={revenusMensuels}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="mois" 
                          stroke="#6b7280"
                          style={{ fontSize: '12px' }}
                        />
                        <YAxis 
                          stroke="#6b7280"
                          style={{ fontSize: '12px' }}
                          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
                        />
                        <Tooltip 
                          formatter={(value) => formatEuro(value)}
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            padding: '8px'
                          }}
                        />
                        <Legend />
                        <Bar 
                          dataKey="revenus" 
                          fill="#3b82f6" 
                          radius={[8, 8, 0, 0]}
                          name="Revenus"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-secondary-500">
                      <p>Aucune donnée disponible</p>
                    </div>
                  )}
                </div>

                {/* Graphique 2: Répartition des dossiers */}
                <div className="bg-white rounded-lg border border-secondary-200 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-secondary-900 mb-6">
                    Répartition des dossiers
                  </h3>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={CustomLabel}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => `${value} dossiers`}
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            padding: '8px'
                          }}
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36}
                          formatter={(value, entry) => (
                            <span style={{ color: entry.color }}>{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-secondary-500">
                      <p>Aucun dossier disponible</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
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

export default Dashboard;

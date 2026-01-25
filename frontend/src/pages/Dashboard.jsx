import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { 
  TrendingUp,
  AlertCircle,
  Folder as FolderIcon
} from 'lucide-react';
import { statistiqueService } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import UrgentDossiersWidget from '../components/UrgentDossiersWidget';

const Dashboard = () => {
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
    <Layout>
      <div className="p-8">
          {/* Titre principal */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-secondary-900 dark:text-white mb-2">
              Tableau de bord
            </h1>
            <p className="text-secondary-600 dark:text-secondary-400">
              Vue d'ensemble de votre activité
            </p>
          </div>

          {/* Widget Dossiers Urgents - Killer Feature */}
          <div className="mb-8">
            <UrgentDossiersWidget />
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
            <div className="bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-lg p-4 mb-6">
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
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4 font-display">Revenus</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Total Revenus */}
                  <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-md card-interactive p-6 hover:shadow-lg hover:shadow-cyan-500/20 transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-lg bg-green-500/20 backdrop-blur-sm flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-secondary-900 dark:text-white mb-1">
                      {formatEuro(kpis.totalRevenus)}
                    </p>
                    <p className="text-sm font-medium text-secondary-700 dark:text-secondary-200">Total des revenus</p>
                    <p className="text-xs text-green-600 mt-2">Factures payées</p>
                  </div>

                  {/* Total Impayés */}
                  <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-md card-interactive p-6 hover:shadow-lg hover:shadow-red-500/30 transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-lg bg-red-500/20 backdrop-blur-sm flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-secondary-900 dark:text-white mb-1">
                      {formatEuro(kpis.totalImpayes)}
                    </p>
                    <p className="text-sm font-medium text-secondary-700 dark:text-secondary-200">Total des impayés</p>
                    <p className="text-xs text-red-600 mt-2">Factures en retard</p>
                  </div>
                </div>
              </div>

              {/* Section Dossiers */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4 font-display">Dossiers</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Total Dossiers */}
                  <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-md card-interactive p-6 hover:shadow-lg hover:shadow-violet-500/30 transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-lg bg-purple-500/20 backdrop-blur-sm flex items-center justify-center">
                        <FolderIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-secondary-900 dark:text-white mb-1">
                      {kpis.repartitionDossiers.total}
                    </p>
                    <p className="text-sm font-medium text-secondary-700 dark:text-secondary-200">Total des dossiers</p>
                    <p className="text-xs text-purple-600 mt-2">Tous statuts confondus</p>
                  </div>

                  {/* Dossiers Ouverts */}
                  <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-md card-interactive p-6 hover:shadow-lg hover:shadow-green-500/30 transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-lg bg-green-500/20 backdrop-blur-sm flex items-center justify-center">
                        <FolderIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-secondary-900 dark:text-white mb-1">
                      {kpis.repartitionDossiers.ouverts}
                    </p>
                    <p className="text-sm font-medium text-secondary-700 dark:text-secondary-200">Dossiers ouverts</p>
                    <p className="text-xs text-green-600 mt-2">En cours de traitement</p>
                  </div>

                  {/* Dossiers En Attente */}
                  <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-md card-interactive p-6 hover:shadow-lg hover:shadow-yellow-500/30 transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-lg bg-yellow-500/20 backdrop-blur-sm flex items-center justify-center">
                        <FolderIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-secondary-900 dark:text-white mb-1">
                      {kpis.repartitionDossiers.enAttente}
                    </p>
                    <p className="text-sm font-medium text-secondary-700 dark:text-secondary-200">En attente</p>
                    <p className="text-xs text-yellow-600 mt-2">En attente de traitement</p>
                  </div>

                  {/* Dossiers Fermés */}
                  <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-md card-interactive p-6 hover:shadow-lg hover:shadow-gray-500/30 transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-lg bg-white/30 dark:bg-slate-950/30 backdrop-blur-sm flex items-center justify-center">
                        <FolderIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-secondary-900 dark:text-white mb-1">
                      {kpis.repartitionDossiers.fermes}
                    </p>
                    <p className="text-sm font-medium text-secondary-700 dark:text-secondary-200">Dossiers fermés</p>
                    <p className="text-xs text-gray-600 mt-2">Clôturés</p>
                  </div>
                </div>
              </div>

              {/* Graphiques */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Graphique 1: Revenus mensuels */}
                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-md p-6 card-interactive hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300">
                  <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-6 font-display">
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
                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-md p-6 card-interactive hover:shadow-lg hover:shadow-violet-500/20 transition-all duration-300">
                  <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-6 font-display">
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
    </Layout>
  );
};

export default Dashboard;

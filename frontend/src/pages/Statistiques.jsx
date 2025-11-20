import { useState, useEffect } from 'react';
import { rapportService } from '../services/api';
import Layout from '../components/Layout';
import {
  BarChart3,
  TrendingUp,
  Users,
  Loader2,
  Filter
} from 'lucide-react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const Statistiques = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rapport, setRapport] = useState(null);

  // Filtres
  const [filters, setFilters] = useState({
    annee: new Date().getFullYear().toString(),
    responsableId: ''
  });

  // Charger le rapport au montage et quand les filtres changent
  useEffect(() => {
    loadRapport();
  }, [filters]);

  const loadRapport = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {
        annee: filters.annee
      };
      
      if (filters.responsableId) {
        params.responsableId = filters.responsableId;
      }

      const response = await rapportService.getRapportAnnuel(params);
      setRapport(response.data);
    } catch (err) {
      console.error('Erreur lors du chargement du rapport:', err);
      setError('Impossible de charger le rapport');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Générer les années disponibles (5 dernières années)
  const getAnnees = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  };

  // Couleurs pour le PieChart
  const COLORS = ['#2563EB', '#DC2626', '#059669', '#EA580C', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B'];

  // Formatter pour la devise
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Combiner les données pour le ComposedChart
  const getCombinedData = () => {
    if (!rapport) return [];
    
    return rapport.revenusMensuels.map((revenu, index) => ({
      mois: revenu.mois,
      revenus: revenu.revenus,
      dossiers: rapport.nouveauxDossiersMensuels[index]?.dossiers || 0
    }));
  };

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-secondary-900 mb-2">
                Statistiques Avancées
              </h1>
              <p className="text-secondary-600">
                Analysez les performances détaillées de votre cabinet
              </p>
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="card p-6 mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Filter className="w-5 h-5 text-secondary-500" />
            <h2 className="text-lg font-semibold text-secondary-900">Filtres</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Filtre année */}
            <div>
              <label htmlFor="annee" className="label">
                Année
              </label>
              <select
                id="annee"
                name="annee"
                value={filters.annee}
                onChange={handleFilterChange}
                className="input"
              >
                {getAnnees().map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Note: Le filtre responsable pourrait être ajouté ici si besoin */}
            <div className="flex items-end">
              <button
                onClick={loadRapport}
                className="btn-primary w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Chargement...
                  </>
                ) : (
                  'Actualiser'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        {loading && !rapport ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : error ? (
          <div className="card p-8 text-center text-red-600">
            {error}
          </div>
        ) : rapport ? (
          <div className="space-y-8">
            {/* KPIs rapides */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary-600 mb-1">
                      Revenus Totaux {rapport.annee}
                    </p>
                    <p className="text-3xl font-bold text-secondary-900">
                      {formatCurrency(rapport.totaux.revenus)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary-600 mb-1">
                      Nouveaux Dossiers {rapport.annee}
                    </p>
                    <p className="text-3xl font-bold text-secondary-900">
                      {rapport.totaux.dossiers}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Graphique 1 : Revenus vs Nouveaux Dossiers */}
            <div className="card p-6">
              <h2 className="text-xl font-bold text-secondary-900 mb-6">
                Revenus et Nouveaux Dossiers par Mois
              </h2>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={getCombinedData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="mois" 
                    tick={{ fill: '#64748B', fontSize: 12 }}
                  />
                  <YAxis 
                    yAxisId="left"
                    tick={{ fill: '#64748B', fontSize: 12 }}
                    tickFormatter={formatCurrency}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: '#64748B', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #E2E8F0',
                      borderRadius: '0.5rem',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value, name) => {
                      if (name === 'revenus') {
                        return [formatCurrency(value), 'Revenus'];
                      }
                      return [value, 'Nouveaux dossiers'];
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    formatter={(value) => {
                      if (value === 'revenus') return 'Revenus';
                      if (value === 'dossiers') return 'Nouveaux dossiers';
                      return value;
                    }}
                  />
                  <Bar 
                    yAxisId="left"
                    dataKey="revenus" 
                    fill="#2563EB" 
                    radius={[8, 8, 0, 0]}
                    name="revenus"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="dossiers" 
                    stroke="#DC2626" 
                    strokeWidth={2}
                    dot={{ fill: '#DC2626', r: 4 }}
                    name="dossiers"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Graphique 2 : Répartition des Affaires */}
              <div className="card p-6">
                <h2 className="text-xl font-bold text-secondary-900 mb-6">
                  Répartition par Type d'Affaire
                </h2>
                {rapport.repartitionTypesDossiers.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={rapport.repartitionTypesDossiers}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ type, percent }) => 
                          `${type} (${(percent * 100).toFixed(0)}%)`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {rapport.repartitionTypesDossiers.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #E2E8F0',
                          borderRadius: '0.5rem'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-secondary-500">
                    Aucune donnée disponible
                  </div>
                )}
              </div>

              {/* Tableau 3 : Top 5 Clients */}
              <div className="card p-6">
                <div className="flex items-center space-x-2 mb-6">
                  <Users className="w-5 h-5 text-secondary-500" />
                  <h2 className="text-xl font-bold text-secondary-900">
                    Top 5 Clients
                  </h2>
                </div>
                {rapport.topClients.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-secondary-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">
                            Rang
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">
                            Client
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase">
                            Revenus
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase">
                            Factures
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-secondary-200">
                        {rapport.topClients.map((client, index) => (
                          <tr key={client.id || client.nom} className="hover:bg-secondary-50">
                            <td className="px-4 py-3 text-sm font-semibold text-secondary-900">
                              #{index + 1}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-secondary-900">
                                {client.nom}
                              </div>
                              {client.email && (
                                <div className="text-xs text-secondary-500">
                                  {client.email}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                              {formatCurrency(client.revenus)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-secondary-600">
                              {client.nombreFactures}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-secondary-500">
                    Aucun client avec des revenus pour cette période
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
};

export default Statistiques;

import React, { useState, useEffect } from 'react';
import { dossierService } from '../services/api';
import { useNavigate } from 'react-router-dom';

const UrgentDossiersWidget = () => {
  const [urgentDossiers, setUrgentDossiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadUrgentDossiers();
  }, []);

  const loadUrgentDossiers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await dossierService.getUrgentDossiers();
      setUrgentDossiers(response.data.urgentDossiers || []);
    } catch (error) {
      console.error('❌ Erreur chargement dossiers urgents:', error);
      setError('Impossible de charger les dossiers urgents');
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (level) => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-50 border-red-500 text-red-900';
      case 'HIGH': return 'bg-orange-50 border-orange-500 text-orange-900';
      case 'MEDIUM': return 'bg-yellow-50 border-yellow-500 text-yellow-900';
      default: return 'bg-gray-50 border-gray-500 text-gray-900';
    }
  };

  const getUrgencyIcon = (level) => {
    switch (level) {
      case 'CRITICAL': return '🚨';
      case 'HIGH': return '⚠️';
      case 'MEDIUM': return '⏰';
      default: return '📅';
    }
  };

  const getUrgencyLabel = (level) => {
    switch (level) {
      case 'CRITICAL': return 'Critique';
      case 'HIGH': return 'Élevé';
      case 'MEDIUM': return 'Moyen';
      default: return 'Normal';
    }
  };

  const handleDossierClick = (dossierId) => {
    navigate(`/dossiers/${dossierId}`);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <span className="mr-2">⚠️</span>
          Dossiers Urgents
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <span className="mr-2">⚠️</span>
          Dossiers Urgents
        </h3>
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadUrgentDossiers}
            className="mt-4 text-primary-600 hover:text-primary-800 font-medium"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (urgentDossiers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <span className="mr-2">✅</span>
          Aucun dossier urgent
        </h3>
        <p className="text-gray-600 text-center py-8">
          Tous vos dossiers sont à jour ! 🎉
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center">
          <span className="mr-2">⚠️</span>
          Dossiers Urgents
        </h3>
        <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded-full">
          {urgentDossiers.length}
        </span>
      </div>

      <div className="space-y-3">
        {urgentDossiers.map(dossier => (
          <div
            key={dossier.id}
            onClick={() => handleDossierClick(dossier.id)}
            className={`p-4 border-l-4 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${getUrgencyColor(dossier.urgencyLevel)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{getUrgencyIcon(dossier.urgencyLevel)}</span>
                  <h4 className="font-semibold truncate">{dossier.nom}</h4>
                </div>
                
                {dossier.client && (
                  <p className="text-sm mb-1">
                    Client: {dossier.client.prenom} {dossier.client.nom}
                  </p>
                )}
                
                {dossier.numeroAffaire && (
                  <p className="text-sm mb-1">
                    Référence: {dossier.numeroAffaire}
                  </p>
                )}

                {dossier.typeAffaire && (
                  <span className="inline-block text-xs px-2 py-1 bg-white bg-opacity-50 rounded mt-1">
                    {dossier.typeAffaire}
                  </span>
                )}
              </div>
              
              <div className="text-right ml-4 flex-shrink-0">
                <p className="text-3xl font-bold mb-1">
                  {dossier.daysRemaining}
                </p>
                <p className="text-xs mb-1">
                  jour{dossier.daysRemaining > 1 ? 's' : ''}
                </p>
                <span className={`text-xs font-semibold px-2 py-1 rounded ${
                  dossier.urgencyLevel === 'CRITICAL' ? 'bg-red-200' :
                  dossier.urgencyLevel === 'HIGH' ? 'bg-orange-200' :
                  'bg-yellow-200'
                }`}>
                  {getUrgencyLabel(dossier.urgencyLevel)}
                </span>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-current border-opacity-20">
              <p className="text-xs flex items-center">
                <span className="mr-2">📅</span>
                Échéance: {new Date(dossier.dateEcheance).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={() => navigate('/dossiers?filter=urgent')}
          className="w-full text-center text-primary-600 hover:text-primary-800 font-medium text-sm transition-colors"
        >
          Voir tous les dossiers urgents →
        </button>
      </div>
    </div>
  );
};

export default UrgentDossiersWidget;

import React from 'react';

const PremiumBadge = ({ inline = false, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-3 py-1',
    lg: 'text-sm px-4 py-1.5'
  };

  if (inline) {
    return (
      <span className={`inline-flex items-center ml-2 font-semibold bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full ${sizeClasses[size]}`}>
        ⭐ PRO
      </span>
    );
  }

  return (
    <div className={`absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold rounded-full shadow-lg ${sizeClasses[size]}`}>
      ⭐ PRO
    </div>
  );
};

export const PremiumFeatureCard = ({ title, description, features = [], onUpgrade }) => {
  return (
    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-lg p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-300 to-orange-400 opacity-10 rounded-full -mr-16 -mt-16"></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <PremiumBadge size="lg" />
        </div>
        
        <p className="text-gray-700 mb-4">{description}</p>
        
        {features.length > 0 && (
          <ul className="space-y-2 mb-6">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span className="text-gray-700">{feature}</span>
              </li>
            ))}
          </ul>
        )}
        
        <button
          onClick={onUpgrade}
          className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
        >
          🚀 Passer à Premium
        </button>
      </div>
    </div>
  );
};

export default PremiumBadge;

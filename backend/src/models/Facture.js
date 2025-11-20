import mongoose from 'mongoose';

const factureSchema = new mongoose.Schema({
  // Numéro de facture unique
  numeroFacture: {
    type: String,
    required: [true, 'Le numéro de facture est requis'],
    unique: true,
    trim: true,
    uppercase: true
  },

  // Référence au dossier
  dossier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dossier',
    required: [true, 'Le dossier est requis']
  },

  // Cabinet (multi-tenant)
  cabinet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Lignes de facturation
  lignes: [{
    description: {
      type: String,
      required: [true, 'La description de la ligne est requise'],
      trim: true
    },
    quantite: {
      type: Number,
      required: [true, 'La quantité est requise'],
      min: [0.01, 'La quantité doit être supérieure à 0']
    },
    prixUnitaire: {
      type: Number,
      required: [true, 'Le prix unitaire est requis'],
      min: [0, 'Le prix unitaire doit être positif']
    },
    // Total de la ligne (calculé automatiquement)
    totalLigne: {
      type: Number,
      default: function() {
        return this.quantite * this.prixUnitaire;
      }
    }
  }],

  // Totaux
  totalHT: {
    type: Number,
    required: true,
    min: [0, 'Le total HT doit être positif'],
    default: 0
  },

  tva: {
    type: Number,
    default: 20,
    min: [0, 'La TVA doit être positive'],
    max: [100, 'La TVA ne peut pas dépasser 100%']
  },

  totalTTC: {
    type: Number,
    required: true,
    min: [0, 'Le total TTC doit être positif'],
    default: 0
  },

  // Statut de la facture
  statut: {
    type: String,
    enum: {
      values: ['Brouillon', 'Envoyée', 'Payée', 'En retard'],
      message: 'Le statut doit être : Brouillon, Envoyée, Payée ou En retard'
    },
    default: 'Brouillon'
  },

  // Dates
  dateEmission: {
    type: Date,
    default: Date.now
  },

  dateEcheance: {
    type: Date,
    required: [true, 'La date d\'échéance est requise']
  },

  // Date de paiement (si payée)
  datePaiement: {
    type: Date
  },

  // Notes internes
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Les notes ne peuvent pas dépasser 1000 caractères']
  },

  // Soft delete
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true, // createdAt et updatedAt automatiques
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour améliorer les performances
factureSchema.index({ cabinet: 1, createdAt: -1 });
factureSchema.index({ dossier: 1 });
factureSchema.index({ numeroFacture: 1 });
factureSchema.index({ statut: 1 });

// Virtual pour calculer le total HT à partir des lignes
factureSchema.virtual('calculTotalHT').get(function() {
  if (!this.lignes || this.lignes.length === 0) {
    return 0;
  }
  return this.lignes.reduce((total, ligne) => {
    const totalLigne = ligne.quantite * ligne.prixUnitaire;
    return total + totalLigne;
  }, 0);
});

// Virtual pour calculer le total TTC
factureSchema.virtual('calculTotalTTC').get(function() {
  const totalHT = this.calculTotalHT || this.totalHT || 0;
  const tva = this.tva || 20;
  return totalHT * (1 + tva / 100);
});

// Pre-save hook : Calculer automatiquement les totaux
factureSchema.pre('save', function(next) {
  // Calculer le total de chaque ligne
  if (this.lignes && this.lignes.length > 0) {
    this.lignes.forEach(ligne => {
      ligne.totalLigne = ligne.quantite * ligne.prixUnitaire;
    });
  }

  // Calculer le total HT
  this.totalHT = this.lignes.reduce((total, ligne) => {
    return total + (ligne.quantite * ligne.prixUnitaire);
  }, 0);

  // Calculer le total TTC
  const tva = this.tva || 20;
  this.totalTTC = this.totalHT * (1 + tva / 100);

  // Si le statut passe à "Payée", enregistrer la date de paiement
  if (this.isModified('statut') && this.statut === 'Payée' && !this.datePaiement) {
    this.datePaiement = new Date();
  }

  // Si le statut n'est plus "Payée", supprimer la date de paiement
  if (this.isModified('statut') && this.statut !== 'Payée' && this.datePaiement) {
    this.datePaiement = undefined;
  }

  next();
});

// Méthode pour générer un numéro de facture unique
factureSchema.statics.generateNumeroFacture = async function(cabinetId) {
  const year = new Date().getFullYear();
  const prefix = `FAC-${year}-`;
  
  // Trouver le dernier numéro de facture de l'année pour ce cabinet
  const lastFacture = await this.findOne({
    cabinet: cabinetId,
    numeroFacture: new RegExp(`^${prefix}`)
  }).sort({ numeroFacture: -1 });

  let numero = 1;
  if (lastFacture) {
    const lastNum = parseInt(lastFacture.numeroFacture.split('-')[2]);
    numero = lastNum + 1;
  }

  return `${prefix}${numero.toString().padStart(4, '0')}`;
};

// Méthode pour obtenir la représentation publique
factureSchema.methods.toPublicJSON = function() {
  const facture = this.toObject();
  
  // Formater les dates
  if (facture.dateEmission) {
    facture.dateEmission = new Date(facture.dateEmission).toISOString();
  }
  if (facture.dateEcheance) {
    facture.dateEcheance = new Date(facture.dateEcheance).toISOString();
  }
  if (facture.datePaiement) {
    facture.datePaiement = new Date(facture.datePaiement).toISOString();
  }

  return facture;
};

const Facture = mongoose.model('Facture', factureSchema);

export default Facture;


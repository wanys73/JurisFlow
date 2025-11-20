import mongoose from 'mongoose';

const dossierSchema = new mongoose.Schema({
  // Informations de base
  nom: {
    type: String,
    required: [true, 'Le nom du dossier est requis'],
    trim: true,
    minlength: [3, 'Le nom doit contenir au moins 3 caractères'],
    maxlength: [200, 'Le nom ne peut pas dépasser 200 caractères']
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'La description ne peut pas dépasser 2000 caractères']
  },
  
  // Statut du dossier
  statut: {
    type: String,
    enum: {
      values: ['Ouvert', 'Fermé', 'En attente'],
      message: 'Le statut doit être : Ouvert, Fermé ou En attente'
    },
    default: 'Ouvert'
  },
  
  // Responsable du dossier (avocat/juriste assigné)
  responsable: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Un responsable doit être assigné au dossier']
  },
  
  // Cabinet propriétaire (pour le multi-tenant)
  cabinet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Le dossier doit être lié à un cabinet']
  },
  
  // Client lié au dossier (optionnel pour le moment)
  client: {
    nom: String,
    prenom: String,
    email: String,
    telephone: String,
    adresse: String
  },
  
  // Informations juridiques
  typeAffaire: {
    type: String,
    enum: [
      'Civil',
      'Pénal',
      'Commercial',
      'Administratif',
      'Travail',
      'Famille',
      'Immobilier',
      'Autre'
    ]
  },
  
  numeroAffaire: {
    type: String,
    unique: true,
    sparse: true // Permet d'avoir des valeurs null multiples
  },
  
  juridiction: String,
  
  // Dates importantes
  dateOuverture: {
    type: Date,
    default: Date.now
  },
  
  dateCloture: Date,
  
  dateProchainEvenement: Date,
  
  // Notes internes
  notes: [{
    contenu: {
      type: String,
      required: true
    },
    auteur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    dateCreation: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Timeline des actions
  timeline: [{
    action: {
      type: String,
      required: true
    },
    description: String,
    auteur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Métadonnées
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  isArchived: {
    type: Boolean,
    default: false
  }
  
}, {
  timestamps: true
});

// Index pour améliorer les performances
dossierSchema.index({ cabinet: 1, statut: 1 });
dossierSchema.index({ responsable: 1 });
dossierSchema.index({ nom: 'text', description: 'text' }); // Recherche textuelle
dossierSchema.index({ numeroAffaire: 1 });

// Middleware pour ajouter une entrée dans la timeline lors de la création
dossierSchema.pre('save', function(next) {
  if (this.isNew) {
    this.timeline.push({
      action: 'Création du dossier',
      description: `Le dossier "${this.nom}" a été créé`,
      auteur: this.createdBy,
      date: new Date()
    });
  }
  next();
});

// Méthode pour ajouter une note
dossierSchema.methods.ajouterNote = function(contenu, auteurId) {
  this.notes.push({
    contenu,
    auteur: auteurId,
    dateCreation: new Date()
  });
  
  // Ajouter à la timeline
  this.timeline.push({
    action: 'Note ajoutée',
    description: 'Une nouvelle note a été ajoutée au dossier',
    auteur: auteurId,
    date: new Date()
  });
  
  return this.save();
};

// Méthode pour changer le statut
dossierSchema.methods.changerStatut = function(nouveauStatut, auteurId) {
  const ancienStatut = this.statut;
  this.statut = nouveauStatut;
  this.updatedBy = auteurId;
  
  // Ajouter à la timeline
  this.timeline.push({
    action: 'Changement de statut',
    description: `Statut modifié de "${ancienStatut}" à "${nouveauStatut}"`,
    auteur: auteurId,
    date: new Date()
  });
  
  // Si fermé, enregistrer la date de clôture
  if (nouveauStatut === 'Fermé' && !this.dateCloture) {
    this.dateCloture = new Date();
  }
  
  return this.save();
};

// Méthode pour obtenir un résumé public du dossier
dossierSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    nom: this.nom,
    description: this.description,
    statut: this.statut,
    responsable: this.responsable,
    cabinet: this.cabinet,
    client: this.client,
    typeAffaire: this.typeAffaire,
    numeroAffaire: this.numeroAffaire,
    juridiction: this.juridiction,
    dateOuverture: this.dateOuverture,
    dateCloture: this.dateCloture,
    dateProchainEvenement: this.dateProchainEvenement,
    notesCount: this.notes.length,
    timelineCount: this.timeline.length,
    isArchived: this.isArchived,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Méthode statique pour trouver les dossiers d'un cabinet
dossierSchema.statics.findByCabinet = async function(cabinetId, options = {}) {
  const query = { cabinet: cabinetId };
  
  // Filtres optionnels
  if (options.statut) {
    query.statut = options.statut;
  }
  
  if (options.responsable) {
    query.responsable = options.responsable;
  }
  
  if (!options.includeArchived) {
    query.isArchived = false;
  }
  
  return this.find(query)
    .populate('responsable', 'nom prenom email')
    .populate('createdBy', 'nom prenom')
    .populate('updatedBy', 'nom prenom')
    .sort({ updatedAt: -1 });
};

const Dossier = mongoose.model('Dossier', dossierSchema);

export default Dossier;


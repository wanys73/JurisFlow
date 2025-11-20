import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  // Informations du fichier
  nomFichier: {
    type: String,
    required: [true, 'Le nom du fichier est requis'],
    trim: true
  },
  
  // URL S3 pour accéder au fichier
  urlS3: {
    type: String,
    required: [true, 'L\'URL S3 est requise']
  },
  
  // Clé S3 pour la suppression
  keyS3: {
    type: String,
    required: [true, 'La clé S3 est requise']
  },
  
  // Type MIME du fichier
  typeMime: {
    type: String,
    required: [true, 'Le type MIME est requis']
  },
  
  // Taille du fichier en bytes
  taille: {
    type: Number,
    required: [true, 'La taille du fichier est requise']
  },
  
  // Référence au dossier
  dossier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dossier',
    required: [true, 'Le document doit être lié à un dossier']
  },
  
  // Utilisateur qui a uploadé le fichier
  uploader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'L\'uploader est requis']
  },
  
  // Description optionnelle
  description: {
    type: String,
    maxlength: [500, 'La description ne peut pas dépasser 500 caractères']
  },
  
  // Catégorie du document (optionnel)
  categorie: {
    type: String,
    enum: [
      'Contrat',
      'Pièce d\'identité',
      'Justificatif',
      'Courrier',
      'Jugement',
      'Procès-verbal',
      'Facture',
      'Autre'
    ]
  },
  
  // Métadonnées
  isArchived: {
    type: Boolean,
    default: false
  }
  
}, {
  timestamps: true
});

// Index pour améliorer les performances
documentSchema.index({ dossier: 1, createdAt: -1 });
documentSchema.index({ uploader: 1 });
documentSchema.index({ keyS3: 1 }); // Pour la recherche lors de la suppression

// Méthode pour formater la taille du fichier
documentSchema.methods.getTailleFormatee = function() {
  const bytes = this.taille;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

// Méthode pour obtenir l'icône selon le type de fichier
documentSchema.methods.getIcone = function() {
  const mimeType = this.typeMime;
  
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'word';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'excel';
  if (mimeType.includes('image')) return 'image';
  if (mimeType.includes('video')) return 'video';
  if (mimeType.includes('audio')) return 'audio';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'archive';
  
  return 'file';
};

// Méthode pour obtenir les informations publiques
documentSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    nomFichier: this.nomFichier,
    urlS3: this.urlS3,
    keyS3: this.keyS3,
    typeMime: this.typeMime,
    taille: this.taille,
    tailleFormatee: this.getTailleFormatee(),
    icone: this.getIcone(),
    dossier: this.dossier,
    uploader: this.uploader,
    description: this.description,
    categorie: this.categorie,
    isArchived: this.isArchived,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Méthode statique pour trouver les documents d'un dossier
documentSchema.statics.findByDossier = async function(dossierId, options = {}) {
  const query = { dossier: dossierId };
  
  if (!options.includeArchived) {
    query.isArchived = false;
  }
  
  return this.find(query)
    .populate('uploader', 'nom prenom email')
    .sort({ createdAt: -1 });
};

const Document = mongoose.model('Document', documentSchema);

export default Document;


import { prisma } from '../lib/prisma.js';
import { uploadMultiple, uploadToSupabase, deleteFromSupabase, getSignedUrl } from '../config/supabaseStorage.js';

// Helper pour obtenir le cabinetId
const getCabinetId = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  return user.role === 'ADMIN' ? user.id : user.id;
};

// Helper pour formater la taille
const formatTaille = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

// Helper pour obtenir l'icône
const getIcone = (mimeType) => {
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'word';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'excel';
  if (mimeType.includes('image')) return 'image';
  if (mimeType.includes('video')) return 'video';
  if (mimeType.includes('audio')) return 'audio';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'archive';
  return 'file';
};

// Helper pour convertir Document en format public
const documentToPublicJSON = (doc) => {
  return {
    id: doc.id,
    nomFichier: doc.nomFichier,
    urlS3: doc.urlS3,
    keyS3: doc.keyS3,
    typeMime: doc.typeMime,
    taille: doc.taille,
    tailleFormatee: formatTaille(doc.taille),
    icone: getIcone(doc.typeMime),
    dossier: doc.dossierId,
    uploader: doc.uploader,
    description: doc.description,
    categorie: doc.categorie,
    isArchived: doc.isArchived,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
};

// @desc    Uploader un ou plusieurs documents dans un dossier
// @route   POST /api/dossiers/:id/documents
// @access  Private
export const uploadDocuments = async (req, res) => {
  try {
    const dossierId = req.params.id;
    
    // Vérifier que le dossier existe et appartient au cabinet
    const cabinetId = await getCabinetId(req.user.userId);
    
    const dossier = await prisma.dossier.findFirst({
      where: {
        id: dossierId,
        cabinetId
      }
    });
    
    if (!dossier) {
      return res.status(404).json({
        success: false,
        message: 'Dossier non trouvé'
      });
    }
    
    // Vérifier qu'il y a des fichiers
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni'
      });
    }
    
    // Uploader les fichiers vers Supabase Storage
    const uploadPromises = req.files.map(file => 
      uploadToSupabase(file, dossierId, req.user.userId)
    );
    
    const uploadedFiles = await Promise.all(uploadPromises);
    
    // Créer les documents dans la base de données
    const documents = await prisma.$transaction(
      uploadedFiles.map((fileData, index) => 
        prisma.document.create({
          data: {
            nomFichier: fileData.nomFichier,
            urlS3: fileData.urlS3,
            keyS3: fileData.keyS3,
            typeMime: fileData.typeMime,
            taille: fileData.taille,
            dossierId: dossierId,
            uploaderId: req.user.userId,
            description: req.body.description || null,
            categorie: req.body.categorie ? req.body.categorie.toUpperCase().replace(' ', '_') : null
          },
          include: {
            uploader: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                email: true
              }
            }
          }
        })
      )
    );
    
    // Ajouter une entrée dans la timeline du dossier
    await prisma.dossierTimeline.create({
      data: {
        action: 'Documents ajoutés',
        description: `${documents.length} document(s) ajouté(s) au dossier`,
        auteurId: req.user.userId,
        dossierId: dossierId,
        date: new Date()
      }
    });
    
    res.status(201).json({
      success: true,
      message: `${documents.length} document(s) uploadé(s) avec succès`,
      data: {
        documents: documents.map(doc => documentToPublicJSON(doc))
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de l\'upload des documents:', error);
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'upload des documents'
    });
  }
};

// @desc    Récupérer tous les documents d'un dossier
// @route   GET /api/dossiers/:id/documents
// @access  Private
export const getDocumentsByDossier = async (req, res) => {
  try {
    const dossierId = req.params.id;
    
    // Vérifier que le dossier existe et appartient au cabinet
    const cabinetId = await getCabinetId(req.user.userId);
    
    const dossier = await prisma.dossier.findFirst({
      where: {
        id: dossierId,
        cabinetId
      }
    });
    
    if (!dossier) {
      return res.status(404).json({
        success: false,
        message: 'Dossier non trouvé'
      });
    }
    
    // Récupérer les documents
    const documents = await prisma.document.findMany({
      where: {
        dossierId,
        isArchived: false
      },
      include: {
        uploader: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.status(200).json({
      success: true,
      data: {
        documents: documents.map(doc => documentToPublicJSON(doc))
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération des documents:', error);
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des documents'
    });
  }
};

// @desc    Supprimer un document
// @route   DELETE /api/documents/:docId
// @access  Private
export const deleteDocument = async (req, res) => {
  try {
    const { docId } = req.params;
    
    // Récupérer le document avec le dossier
    const document = await prisma.document.findUnique({
      where: { id: docId },
      include: {
        dossier: true
      }
    });
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }
    
    // Vérifier que l'utilisateur a accès à ce document
    const cabinetId = await getCabinetId(req.user.userId);
    
    if (document.dossier.cabinetId !== cabinetId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à ce document'
      });
    }
    
    // Supprimer le fichier de Supabase Storage
    try {
      await deleteFromSupabase(document.keyS3);
    } catch (storageError) {
      console.error('Erreur lors de la suppression Supabase Storage:', storageError);
      // Continue quand même pour supprimer de la DB
    }
    
    // Supprimer de la base de données
    await prisma.document.delete({
      where: { id: docId }
    });
    
    // Ajouter une entrée dans la timeline du dossier
    await prisma.dossierTimeline.create({
      data: {
        action: 'Document supprimé',
        description: `Le document "${document.nomFichier}" a été supprimé`,
        auteurId: req.user.userId,
        dossierId: document.dossierId,
        date: new Date()
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'Document supprimé avec succès'
    });
    
  } catch (error) {
    console.error('Erreur lors de la suppression du document:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du document'
    });
  }
};

// @desc    Générer une URL signée pour télécharger un document
// @route   GET /api/documents/:docId/download
// @access  Private
export const getDocumentDownloadUrl = async (req, res) => {
  try {
    const { docId } = req.params;
    
    // Récupérer le document avec le dossier
    const document = await prisma.document.findUnique({
      where: { id: docId },
      include: {
        dossier: true
      }
    });
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }
    
    // Vérifier que l'utilisateur a accès à ce document
    const cabinetId = await getCabinetId(req.user.userId);
    
    if (document.dossier.cabinetId !== cabinetId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à ce document'
      });
    }
    
    // Générer une URL signée (valide 1 heure)
    const signedUrl = await getSignedUrl(document.keyS3, 3600);
    
    res.status(200).json({
      success: true,
      data: {
        url: signedUrl,
        nomFichier: document.nomFichier
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la génération de l\'URL:', error);
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération du lien de téléchargement'
    });
  }
};

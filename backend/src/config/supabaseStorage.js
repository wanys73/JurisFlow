import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Configuration du client Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://nfkdywcpcyrhzdnwexol.supabase.co';
// Utiliser service_role pour le backend (plus de permissions)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_ANON_KEY non configuré');
  console.warn('⚠️ SUPABASE_URL:', supabaseUrl);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Fonction pour vérifier/créer le bucket
async function ensureBucketExists() {
  try {
    // Vérifier si le bucket existe
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Erreur lors de la liste des buckets:', listError);
      return;
    }
    
    const bucket = buckets.find(b => b.name === 'documents');
    
    if (!bucket) {
      console.log('📦 Création du bucket "documents"...');
      const { data, error } = await supabase.storage.createBucket('documents', {
        public: true,
        fileSizeLimit: 52428800 // 50 MB
      });
      
      if (error) {
        console.error('❌ Erreur lors de la création du bucket:', error);
      } else {
        console.log('✅ Bucket "documents" créé avec succès (public)');
      }
    } else {
      // Vérifier si le bucket est public
      if (!bucket.public) {
        console.log('⚠️ Le bucket "documents" existe mais n\'est PAS public');
        console.log('📝 Mise à jour du bucket pour le rendre public...');
        
        const { data, error } = await supabase.storage.updateBucket('documents', {
          public: true
        });
        
        if (error) {
          console.error('❌ Erreur lors de la mise à jour du bucket:', error);
        } else {
          console.log('✅ Bucket "documents" mis à jour : maintenant public');
        }
      } else {
        console.log('✅ Bucket "documents" existe et est public');
      }
    }
  } catch (error) {
    console.error('❌ Erreur ensureBucketExists:', error);
  }
}

// Créer/vérifier le bucket au démarrage
ensureBucketExists();

// Types de fichiers autorisés
const allowedMimeTypes = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.oasis.opendocument.text',
  
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  
  // Texte
  'text/plain'
];

// Extensions autorisées
const allowedExtensions = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.odt',
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.zip', '.rar',
  '.txt'
];

// Configuration multer pour stockage en mémoire (temporaire)
const storage = multer.memoryStorage();

// Filtre de validation des fichiers
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  // Vérifier l'extension
  if (!allowedExtensions.includes(ext)) {
    return cb(new Error(`Type de fichier non autorisé. Extensions acceptées : ${allowedExtensions.join(', ')}`), false);
  }
  
  // Vérifier le type MIME
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Type de fichier non autorisé'), false);
  }
  
  cb(null, true);
};

// Configuration de l'upload multer (stockage en mémoire)
const uploadMulter = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB max par fichier
    files: 10 // Maximum 10 fichiers par upload
  }
});

// Middleware pour uploader un seul fichier
export const uploadSingle = uploadMulter.single('document');

// Middleware pour uploader plusieurs fichiers
export const uploadMultiple = uploadMulter.array('documents', 10);

// Fonction pour uploader un fichier vers Supabase Storage
export const uploadToSupabase = async (file, dossierId, userId) => {
  try {
    // Générer un nom de fichier unique
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    const fileName = `${uniqueSuffix}${ext}`;
    
    // Chemin dans Supabase Storage : dossiers/{dossierId}/documents/{filename}
    const filePath = `dossiers/${dossierId}/documents/${fileName}`;
    
    // Upload vers Supabase Storage
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
        metadata: {
          originalName: file.originalname,
          uploadedBy: userId,
          uploadDate: new Date().toISOString()
        }
      });

    if (error) {
      throw error;
    }

    // Obtenir l'URL publique (ou signée)
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    return {
      keyS3: filePath, // On garde le nom "keyS3" pour la compatibilité
      urlS3: urlData.publicUrl,
      nomFichier: file.originalname,
      typeMime: file.mimetype,
      taille: file.size
    };
  } catch (error) {
    console.error('Erreur upload Supabase:', error);
    throw error;
  }
};

// Upload d'un buffer (ex: document généré) vers Supabase Storage
export const uploadBuffer = async (buffer, filePath, contentType = 'text/plain', upsert = false) => {
  try {
    if (!buffer) {
      throw new Error('Buffer manquant pour upload');
    }

    const { data, error } = await supabase.storage
      .from('documents')
      .upload(filePath, buffer, {
        contentType,
        upsert
      });

    if (error) {
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    return {
      publicUrl: urlData.publicUrl,
      path: data?.path || filePath
    };
  } catch (error) {
    console.error('Erreur upload buffer Supabase:', error);
    throw error;
  }
};

// Fonction pour uploader un fichier du cabinet (logo, signature, KBIS) vers Supabase Storage
export const uploadCabinetFile = async (file, folder) => {
  try {
    console.log('📤 Upload cabinet file:', folder, file.originalname, file.size, 'bytes');
    console.log('📊 File details:', {
      fieldname: file.fieldname,
      encoding: file.encoding,
      mimetype: file.mimetype,
      bufferSize: file.buffer?.length
    });
    
    // Vérifier que le buffer existe
    if (!file.buffer) {
      console.error('❌ Pas de buffer dans le fichier');
      throw new Error('Fichier invalide : buffer manquant');
    }
    
    // Générer un nom de fichier unique
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    const fileName = `${uniqueSuffix}${ext}`;
    
    // Chemin dans Supabase Storage : cabinet/{folder}/{filename}
    const filePath = `cabinet/${folder}/${fileName}`;
    
    console.log('📁 Chemin Supabase:', filePath);
    console.log('🚀 Tentative d\'upload vers Supabase...');
    
    // Upload vers Supabase Storage
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) {
      console.error('❌ Erreur upload Supabase:', error);
      console.error('Détails erreur:', JSON.stringify(error, null, 2));
      throw error;
    }

    console.log('✅ Upload réussi, data:', data);

    // Obtenir l'URL publique
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    console.log('✅ URL publique générée:', urlData.publicUrl);

    return {
      url: urlData.publicUrl,
      path: filePath
    };
  } catch (error) {
    console.error('❌ Erreur upload cabinet file:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  }
};

// Fonction pour supprimer un fichier de Supabase Storage
export const deleteFromSupabase = async (filePathOrUrl) => {
  try {
    // Si c'est une URL, extraire le chemin
    let filePath = filePathOrUrl;
    if (filePathOrUrl.includes('/storage/v1/object/public/')) {
      // Extraire le chemin depuis l'URL publique
      const urlParts = filePathOrUrl.split('/storage/v1/object/public/');
      if (urlParts.length > 1) {
        const pathParts = urlParts[1].split('/');
        filePath = pathParts.slice(1).join('/'); // Enlever le nom du bucket
      }
    }

    console.log('🗑️ Suppression fichier:', filePath);

    const { error } = await supabase.storage
      .from('documents')
      .remove([filePath]);

    if (error) {
      console.error('❌ Erreur suppression:', error);
      throw error;
    }

    console.log('✅ Fichier supprimé');
    return true;
  } catch (error) {
    console.error('Erreur suppression Supabase:', error);
    throw error;
  }
};

// Fonction pour obtenir une URL signée (pour téléchargement privé)
export const getSignedUrl = async (filePath, expiresIn = 3600) => {
  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      throw error;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Erreur génération URL signée:', error);
    throw error;
  }
};

export { supabase };
export default uploadMulter;


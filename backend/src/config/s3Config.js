import { S3Client } from '@aws-sdk/client-s3';
import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import crypto from 'crypto';

// Configuration du client S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-3',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

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

// Configuration de l'upload S3
const uploadS3 = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_BUCKET_NAME || 'jurisflow-documents',
    acl: 'private', // Fichiers privés
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
      cb(null, {
        fieldName: file.fieldname,
        uploadedBy: req.user?.userId || 'unknown',
        uploadDate: new Date().toISOString()
      });
    },
    key: (req, file, cb) => {
      // Générer un nom de fichier unique
      const uniqueSuffix = crypto.randomBytes(16).toString('hex');
      const ext = path.extname(file.originalname);
      const fileName = `${uniqueSuffix}${ext}`;
      
      // Organisation par dossier : dossiers/{dossierId}/documents/{filename}
      const dossierId = req.params.id;
      const key = `dossiers/${dossierId}/documents/${fileName}`;
      
      cb(null, key);
    }
  }),
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB max par fichier
    files: 10 // Maximum 10 fichiers par upload
  }
});

// Middleware pour uploader un seul fichier
export const uploadSingle = uploadS3.single('document');

// Middleware pour uploader plusieurs fichiers
export const uploadMultiple = uploadS3.array('documents', 10);

// Exporter le client S3 pour les opérations de suppression
export { s3Client };

export default uploadS3;


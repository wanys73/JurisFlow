import express from 'express';
import {
  uploadDocuments,
  getDocumentsByDossier,
  deleteDocument,
  getDocumentDownloadUrl
} from '../controllers/documentController.js';
import { getDocumentsGlobaux } from '../controllers/documentGlobalController.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadMultiple } from '../config/supabaseStorage.js';

const router = express.Router();

// Routes pour les documents liés à un dossier
// POST /api/dossiers/:id/documents - Uploader des documents
router.post('/dossiers/:id/documents', protect, uploadMultiple, uploadDocuments);

// GET /api/dossiers/:id/documents - Récupérer les documents d'un dossier
router.get('/dossiers/:id/documents', protect, getDocumentsByDossier);

// Route pour les documents globaux (doit être avant les routes avec :docId)
// GET /api/documents/global - Récupérer tous les documents et factures agrégés
router.get('/documents/global', protect, getDocumentsGlobaux);

// Routes pour un document spécifique
// GET /api/documents/:docId/download - Obtenir l'URL de téléchargement
router.get('/documents/:docId/download', protect, getDocumentDownloadUrl);

// DELETE /api/documents/:docId - Supprimer un document
router.delete('/documents/:docId', protect, deleteDocument);

export default router;


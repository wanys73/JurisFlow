import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  createConversation,
  getConversations,
  getConversation,
  addMessage,
  updateConversation,
  deleteConversation
} from '../controllers/conversationController.js';
import {
  getDocumentTypes,
  generateDocumentIA,
  getGeneratedDocuments,
  getGeneratedDocument,
  updateGeneratedDocument,
  deleteGeneratedDocument,
  exportGeneratedDocument
} from '../controllers/documentGenerationController.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(protect);

// Routes conversations
router.post('/conversations', createConversation);
router.get('/conversations', getConversations);
router.get('/conversations/:id', getConversation);
router.patch('/conversations/:id', updateConversation);
router.delete('/conversations/:id', deleteConversation);

// Routes messages
router.post('/conversations/:id/messages', addMessage);

// Routes génération de documents
router.get('/document-types', getDocumentTypes);
router.post('/generate-document', generateDocumentIA);
router.get('/generated-documents', getGeneratedDocuments);
router.get('/generated-documents/:id', getGeneratedDocument);
router.patch('/generated-documents/:id', updateGeneratedDocument);
router.delete('/generated-documents/:id', deleteGeneratedDocument);
router.get('/generated-documents/:id/export', exportGeneratedDocument);

export default router;

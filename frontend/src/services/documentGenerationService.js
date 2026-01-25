import { api } from './api';

export const getDocumentTypes = async () => {
  const response = await api.get('/studio-ia/document-types');
  return response.data?.data?.types || [];
};

export const generateDocument = async (dossierId, documentType, options, saveToStorage = true) => {
  const response = await api.post('/studio-ia/generate-document', {
    dossierId,
    documentType,
    options,
    saveToStorage
  });
  return response.data?.data;
};

export const updateGeneratedDocument = async (documentId, { content, title, syncStorage = true }) => {
  const response = await api.patch(`/studio-ia/generated-documents/${documentId}`, {
    content,
    title,
    syncStorage
  });
  return response.data?.data?.document;
};

export const exportGeneratedDocument = async (documentId, format = 'txt') => {
  const response = await api.get(`/studio-ia/generated-documents/${documentId}/export`, {
    params: { format },
    responseType: 'blob'
  });
  return response.data;
};

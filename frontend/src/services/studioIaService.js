import { api } from './api';

// Récupérer toutes les conversations
export const getConversations = async () => {
  const response = await api.get('/studio-ia/conversations');
  return response.data?.data?.conversations || [];
};

// Récupérer une conversation avec historique
export const getConversation = async (conversationId) => {
  const response = await api.get(`/studio-ia/conversations/${conversationId}`);
  return response.data?.data?.conversation;
};

// Envoyer un message (créer ou continuer une conversation)
export const sendMessage = async (message, conversationId = null, dossierId = null) => {
  const response = await api.post('/ia/chat', {
    message,
    conversationId,
    dossierId
  });
  return response;
};

// Supprimer (archiver) une conversation
export const deleteConversation = async (conversationId) => {
  const response = await api.delete(`/studio-ia/conversations/${conversationId}`);
  return response.data;
};

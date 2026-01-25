-- =============================================================================
-- POLITIQUES ROW LEVEL SECURITY (RLS) POUR JURISFLOW
-- =============================================================================
--
-- ⚠️ IMPORTANT : COMPATIBILITÉ AVEC L'ARCHITECTURE ACTUELLE
-- 
-- JurisFlow utilise JWT pour l'authentification (pas Supabase Auth).
-- Les politiques RLS ci-dessous sont conçues pour Supabase Auth (auth.uid()).
-- 
-- Pour activer RLS avec l'architecture actuelle, vous avez 2 options :
--
-- OPTION 1 (Recommandée pour le MVP) : 
--   → Garder RLS désactivé
--   → S'appuyer sur les filtres Prisma (cabinetId/userId) dans les controllers
--   → Tous les controllers incluent déjà ces filtres (sécurité au niveau applicatif)
--
-- OPTION 2 (Pour production avancée) :
--   → Migrer vers Supabase Auth
--   → OU utiliser des variables de session PostgreSQL (complexe)
--   → Activer les politiques ci-dessous
--
-- =============================================================================

-- Pour l'instant, ces commandes sont en commentaire
-- Décommentez-les UNIQUEMENT si vous utilisez Supabase Auth

/*
-- Activer RLS sur toutes les tables sensibles
ALTER TABLE "dossiers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "factures" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "generated_documents" ENABLE ROW LEVEL SECURITY;

-- Politique RLS pour Dossier : l'utilisateur ne voit que ses propres dossiers
DROP POLICY IF EXISTS "Users can only access their own dossiers" ON "dossiers";
CREATE POLICY "Users can only access their own dossiers" 
ON "dossiers" 
FOR ALL 
USING (auth.uid()::text = "cabinetId");

-- Politique RLS pour Client : l'utilisateur ne voit que ses propres clients
DROP POLICY IF EXISTS "Users can only access their own clients" ON "clients";
CREATE POLICY "Users can only access their own clients" 
ON "clients" 
FOR ALL 
USING (auth.uid()::text = "cabinetId");

-- Politique RLS pour Facture : l'utilisateur ne voit que ses propres factures
DROP POLICY IF EXISTS "Users can only access their own factures" ON "factures";
CREATE POLICY "Users can only access their own factures" 
ON "factures" 
FOR ALL 
USING (auth.uid()::text = "cabinetId");

-- Politique RLS pour Document : l'utilisateur ne voit que ses propres documents
DROP POLICY IF EXISTS "Users can only access their own documents" ON "documents";
CREATE POLICY "Users can only access their own documents" 
ON "documents" 
FOR ALL 
USING (auth.uid()::text = "uploaderId");

-- Politique RLS pour Conversation : l'utilisateur ne voit que ses propres conversations
DROP POLICY IF EXISTS "Users can only access their own conversations" ON "conversations";
CREATE POLICY "Users can only access their own conversations" 
ON "conversations" 
FOR ALL 
USING (auth.uid()::text = "userId");

-- Politique RLS pour Message : via la conversation parente
DROP POLICY IF EXISTS "Users can only access their own messages" ON "messages";
CREATE POLICY "Users can only access their own messages" 
ON "messages" 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM "conversations" 
    WHERE "conversations"."id" = "messages"."conversationId" 
    AND auth.uid()::text = "conversations"."userId"
  )
);

-- Politique RLS pour GeneratedDocument : l'utilisateur ne voit que ses propres documents générés
DROP POLICY IF EXISTS "Users can only access their own generated documents" ON "generated_documents";
CREATE POLICY "Users can only access their own generated documents" 
ON "generated_documents" 
FOR ALL 
USING (auth.uid()::text = "userId");
*/

-- =============================================================================
-- VÉRIFICATION DE SÉCURITÉ ACTUELLE (Alternative à RLS)
-- =============================================================================
--
-- Tous les controllers JurisFlow incluent déjà des filtres de sécurité :
--
-- ✅ dossierController.js : WHERE cabinetId = req.user.cabinetId
-- ✅ clientController.js : WHERE cabinetId = req.user.cabinetId
-- ✅ factureController.js : WHERE cabinetId = req.user.cabinetId
-- ✅ documentController.js : WHERE uploaderId = req.user.id
-- ✅ conversationController.js : WHERE userId = req.user.id
--
-- Cette approche (sécurité applicative) est valide pour le MVP.
-- RLS serait une couche de défense supplémentaire (defense in depth).
--
-- =============================================================================

-- Requête pour vérifier le statut RLS des tables
SELECT 
  schemaname, 
  tablename, 
  rowsecurity AS "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('dossiers', 'clients', 'factures', 'documents', 'conversations', 'messages', 'generated_documents')
ORDER BY tablename;

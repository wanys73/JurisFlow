-- =============================================================================
-- SCRIPT SQL DE CORRECTION DIRECTE (URGENCE)
-- À exécuter si Prisma migrate/push ne répond pas
-- =============================================================================

-- 1. Créer l'enum PlanType s'il n'existe pas
DO $$ BEGIN
    CREATE TYPE "PlanType" AS ENUM ('BASIC', 'PREMIUM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Ajouter la colonne planType à users si elle n'existe pas
DO $$ BEGIN
    ALTER TABLE users ADD COLUMN "planType" "PlanType" DEFAULT 'BASIC';
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'La colonne planType existe déjà';
END $$;

-- 3. Mettre tous les utilisateurs existants en PREMIUM par défaut
UPDATE users 
SET "planType" = 'PREMIUM' 
WHERE "planType" IS NULL OR "planType" = 'BASIC';

-- 4. Ajouter la colonne dateEcheance à dossiers si elle n'existe pas
DO $$ BEGIN
    ALTER TABLE dossiers ADD COLUMN "dateEcheance" TIMESTAMP(3);
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'La colonne dateEcheance existe déjà';
END $$;

-- 5. Créer la table activity_logs si elle n'existe pas
CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    "targetId" TEXT,
    "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    metadata JSONB,
    timestamp TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Créer les index sur activity_logs
CREATE INDEX IF NOT EXISTS activity_logs_userId_idx ON activity_logs("userId");
CREATE INDEX IF NOT EXISTS activity_logs_action_idx ON activity_logs(action);
CREATE INDEX IF NOT EXISTS activity_logs_target_idx ON activity_logs(target);
CREATE INDEX IF NOT EXISTS activity_logs_timestamp_idx ON activity_logs(timestamp);

-- 7. Vérification finale
SELECT 
    'users.planType' AS check_column,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'planType'
    ) THEN '✅ OK' ELSE '❌ MANQUANT' END AS status
UNION ALL
SELECT 
    'dossiers.dateEcheance' AS check_column,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dossiers' AND column_name = 'dateEcheance'
    ) THEN '✅ OK' ELSE '❌ MANQUANT' END AS status
UNION ALL
SELECT 
    'activity_logs table' AS check_column,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'activity_logs'
    ) THEN '✅ OK' ELSE '❌ MANQUANT' END AS status;

-- 8. Compter les utilisateurs PREMIUM
SELECT 
    "planType", 
    COUNT(*) as count 
FROM users 
GROUP BY "planType";

SELECT '✅ SCRIPT DE CORRECTION TERMINÉ' as message;

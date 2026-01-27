-- AlterTable
-- Ajout des colonnes Google OAuth au modèle User
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "googleAccessToken" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "googleRefreshToken" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "googleTokenExpiry" TIMESTAMP(3);

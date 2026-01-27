# Migration: Add Google OAuth Tokens

## Description
Ajout des colonnes nécessaires pour stocker les tokens Google OAuth dans le modèle User.

## Colonnes ajoutées
- `googleAccessToken` (TEXT, nullable) : Token d'accès Google OAuth
- `googleRefreshToken` (TEXT, nullable) : Token de rafraîchissement Google OAuth
- `googleTokenExpiry` (TIMESTAMP(3), nullable) : Date d'expiration du token d'accès

## Statut
✅ Migration appliquée directement via script SQL (scripts/addGoogleTokensColumns.js)

## Notes
- Les colonnes sont nullable car tous les utilisateurs n'utilisent pas Google OAuth
- Le contrôleur `googleAuthController.js` utilise ces champs pour stocker les tokens après authentification Google

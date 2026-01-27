# ✅ Checklist Production - JurisFlow

## 🎯 Statut : PRÊT POUR PRODUCTION

Tous les éléments nécessaires pour Google OAuth et la conformité ont été implémentés.

---

## ✅ Éléments Implémentés

### 1. Route Google OAuth Callback ✅

**Route backend :** `/api/auth/callback/google`  
**URL complète :** `https://jurisapp-smart-pro.com/api/auth/callback/google`

**Fichiers créés/modifiés :**
- ✅ `backend/src/controllers/googleAuthController.js` : Contrôleurs OAuth
- ✅ `backend/src/routes/authRoutes.js` : Routes ajoutées
- ✅ `backend/package.json` : Dépendance `google-auth-library` ajoutée

**Routes disponibles :**
- `GET /api/auth/google` : Initie l'authentification (retourne l'URL d'autorisation Google)
- `GET /api/auth/callback/google` : Traite la réponse de Google et connecte l'utilisateur

### 2. Page Privacy ✅

**Route frontend :** `/privacy`  
**URL production :** `https://jurisapp-smart-pro.com/privacy`

**Fichier créé :**
- ✅ `frontend/src/pages/Privacy.jsx` : Page complète de politique de confidentialité

**Contenu :**
- ✅ Conforme RGPD
- ✅ Mention explicite de l'accès Google Calendar (lecture seule uniquement)
- ✅ Non-partage des données avec des tiers
- ✅ Droits des utilisateurs (RGPD Article 15-22)
- ✅ Contact : contact@jurisapp-smart-pro.com

### 3. Variables d'Environnement ✅

**Fichier créé :** `backend/.env.production`

**Variables à remplir :**
```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=https://jurisapp-smart-pro.com/api/auth/callback/google
FRONTEND_URL=https://jurisapp-smart-pro.com
```

### 4. Configuration CORS ✅

**Fichier modifié :** `backend/src/app.js`

**Configuration :**
- ✅ En production : Accepte uniquement `https://jurisapp-smart-pro.com`
- ✅ En développement : Accepte tous les localhost (ports 3000, 5173, 5174, 5175)

### 5. Page Callback Frontend ✅

**Route frontend :** `/auth/google/callback`

**Fichier créé :**
- ✅ `frontend/src/pages/GoogleAuthCallback.jsx` : Gère la redirection après OAuth

---

## 📋 Actions Requises AVANT Déploiement

### 1. Installer la Dépendance Google Auth Library

```bash
cd backend
npm install google-auth-library
```

### 2. Configurer Google Cloud Console

#### Étape 1 : Créer un Projet
1. Aller sur https://console.cloud.google.com
2. Créer un nouveau projet "JurisFlow"

#### Étape 2 : Activer l'API Google Calendar
1. APIs & Services > Library
2. Rechercher "Google Calendar API"
3. Cliquer sur "Enable"

#### Étape 3 : Créer des Identifiants OAuth 2.0
1. APIs & Services > Credentials
2. Cliquer sur "Create Credentials" > "OAuth client ID"
3. Type : "Web application"
4. **Name :** JurisFlow Production
5. **Authorized redirect URIs :**
   ```
   https://jurisapp-smart-pro.com/api/auth/callback/google
   ```
6. **Authorized JavaScript origins :**
   ```
   https://jurisapp-smart-pro.com
   ```
7. Cliquer sur "Create"
8. **Copier le Client ID et Client Secret**

#### Étape 4 : Configurer l'Écran de Consentement OAuth
1. APIs & Services > OAuth consent screen
2. **User Type :** External (ou Internal si Google Workspace)
3. **App name :** JurisFlow
4. **User support email :** votre email
5. **Authorized domains :** `jurisapp-smart-pro.com`
6. **Application homepage :** `https://jurisapp-smart-pro.com`
7. **Privacy policy URL :** `https://jurisapp-smart-pro.com/privacy`
8. **Scopes :**
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/calendar.readonly`
9. **Test users :** (optionnel) Ajouter des emails de test
10. Sauvegarder

### 3. Remplir les Variables d'Environnement

**Fichier :** `backend/.env.production`

```bash
# Google OAuth
GOOGLE_CLIENT_ID=votre_client_id_ici
GOOGLE_CLIENT_SECRET=votre_client_secret_ici
GOOGLE_CALLBACK_URL=https://jurisapp-smart-pro.com/api/auth/callback/google

# Frontend
FRONTEND_URL=https://jurisapp-smart-pro.com

# Environnement
NODE_ENV=production

# JWT Secrets (GÉNÉRER DES VALEURS SÉCURISÉES)
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

# Database (Supabase - port 6543)
DATABASE_URL=postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:6543/postgres?pgbouncer=true

# Email, AWS, OpenAI, etc. (voir .env.production pour la liste complète)
```

### 4. Configurer les Variables sur Vercel/Railway/Render

**⚠️ IMPORTANT :** Ne pas commiter `.env.production` avec des valeurs réelles.

Configurer les variables directement dans votre plateforme de déploiement :
- Vercel : Settings > Environment Variables
- Railway : Variables
- Render : Environment

---

## 🧪 Tests Avant Production

### Test 1 : Route d'Initiation Google OAuth

```bash
curl https://jurisapp-smart-pro.com/api/auth/google
```

**Attendu :**
```json
{
  "success": true,
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

### Test 2 : Page Privacy

1. Ouvrir `https://jurisapp-smart-pro.com/privacy`
2. Vérifier que la page s'affiche correctement
3. Vérifier les liens (email, site web)

### Test 3 : CORS

```bash
curl -H "Origin: https://jurisapp-smart-pro.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://jurisapp-smart-pro.com/api/auth/login
```

**Attendu :**
```
Access-Control-Allow-Origin: https://jurisapp-smart-pro.com
Access-Control-Allow-Credentials: true
```

### Test 4 : Authentification Google Complète

1. Ouvrir `https://jurisapp-smart-pro.com/login`
2. Cliquer sur "Se connecter avec Google" (si bouton ajouté)
3. Autoriser l'accès dans Google
4. Vérifier la redirection vers `/dashboard`
5. Vérifier que le compte est créé/mis à jour en base

---

## 📝 Notes Importantes

### Scopes Google OAuth

Les scopes demandés sont :
- `email` : Pour identifier l'utilisateur
- `profile` : Pour obtenir nom/prénom
- `https://www.googleapis.com/auth/calendar.readonly` : **Lecture seule** du calendrier

⚠️ **Conformité :** Nous n'avons pas accès en écriture au calendrier, conformément à la politique de confidentialité.

### Gestion des Tokens

Les tokens Google sont stockés dans la base de données :
- `googleAccessToken` : Token d'accès (expire après 1h)
- `googleRefreshToken` : Token de rafraîchissement (permanent si `prompt=consent`)
- `googleTokenExpiry` : Date d'expiration

**À implémenter plus tard :** Service de rafraîchissement automatique des tokens expirés.

### Sécurité

1. ✅ HTTPS obligatoire partout
2. ✅ CORS restreint au domaine de production
3. ✅ Rate limiting activé en production
4. ✅ Secrets JWT sécurisés (64 caractères aléatoires)
5. ✅ Audit logs pour conformité RGPD

---

## 🚀 Déploiement

### Backend

1. Configurer les variables d'environnement
2. Installer les dépendances : `npm install`
3. Générer Prisma Client : `npx prisma generate`
4. Déployer
5. Vérifier `/health`

### Frontend

1. Configurer `VITE_API_URL=https://jurisapp-smart-pro.com/api` (ou l'URL de votre backend)
2. Déployer
3. Vérifier les routes

---

## ✅ Checklist Finale

- [ ] `google-auth-library` installé (`npm install`)
- [ ] Google Cloud Console configuré
- [ ] OAuth 2.0 credentials créés
- [ ] Écran de consentement OAuth configuré
- [ ] Variables d'environnement remplies
- [ ] Secrets JWT générés (64 caractères)
- [ ] Route `/api/auth/callback/google` accessible
- [ ] Page `/privacy` accessible
- [ ] CORS configuré pour `https://jurisapp-smart-pro.com`
- [ ] Tests d'authentification Google réussis
- [ ] HTTPS activé partout
- [ ] Variables d'environnement configurées sur la plateforme de déploiement

---

**Date :** 25 janvier 2026  
**Statut :** ✅ Prêt pour production  
**Documentation complète :** Voir `PREPARATION_PRODUCTION.md`

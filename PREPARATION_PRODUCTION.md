# 🚀 Préparation Production - JurisFlow

## ✅ Éléments Implémentés

### 1. Route Google OAuth Callback ✅

**Route créée :** `/api/auth/callback/google`

**Fichiers modifiés :**
- `backend/src/routes/authRoutes.js` : Ajout des routes Google OAuth
- `backend/src/controllers/googleAuthController.js` : Contrôleurs pour l'authentification Google

**Routes disponibles :**
- `GET /api/auth/google` : Initie l'authentification Google (retourne l'URL d'autorisation)
- `GET /api/auth/callback/google` : Callback Google OAuth (traite la réponse de Google)

### 2. Page Privacy ✅

**Route frontend :** `/privacy`  
**URL production :** `https://jurisapp-smart-pro.com/privacy`

**Fichier créé :**
- `frontend/src/pages/Privacy.jsx` : Page complète de politique de confidentialité

**Contenu :**
- ✅ Conforme RGPD
- ✅ Mention explicite de l'accès Google Calendar (lecture seule)
- ✅ Non-partage des données avec tiers
- ✅ Droits des utilisateurs (RGPD)
- ✅ Contact et informations légales

### 3. Variables d'Environnement Production ✅

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

### 5. Page de Callback Frontend ✅

**Route frontend :** `/auth/google/callback`

**Fichier créé :**
- `frontend/src/pages/GoogleAuthCallback.jsx` : Gère la redirection après authentification Google

---

## 📋 Checklist Avant Déploiement

### Configuration Google Cloud Console

1. **Créer un projet Google Cloud**
   - Aller sur https://console.cloud.google.com
   - Créer un nouveau projet "JurisFlow"

2. **Activer l'API Google Calendar**
   - APIs & Services > Library
   - Rechercher "Google Calendar API"
   - Cliquer sur "Enable"

3. **Créer des identifiants OAuth 2.0**
   - APIs & Services > Credentials
   - Cliquer sur "Create Credentials" > "OAuth client ID"
   - Type d'application : "Web application"
   - **Authorized redirect URIs :** 
     ```
     https://jurisapp-smart-pro.com/api/auth/callback/google
     ```
   - **Authorized JavaScript origins :**
     ```
     https://jurisapp-smart-pro.com
     ```

4. **Récupérer les credentials**
   - Copier le `Client ID` → `GOOGLE_CLIENT_ID`
   - Copier le `Client Secret` → `GOOGLE_CLIENT_SECRET`

5. **Configurer l'écran de consentement OAuth**
   - APIs & Services > OAuth consent screen
   - Type : External (ou Internal si Google Workspace)
   - **Application name :** JurisFlow
   - **User support email :** votre email
   - **Authorized domains :** `jurisapp-smart-pro.com`
   - **Homepage URL :** `https://jurisapp-smart-pro.com`
   - **Privacy policy URL :** `https://jurisapp-smart-pro.com/privacy`
   - **Terms of service URL :** (optionnel)
   - **Scopes :** 
     - `email`
     - `profile`
     - `https://www.googleapis.com/auth/calendar.readonly`

### Variables d'Environnement

1. **Remplir `backend/.env.production`**
   ```bash
   GOOGLE_CLIENT_ID=votre_client_id_ici
   GOOGLE_CLIENT_SECRET=votre_client_secret_ici
   GOOGLE_CALLBACK_URL=https://jurisapp-smart-pro.com/api/auth/callback/google
   FRONTEND_URL=https://jurisapp-smart-pro.com
   ```

2. **Générer des secrets JWT sécurisés**
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
   Exécuter 2 fois pour générer `JWT_SECRET` et `JWT_REFRESH_SECRET`

3. **Configurer les autres variables**
   - `DATABASE_URL` : URL de connexion Supabase (port 6543)
   - `EMAIL_*` : Configuration SMTP
   - `AWS_*` : Configuration S3
   - `OPENAI_API_KEY` : Clé API OpenAI

### Installation Dépendances

```bash
cd backend
npm install google-auth-library
```

### Tests Locaux (Avant Production)

1. **Tester la route d'initiation**
   ```bash
   curl http://localhost:5087/api/auth/google
   ```
   Doit retourner : `{"success":true,"authUrl":"https://accounts.google.com/..."}`

2. **Tester la page Privacy**
   - Ouvrir http://localhost:5174/privacy
   - Vérifier que la page s'affiche correctement

3. **Tester le CORS**
   ```bash
   curl -H "Origin: https://jurisapp-smart-pro.com" \
        -H "Access-Control-Request-Method: GET" \
        -X OPTIONS \
        http://localhost:5087/api/auth/google
   ```
   Doit retourner les headers CORS appropriés

---

## 🔐 Sécurité Production

### Recommandations

1. **Ne jamais commiter `.env.production` avec des valeurs réelles**
   - Utiliser les variables d'environnement de votre plateforme (Vercel, Railway, etc.)

2. **Utiliser HTTPS partout**
   - Backend : HTTPS obligatoire
   - Frontend : HTTPS obligatoire
   - Cookies : `Secure` flag activé

3. **Rate Limiting en production**
   - Actuellement configuré : 100 req/15min (général), 10 req/15min (auth)
   - Ajuster selon vos besoins

4. **Audit Logs**
   - Toutes les actions sont loggées dans `activity_logs`
   - Conformité RGPD assurée

---

## 🧪 Tests Post-Déploiement

### 1. Test Authentification Google

1. Ouvrir `https://jurisapp-smart-pro.com/login`
2. Cliquer sur "Se connecter avec Google"
3. Autoriser l'accès dans Google
4. Vérifier la redirection vers `/dashboard`
5. Vérifier que le compte est créé/mis à jour en base

### 2. Test Page Privacy

1. Ouvrir `https://jurisapp-smart-pro.com/privacy`
2. Vérifier que le contenu s'affiche correctement
3. Vérifier les liens (email, site web)

### 3. Test CORS

```bash
curl -H "Origin: https://jurisapp-smart-pro.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://jurisapp-smart-pro.com/api/auth/login
```

Doit retourner :
```
Access-Control-Allow-Origin: https://jurisapp-smart-pro.com
Access-Control-Allow-Credentials: true
```

---

## 📝 Notes Importantes

### Google OAuth Scopes

Les scopes demandés sont :
- `email` : Pour identifier l'utilisateur
- `profile` : Pour obtenir nom/prénom
- `https://www.googleapis.com/auth/calendar.readonly` : **Lecture seule** du calendrier

⚠️ **Important :** Nous n'avons pas accès en écriture au calendrier, conformément à la politique de confidentialité.

### Gestion des Tokens Google

Les tokens Google sont stockés dans la base de données :
- `googleAccessToken` : Token d'accès (expire après 1h)
- `googleRefreshToken` : Token de rafraîchissement (permanent si `prompt=consent`)
- `googleTokenExpiry` : Date d'expiration du token

**À implémenter plus tard :** Service de rafraîchissement automatique des tokens expirés.

---

## 🚀 Déploiement

### Backend (Vercel/Railway/Render)

1. Configurer les variables d'environnement depuis `.env.production`
2. Déployer le backend
3. Vérifier que la route `/health` répond

### Frontend (Vercel)

1. Configurer `VITE_API_URL=https://jurisapp-smart-pro.com/api` (ou l'URL de votre backend)
2. Déployer le frontend
3. Vérifier que les routes fonctionnent

---

## ✅ Validation Finale

- [ ] Google OAuth configuré dans Google Cloud Console
- [ ] Variables d'environnement remplies dans `.env.production`
- [ ] `google-auth-library` installé (`npm install`)
- [ ] Route `/api/auth/callback/google` accessible
- [ ] Page `/privacy` accessible
- [ ] CORS configuré pour `https://jurisapp-smart-pro.com`
- [ ] Tests d'authentification Google réussis
- [ ] HTTPS activé partout
- [ ] Secrets JWT générés et sécurisés

---

**Date de préparation :** 25 janvier 2026  
**Statut :** ✅ Prêt pour production

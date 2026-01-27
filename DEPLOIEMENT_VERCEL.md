# 🚀 Guide de Déploiement Vercel - JurisFlow

## 📋 Prérequis

- Compte Vercel : https://vercel.com
- Domaine configuré : `jurisapp-smart-pro.com`
- Base de données Supabase configurée
- Compte Google Cloud avec OAuth configuré

---

## 🎯 Déploiement Backend

### 1. Créer un Nouveau Projet Vercel (Backend)

1. Aller sur https://vercel.com/new
2. Importer le dépôt Git contenant JurisFlow
3. **Root Directory :** Définir sur `backend`
4. **Framework Preset :** Autre (Node.js)
5. Cliquer sur "Deploy"

### 2. Configurer les Variables d'Environnement

**Dashboard Vercel > Settings > Environment Variables**

Copier **TOUTES** ces variables (depuis `backend/.env.production`) :

#### Base de Données
```bash
DATABASE_URL=postgresql://postgres.PROJET:VOTRE_MOT_DE_PASSE@REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=30
```

#### JWT Secrets
```bash
JWT_SECRET=jurisflow_dev_secret_key_2024_changez_moi_en_production
JWT_REFRESH_SECRET=jurisflow_dev_refresh_secret_key_2024_changez_moi_en_production
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d
```

⚠️ **IMPORTANT :** Générer de nouveaux secrets sécurisés en production :
```bash
# Exécuter 2 fois pour générer JWT_SECRET et JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### Google OAuth (CRITIQUE)
```bash
GOOGLE_CLIENT_ID=VOTRE_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=VOTRE_GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL=https://jurisapp-smart-pro.com/api/auth/callback/google
```

⚠️ **IMPORTANT :** Mettre à jour dans Google Cloud Console :
- Authorized redirect URIs : `https://jurisapp-smart-pro.com/api/auth/callback/google`
- Authorized JavaScript origins : `https://jurisapp-smart-pro.com`

#### Frontend URL
```bash
FRONTEND_URL=https://jurisapp-smart-pro.com
```

#### Email (SMTP Amen)
```bash
EMAIL_HOST=smtp.securemail.pro
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=contact@jurisapp-smart-pro.com
EMAIL_PASSWORD=VOTRE_MOT_DE_PASSE_EMAIL
EMAIL_FROM=contact@jurisapp-smart-pro.com
```

#### OpenAI
```bash
OPENAI_API_KEY=VOTRE_OPENAI_API_KEY
```

#### Supabase Storage
```bash
SUPABASE_URL=https://VOTRE_PROJET.supabase.co
SUPABASE_ANON_KEY=VOTRE_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=VOTRE_SUPABASE_SERVICE_ROLE_KEY
```

#### Environnement
```bash
NODE_ENV=production
PORT=5087
```

### 3. Domaine Personnalisé (Backend)

**Option 1 : Sous-domaine API**
- Domaine : `api.jurisapp-smart-pro.com`
- Créer un CNAME chez Amen pointant vers le domaine Vercel du backend

**Option 2 : Chemin API**
- Utiliser le même domaine : `jurisapp-smart-pro.com`
- Le backend sera accessible via les routes `/api/*`

---

## 🎯 Déploiement Frontend

### 1. Créer un Nouveau Projet Vercel (Frontend)

1. Aller sur https://vercel.com/new
2. Importer le même dépôt Git
3. **Root Directory :** Définir sur `frontend`
4. **Framework Preset :** Vite
5. **Build Command :** `npm run build`
6. **Output Directory :** `dist`
7. Cliquer sur "Deploy"

### 2. Configurer les Variables d'Environnement

**Dashboard Vercel > Settings > Environment Variables**

```bash
# URL du backend (selon votre choix)
# Option 1 : Sous-domaine
VITE_API_URL=https://api.jurisapp-smart-pro.com/api

# Option 2 : Même domaine
VITE_API_URL=https://jurisapp-smart-pro.com/api
```

### 3. Domaine Personnalisé (Frontend)

1. Dashboard Vercel > Settings > Domains
2. Ajouter : `jurisapp-smart-pro.com`
3. Vercel vous donnera l'adresse IP ou CNAME à configurer chez Amen

**Configuration DNS chez Amen :**
- Type : A
- Nom : @ (ou vide pour le domaine racine)
- Valeur : IP fournie par Vercel (généralement `76.76.21.21`)

---

## 🔐 Configuration Google Cloud Console (Production)

### Mettre à jour les URI autorisés

**APIs & Services > Credentials > Votre OAuth Client**

**Authorized redirect URIs :**
```
https://jurisapp-smart-pro.com/api/auth/callback/google
```

**Authorized JavaScript origins :**
```
https://jurisapp-smart-pro.com
```

**⚠️ IMPORTANT :** Supprimer les URI localhost en production pour la sécurité.

---

## ✅ Checklist de Déploiement

### Backend

- [ ] Projet Vercel créé avec root directory = `backend`
- [ ] Variables d'environnement copiées (voir liste ci-dessus)
- [ ] `FRONTEND_URL=https://jurisapp-smart-pro.com` configuré
- [ ] `GOOGLE_CALLBACK_URL=https://jurisapp-smart-pro.com/api/auth/callback/google` configuré
- [ ] Déploiement réussi
- [ ] Test : `https://jurisapp-smart-pro.com/health` (ou votre domaine backend)

### Frontend

- [ ] Projet Vercel créé avec root directory = `frontend`
- [ ] `VITE_API_URL` configuré avec l'URL du backend
- [ ] Domaine `jurisapp-smart-pro.com` ajouté
- [ ] DNS configuré chez Amen
- [ ] Déploiement réussi
- [ ] Test : `https://jurisapp-smart-pro.com` accessible

### Google Cloud

- [ ] OAuth redirect URIs mis à jour avec l'URL de production
- [ ] Page Privacy accessible : `https://jurisapp-smart-pro.com/privacy`
- [ ] Homepage accessible : `https://jurisapp-smart-pro.com`
- [ ] Test d'authentification Google réussi

---

## 🧪 Tests Post-Déploiement

### Test 1 : Backend Health Check

```bash
curl https://jurisapp-smart-pro.com/health
# ou
curl https://api.jurisapp-smart-pro.com/health
```

**Attendu :**
```json
{
  "success": true,
  "message": "JurisFlow API est opérationnelle",
  "environment": "production"
}
```

### Test 2 : Google OAuth

1. Ouvrir `https://jurisapp-smart-pro.com/login`
2. Cliquer sur "Se connecter avec Google"
3. Autoriser l'accès
4. Vérifier la redirection vers `/dashboard`

### Test 3 : Google Calendar

1. Se connecter avec Google
2. Ouvrir l'agenda
3. Vérifier que les événements Google s'affichent (📅 bleus)
4. Créer un événement
5. Vérifier qu'il apparaît aussi sur Google Calendar

### Test 4 : Refresh Token

1. Attendre 1h (ou forcer l'expiration en DB)
2. Ouvrir l'agenda
3. Vérifier dans les logs Vercel : "Token rafraîchi avec succès"
4. Les événements doivent se charger normalement

---

## 🔧 Variables d'Environnement pour Vercel

### Liste Complète (Copier-Coller)

#### Backend

```bash
# Database
DATABASE_URL=postgresql://postgres.PROJET:VOTRE_MOT_DE_PASSE@REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=30

# JWT (GÉNÉRER DE NOUVEAUX SECRETS EN PRODUCTION)
JWT_SECRET=GÉNÉRER_UN_NOUVEAU_SECRET_64_CARACTÈRES
JWT_REFRESH_SECRET=GÉNÉRER_UN_NOUVEAU_SECRET_64_CARACTÈRES
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d

# Frontend
FRONTEND_URL=https://jurisapp-smart-pro.com

# Google OAuth
GOOGLE_CLIENT_ID=VOTRE_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=VOTRE_GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL=https://jurisapp-smart-pro.com/api/auth/callback/google

# Email
EMAIL_HOST=smtp.securemail.pro
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=contact@jurisapp-smart-pro.com
EMAIL_PASSWORD=VOTRE_MOT_DE_PASSE_EMAIL
EMAIL_FROM=contact@jurisapp-smart-pro.com

# OpenAI
OPENAI_API_KEY=VOTRE_OPENAI_API_KEY

# Supabase
SUPABASE_URL=https://VOTRE_PROJET.supabase.co
SUPABASE_ANON_KEY=VOTRE_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=VOTRE_SUPABASE_SERVICE_ROLE_KEY

# Environnement
NODE_ENV=production
PORT=5087
```

#### Frontend

```bash
# URL du backend (à adapter selon votre configuration)
VITE_API_URL=https://jurisapp-smart-pro.com/api
```

---

## 🔄 Architecture Serverless (Vercel)

### Fonctions Serverless Créées

Toutes les routes API fonctionnent comme des **Vercel Serverless Functions** :

#### Google OAuth
- `/api/auth/google` : Initiation OAuth
- `/api/auth/callback/google` : Callback OAuth
- Fonction `refreshGoogleToken()` exportée et utilisée automatiquement

#### Google Calendar
- `/api/google-calendar/events` (GET) : Récupération événements
- `/api/google-calendar/events` (POST) : Création événement
- Service `googleCalendarService.js` avec fonctions exportées

### Configuration Vercel

**Fichier :** `backend/vercel.json`

```json
{
  "version": 2,
  "name": "jurisflow-backend",
  "builds": [
    {
      "src": "src/app.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/app.js"
    }
  ],
  "functions": {
    "src/app.js": {
      "maxDuration": 30
    }
  }
}
```

---

## 🌐 URLs Dynamiques

### Backend

Toutes les redirections utilisent `process.env.FRONTEND_URL` :

```javascript
// Exemple dans googleAuthController.js
const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5174'}/auth/google/callback?...`;
```

**Résultat :**
- En local : `http://localhost:5174`
- En production : `https://jurisapp-smart-pro.com`

### Google OAuth Callback

```javascript
GOOGLE_CALLBACK_URL=process.env.GOOGLE_CALLBACK_URL
```

**Valeurs :**
- Local : `http://localhost:5087/api/auth/callback/google`
- Production : `https://jurisapp-smart-pro.com/api/auth/callback/google`

---

## 📊 Vérification des Variables

### Script de Vérification

Les logs de démarrage affichent les variables chargées :

```
✅ Fichier .env chargé: /var/task/.env.production
📊 NODE_ENV: production
🌐 FRONTEND_URL: https://jurisapp-smart-pro.com
```

Lors de l'authentification Google :
```
🔍 [Google OAuth] Vérification des variables d'environnement:
   - GOOGLE_CLIENT_ID: ✅ Présent (324487856842-on74c0bf...)
   - GOOGLE_CLIENT_SECRET: ✅ Présent (GOCSPX-wcJd...)
   - GOOGLE_CALLBACK_URL: https://jurisapp-smart-pro.com/api/auth/callback/google
   - NODE_ENV: production
```

---

## ⚠️ Points d'Attention

### 1. Secrets JWT

**Ne PAS utiliser les secrets de développement en production !**

Générer de nouveaux secrets :
```bash
# JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. Google Cloud Console

**Mettre à jour les URI autorisés :**
- Ajouter les URI de production
- Supprimer les URI localhost (sécurité)

### 3. CORS

Le CORS est automatiquement configuré pour accepter `https://jurisapp-smart-pro.com` en production :

```javascript
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [
      process.env.FRONTEND_URL || 'https://jurisapp-smart-pro.com',
      'https://jurisapp-smart-pro.com'
    ]
  : [...localhost ports...];
```

### 4. Rate Limiting

En production, le rate limiting est **activé** :
- 100 req/15min (général)
- 10 req/15min (auth)

### 5. Logs Vercel

Les logs sont accessibles dans le Dashboard Vercel :
- Logs en temps réel
- Recherche par fonction
- Filtrage par erreur

---

## 🎊 Résultat Attendu

### Backend Déployé

- ✅ URL : `https://jurisapp-smart-pro.com` (ou `api.jurisapp-smart-pro.com`)
- ✅ Health check : `/health` retourne 200
- ✅ Google OAuth : Fonctionnel
- ✅ Google Calendar : Synchronisation active
- ✅ Refresh token : Automatique

### Frontend Déployé

- ✅ URL : `https://jurisapp-smart-pro.com`
- ✅ Page de login avec bouton Google
- ✅ Page Privacy accessible
- ✅ Agenda fusionné (Google + Local)

### Intégration Google Calendar

- ✅ Les événements Google s'affichent dans JurisFlow
- ✅ Les événements créés dans JurisFlow sont sur Google Calendar
- ✅ Rafraîchissement automatique des tokens
- ✅ Fonctionne avec ou sans compte Google

---

## 🐛 Troubleshooting

### Erreur : "Configuration OAuth manquante"

**Cause :** Les variables `GOOGLE_CLIENT_ID` ou `GOOGLE_CLIENT_SECRET` ne sont pas définies.

**Solution :**
1. Vérifier dans Vercel > Settings > Environment Variables
2. S'assurer qu'elles sont définies pour "Production"
3. Redéployer

### Erreur : "Invalid redirect URI"

**Cause :** L'URI de redirection ne correspond pas à celle configurée dans Google Cloud Console.

**Solution :**
1. Vérifier `GOOGLE_CALLBACK_URL` dans les variables Vercel
2. Vérifier dans Google Cloud Console > Credentials
3. S'assurer que les deux correspondent exactement

### Erreur : "CORS policy"

**Cause :** Le frontend n'est pas autorisé par le backend.

**Solution :**
1. Vérifier `FRONTEND_URL` dans les variables Vercel (backend)
2. S'assurer qu'elle correspond à l'URL du frontend
3. Redéployer le backend

### Logs ne s'affichent pas

**Solution :**
- Dashboard Vercel > Deployments > Cliquer sur le dernier déploiement
- Onglet "Functions" pour voir les logs de chaque fonction
- Onglet "Build Logs" pour voir les logs de build

---

## 📞 Support

Si vous rencontrez des problèmes lors du déploiement :

1. **Vérifier les logs Vercel** : Dashboard > Functions
2. **Tester les variables** : Ajouter des `console.log()` dans les fonctions
3. **Vérifier Google Cloud Console** : OAuth credentials et écran de consentement
4. **Vérifier DNS** : `nslookup jurisapp-smart-pro.com`

---

## 🎯 Commandes Rapides

### Générer des secrets JWT sécurisés

```bash
# JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Tester le backend en local avant déploiement

```bash
cd backend
NODE_ENV=production node src/app.js
```

### Tester le frontend en local avec le backend de production

```bash
cd frontend
echo "VITE_API_URL=https://jurisapp-smart-pro.com/api" > .env.production.local
npm run build
npm run preview
```

---

**Date :** 26 janvier 2026  
**Statut :** ✅ Prêt pour déploiement Vercel  
**Architecture :** Serverless Functions compatible  
**Variables d'environnement :** Configurées via `process.env`

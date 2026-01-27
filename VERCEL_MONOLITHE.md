# 🚀 Déploiement Monolithe Vercel - JurisFlow

## 📋 Configuration Unique (Backend + Frontend)

Avec cette configuration, **un seul projet Vercel** héberge le backend ET le frontend.

---

## 🎯 Architecture

```
jurisapp-smart-pro.com
├── /                    → Frontend (React/Vite)
├── /dashboard           → Frontend (SPA routing)
├── /login               → Frontend
├── /privacy             → Frontend
├── /api/*               → Backend (Serverless Functions)
└── /health              → Backend (Health check)
```

---

## ✅ Configuration Créée

**Fichier :** `vercel.json` (à la racine du projet)

### Structure

```json
{
  "builds": [
    {
      "src": "backend/src/app.js",
      "use": "@vercel/node"
    },
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "backend/src/app.js" },
    { "src": "/health", "dest": "backend/src/app.js" },
    { "src": "/(.*)", "dest": "frontend/dist/$1" },
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "frontend/dist/index.html" }
  ]
}
```

### Comment ça fonctionne

1. **Routes `/api/*`** → Backend Node.js (Express)
2. **Route `/health`** → Backend (Health check)
3. **Autres routes** → Frontend statique
4. **Si fichier non trouvé** → `index.html` (SPA routing)

---

## 🚀 Déploiement sur Vercel

### Étape 1 : Créer le Projet

1. Aller sur https://vercel.com/new
2. Importer votre dépôt Git
3. **Root Directory :** Laisser vide (racine du projet)
4. **Framework Preset :** Autre (ou Vite, peu importe)
5. Cliquer sur "Deploy"

### Étape 2 : Configurer les Variables d'Environnement

**Dashboard Vercel > Settings > Environment Variables**

#### Pour le Backend (API)

```bash
# Database
DATABASE_URL=VOTRE_DATABASE_URL_SUPABASE

# JWT (GÉNÉRER DE NOUVEAUX SECRETS)
JWT_SECRET=VOTRE_JWT_SECRET
JWT_REFRESH_SECRET=VOTRE_JWT_REFRESH_SECRET
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d

# Frontend URL
FRONTEND_URL=https://jurisapp-smart-pro.com

# Google OAuth
GOOGLE_CLIENT_ID=VOTRE_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=VOTRE_GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL=https://jurisapp-smart-pro.com/api/auth/callback/google

# Email (SMTP Amen)
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

#### Pour le Frontend (Build)

```bash
# URL du backend (IMPORTANT : API sur le même domaine)
VITE_API_URL=https://jurisapp-smart-pro.com/api
```

### Étape 3 : Build Settings

**Framework Preset :** Vite  
**Build Command :** `cd frontend && npm install && npm run build`  
**Output Directory :** `frontend/dist`  
**Install Command :** `npm install`

⚠️ **Important :** Si Vercel ne détecte pas automatiquement, ajouter ces commandes manuellement dans Settings > General.

### Étape 4 : Domaine Personnalisé

1. Settings > Domains
2. Ajouter : `jurisapp-smart-pro.com`
3. Configurer DNS chez Amen avec l'IP fournie

---

## 🧪 Tests Post-Déploiement

### Test 1 : Backend (API)

```bash
curl https://jurisapp-smart-pro.com/health
```

**Attendu :**
```json
{
  "success": true,
  "message": "JurisFlow API est opérationnelle",
  "environment": "production"
}
```

### Test 2 : Frontend

```bash
curl https://jurisapp-smart-pro.com
```

**Attendu :** HTML de la page d'accueil (React)

### Test 3 : Route Frontend (SPA)

```bash
curl https://jurisapp-smart-pro.com/dashboard
```

**Attendu :** Même HTML que la page d'accueil (React Router gère la route)

### Test 4 : Google OAuth

1. Ouvrir `https://jurisapp-smart-pro.com/login`
2. Cliquer sur "Se connecter avec Google"
3. Vérifier la redirection

### Test 5 : Google Calendar

1. Se connecter avec Google
2. Ouvrir `https://jurisapp-smart-pro.com/agenda`
3. Vérifier que les événements Google s'affichent

---

## 🔧 Avantages du Monolithe

### ✅ Avantages

1. **Un seul déploiement** : Plus simple à gérer
2. **Même domaine** : Pas de problème CORS
3. **URL simplifiées** : `/api/*` au lieu de `api.example.com`
4. **Routing propre** : Frontend + Backend cohérents

### ⚠️ Limitations

1. **Build plus long** : Frontend + Backend ensemble
2. **Moins de contrôle** : Difficile d'avoir des configs séparées
3. **Cold starts** : Le backend peut avoir des cold starts Vercel

---

## 📝 Structure du Projet

```
jurisflow/
├── vercel.json              ← Configuration monolithe
├── backend/
│   ├── src/app.js          ← API Express
│   ├── package.json
│   └── ...
└── frontend/
    ├── dist/               ← Build statique (généré)
    ├── src/
    ├── package.json
    └── ...
```

---

## 🐛 Troubleshooting

### Erreur 404 sur les routes frontend

**Cause :** Le rewrite SPA ne fonctionne pas.

**Solution :** Vérifier que `vercel.json` contient bien :
```json
{
  "handle": "filesystem"
},
{
  "src": "/(.*)",
  "dest": "frontend/dist/index.html"
}
```

### Erreur 404 sur /api/*

**Cause :** Le routing vers le backend ne fonctionne pas.

**Solution :** Vérifier que :
1. `backend/src/app.js` existe et exporte une app Express
2. Les routes API sont montées sur `/api`
3. Les variables d'environnement sont définies

### Erreur "Module not found"

**Cause :** Les dépendances backend/frontend ne sont pas installées.

**Solution :** Vérifier le Build Command :
```bash
npm install && cd backend && npm install && cd ../frontend && npm install && npm run build
```

### Cold Start Lent

**Cause :** Vercel Serverless Functions ont un cold start.

**Solution :**
- Passer à Vercel Pro (warm instances)
- Ou déployer le backend séparément (Railway, Render)

---

## 🎯 Commandes Vercel CLI (Optionnel)

### Installer Vercel CLI

```bash
npm install -g vercel
```

### Déployer en ligne de commande

```bash
cd /Users/wanys/Documents/SAAS\ AI/jurisflow
vercel --prod
```

### Tester localement

```bash
vercel dev
```

---

## ✅ Checklist Finale

- [x] `vercel.json` créé à la racine
- [x] Routes `/api/*` configurées vers backend
- [x] Rewrite SPA configuré pour le frontend
- [x] Variables d'environnement définies
- [ ] Déploiement réussi
- [ ] Tests passés

---

## 🚀 Prochaine Étape

1. **Vérifier le déploiement** : Dashboard Vercel
2. **Tester les routes** : `/api/health`, `/`, `/dashboard`
3. **Tester Google OAuth**
4. **Tester Google Calendar**

---

**Date :** 27 janvier 2026  
**Architecture :** Monolithe (Backend + Frontend)  
**Domaine :** https://jurisapp-smart-pro.com  
**Statut :** ✅ Prêt pour déploiement

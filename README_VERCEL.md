# 🚀 JurisFlow - Déploiement Vercel

## Lien du Projet

- **Repository GitHub :** https://github.com/wanys73/JurisFlow
- **Dernière mise à jour :** Commit `67dd264`

---

## ⚡ Déploiement Rapide

### Étape 1 : Créer le Projet sur Vercel

1. Aller sur https://vercel.com/new
2. **Import Git Repository :**
   - Choisir "Import from GitHub"
   - Chercher "JurisFlow" ou "wanys73/JurisFlow"
   - Cliquer sur "Import"

3. **Configure Project :**
   - **Project Name :** jurisflow (ou laissez le nom par défaut)
   - **Root Directory :** Laisser vide (racine)
   - **Framework Preset :** Vite
   - Cliquer sur "Deploy"

### Étape 2 : Configurer les Variables d'Environnement

**Après le premier déploiement :**

1. Aller dans **Settings > Environment Variables**
2. Copier vos variables depuis `backend/.env.production` :

```bash
# CRITIQUES
FRONTEND_URL=https://jurisapp-smart-pro.com
GOOGLE_CLIENT_ID=votre_client_id
GOOGLE_CLIENT_SECRET=votre_client_secret
GOOGLE_CALLBACK_URL=https://jurisapp-smart-pro.com/api/auth/callback/google
DATABASE_URL=votre_database_url_supabase
JWT_SECRET=votre_jwt_secret
JWT_REFRESH_SECRET=votre_jwt_refresh_secret
OPENAI_API_KEY=votre_openai_key
EMAIL_HOST=smtp.securemail.pro
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=contact@jurisapp-smart-pro.com
EMAIL_PASSWORD=votre_mot_de_passe
EMAIL_FROM=contact@jurisapp-smart-pro.com
SUPABASE_URL=votre_supabase_url
SUPABASE_ANON_KEY=votre_anon_key
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
NODE_ENV=production
VITE_API_URL=https://jurisapp-smart-pro.com/api
```

3. **Sauvegarder** et **Redéployer** (Deployments > ... > Redeploy)

### Étape 3 : Ajouter le Domaine

1. Settings > Domains
2. Ajouter : `jurisapp-smart-pro.com`
3. Configurer DNS chez Amen avec l'IP fournie par Vercel

---

## 🔧 Si Vercel ne Trouve Pas le Repo

### Solution 1 : Installer l'App GitHub

1. Aller sur https://vercel.com/new
2. Cliquer sur "Adjust GitHub App Permissions"
3. Autoriser l'accès au repo "JurisFlow"
4. Réessayer l'import

### Solution 2 : Déployer via Vercel CLI

```bash
# Installer Vercel CLI
npm install -g vercel

# Se connecter
vercel login

# Déployer
cd "/Users/wanys/Documents/SAAS AI/jurisflow"
vercel --prod
```

### Solution 3 : Lier le Repo Manuellement

```bash
cd "/Users/wanys/Documents/SAAS AI/jurisflow"
vercel link
# Suivre les instructions
vercel --prod
```

---

## 🧪 Vérifier le Déploiement

Après le déploiement, Vercel vous donnera une URL (ex: `jurisflow-xxx.vercel.app`)

**Tester :**
```bash
# Backend
curl https://jurisflow-xxx.vercel.app/health

# Frontend
curl https://jurisflow-xxx.vercel.app
```

---

## 📊 Structure du Projet

```
jurisflow/
├── vercel.json              ← Configuration monolithe
├── .vercelignore           ← Fichiers ignorés
├── backend/
│   ├── src/app.js          ← API Express
│   └── ...
└── frontend/
    ├── dist/               ← Build (généré par Vercel)
    └── ...
```

---

## ⚠️ Important

- **Vercel doit avoir accès à votre repo GitHub**
- **Le fichier `vercel.json` doit être à la racine**
- **Les variables d'environnement doivent être configurées dans Vercel**

---

## 🔗 Liens Utiles

- Dashboard Vercel : https://vercel.com/dashboard
- Import New Project : https://vercel.com/new
- Documentation Vercel : https://vercel.com/docs

---

**Commit actuel :** `67dd264`  
**Statut :** ✅ Prêt pour déploiement

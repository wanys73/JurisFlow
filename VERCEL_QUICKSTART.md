# ⚡ Vercel Quickstart - JurisFlow

## 🎯 Déploiement en 5 Étapes

### Étape 1 : Déployer le Backend

1. **Créer un projet Vercel :**
   - https://vercel.com/new
   - Importer votre repo Git
   - **Root Directory :** `backend`
   - Deploy

2. **Configurer les variables d'environnement :**
   - Settings > Environment Variables
   - Copier TOUTES les variables depuis `backend/.env.production`
   - **CRITICAL :**
     ```
     FRONTEND_URL=https://jurisapp-smart-pro.com
     GOOGLE_CALLBACK_URL=https://jurisapp-smart-pro.com/api/auth/callback/google
     ```

3. **Récupérer l'URL du backend :**
   - Exemple : `https://jurisflow-backend.vercel.app`
   - Ou configurer un domaine personnalisé : `api.jurisapp-smart-pro.com`

### Étape 2 : Déployer le Frontend

1. **Créer un projet Vercel :**
   - https://vercel.com/new
   - Importer le même repo
   - **Root Directory :** `frontend`
   - **Framework :** Vite
   - Deploy

2. **Configurer la variable d'environnement :**
   ```bash
   VITE_API_URL=https://jurisapp-smart-pro.com/api
   ```
   (ou l'URL de votre backend)

3. **Ajouter le domaine :**
   - Settings > Domains
   - Ajouter : `jurisapp-smart-pro.com`

### Étape 3 : Configurer DNS chez Amen

**Pour le domaine racine (jurisapp-smart-pro.com) :**
- Type : A
- Nom : @ (vide)
- Valeur : IP fournie par Vercel (ex: `76.76.21.21`)

**Ou CNAME :**
- Type : CNAME
- Nom : @
- Valeur : `cname.vercel-dns.com`

### Étape 4 : Mettre à Jour Google Cloud Console

**OAuth Credentials > Authorized redirect URIs :**
```
https://jurisapp-smart-pro.com/api/auth/callback/google
```

**Authorized JavaScript origins :**
```
https://jurisapp-smart-pro.com
```

### Étape 5 : Tester

1. Ouvrir `https://jurisapp-smart-pro.com`
2. Cliquer sur "Se connecter avec Google"
3. Vérifier la redirection
4. Ouvrir l'agenda et vérifier les événements Google

---

## 📋 Variables d'Environnement Backend (Copier dans Vercel)

```bash
DATABASE_URL=VOTRE_DATABASE_URL_SUPABASE
JWT_SECRET=GÉNÉRER_NOUVEAU_SECRET
JWT_REFRESH_SECRET=GÉNÉRER_NOUVEAU_SECRET
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d
FRONTEND_URL=https://jurisapp-smart-pro.com
GOOGLE_CLIENT_ID=VOTRE_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=VOTRE_GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL=https://jurisapp-smart-pro.com/api/auth/callback/google
EMAIL_HOST=smtp.securemail.pro
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=contact@jurisapp-smart-pro.com
EMAIL_PASSWORD=VOTRE_MOT_DE_PASSE_EMAIL
EMAIL_FROM=contact@jurisapp-smart-pro.com
OPENAI_API_KEY=VOTRE_OPENAI_API_KEY
SUPABASE_URL=https://VOTRE_PROJET.supabase.co
SUPABASE_ANON_KEY=VOTRE_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=VOTRE_SUPABASE_SERVICE_ROLE_KEY
NODE_ENV=production
PORT=5087
```

---

## ✅ Checklist Finale

**Backend :**
- [ ] Projet Vercel créé (root: `backend`)
- [ ] Variables d'environnement copiées
- [ ] `FRONTEND_URL` = URL du frontend
- [ ] `GOOGLE_CALLBACK_URL` = URL de production
- [ ] Déploiement réussi
- [ ] `/health` accessible

**Frontend :**
- [ ] Projet Vercel créé (root: `frontend`)
- [ ] `VITE_API_URL` configuré
- [ ] Domaine ajouté
- [ ] DNS configuré chez Amen
- [ ] Déploiement réussi

**Google Cloud :**
- [ ] Redirect URIs mis à jour
- [ ] Test d'authentification réussi

---

## 🚀 Commandes de Test

```bash
# Backend
curl https://jurisapp-smart-pro.com/health

# Google OAuth
curl https://jurisapp-smart-pro.com/api/auth/google

# Frontend
curl https://jurisapp-smart-pro.com
```

---

**Temps estimé :** 15-20 minutes  
**Prérequis :** Compte Vercel + Domaine configuré chez Amen

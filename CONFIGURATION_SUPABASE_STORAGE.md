# 📦 Configuration Supabase Storage

## Étape 1 : Récupérer les clés API

1. Allez sur [https://supabase.com/dashboard/project/nfkdywcpcyrhzdnwexol](https://supabase.com/dashboard/project/nfkdywcpcyrhzdnwexol)
2. Cliquez sur **Settings** (icône d'engrenage en bas à gauche)
3. Cliquez sur **API** dans le menu de gauche
4. Vous verrez deux clés :
   - **anon public** : Clé publique (sécurisée pour le frontend)
   - **service_role** : Clé secrète (UNIQUEMENT pour le backend, ne jamais exposer)

## Étape 2 : Ajouter les clés dans .env

Ouvrez `backend/.env` et ajoutez :

```env
SUPABASE_URL=https://nfkdywcpcyrhzdnwexol.supabase.co
SUPABASE_ANON_KEY=votre_cle_anon_public_ici
SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_role_ici
```

## Étape 3 : Créer le bucket "documents"

1. Dans votre projet Supabase, allez dans **Storage** (icône de dossier dans la sidebar)
2. Cliquez sur **"New bucket"** ou **"Créer un bucket"**
3. Nom du bucket : `documents`
4. **Public bucket** : Décochez (bucket privé)
5. Cliquez sur **"Create bucket"**

## Étape 4 : Configurer les politiques (optionnel)

Pour plus de sécurité, vous pouvez configurer des Row Level Security (RLS) policies dans Storage, mais pour l'instant, le bucket privé avec la clé service_role suffit.

## ✅ Vérification

Une fois configuré, redémarrez le backend :

```bash
cd backend
npm run dev
```

L'upload de fichiers devrait maintenant fonctionner !


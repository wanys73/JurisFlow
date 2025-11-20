# 🚀 Migration vers Supabase (PostgreSQL) - Guide Complet

## ✅ Migration Terminée

La migration complète de MongoDB vers Supabase (PostgreSQL) avec Prisma est terminée !

## 📋 Étapes de Configuration

### 1. Installer les dépendances

```bash
cd backend
npm install
```

Cela installera automatiquement :
- `@prisma/client` : Client Prisma pour interagir avec la base de données
- `prisma` : CLI Prisma pour les migrations

### 2. Configurer Supabase

#### A. Créer un projet Supabase

1. Allez sur [https://supabase.com](https://supabase.com)
2. Créez un compte ou connectez-vous
3. Créez un nouveau projet
4. Notez les informations de connexion :
   - **Database URL** (Connection string)
   - **API Key** (si nécessaire)

#### B. Récupérer la connection string

Dans votre projet Supabase :
1. Allez dans **Settings** → **Database**
2. Copiez la **Connection string** (URI)
3. Format : `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

### 3. Mettre à jour les variables d'environnement

Modifiez votre fichier `backend/.env` :

```env
# === BASE DE DONNÉES - Supabase PostgreSQL ===
# Remplacez MONGODB_URI par DATABASE_URL
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"

# === JWT ===
JWT_SECRET=votre_secret_jwt_tres_securise
JWT_EXPIRE=24h
JWT_REFRESH_SECRET=votre_refresh_secret_tres_securise
JWT_REFRESH_EXPIRE=7d

# === SERVEUR ===
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# === AWS S3 ===
AWS_ACCESS_KEY_ID=votre_access_key
AWS_SECRET_ACCESS_KEY=votre_secret_key
AWS_REGION=eu-west-3
AWS_BUCKET_NAME=jurisflow-documents

# === IA - OpenAI ===
OPENAI_API_KEY=votre_cle_openai
```

**⚠️ IMPORTANT :** 
- Remplacez `[YOUR-PASSWORD]` par votre mot de passe Supabase
- Remplacez `[PROJECT-REF]` par la référence de votre projet Supabase
- Le paramètre `?pgbouncer=true&connection_limit=1` est recommandé pour Supabase

### 4. Générer le client Prisma

```bash
cd backend
npm run prisma:generate
```

Cette commande génère le client Prisma basé sur le schéma `prisma/schema.prisma`.

### 5. Exécuter les migrations

```bash
cd backend
npm run prisma:migrate
```

Cette commande :
- Crée toutes les tables dans Supabase
- Applique les contraintes et index
- Configure les relations entre les tables

**Note :** Lors de la première migration, Prisma vous demandera un nom pour la migration. Utilisez par exemple : `init`

### 6. (Optionnel) Ouvrir Prisma Studio

Pour visualiser et gérer vos données :

```bash
cd backend
npm run prisma:studio
```

Cela ouvrira Prisma Studio sur `http://localhost:5555`

## 📊 Structure de la Base de Données

La migration a créé les tables suivantes dans PostgreSQL :

- **users** : Utilisateurs (admins et collaborateurs)
- **dossiers** : Dossiers juridiques
- **dossier_notes** : Notes associées aux dossiers
- **dossier_timeline** : Timeline des actions sur les dossiers
- **documents** : Documents uploadés (liés aux dossiers)
- **factures** : Factures
- **facture_lignes** : Lignes de facturation

## 🔄 Changements Principaux

### Modèles Migrés

1. **User** → `users` (PostgreSQL)
   - Rôles : `ADMIN`, `COLLABORATEUR` (enum)
   - Cabinet stocké en colonnes séparées

2. **Dossier** → `dossiers` (PostgreSQL)
   - Statuts : `OUVERT`, `FERME`, `EN_ATTENTE` (enum)
   - Client stocké en colonnes séparées
   - Notes et Timeline dans des tables séparées

3. **Document** → `documents` (PostgreSQL)
   - Catégories : enum PostgreSQL

4. **Facture** → `factures` + `facture_lignes` (PostgreSQL)
   - Statuts : `BROUILLON`, `ENVOYEE`, `PAYEE`, `EN_RETARD` (enum)
   - Lignes dans une table séparée

### Controllers Migrés

Tous les controllers utilisent maintenant Prisma :
- ✅ `authController.js`
- ✅ `dossierController.js`
- ✅ `documentController.js`
- ✅ `factureController.js`
- ✅ `iaController.js`

### Middlewares Migrés

- ✅ `authMiddleware.js` : Utilise Prisma pour vérifier les utilisateurs
- ✅ `errorMiddleware.js` : Gère les erreurs Prisma (codes P2002, P2023, P2025, etc.)

## 🧪 Tester la Migration

### 1. Démarrer le serveur

```bash
cd backend
npm run dev
```

Vous devriez voir :
```
✅ Base de données PostgreSQL (Supabase) connectée
📊 Connexion Prisma opérationnelle
🚀 Serveur JurisFlow démarré avec succès
```

### 2. Tester l'API

```bash
# Health check
curl http://localhost:5000/health

# Inscription
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Dupont",
    "prenom": "Jean",
    "email": "jean@example.com",
    "password": "MotDePasse123!",
    "role": "admin",
    "cabinet": {
      "nom": "Cabinet Dupont"
    }
  }'
```

## 🐛 Dépannage

### Erreur : "Can't reach database server"

- Vérifiez que votre `DATABASE_URL` est correcte
- Vérifiez que votre projet Supabase est actif
- Vérifiez votre mot de passe dans la connection string

### Erreur : "P1001: Can't reach database server"

- Vérifiez que vous utilisez le bon format de connection string
- Ajoutez `?pgbouncer=true&connection_limit=1` à la fin de votre DATABASE_URL

### Erreur : "P2002: Unique constraint failed"

- C'est normal si vous essayez de créer un utilisateur avec un email existant
- Vérifiez que vous n'avez pas déjà des données dans Supabase

### Erreur : "Prisma Client not generated"

```bash
cd backend
npm run prisma:generate
```

## 📚 Ressources

- [Documentation Prisma](https://www.prisma.io/docs)
- [Documentation Supabase](https://supabase.com/docs)
- [Prisma avec Supabase](https://supabase.com/docs/guides/integrations/prisma)

## ✅ Checklist de Migration

- [x] Schéma Prisma créé
- [x] Client Prisma configuré
- [x] Tous les controllers migrés
- [x] Middlewares migrés
- [x] Gestion d'erreurs Prisma
- [x] Documentation créée
- [ ] Variables d'environnement configurées
- [ ] Migrations exécutées
- [ ] Tests effectués

## 🎉 Prochaines Étapes

1. Configurez Supabase et mettez à jour `.env`
2. Exécutez `npm run prisma:generate`
3. Exécutez `npm run prisma:migrate`
4. Testez l'application
5. Supprimez les anciens modèles Mongoose (optionnel) :
   - `backend/src/models/User.js`
   - `backend/src/models/Dossier.js`
   - `backend/src/models/Document.js`
   - `backend/src/models/Facture.js`

---

**Migration réalisée le :** $(date)
**Version Prisma :** 5.7.1
**Base de données :** PostgreSQL (Supabase)


# 🔧 Configuration de la Base de Données Supabase

Ce document explique comment configurer correctement la connexion à Supabase pour éviter les erreurs de connexion après la sortie de veille.

## 📋 Configuration DATABASE_URL

### Format recommandé pour Supabase

Votre `DATABASE_URL` dans le fichier `.env` doit inclure les paramètres de connexion optimisés :

```env
DATABASE_URL="postgresql://postgres:[VOTRE_MOT_DE_PASSE]@db.[PROJECT_REF].supabase.co:5432/postgres?connect_timeout=30&pool_timeout=30&pgbouncer=true"
```

### Paramètres importants

- **`connect_timeout=30`** : Délai d'attente de 30 secondes pour établir la connexion
- **`pool_timeout=30`** : Délai d'attente pour obtenir une connexion du pool
- **`pgbouncer=true`** : Active le mode connection pooling (recommandé pour Supabase)

### Exemple complet

```env
# .env
# Format recommandé avec pooler Supabase (port 6543)
DATABASE_URL="postgresql://postgres.xxxxx:VOTRE_MOT_DE_PASSE@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?connect_timeout=60&pool_timeout=60&pgbouncer=true"

# Alternative avec port direct (5432) - moins recommandé
# DATABASE_URL="postgresql://postgres:[MOT_DE_PASSE]@db.[PROJECT_REF].supabase.co:5432/postgres?connect_timeout=60"
```

## 🔄 Gestion des reconnexions

Le backend a été configuré pour :

1. **Tentatives multiples** : 5 tentatives avec un délai progressif (5s, 10s, 15s, 20s)
2. **Timeout de connexion** : 60 secondes maximum par tentative (optimisé pour Supabase)
3. **Timeout de requête** : 10 secondes pour les requêtes de test
4. **Démarrage gracieux** : Le serveur démarre même si la DB est temporairement inaccessible

## ⚠️ Problèmes courants

### Erreur : "Can't reach database server"

**Causes possibles :**
- La base de données Supabase est en pause (plan gratuit)
- Problème de réseau/firewall
- `DATABASE_URL` incorrecte

**Solutions :**
1. Vérifiez que votre projet Supabase est actif
2. Vérifiez votre `DATABASE_URL` dans le fichier `.env`
3. Ajoutez `?connect_timeout=30` à la fin de votre `DATABASE_URL`
4. Utilisez le pooler Supabase (port 6543) au lieu du port direct (5432)

### Erreur après sortie de veille

Supabase met en pause les bases de données inactives sur le plan gratuit. Après la sortie de veille :

1. Réactivez votre projet dans le dashboard Supabase
2. Attendez quelques secondes que la base soit prête
3. Redémarrez le backend

## 🚀 Script predev

Le script `predev` dans `package.json` génère automatiquement le client Prisma avant chaque démarrage :

```json
{
  "scripts": {
    "predev": "npx prisma generate",
    "dev": "nodemon src/app.js"
  }
}
```

Cela garantit que le client Prisma est toujours à jour avec votre schéma.

## 📝 Vérification de la connexion

Pour tester votre connexion :

```bash
# Générer le client Prisma
npx prisma generate

# Tester la connexion
npx prisma db pull
```

## 🔗 Ressources

- [Documentation Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Documentation Prisma PostgreSQL](https://www.prisma.io/docs/concepts/database-connectors/postgresql)


# 🏛️ JurisFlow Backend

Backend API pour JurisFlow - Application SaaS pour professionnels du droit.

## 📋 Table des matières

- [Stack Technique](#stack-technique)
- [Installation](#installation)
- [Configuration](#configuration)
- [Lancement](#lancement)
- [Endpoints API](#endpoints-api)
- [Structure du projet](#structure-du-projet)

---

## 🛠️ Stack Technique

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Base de données**: MongoDB (avec Mongoose)
- **Authentification**: JWT + bcrypt
- **Validation**: express-validator
- **Sécurité**: Helmet, CORS, Rate limiting

---

## 📦 Installation

### 1. Cloner le projet et installer les dépendances

```bash
cd jurisflow/backend
npm install
```

### 2. Installer MongoDB localement

**MacOS** (avec Homebrew):
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Windows**:
Télécharger depuis [mongodb.com](https://www.mongodb.com/try/download/community)

**Linux (Ubuntu)**:
```bash
sudo apt-get install -y mongodb
sudo systemctl start mongodb
```

---

## ⚙️ Configuration

### 1. Créer le fichier `.env`

Copier le fichier `.env.example` et le renommer en `.env`:

```bash
cp .env.example .env
```

### 2. Configurer les variables d'environnement

Éditer le fichier `.env` avec vos propres valeurs:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/jurisflow

# JWT Secrets (IMPORTANT: Générer des clés sécurisées pour la production)
JWT_SECRET=votre_cle_secrete_jwt
JWT_REFRESH_SECRET=votre_cle_secrete_refresh_token

FRONTEND_URL=http://localhost:5173
```

**💡 Générer des clés JWT sécurisées**:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 🚀 Lancement

### Mode développement (avec auto-reload)

```bash
npm run dev
```

### Mode production

```bash
npm start
```

Le serveur démarre sur `http://localhost:5000`

---

## 📡 Endpoints API

### 🔐 Authentification

#### Inscription
```http
POST /api/auth/register
Content-Type: application/json

{
  "nom": "Dupont",
  "prenom": "Jean",
  "email": "jean.dupont@cabinet-avocat.fr",
  "password": "Motdepasse123!",
  "role": "admin",
  "cabinet": {
    "nom": "Cabinet Dupont & Associés",
    "adresse": "123 Rue de la Loi, Paris",
    "telephone": "0123456789"
  }
}
```

#### Connexion
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "jean.dupont@cabinet-avocat.fr",
  "password": "Motdepasse123!"
}
```

#### Rafraîchir le token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "votre_refresh_token"
}
```

#### Profil utilisateur
```http
GET /api/auth/me
Authorization: Bearer <access_token>
```

#### Déconnexion
```http
POST /api/auth/logout
Authorization: Bearer <access_token>
```

---

## 📁 Structure du projet

```
backend/
├── src/
│   ├── controllers/      # Logique métier des endpoints
│   │   └── authController.js
│   ├── models/          # Modèles MongoDB (Mongoose)
│   │   └── User.js
│   ├── routes/          # Définition des routes API
│   │   └── authRoutes.js
│   ├── middleware/      # Middlewares personnalisés
│   │   ├── authMiddleware.js      # Protection JWT
│   │   ├── errorMiddleware.js     # Gestion des erreurs
│   │   └── validationMiddleware.js # Validation des données
│   ├── services/        # Services réutilisables
│   └── app.js          # Point d'entrée de l'application
├── .env                 # Variables d'environnement (ne pas commit)
├── .env.example         # Exemple de configuration
├── .gitignore
├── package.json
└── README.md
```

---

## 🔐 Sécurité

- ✅ Hashage des mots de passe avec **bcrypt** (12 rounds)
- ✅ Authentification par **JWT** avec access & refresh tokens
- ✅ Protection des headers avec **Helmet**
- ✅ **CORS** configuré pour le frontend
- ✅ **Rate limiting** contre les attaques par force brute
- ✅ Validation stricte des données avec **express-validator**
- ✅ Gestion centralisée des erreurs

---

## 📝 Prochaines étapes (MVP)

- [ ] Gestion des dossiers (CRUD)
- [ ] Gestion des clients
- [ ] Upload de documents
- [ ] Génération de documents avec IA (OpenAI)
- [ ] Facturation simple
- [ ] Tableau de bord

---

## 👨‍💻 Développement

### Tests

```bash
npm test
```

### Linter

```bash
npm run lint
```

---

## 📞 Support

Pour toute question, contactez l'équipe JurisFlow.

---

**© 2024 JurisFlow - Tous droits réservés**


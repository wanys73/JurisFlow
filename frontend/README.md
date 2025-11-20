# 🎨 JurisFlow Frontend

Frontend React pour JurisFlow - Application SaaS pour professionnels du droit.

## 📋 Table des matières

- [Stack Technique](#stack-technique)
- [Installation](#installation)
- [Configuration](#configuration)
- [Lancement](#lancement)
- [Structure du projet](#structure-du-projet)
- [Pages disponibles](#pages-disponibles)

---

## 🛠️ Stack Technique

- **Framework**: React 18
- **Build Tool**: Vite
- **Routage**: React Router v6
- **Styling**: TailwindCSS
- **HTTP Client**: Axios
- **Icônes**: Lucide React
- **État d'authentification**: Context API

---

## 📦 Installation

```bash
cd jurisflow/frontend
npm install
```

---

## ⚙️ Configuration

### 1. Variables d'environnement

Créer le fichier `.env` à la racine du dossier `frontend` :

```bash
cp .env.example .env
```

Contenu du fichier `.env` :

```env
VITE_API_URL=http://localhost:5000/api
VITE_ENV=development
```

### 2. Vérifier la configuration TailwindCSS

Le fichier `tailwind.config.js` est déjà configuré avec :
- Palette de couleurs personnalisée (primary, secondary)
- Classes utilitaires personnalisées
- Composants réutilisables

---

## 🚀 Lancement

### Mode développement

```bash
npm run dev
```

L'application sera disponible sur **http://localhost:5173**

### Build de production

```bash
npm run build
```

Les fichiers seront générés dans le dossier `dist/`

### Prévisualisation de la production

```bash
npm run preview
```

---

## 📁 Structure du projet

```
frontend/
├── src/
│   ├── components/           # Composants réutilisables
│   ├── context/
│   │   └── AuthContext.jsx   # Contexte d'authentification
│   ├── pages/
│   │   ├── Login.jsx         # Page de connexion
│   │   ├── Register.jsx      # Page d'inscription
│   │   └── Dashboard.jsx     # Tableau de bord
│   ├── services/
│   │   └── api.js            # Service API avec intercepteurs
│   ├── App.jsx               # Routes et configuration
│   ├── main.jsx              # Point d'entrée
│   └── index.css             # Styles globaux + Tailwind
├── public/                   # Assets statiques
├── .env                      # Variables d'environnement
├── .env.example              # Template des variables
├── package.json
├── tailwind.config.js        # Configuration Tailwind
├── vite.config.js            # Configuration Vite
└── README.md
```

---

## 🎨 Pages disponibles

### 1. Login (`/login`)
- Formulaire de connexion
- Validation des champs
- Gestion des erreurs
- Redirection automatique vers `/dashboard` après connexion

### 2. Register (`/register`)
- Formulaire d'inscription complet
- Choix du rôle (Admin / Collaborateur)
- Informations du cabinet (pour les admins)
- Validation des mots de passe
- Redirection vers `/dashboard` après inscription réussie

### 3. Dashboard (`/dashboard`)
- **Route protégée** (authentification requise)
- Affichage des informations de l'utilisateur
- Menu de navigation
- Déconnexion

---

## 🔐 Authentification

### Context API (`AuthContext.jsx`)

Le contexte d'authentification gère :
- L'état de l'utilisateur connecté
- Le chargement initial
- Les fonctions de connexion, inscription, déconnexion
- La persistance des tokens (localStorage)

### Hooks disponibles

```jsx
import { useAuth } from './context/AuthContext';

const { user, loading, login, register, logout } = useAuth();
```

### Service API (`api.js`)

Le service API inclut :
- **Intercepteur de requête** : Ajoute automatiquement le token JWT
- **Intercepteur de réponse** : Gère le refresh automatique du token en cas d'expiration (401)
- **Méthodes d'authentification** :
  - `authService.register(userData)`
  - `authService.login(credentials)`
  - `authService.logout()`
  - `authService.getProfile()`

---

## 🛣️ Routes

| Route | Accès | Description |
|-------|-------|-------------|
| `/` | - | Redirige vers `/dashboard` |
| `/login` | Public | Page de connexion |
| `/register` | Public | Page d'inscription |
| `/dashboard` | **Protégé** | Tableau de bord |

### Routes protégées

Les routes protégées utilisent le composant `ProtectedRoute` dans `App.jsx` :

```jsx
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>
```

Si l'utilisateur n'est pas connecté, il est redirigé vers `/login`.

### Routes publiques

Les routes publiques utilisent le composant `PublicRoute` :
- Si l'utilisateur est déjà connecté, il est redirigé vers `/dashboard`

---

## 🎨 Styles et composants

### Classes TailwindCSS personnalisées

```css
/* Boutons */
.btn-primary       → Bouton principal (bleu)
.btn-secondary     → Bouton secondaire (gris)
.btn-outline       → Bouton avec bordure

/* Inputs */
.input             → Champ de formulaire
.input-error       → Champ avec erreur

/* Cards */
.card              → Carte avec ombre et bordure

/* Labels */
.label             → Label de formulaire

/* Utilitaires */
.text-gradient     → Texte avec dégradé
.shadow-elegant    → Ombre élégante
.animate-fade-in   → Animation d'apparition
```

### Palette de couleurs

Configurée dans `tailwind.config.js` :
- **primary** : Bleu (600, 700, etc.)
- **secondary** : Gris pour le texte et les fonds

---

## 🔧 Configuration Axios

### Base URL

```javascript
baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
```

### Gestion automatique du token

```javascript
// Ajout automatique du token à chaque requête
config.headers.Authorization = `Bearer ${token}`;
```

### Refresh automatique du token

En cas d'erreur 401 (token expiré) :
1. Tentative de rafraîchissement avec le `refreshToken`
2. Si succès : nouvelle requête avec le nouveau token
3. Si échec : déconnexion et redirection vers `/login`

---

## 📝 Exemples d'utilisation

### Connexion

```jsx
const handleLogin = async () => {
  const result = await login({ email, password });
  
  if (result.success) {
    navigate('/dashboard');
  } else {
    setError(result.message);
  }
};
```

### Inscription

```jsx
const handleRegister = async () => {
  const result = await register({
    nom: 'Dupont',
    prenom: 'Jean',
    email: 'jean.dupont@cabinet.fr',
    password: 'Motdepasse123!',
    role: 'admin',
    cabinet: {
      nom: 'Cabinet Dupont',
      adresse: '123 Rue Test',
      telephone: '0123456789'
    }
  });
  
  if (result.success) {
    navigate('/dashboard');
  }
};
```

### Déconnexion

```jsx
const handleLogout = async () => {
  await logout();
  navigate('/login');
};
```

---

## 🧪 Tests manuels

### 1. Test de l'inscription
1. Lancer le frontend : `npm run dev`
2. Aller sur http://localhost:5173/register
3. Remplir le formulaire avec :
   - Prénom et nom
   - Email valide
   - Mot de passe (min 8 car, 1 maj, 1 chiffre)
   - Rôle : Admin
   - Nom du cabinet
4. Cliquer sur "Créer mon compte"
5. Vérifier la redirection vers `/dashboard`

### 2. Test de la connexion
1. Aller sur http://localhost:5173/login
2. Entrer l'email et le mot de passe créés
3. Cliquer sur "Se connecter"
4. Vérifier la redirection vers `/dashboard`

### 3. Test de la déconnexion
1. Sur le dashboard, cliquer sur "Déconnexion"
2. Vérifier la redirection vers `/login`

### 4. Test des routes protégées
1. Se déconnecter
2. Essayer d'accéder à http://localhost:5173/dashboard
3. Vérifier la redirection automatique vers `/login`

---

## 🐛 Dépannage

### Port déjà utilisé
Si le port 5173 est occupé, Vite proposera automatiquement un autre port.

### Erreur de connexion à l'API
Vérifier que :
1. Le backend est lancé sur http://localhost:5000
2. Le fichier `.env` contient la bonne `VITE_API_URL`

### Erreur CORS
Vérifier que le backend autorise les requêtes depuis `http://localhost:5173` (configuré dans `backend/src/app.js`)

### Token expiré
Le refresh automatique du token devrait gérer ce cas. Si problème :
1. Vider le localStorage (DevTools → Application → Local Storage)
2. Se reconnecter

---

## 📚 Prochaines fonctionnalités

- [ ] Page Dossiers (CRUD)
- [ ] Page Clients
- [ ] Page Documents
- [ ] Page Facturation
- [ ] Page Statistiques
- [ ] Page Paramètres
- [ ] Composants réutilisables (Modal, Table, etc.)

---

## 🎉 Résumé

✅ **Le frontend d'authentification est opérationnel !**

Vous disposez d'un frontend React moderne avec :
- Authentification complète (login, register, logout)
- Routes protégées
- Refresh automatique des tokens
- Design professionnel avec TailwindCSS
- Gestion des erreurs
- Validation des formulaires

**Prêt pour le développement des autres pages !** 🚀



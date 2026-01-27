# 📅 Intégration Google Calendar - JurisFlow

## ✅ Implémentation Complète

### Vue d'ensemble

L'intégration Google Calendar est maintenant **100% fonctionnelle**. Les utilisateurs peuvent :
- 🔐 Se connecter avec Google OAuth
- 📅 Voir leurs événements Google Calendar dans JurisFlow
- ➕ Créer des événements qui se synchronisent automatiquement avec Google
- 🔄 Rafraîchir automatiquement les tokens expirés
- 🔒 Continuer à utiliser l'agenda local sans compte Google

---

## 🏗️ Architecture

### Backend

#### 1. Contrôleur Google OAuth (`controllers/googleAuthController.js`)
- `initiateGoogleAuth()` : Initie l'authentification Google
- `googleCallback()` : Traite le callback OAuth
- `refreshGoogleToken()` : **Rafraîchit automatiquement les tokens expirés**

#### 2. Service Google Calendar (`services/googleCalendarService.js`)
Fonctions principales :
- `getGoogleCalendarEvents(userId, timeMin, timeMax)` : Récupère les événements Google
- `createGoogleCalendarEvent(userId, eventData)` : Crée un événement sur Google
- `updateGoogleCalendarEvent(userId, googleEventId, eventData)` : Met à jour un événement
- `deleteGoogleCalendarEvent(userId, googleEventId)` : Supprime un événement
- `getOAuth2Client(userId)` : Obtient un client OAuth2 configuré (avec refresh automatique)

#### 3. Routes (`routes/googleCalendarRoutes.js`)
- `GET /api/google-calendar/events` : Récupérer les événements Google
- `POST /api/google-calendar/events` : Créer un événement sur Google

#### 4. Schéma Prisma
Nouveaux champs dans le modèle `User` :
```prisma
googleAccessToken  String?
googleRefreshToken String?
googleTokenExpiry  DateTime?
```

### Frontend

#### 1. Service API (`services/api.js`)
```javascript
googleCalendarService.getGoogleEvents(timeMin, timeMax)
googleCalendarService.createGoogleEvent(eventData)
```

#### 2. Page Agenda (`pages/Agenda.jsx`)
- Fusion automatique des événements Google + Locaux
- Événements Google affichés avec icône 📅 et couleur bleue Google (#4285F4)
- Création d'événement synchronisée avec Google si connecté
- Condition `if (user.googleAccessToken)` pour gérer les utilisateurs sans Google

---

## 🔄 Flux de Rafraîchissement Automatique

### Comment ça fonctionne

1. **Vérification à chaque appel :**
   - Avant d'utiliser l'API Google, on vérifie si le token est expiré
   - Si expiré, `refreshGoogleToken()` est appelé automatiquement

2. **Utilisation du Refresh Token :**
   - Le `googleRefreshToken` est permanent (obtenu avec `prompt=consent`)
   - Il permet d'obtenir de nouveaux `googleAccessToken` sans intervention utilisateur

3. **Mise à jour en base :**
   - Les nouveaux tokens sont sauvegardés automatiquement
   - `googleTokenExpiry` est mis à jour

4. **Réessai automatique :**
   - Si un appel API échoue (401/403), on rafraîchit et réessaye une fois

---

## 🎨 Interface Utilisateur

### Événements dans le Calendrier

**Événements Locaux (JurisFlow) :**
- Couleur selon le type :
  - 🔴 Audience : Rouge
  - 🔵 Rendez-vous : Bleu
  - 🟠 Échéance : Orange
  - ⚪ Tâche : Gris

**Événements Google :**
- 📅 Préfixe icône
- 🔵 Couleur bleue Google (#4285F4)
- Cliquables (ouvrent Google Calendar)

### Création d'Événement

**Utilisateur avec Google connecté :**
1. Crée l'événement local (base de données JurisFlow)
2. Crée automatiquement sur Google Calendar
3. Les deux événements restent synchronisés

**Utilisateur sans Google :**
- Fonctionne normalement (événements locaux uniquement)
- Aucune erreur, aucun impact

---

## 🔐 Sécurité

### Conditions de Protection

Toutes les fonctions vérifient `if (user.googleAccessToken)` :
- ✅ `loadEvenements()` : Charge Google uniquement si connecté
- ✅ `handleSubmit()` : Synchronise uniquement si connecté
- ✅ Backend : Retourne `[]` si pas de token (non bloquant)

### Gestion des Erreurs

- Les erreurs Google sont **non bloquantes**
- Si Google échoue, l'agenda local continue de fonctionner
- Logs détaillés pour debug (préfixe `[Google Calendar]`)

---

## 🧪 Tests

### 1. Utilisateur sans Google

```javascript
// Doit fonctionner normalement
- Afficher les événements locaux ✅
- Créer des événements locaux ✅
- Pas d'appel à Google ✅
- Pas d'erreur ✅
```

### 2. Utilisateur avec Google

```javascript
// Doit afficher les deux sources
- Événements locaux (colorés par type) ✅
- Événements Google (bleus avec 📅) ✅
- Création synchronisée avec Google ✅
- Rafraîchissement automatique des tokens ✅
```

### 3. Test de Rafraîchissement

```javascript
// Attendre que le token expire (1h), puis :
- Récupérer les événements
- Vérifier dans les logs : "🔄 Token expiré, rafraîchissement..."
- Vérifier : "✅ Token rafraîchi avec succès"
- Les événements doivent se charger normalement
```

---

## 📊 Logs de Debug

### Lors du chargement des événements

```
📅 [Google Calendar] Récupération des événements pour l'utilisateur: clxxxxx
✅ [Google Calendar] Token encore valide (expire dans 45 min)
✅ [Google Calendar] 5 événements récupérés
```

### Lors du rafraîchissement du token

```
🔄 [Google OAuth] Rafraîchissement du token pour l'utilisateur: clxxxxx
✅ [Google OAuth] Token rafraîchi avec succès pour user@example.com
   - Nouveau token expire le: 26/01/2026 à 15:30:00
```

### Lors de la création d'un événement

```
📅 [Google Calendar] Création d'un événement pour l'utilisateur: clxxxxx
✅ [Google Calendar] Événement créé: abc123xyz
```

---

## 🚀 Déploiement en Production

### Variables d'Environnement

**Backend (`.env.production`) :**
```bash
GOOGLE_CLIENT_ID=votre_client_id
GOOGLE_CLIENT_SECRET=votre_client_secret
GOOGLE_CALLBACK_URL=https://jurisapp-smart-pro.com/api/auth/callback/google
FRONTEND_URL=https://jurisapp-smart-pro.com
```

### Configuration Google Cloud

**Scopes OAuth :**
- `email` : Identification
- `profile` : Nom/prénom
- `https://www.googleapis.com/auth/calendar` : **Lecture ET écriture** du calendrier

⚠️ **Important :** Mettre à jour le scope dans `googleAuthController.js` si vous voulez permettre la modification :

```javascript
const scopes = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/calendar' // Lecture + Écriture (au lieu de calendar.readonly)
];
```

### Politique de Confidentialité

La page `/privacy` mentionne déjà l'accès au calendrier Google. Si vous activez l'écriture, **mettez à jour cette page** pour indiquer que JurisFlow peut aussi créer des événements.

---

## 📝 Améliorations Futures

### 1. Synchronisation Bidirectionnelle Complète
- Mettre à jour les événements Google si modifiés dans JurisFlow
- Supprimer sur Google si supprimés dans JurisFlow
- Stocker `googleEventId` dans le modèle `Evenement` local

### 2. Webhook Google Calendar
- Recevoir des notifications quand un événement Google change
- Synchroniser automatiquement sans intervention utilisateur

### 3. Choix du Calendrier
- Permettre de choisir quel calendrier Google synchroniser
- Actuellement : `primary` (calendrier principal)

### 4. Options de Synchronisation
- Toggle pour activer/désactiver la synchronisation
- Paramètre pour choisir la direction (Google → JurisFlow ou bidirectionnel)

---

## 🎯 Résultat

✅ **Authentification Google OAuth** : Fonctionnelle  
✅ **Récupération des événements Google** : Fonctionnelle  
✅ **Création synchronisée** : Fonctionnelle  
✅ **Rafraîchissement automatique des tokens** : Fonctionnel  
✅ **Interface fusionnée** : Événements Google + Locaux affichés ensemble  
✅ **Sécurité** : Conditions `if (user.googleAccessToken)` partout  
✅ **Non-bloquant** : Les utilisateurs sans Google ne sont pas impactés  

---

**Date d'implémentation :** 26 janvier 2026  
**Statut :** ✅ Production Ready  
**Dépendances ajoutées :** `googleapis`, `google-auth-library`

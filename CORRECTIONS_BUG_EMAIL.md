# ✅ Corrections appliquées - Bug Email & Port

## 🎯 Problèmes identifiés et corrigés

### 1. Port dynamique non synchronisé
**Problème** : Le backend change de port dynamiquement (5087 → 50870) mais le frontend ne suit pas
**Solution** : 
- ✅ Correction du fallback dans `api.js` : `50870 → 5087`
- ✅ Création de `.env.example` pour le frontend avec documentation
- ✅ Mise à jour de `.env` pour pointer vers le port réel (`50870`)

### 2. Service Email centralisé
**Problème** : Suspicion de multiples configurations nodemailer
**Vérification** : 
- ✅ Le service email est déjà centralisé dans `backend/src/services/emailService.js`
- ✅ Tous les envois (inscription, reset password) utilisent la même fonction `sendEmail()`
- ✅ Aucune création manuelle de transporter dans les contrôleurs

### 3. Gestion d'erreur 500
**Problème** : L'échec d'envoi d'email cause une erreur 500 sur le frontend
**Solution** :
- ✅ Modification de `forgotPassword` pour retourner une erreur gracieuse
- ✅ Retourne maintenant un status 200 avec `success: false` au lieu de 500
- ✅ Message d'erreur générique pour ne pas révéler les détails techniques
- ✅ Logs détaillés en développement avec instructions pour le script alternatif

### 4. Configuration Gmail sécurisée
**Vérification** :
- ✅ `secure: false` déjà présent dans la configuration
- ✅ `tls: { rejectUnauthorized: false }` déjà configuré
- ✅ Variables d'environnement nettoyées avec `.trim()`

## 📡 État actuel de l'application

### Backend
- **Port** : `http://localhost:50870`
- **API** : `http://localhost:50870/api`
- **Health Check** : `http://localhost:50870/health`

### Frontend
- **Port** : `http://localhost:5173`
- **Configuration API** : `VITE_API_URL=http://localhost:50870/api`

## 🔧 Configuration Email

Le service email utilise une configuration centralisée dans `emailService.js` :

```javascript
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: emailUser,
    pass: emailPass,
  },
  tls: {
    rejectUnauthorized: false
  }
});
```

### Variables d'environnement requises (backend/.env)

```env
EMAIL_SERVICE=gmail
EMAIL_USER=ninisius@gmail.com
EMAIL_PASS=votre-mot-de-passe-application-16-caracteres
```

**Important** : `EMAIL_PASS` doit être un mot de passe d'application Gmail, pas votre mot de passe normal.

## 🚨 Si l'email échoue encore

### Cause probable : Authentification Gmail
L'erreur 535 (Authentication Failed) indique que Gmail rejette les identifiants.

### Solutions :

1. **Créer un nouveau mot de passe d'application** :
   - Allez sur https://myaccount.google.com/apppasswords
   - Créez un nouveau mot de passe pour "JurisFlow"
   - Copiez les 16 caractères (sans espaces)
   - Mettez à jour `EMAIL_PASS` dans `backend/.env`

2. **Utiliser le script de réinitialisation directe** :
   ```bash
   cd backend
   node scripts/resetPassword.js email@example.com NouveauMotDePasse123
   ```

3. **Tester la configuration email** :
   ```bash
   cd backend
   node scripts/testEmail.js
   ```

## 📝 Modifications de code

### 1. `frontend/src/services/api.js`
```javascript
// Avant
return 'http://localhost:50870/api';

// Après
return 'http://localhost:5087/api';
```

### 2. `backend/src/controllers/authController.js`
```javascript
// Gestion d'erreur améliorée
return res.status(200).json({
  success: false,
  message: 'Erreur technique lors de l\'envoi de l\'email. Veuillez réessayer plus tard.'
});
```

### 3. Nouveaux fichiers créés
- `frontend/.env.example` - Exemple de configuration avec documentation
- `CORRECTIONS_BUG_EMAIL.md` - Ce document

## ✅ Tests recommandés

1. **Test de l'inscription** :
   - Créer un nouveau compte
   - Vérifier la réception de l'email de bienvenue

2. **Test du mot de passe oublié** :
   - Demander une réinitialisation
   - Vérifier les logs pour voir les messages de débogage
   - Utiliser le script alternatif si l'email échoue

3. **Test du frontend** :
   - Vérifier que les requêtes vont bien vers `http://localhost:50870/api`
   - Vérifier qu'il n'y a plus d'erreur de CORS ou de connexion

## 📊 Logs

Pour suivre les logs en temps réel :
```bash
# Backend
tail -f /tmp/jurisflow-backend.log

# Frontend
tail -f /tmp/jurisflow-frontend.log

# Ou utiliser le script interactif
cd jurisflow
./view-logs.sh
```

Les logs afficheront maintenant :
- Configuration email détectée (user, longueur du mot de passe)
- Tentatives d'envoi d'email
- Erreurs détaillées si problème
- Instructions pour le script alternatif

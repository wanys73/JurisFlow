# Configuration Email - JurisFlow

Ce document explique comment configurer le service d'email pour JurisFlow.

## Variables d'environnement requises

Ajoutez les variables suivantes dans votre fichier `.env` :

```env
# Configuration Email (Nodemailer)
EMAIL_SERVICE=gmail
EMAIL_USER=votre-email@gmail.com
EMAIL_PASS=votre-mot-de-passe-application

# URL du frontend (pour les liens de confirmation)
FRONTEND_URL=http://localhost:5173
```

## Configuration Gmail

### Option 1 : Mot de passe d'application (Recommandé)

1. Activez la validation en 2 étapes sur votre compte Google
2. Allez dans [Paramètres de sécurité Google](https://myaccount.google.com/security)
3. Créez un "Mot de passe d'application"
4. Utilisez ce mot de passe dans `EMAIL_PASS`

### Option 2 : OAuth2 (Avancé)

Pour une configuration OAuth2, modifiez `emailService.js` pour utiliser OAuth2 au lieu d'un mot de passe.

## Configuration SendGrid (Alternative)

Si vous préférez utiliser SendGrid :

```env
EMAIL_SERVICE=smtp
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=votre-clé-api-sendgrid
```

Puis modifiez `emailService.js` pour utiliser la configuration SMTP.

## Configuration Mailgun (Alternative)

```env
EMAIL_SERVICE=smtp
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=postmaster@votre-domaine.mailgun.org
EMAIL_PASS=votre-clé-api-mailgun
```

## Test de la configuration

Pour tester la configuration, vous pouvez créer un endpoint de test temporaire dans `app.js` :

```javascript
app.post('/api/test-email', async (req, res) => {
  try {
    await sendVerificationEmail('test@example.com', 'test-token', 'Test User');
    res.json({ success: true, message: 'Email envoyé avec succès' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

## Emails envoyés par l'application

1. **Email de confirmation d'inscription** : Envoyé lors de l'inscription d'un nouvel utilisateur
2. **Email de rappel d'événement** : Envoyé 48h avant un événement du calendrier

## Notes importantes

- Les emails sont envoyés en HTML avec un design professionnel
- Les emails de confirmation contiennent un lien unique valide pour activer le compte
- Les rappels d'événements sont envoyés automatiquement via un job cron (tous les jours à 8h00)


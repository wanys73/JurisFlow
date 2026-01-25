# 🔐 Guide : Créer un Mot de Passe d'Application Gmail

Pour que JurisFlow puisse envoyer des emails via Gmail, vous devez créer un **mot de passe d'application** (App Password) et non utiliser votre mot de passe Gmail normal.

## 📋 Étapes pour créer un mot de passe d'application Gmail

### Étape 1 : Activer la validation en 2 étapes

1. Allez sur [Votre compte Google](https://myaccount.google.com/)
2. Cliquez sur **Sécurité** dans le menu de gauche
3. Dans la section "Connexion à Google", vérifiez que la **Validation en 2 étapes** est activée
   - Si elle n'est pas activée, cliquez dessus et suivez les instructions pour l'activer

### Étape 2 : Créer un mot de passe d'application

1. Toujours dans la section **Sécurité** de votre compte Google
2. Faites défiler jusqu'à la section "Connexion à Google"
3. Cliquez sur **Mots de passe des applications** (ou "App passwords" en anglais)
4. Si vous ne voyez pas cette option :
   - Assurez-vous que la validation en 2 étapes est bien activée
   - Vous devrez peut-être vous authentifier à nouveau
5. Sélectionnez **Autre (nom personnalisé)** dans le menu déroulant
6. Entrez un nom descriptif, par exemple : **"JurisFlow Application"**
7. Cliquez sur **Générer**
8. **IMPORTANT** : Google vous affichera un mot de passe de 16 caractères (sans espaces)
   - Exemple : `abcd efgh ijkl mnop` (mais sans les espaces)
   - **Copiez ce mot de passe immédiatement**, vous ne pourrez plus le voir après !

### Étape 3 : Configurer le fichier .env

Ouvrez le fichier `/backend/.env` et ajoutez/modifiez ces lignes :

```env
# Configuration Email Gmail
EMAIL_SERVICE=gmail
EMAIL_USER=ninisius@gmail.com
EMAIL_PASS=votre-mot-de-passe-application-16-caracteres
```

**Remplacez** `votre-mot-de-passe-application-16-caracteres` par le mot de passe de 16 caractères que vous avez copié à l'étape 2.

### Exemple complet dans .env :

```env
EMAIL_SERVICE=gmail
EMAIL_USER=ninisius@gmail.com
EMAIL_PASS=abcdefghijklmnop
```

⚠️ **Important** :
- Ne mettez **PAS** d'espaces dans le mot de passe
- Ne mettez **PAS** de guillemets autour du mot de passe
- Le mot de passe fait exactement 16 caractères (sans espaces)

## ✅ Vérification

Après avoir configuré le `.env`, redémarrez le backend :

```bash
cd jurisflow
./STOP.sh
./START.sh
```

Les emails devraient maintenant fonctionner ! 🎉

## 🔗 Liens utiles

- [Paramètres de sécurité Google](https://myaccount.google.com/security)
- [Mots de passe des applications Google](https://myaccount.google.com/apppasswords)

## ❓ Problèmes courants

### "Mots de passe des applications" n'apparaît pas
- Vérifiez que la validation en 2 étapes est bien activée
- Vous devrez peut-être vous authentifier à nouveau sur votre compte Google

### Erreur "Invalid login" après configuration
- Vérifiez que vous avez copié le mot de passe sans espaces
- Vérifiez que vous n'avez pas mis de guillemets dans le `.env`
- Assurez-vous que `EMAIL_USER` contient bien `ninisius@gmail.com` (sans espaces)

### Le mot de passe ne fonctionne plus
- Les mots de passe d'application peuvent être révoqués
- Créez-en un nouveau et mettez à jour le `.env`

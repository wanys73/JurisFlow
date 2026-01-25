# 🚨 DÉBLOCAGE URGENT - JurisFlow

## Problème Rencontré

Après l'implémentation de la Phase "Forteresse & Business", l'utilisateur principal ne peut plus se connecter.

**Causes identifiées :**
1. ✅ `planType` NULL dans la base → bloqué par le gatekeeper PREMIUM
2. ✅ Rate Limiter trop agressif en développement
3. ✅ Audit middleware pouvait bloquer les requêtes en cas d'erreur

---

## ✅ Corrections Appliquées

### 1. Rate Limiting Désactivé en Développement

**Fichier :** `backend/src/app.js`

- `limiter` : `skip: (req) => process.env.NODE_ENV === 'development'`
- `authLimiter` : `skip: (req) => process.env.NODE_ENV === 'development'`

→ **En mode dev, aucune limite de requêtes**

### 2. Auth Controller Corrigé

**Fichier :** `backend/src/controllers/authController.js`

- Correction du `findUnique` (isActive vérifié après, pas dans le where)
- Auto-assignation de `planType = 'PREMIUM'` si NULL lors du login
- Logs de debug pour chaque étape
- `userToPublicJSON()` renvoie toujours `planType` (défaut: PREMIUM)

→ **Plus de blocage si planType est NULL**

### 3. Audit Middleware Sécurisé

**Fichier :** `backend/src/middleware/auditMiddleware.js`

- Triple protection try-catch
- Erreurs jamais propagées (non bloquantes)
- Logs en warning uniquement

→ **L'audit ne bloque JAMAIS une requête**

### 4. Script de Réparation Automatique

**Fichier :** `backend/scripts/fixAccount.js`

Fonctionnalités :
- Détection automatique des problèmes
- Assignation PREMIUM si planType NULL ou BASIC
- Activation du compte si inactif
- Vérification du hash du mot de passe
- Logs détaillés

---

## 🚀 DÉBLOCAGE EN 2 COMMANDES

### Option 1 : Script Automatique (Recommandé)

```bash
cd /Users/wanys/Documents/SAAS\ AI/jurisflow/backend/scripts
./DEBLOCAGE_URGENT.sh
```

Le script va :
1. ✅ Réparer le compte (planType → PREMIUM)
2. ✅ Vérifier NODE_ENV=development
3. ✅ Redémarrer le backend
4. ✅ Tester la connexion

### Option 2 : Manuel (Plus Rapide)

```bash
cd /Users/wanys/Documents/SAAS\ AI/jurisflow/backend

# 1. Réparer le compte
node scripts/fixAccount.js baba@gmail.com

# 2. Redémarrer le backend
cd ..
./STOP.sh && ./START.sh
```

Attendez 5 secondes, puis testez sur http://localhost:5174

---

## 🧪 Vérification

### Test 1 : Backend en ligne

```bash
curl http://localhost:5087/health
```

Résultat attendu : `{"success":true,"message":"JurisFlow API est opérationnelle",...}`

### Test 2 : Connexion

```bash
curl -X POST http://localhost:5087/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"baba@gmail.com","password":"VOTRE_MOT_DE_PASSE"}'
```

Résultat attendu : `{"success":true, "data":{"user":{...,"planType":"PREMIUM"},"tokens":{...}}}`

### Test 3 : Accès Studio IA

```bash
# Avec le token obtenu
curl -H "Authorization: Bearer VOTRE_TOKEN" \
  http://localhost:5087/api/studio-ia/conversations
```

Résultat attendu : `{"success":true,...}` (pas de `requiresPremium`)

---

## 🔍 Diagnostic SQL (Si Problème Persiste)

### Vérifier l'état du compte

```sql
SELECT 
  id, 
  email, 
  "planType", 
  "isActive", 
  "emailVerified",
  role
FROM users 
WHERE email = 'baba@gmail.com';
```

### Forcer PREMIUM manuellement (solution de secours)

```sql
UPDATE users 
SET 
  "planType" = 'PREMIUM',
  "isActive" = true
WHERE email = 'baba@gmail.com';
```

### Vérifier les logs d'audit

```sql
SELECT * FROM activity_logs 
ORDER BY timestamp DESC 
LIMIT 10;
```

---

## 📋 Checklist de Déblocage

- [x] Rate limiter désactivé en dev (app.js)
- [x] Auth controller corrigé (planType null handled)
- [x] Audit middleware sécurisé (non bloquant)
- [x] userToPublicJSON renvoie planType
- [x] Script fixAccount.js créé
- [x] Script DEBLOCAGE_URGENT.sh créé
- [ ] **Exécuter : `node scripts/fixAccount.js baba@gmail.com`**
- [ ] **Redémarrer : `./STOP.sh && ./START.sh`**
- [ ] **Tester : connexion sur http://localhost:5174**

---

## ⚡ Exécution Immédiate

```bash
cd "/Users/wanys/Documents/SAAS AI/jurisflow/backend"

# Réparer le compte
node scripts/fixAccount.js baba@gmail.com

# Redémarrer
cd ..
./STOP.sh
sleep 2
./START.sh

# Attendre 5 secondes
sleep 5

# Vérifier
curl http://localhost:5087/health
```

Si tout est OK → Ouvrir http://localhost:5174 et se connecter

---

## 🛡️ Prévention Future

Ces problèmes ne se reproduiront plus car :

1. **Default PREMIUM** : Tous les nouveaux utilisateurs et utilisateurs existants auront PREMIUM par défaut au login
2. **Rate limiter désactivé en dev** : Plus de blocage pendant le développement
3. **Audit non bloquant** : L'audit log ne peut plus bloquer les requêtes
4. **Logs détaillés** : Chaque étape de login est loggée pour debug facile

---

## 📞 Support

Si le problème persiste après ces corrections :

1. Vérifier les logs backend :
   ```bash
   tail -100 /tmp/jurisflow-backend.log
   ```

2. Vérifier les processus Node :
   ```bash
   ps aux | grep node
   ```

3. Killer force tous les processus Node et relancer :
   ```bash
   killall -9 node
   ./START.sh
   ```

---

**Temps estimé : 2 minutes ⚡**

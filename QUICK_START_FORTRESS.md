# 🚀 Quick Start - Phase Forteresse & Business

## ✅ Tous les fichiers ont été créés et intégrés

La Phase "Forteresse & Business" est **100% implémentée**. Voici comment la déployer et la tester.

---

## 1️⃣ Appliquer les modifications en base de données

```bash
cd /Users/wanys/Documents/SAAS\ AI/jurisflow/backend

# Générer le client Prisma avec les nouveaux modèles
npx prisma generate

# Pousser le schema vers Supabase
npx prisma db push

# Vérifier que tout est OK
npx prisma studio
```

**Ce qui a été ajouté dans la base :**
- Table `activity_logs` (audit trail)
- Enum `PlanType` (BASIC, PREMIUM)
- Colonne `planType` sur `users`
- Colonne `dateEcheance` sur `dossiers`

---

## 2️⃣ Redémarrer le backend

```bash
cd /Users/wanys/Documents/SAAS\ AI/jurisflow

# Arrêter l'ancien backend
./STOP.sh

# Redémarrer avec les nouveaux middlewares
./START.sh

# Vérifier que le serveur est bien lancé
curl http://localhost:5087/health
```

Le backend inclut maintenant :
- ✅ Middleware d'audit (trace CREATE/UPDATE/DELETE)
- ✅ Gatekeeper PREMIUM sur Studio IA
- ✅ Route `/api/dossiers/urgent`

---

## 3️⃣ Tester les fonctionnalités

### Option A : Script automatisé

```bash
cd /Users/wanys/Documents/SAAS\ AI/jurisflow
./TEST_FORTRESS.sh
```

Le script va :
1. Se connecter avec vos identifiants
2. Vérifier votre plan (BASIC ou PREMIUM)
3. Tester le gatekeeper Studio IA
4. Récupérer les dossiers urgents
5. Créer un dossier (test audit log)

### Option B : Tests manuels

#### 🔐 Test Gatekeeper PREMIUM

**Si votre compte est BASIC :**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5087/api/studio-ia/conversations
```
→ Résultat attendu : **403 Forbidden** avec message "⭐ Cette fonctionnalité est réservée aux utilisateurs PREMIUM"

**Pour passer en PREMIUM (test) :**
```sql
-- Via Prisma Studio ou directement en SQL
UPDATE users 
SET "planType" = 'PREMIUM' 
WHERE email = 'votre@email.com';
```

Réessayez la requête → devrait fonctionner ✅

#### 📅 Test Dossiers Urgents

**Créer un dossier avec échéance :**
```bash
curl -X POST http://localhost:5087/api/dossiers \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Affaire urgente",
    "description": "Test échéance",
    "statut": "Ouvert",
    "dateEcheance": "2026-02-10T00:00:00.000Z"
  }'
```

**Récupérer les dossiers urgents :**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5087/api/dossiers/urgent
```

→ Résultat attendu : JSON avec le dossier, `daysRemaining`, `urgencyLevel`

#### 📝 Test Audit Log

Après avoir créé/modifié/supprimé un dossier :

```sql
-- Via Prisma Studio ou SQL
SELECT * FROM activity_logs 
ORDER BY timestamp DESC 
LIMIT 10;
```

→ Résultat attendu : entrées avec `action` (CREATE/UPDATE/DELETE), `target` (Dossier), `userId`, `metadata` (IP, User-Agent)

---

## 4️⃣ Intégrer le widget Urgences au Dashboard

**Fichier à modifier :** `frontend/src/pages/Dashboard.jsx`

```jsx
// Ajouter l'import en haut du fichier
import UrgentDossiersWidget from '../components/UrgentDossiersWidget';

// Dans le JSX, ajouter le widget (en premier dans le grid) :
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* Widget Urgences - Prend toute la largeur */}
  <div className="lg:col-span-3">
    <UrgentDossiersWidget />
  </div>

  {/* Autres widgets existants */}
  {/* ... */}
</div>
```

Relancez le frontend :
```bash
cd frontend
npm run dev
```

Ouvrez http://localhost:5174 → Le widget des dossiers urgents devrait apparaître ✅

---

## 5️⃣ Vérifier l'intégration Premium dans le frontend

Les fichiers suivants sont prêts à l'emploi :

- `src/services/planService.js` : vérifier le plan utilisateur
- `src/components/PremiumBadge.jsx` : badge "⭐ PRO"

**Exemple d'utilisation dans un composant :**

```jsx
import { useAuth } from '../context/AuthContext';
import { isPremiumUser, checkPremiumAccess } from '../services/planService';
import PremiumBadge from '../components/PremiumBadge';

const MonComposant = () => {
  const { user } = useAuth();
  const premiumCheck = checkPremiumAccess(user, 'Studio IA');

  const handleStudioIA = () => {
    if (!premiumCheck.hasAccess) {
      alert(premiumCheck.message);
      // Rediriger vers /upgrade
      return;
    }
    // Action autorisée
  };

  return (
    <button onClick={handleStudioIA}>
      Studio IA
      {!isPremiumUser(user) && <PremiumBadge inline />}
    </button>
  );
};
```

---

## 🎯 Checklist Validation

- [ ] Base de données mise à jour (Prisma push OK)
- [ ] Backend redémarré (STOP + START)
- [ ] Route `/health` répond
- [ ] Test gatekeeper : BASIC bloqué sur Studio IA
- [ ] Test gatekeeper : PREMIUM accède au Studio IA
- [ ] Route `/api/dossiers/urgent` fonctionne
- [ ] Widget `UrgentDossiersWidget` affiché dans Dashboard
- [ ] Audit log : entrées créées lors des actions CREATE/UPDATE/DELETE
- [ ] Badge "⭐ PRO" s'affiche sur les features premium

---

## 📚 Documentation Complète

- **Implémentation détaillée :** `FORTRESS_IMPLEMENTATION.md`
- **Tests automatisés :** `./TEST_FORTRESS.sh`
- **Politiques RLS :** `backend/prisma/rls-policies.sql`

---

## 🐛 Troubleshooting

### Erreur : "Table activity_logs does not exist"

```bash
cd backend
npx prisma db push --force-reset
# ⚠️ ATTENTION : reset la DB ! À utiliser uniquement en dev
```

### Erreur : "Column planType does not exist"

Même solution que ci-dessus, ou manuellement :

```sql
ALTER TABLE users ADD COLUMN "planType" TEXT DEFAULT 'BASIC';
```

### Widget vide : "Aucun dossier urgent"

C'est normal si vous n'avez pas de dossiers avec `dateEcheance` < 30 jours.  
Créez un dossier test :

```sql
UPDATE dossiers 
SET "dateEcheance" = NOW() + INTERVAL '10 days'
WHERE id = 'ID_DOSSIER_EXISTANT';
```

### Studio IA accessible alors que BASIC

Vérifier que le middleware est bien appliqué :

```bash
# Dans backend/src/routes/conversationRoutes.js
# Doit contenir :
router.use(trackPremiumAttempt);
router.use(requirePremium);
```

Redémarrer le backend après modification.

---

## 🎉 C'est terminé !

La Phase "Forteresse & Business" est maintenant active sur JurisFlow.

**Prochaines étapes (V2) :**
- Intégration Stripe pour les paiements
- Notifications par email/SMS pour les échéances
- Activation complète de Row Level Security (RLS)
- Dashboard analytics des conversions BASIC → PREMIUM

---

**Questions ?** Consultez `FORTRESS_IMPLEMENTATION.md` pour plus de détails techniques.

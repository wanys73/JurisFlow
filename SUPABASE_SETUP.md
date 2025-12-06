# 🔧 Configuration Supabase Storage - Instructions Urgentes

## Problème Actuel
Le logo est uploadé mais n'est pas accessible car le bucket Supabase n'est pas correctement configuré.

## ✅ Solution : Configurer le bucket "documents" comme PUBLIC

### Étape 1 : Accéder à votre projet Supabase
1. Allez sur https://supabase.com
2. Connectez-vous
3. Ouvrez votre projet : `nfkdywcpcyrhzdnwexol`

### Étape 2 : Vérifier/Créer le bucket
1. Dans le menu latéral gauche, cliquez sur **"Storage"**
2. Vous devriez voir un bucket nommé `documents`
3. **Si le bucket n'existe pas** :
   - Cliquez sur **"New bucket"**
   - Nom : `documents`
   - **IMPORTANT : Cochez "Public bucket"** ✅
   - Cliquez sur **"Create bucket"**

### Étape 3 : Rendre le bucket PUBLIC (si déjà existant)
1. Dans la liste des buckets, cliquez sur **`documents`**
2. Cliquez sur l'icône "Settings" (⚙️) ou "Configuration"
3. Dans la section "Public access", **activez "Public bucket"**
4. Cliquez sur **"Save"**

### Étape 4 : Configurer les politiques d'accès (RLS)
1. Toujours dans les paramètres du bucket `documents`
2. Allez dans l'onglet **"Policies"**
3. Cliquez sur **"New Policy"**
4. Sélectionnez **"For full customization"**
5. Créez 2 politiques :

#### Politique 1 : Lecture publique (SELECT)
```sql
Policy name: Public Access - Read
Allowed operation: SELECT
Policy definition:
  (bucket_id = 'documents')
```

#### Politique 2 : Upload/Update/Delete pour utilisateurs authentifiés
```sql
Policy name: Authenticated Users - All
Allowed operation: ALL
Policy definition:
  (bucket_id = 'documents' AND auth.role() = 'authenticated')
```

### Étape 5 : Tester l'accès
Une fois configuré, testez cette URL dans votre navigateur :
```
https://nfkdywcpcyrhzdnwexol.supabase.co/storage/v1/object/public/documents/cabinet/logos/3374cdf8f31b5fe32ff27e2f224f21f0.png
```

✅ **Résultat attendu** : L'image du logo devrait s'afficher
❌ **Si erreur** : Vérifiez que le bucket est bien public

### Étape 6 : Re-uploader le logo
1. Une fois le bucket configuré, allez dans l'application
2. **Paramètres** > **Cabinet** > Section "Visuel"
3. **Re-uploadez le logo**
4. Cliquez sur **"Enregistrer les modifications"**
5. Générez une nouvelle facture PDF
6. **Le logo devrait maintenant apparaître** 🎉

## 🔍 Vérification rapide

Pour vérifier si tout fonctionne, exécutez cette commande dans un terminal :

```bash
curl -I "https://nfkdywcpcyrhzdnwexol.supabase.co/storage/v1/object/public/documents/cabinet/logos/3374cdf8f31b5fe32ff27e2f224f21f0.png"
```

✅ **Bon résultat** : `HTTP/2 200` (l'image est accessible)
❌ **Mauvais résultat** : `HTTP/2 404` ou `400` (bucket non public)

## 📞 Besoin d'aide ?

Si vous avez des difficultés, dites-moi à quelle étape vous bloquez et je vous guiderai.


import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Charger les variables d'environnement
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, 'backend', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans .env');
  process.exit(1);
}

console.log('🔧 Configuration Supabase Storage');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorage() {
  try {
    console.log('\n📦 Étape 1: Vérification des buckets...');
    
    // Lister les buckets existants
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Erreur lors de la liste des buckets:', listError);
      throw listError;
    }
    
    console.log('Buckets existants:', buckets.map(b => b.name).join(', '));
    
    // Vérifier si le bucket 'documents' existe
    let documentsBucket = buckets.find(b => b.name === 'documents');
    
    if (!documentsBucket) {
      console.log('\n📦 Étape 2: Création du bucket "documents"...');
      
      const { data, error } = await supabase.storage.createBucket('documents', {
        public: true,
        fileSizeLimit: 52428800, // 50 MB
        allowedMimeTypes: [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
      });
      
      if (error) {
        console.error('❌ Erreur lors de la création du bucket:', error);
        throw error;
      }
      
      console.log('✅ Bucket "documents" créé avec succès');
      documentsBucket = { name: 'documents', public: true };
    } else {
      console.log('✅ Bucket "documents" existe déjà');
      
      // Vérifier s'il est public
      if (!documentsBucket.public) {
        console.log('⚠️  Le bucket existe mais n\'est PAS public');
        console.log('📝 Mise à jour du bucket pour le rendre public...');
        
        const { data, error } = await supabase.storage.updateBucket('documents', {
          public: true
        });
        
        if (error) {
          console.error('❌ Erreur lors de la mise à jour:', error);
        } else {
          console.log('✅ Bucket mis à jour avec succès (maintenant public)');
        }
      } else {
        console.log('✅ Le bucket est déjà public');
      }
    }
    
    console.log('\n🔐 Étape 3: Configuration des politiques RLS...');
    
    // Note: Les politiques RLS pour Storage doivent être configurées via l'interface Supabase
    // ou via des requêtes SQL directes car l'API JS ne les supporte pas directement
    
    console.log('⚠️  Les politiques RLS doivent être configurées manuellement via l\'interface Supabase:');
    console.log('   1. Allez sur https://supabase.com');
    console.log('   2. Storage > documents > Policies');
    console.log('   3. Créez une politique "Public Read" pour SELECT');
    console.log('   4. Créez une politique "Authenticated All" pour ALL operations');
    
    console.log('\n✅ Configuration terminée !');
    console.log('\n🧪 Test de l\'URL du logo:');
    console.log('https://nfkdywcpcyrhzdnwexol.supabase.co/storage/v1/object/public/documents/cabinet/logos/3374cdf8f31b5fe32ff27e2f224f21f0.png');
    
  } catch (error) {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  }
}

setupStorage();


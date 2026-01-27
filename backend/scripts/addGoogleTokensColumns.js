import { prisma } from '../src/lib/prisma.js';

/**
 * Script pour ajouter les colonnes Google OAuth directement en base
 * Contourne les problèmes de Prisma migrate/push timeout
 */

const addGoogleTokensColumns = async () => {
  try {
    console.log('🔧 Ajout des colonnes Google OAuth à la table users...\n');

    // 1. Ajouter googleAccessToken
    console.log('1️⃣ Ajout de la colonne googleAccessToken...');
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "googleAccessToken" TEXT;
      `);
      console.log('✅ Colonne googleAccessToken ajoutée');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Colonne googleAccessToken existe déjà');
      } else {
        throw error;
      }
    }

    // 2. Ajouter googleRefreshToken
    console.log('\n2️⃣ Ajout de la colonne googleRefreshToken...');
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "googleRefreshToken" TEXT;
      `);
      console.log('✅ Colonne googleRefreshToken ajoutée');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Colonne googleRefreshToken existe déjà');
      } else {
        throw error;
      }
    }

    // 3. Ajouter googleTokenExpiry
    console.log('\n3️⃣ Ajout de la colonne googleTokenExpiry...');
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "googleTokenExpiry" TIMESTAMP(3);
      `);
      console.log('✅ Colonne googleTokenExpiry ajoutée');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Colonne googleTokenExpiry existe déjà');
      } else {
        throw error;
      }
    }

    // 4. Vérification finale
    console.log('\n4️⃣ Vérification finale...\n');
    
    const columns = await prisma.$queryRawUnsafe(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('googleAccessToken', 'googleRefreshToken', 'googleTokenExpiry')
      ORDER BY column_name;
    `);

    console.log('📋 Colonnes Google OAuth présentes dans la table users:');
    columns.forEach(col => {
      console.log(`   ✅ ${col.column_name}`);
    });

    if (columns.length === 3) {
      console.log('\n✅ TOUTES LES COLONNES GOOGLE OAUTH ONT ÉTÉ AJOUTÉES AVEC SUCCÈS\n');
      console.log('Vous pouvez maintenant :');
      console.log('  1. Générer le client Prisma : npx prisma generate');
      console.log('  2. Redémarrer le backend');
      console.log('  3. Tester l\'authentification Google OAuth');
      console.log('');
    } else {
      console.log(`\n⚠️  Seulement ${columns.length}/3 colonnes trouvées`);
    }

  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout des colonnes:', error);
    console.error('Message:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

addGoogleTokensColumns();

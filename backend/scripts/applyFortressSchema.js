import { prisma } from '../src/lib/prisma.js';

/**
 * Script pour appliquer directement le schema Fortress en base
 * Contourne les problèmes de Prisma migrate/push
 */

const applySchema = async () => {
  try {
    console.log('🔧 Application du schema Fortress en base de données...\n');

    // 1. Créer l'enum PlanType
    console.log('1️⃣ Création de l\'enum PlanType...');
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TYPE "PlanType" AS ENUM ('BASIC', 'PREMIUM');
      `);
      console.log('✅ Enum PlanType créé');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Enum PlanType existe déjà');
      } else {
        throw error;
      }
    }

    // 2. Ajouter la colonne planType à users
    console.log('\n2️⃣ Ajout de la colonne planType à users...');
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE users ADD COLUMN "planType" "PlanType" DEFAULT 'BASIC';
      `);
      console.log('✅ Colonne planType ajoutée');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Colonne planType existe déjà');
      } else {
        throw error;
      }
    }

    // 3. Mettre tous les utilisateurs existants en PREMIUM
    console.log('\n3️⃣ Mise à jour des utilisateurs existants vers PREMIUM...');
    const updateResult = await prisma.$executeRawUnsafe(`
      UPDATE users 
      SET "planType" = 'PREMIUM' 
      WHERE "planType" IS NULL OR "planType" = 'BASIC';
    `);
    console.log(`✅ ${updateResult} utilisateur(s) mis à jour vers PREMIUM`);

    // 4. Ajouter la colonne dateEcheance à dossiers
    console.log('\n4️⃣ Ajout de la colonne dateEcheance à dossiers...');
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE dossiers ADD COLUMN "dateEcheance" TIMESTAMP(3);
      `);
      console.log('✅ Colonne dateEcheance ajoutée');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Colonne dateEcheance existe déjà');
      } else {
        throw error;
      }
    }

    // 5. Créer la table activity_logs
    console.log('\n5️⃣ Création de la table activity_logs...');
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS activity_logs (
          id TEXT PRIMARY KEY,
          action TEXT NOT NULL,
          target TEXT NOT NULL,
          "targetId" TEXT,
          "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          metadata JSONB,
          timestamp TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Table activity_logs créée');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Table activity_logs existe déjà');
      } else {
        throw error;
      }
    }

    // 6. Créer les index sur activity_logs
    console.log('\n6️⃣ Création des index sur activity_logs...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS activity_logs_userId_idx ON activity_logs("userId");',
      'CREATE INDEX IF NOT EXISTS activity_logs_action_idx ON activity_logs(action);',
      'CREATE INDEX IF NOT EXISTS activity_logs_target_idx ON activity_logs(target);',
      'CREATE INDEX IF NOT EXISTS activity_logs_timestamp_idx ON activity_logs(timestamp);'
    ];

    for (const indexSQL of indexes) {
      try {
        await prisma.$executeRawUnsafe(indexSQL);
      } catch (error) {
        // Les index qui existent déjà sont ignorés (IF NOT EXISTS)
      }
    }
    console.log('✅ Index créés');

    // 7. Vérification finale
    console.log('\n7️⃣ Vérification finale...\n');
    
    const users = await prisma.$queryRawUnsafe(`
      SELECT 
        id, 
        email, 
        "planType", 
        "isActive"
      FROM users 
      LIMIT 5;
    `);

    console.log('👥 Utilisateurs (échantillon) :');
    users.forEach(u => {
      console.log(`   - ${u.email}: Plan ${u.planType}, Actif: ${u.isActive}`);
    });

    const dossiersCount = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count 
      FROM dossiers 
      WHERE "dateEcheance" IS NOT NULL;
    `);
    console.log(`\n📅 Dossiers avec échéance : ${dossiersCount[0].count}`);

    console.log('\n✅ SCHEMA FORTRESS APPLIQUÉ AVEC SUCCÈS\n');
    console.log('Vous pouvez maintenant :');
    console.log('  1. Redémarrer le backend : ./STOP.sh && ./START.sh');
    console.log('  2. Vous connecter normalement');
    console.log('  3. Accéder au Studio IA (tous les comptes sont PREMIUM)');
    console.log('');

  } catch (error) {
    console.error('❌ Erreur lors de l\'application du schema:', error);
    console.error('Message:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

applySchema();

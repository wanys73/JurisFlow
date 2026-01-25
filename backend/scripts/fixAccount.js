import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcrypt';

/**
 * Script de réparation du compte admin
 * Usage: node scripts/fixAccount.js <email>
 */

const fixAccount = async (email) => {
  try {
    console.log(`🔧 Recherche du compte: ${email}`);

    // Rechercher l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.error(`❌ Aucun compte trouvé pour: ${email}`);
      process.exit(1);
    }

    console.log(`✅ Compte trouvé: ${user.id}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Nom: ${user.prenom} ${user.nom}`);
    console.log(`   - Plan actuel: ${user.planType || 'NULL'}`);
    console.log(`   - Role: ${user.role}`);

    // Préparer les mises à jour
    const updates = {};

    // 1. Assigner PREMIUM si planType est null ou BASIC
    if (!user.planType || user.planType === 'BASIC') {
      updates.planType = 'PREMIUM';
      console.log(`🔄 Mise à jour planType: ${user.planType || 'NULL'} → PREMIUM`);
    }

    // 2. S'assurer que le compte est actif
    if (!user.isActive) {
      updates.isActive = true;
      console.log(`🔄 Activation du compte`);
    }

    // 3. Appliquer les mises à jour
    if (Object.keys(updates).length > 0) {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: updates
      });
      console.log(`✅ Compte mis à jour avec succès`);
      console.log(`   - Plan: ${updatedUser.planType}`);
      console.log(`   - Actif: ${updatedUser.isActive}`);
    } else {
      console.log(`✅ Aucune mise à jour nécessaire`);
    }

    // 4. Vérifier l'intégrité du mot de passe
    console.log(`🔐 Vérification du hash du mot de passe...`);
    const isValidHash = user.password && user.password.startsWith('$2');
    if (!isValidHash) {
      console.warn(`⚠️  Le hash du mot de passe semble invalide`);
      console.log(`   Si vous avez oublié votre mot de passe, utilisez la fonction de réinitialisation`);
    } else {
      console.log(`✅ Hash du mot de passe valide`);
    }

    console.log(`\n✅ RÉPARATION TERMINÉE`);
    console.log(`   Vous pouvez maintenant vous connecter avec: ${email}`);
    console.log(`   Plan: PREMIUM (accès complet au Studio IA)`);

  } catch (error) {
    console.error(`❌ Erreur lors de la réparation:`, error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

// Récupérer l'email depuis les arguments
const email = process.argv[2];

if (!email) {
  console.error(`❌ Usage: node scripts/fixAccount.js <email>`);
  console.error(`   Exemple: node scripts/fixAccount.js baba@gmail.com`);
  process.exit(1);
}

fixAccount(email);

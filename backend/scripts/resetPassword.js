import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const prisma = new PrismaClient();

async function resetPassword() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('❌ Usage: node scripts/resetPassword.js <email> <nouveau_mot_de_passe>');
    console.log('   Exemple: node scripts/resetPassword.js user@example.com MonNouveauMotDePasse123');
    process.exit(1);
  }

  const [email, newPassword] = args;

  if (newPassword.length < 8) {
    console.log('❌ Le mot de passe doit contenir au moins 8 caractères');
    process.exit(1);
  }

  try {
    console.log(`🔍 Recherche de l'utilisateur avec l'email: ${email}...\n`);
    
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        role: true
      }
    });

    if (!user) {
      console.log(`❌ Aucun utilisateur trouvé avec l'email: ${email}`);
      process.exit(1);
    }

    console.log(`✅ Utilisateur trouvé:`);
    console.log(`   Nom: ${user.prenom} ${user.nom}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Rôle: ${user.role}\n`);

    // Hasher le nouveau mot de passe
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Mettre à jour le mot de passe
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpire: null
      }
    });

    console.log(`✅ Mot de passe réinitialisé avec succès pour ${user.email}`);
    console.log(`\n💡 L'utilisateur peut maintenant se connecter avec le nouveau mot de passe.\n`);

  } catch (error) {
    console.error('❌ Erreur lors de la réinitialisation:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();

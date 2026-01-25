import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const prisma = new PrismaClient();

async function listUsers() {
  try {
    console.log('🔍 Recherche des utilisateurs dans la base de données...\n');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        role: true,
        cabinetNom: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        lastLogin: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (users.length === 0) {
      console.log('❌ Aucun utilisateur trouvé dans la base de données.\n');
      return;
    }

    console.log(`✅ ${users.length} utilisateur(s) trouvé(s) :\n`);
    console.log('═'.repeat(80));
    
    users.forEach((user, index) => {
      console.log(`\n📋 Utilisateur #${index + 1}`);
      console.log('─'.repeat(80));
      console.log(`   Nom complet : ${user.prenom} ${user.nom}`);
      console.log(`   Email       : ${user.email}`);
      console.log(`   Rôle        : ${user.role}`);
      console.log(`   Cabinet     : ${user.cabinetNom || 'Non défini'}`);
      console.log(`   Actif       : ${user.isActive ? '✅ Oui' : '❌ Non'}`);
      console.log(`   Email vérifié : ${user.emailVerified ? '✅ Oui' : '❌ Non'}`);
      console.log(`   Créé le     : ${user.createdAt.toLocaleString('fr-FR')}`);
      if (user.lastLogin) {
        console.log(`   Dernière connexion : ${user.lastLogin.toLocaleString('fr-FR')}`);
      } else {
        console.log(`   Dernière connexion : Jamais connecté`);
      }
    });

    console.log('\n' + '═'.repeat(80));
    console.log('\n💡 Pour réinitialiser un mot de passe, utilisez l\'endpoint /api/auth/forgot-password');
    console.log('   ou modifiez directement dans la base de données.\n');

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des utilisateurs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();

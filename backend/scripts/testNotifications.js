import dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../src/lib/prisma.js';
import { createCriticalNotification, createSecondaryNotification, NOTIFICATION_TYPES } from '../src/services/notificationService.js';

/**
 * Script de test pour simuler des notifications
 */
async function testNotifications() {
  try {
    console.log('🧪 Démarrage du test de notifications...\n');

    // Récupérer le premier utilisateur admin (ou le premier utilisateur disponible)
    const user = await prisma.user.findFirst({
      where: {
        emailVerified: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!user) {
      console.error('❌ Aucun utilisateur trouvé avec email vérifié');
      process.exit(1);
    }

    console.log(`✅ Utilisateur trouvé : ${user.prenom} ${user.nom} (${user.email})\n`);

    // TEST 1 : Notification secondaire (Cloche uniquement)
    console.log('📬 TEST 1 : Notification secondaire (Cloche uniquement)');
    console.log('─'.repeat(60));
    
    await createSecondaryNotification(
      user.id,
      NOTIFICATION_TYPES.DOCUMENT,
      '📄 Nouveau document généré',
      'Un document "Mise en demeure" a été généré automatiquement pour le dossier "Litige commercial - Client ABC".',
      'test-doc-id',
      'document'
    );
    
    console.log('✅ Notification secondaire créée avec succès\n');

    // Attendre 2 secondes
    await new Promise(resolve => setTimeout(resolve, 2000));

    // TEST 2 : Notification critique (Email + Cloche)
    console.log('📧 TEST 2 : Notification critique (Email + Cloche)');
    console.log('─'.repeat(60));
    
    const emailSubject = '💶 Paiement reçu : Facture FACT-2025-001';
    const emailBody = `
      <h2>Paiement reçu</h2>
      <p>Bonjour ${user.prenom},</p>
      <p>La facture suivante a été marquée comme <strong>payée</strong> :</p>
      <ul>
        <li><strong>Numéro :</strong> FACT-2025-001</li>
        <li><strong>Client :</strong> Jean Dupont</li>
        <li><strong>Montant TTC :</strong> 1 500,00 €</li>
        <li><strong>Date de paiement :</strong> ${new Date().toLocaleDateString('fr-FR')}</li>
      </ul>
      <p>Merci pour votre suivi.</p>
    `;
    
    await createCriticalNotification(
      user.id,
      NOTIFICATION_TYPES.FACTURE,
      '💶 Paiement reçu',
      'La facture FACT-2025-001 (Jean Dupont) a été marquée comme payée. Montant : 1 500,00 €.',
      emailSubject,
      emailBody,
      'test-facture-id',
      'facture'
    );
    
    console.log('✅ Notification critique créée avec succès');
    console.log('✅ Email envoyé avec succès\n');

    // Afficher les notifications créées
    console.log('📋 Récapitulatif des notifications créées :');
    console.log('─'.repeat(60));
    
    const notifications = await prisma.notification.findMany({
      where: {
        utilisateurId: user.id,
        dateEnvoi: {
          gte: new Date(Date.now() - 60000) // Dernière minute
        }
      },
      orderBy: {
        dateEnvoi: 'desc'
      },
      take: 5
    });

    notifications.forEach((notif, index) => {
      console.log(`\n${index + 1}. ${notif.titre}`);
      console.log(`   Message : ${notif.message}`);
      console.log(`   Date : ${notif.dateEnvoi.toLocaleString('fr-FR')}`);
      console.log(`   Lu : ${notif.lu ? 'Oui' : 'Non'}`);
    });

    console.log('\n✅ Test terminé avec succès !');
    console.log('\n💡 Pour voir les notifications :');
    console.log('   1. Connectez-vous à l\'application');
    console.log('   2. Cliquez sur l\'icône de cloche dans le header');
    console.log('   3. Vérifiez votre boîte email pour le message de paiement\n');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le test
testNotifications();


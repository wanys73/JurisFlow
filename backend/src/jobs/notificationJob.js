import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';
import { createCriticalNotification, createSecondaryNotification, NOTIFICATION_TYPES } from '../services/notificationService.js';
import { sendEmail } from '../services/emailService.js';

/**
 * Job Cron pour les notifications intelligentes
 * S'exécute tous les jours à 8h00
 */
export const startNotificationJob = () => {
  cron.schedule('0 8 * * *', async () => {
    console.log('🔔 Démarrage du job de notifications intelligentes...');
    
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      // RÈGLE 1 : Événements Agenda (Critique -> Email + Cloche)
      // Condition : Événement de type "Audience" ou "Rendez-vous" prévu dans 24h
      await checkAgendaEvents(in24Hours);
      
      // RÈGLE 2 : Factures en Retard (Critique -> Email + Cloche)
      await checkOverdueInvoices(now);
      
      // RÈGLE 3 : Tâches et Échéances (Secondaire -> Cloche uniquement)
      await checkTodayTasks(today);
      
      console.log('✅ Job de notifications intelligentes terminé');
    } catch (error) {
      console.error('❌ Erreur dans le job de notifications intelligentes:', error);
    }
  }, {
    timezone: 'Europe/Paris'
  });
  
  console.log('✅ Job de notifications intelligentes planifié (tous les jours à 8h00)');
};

/**
 * RÈGLE 1 : Vérifier les événements Agenda critiques (24h)
 */
async function checkAgendaEvents(in24Hours) {
  console.log('📅 Vérification des événements Agenda dans 24h...');
  
  try {
    const startTime = new Date(in24Hours.getTime() - 60 * 60 * 1000); // 23h
    const endTime = new Date(in24Hours.getTime() + 60 * 60 * 1000); // 25h
    
    const evenements = await prisma.evenement.findMany({
      where: {
        dateDebut: {
          gte: startTime,
          lte: endTime
        },
        type: {
          in: ['AUDIENCE', 'RENDEZ_VOUS']
        },
        isArchived: false
      },
      include: {
        utilisateur: {
          select: {
            id: true,
            email: true,
            nom: true,
            prenom: true,
            emailVerified: true
          }
        }
      }
    });
    
    console.log(`📋 ${evenements.length} événement(s) critique(s) trouvé(s)`);
    
    for (const evenement of evenements) {
      try {
        // Vérifier si une notification a déjà été envoyée aujourd'hui
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const existingNotification = await prisma.notification.findFirst({
          where: {
            utilisateurId: evenement.utilisateurId,
            titre: {
              contains: evenement.titre
            },
            dateEnvoi: {
              gte: today
            }
          }
        });
        
        if (existingNotification) {
          console.log(`ℹ️ Notification déjà envoyée pour l'événement ${evenement.id}, skip`);
          continue;
        }
        
        const dateDebutFormatted = new Date(evenement.dateDebut).toLocaleDateString('fr-FR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        
        const titre = `📅 Rappel : ${evenement.titre}`;
        const message = `Vous avez un ${evenement.type === 'AUDIENCE' ? 'audience' : 'rendez-vous'} prévu demain : "${evenement.titre}" le ${dateDebutFormatted}.`;
        
        const emailSubject = `Rappel : ${evenement.type === 'AUDIENCE' ? 'Audience' : 'Rendez-vous'} demain`;
        const emailBody = `
          <h2>Rappel : ${evenement.titre}</h2>
          <p>Bonjour ${evenement.utilisateur.prenom},</p>
          <p>Vous avez un ${evenement.type === 'AUDIENCE' ? 'audience' : 'rendez-vous'} prévu <strong>demain</strong> :</p>
          <ul>
            <li><strong>Date :</strong> ${dateDebutFormatted}</li>
            ${evenement.description ? `<li><strong>Description :</strong> ${evenement.description}</li>` : ''}
            ${evenement.lieu ? `<li><strong>Lieu :</strong> ${evenement.lieu}</li>` : ''}
          </ul>
          <p>N'oubliez pas de vous préparer pour cet événement.</p>
        `;
        
        await createCriticalNotification(
          evenement.utilisateurId,
          NOTIFICATION_TYPES.AGENDA,
          titre,
          message,
          emailSubject,
          emailBody,
          evenement.id,
          'evenement'
        );
        
        console.log(`✅ Notification critique créée pour l'événement "${evenement.titre}"`);
      } catch (error) {
        console.error(`❌ Erreur lors du traitement de l'événement ${evenement.id}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des événements Agenda:', error);
  }
}

/**
 * RÈGLE 2 : Vérifier les factures en retard
 */
async function checkOverdueInvoices(now) {
  console.log('💶 Vérification des factures en retard...');
  
  try {
    const factures = await prisma.facture.findMany({
      where: {
        statut: {
          not: 'PAYEE'
        },
        dateEcheance: {
          lt: now
        },
        isArchived: false
      },
      include: {
        dossier: {
          select: {
            id: true,
            nom: true,
            clientNom: true,
            clientPrenom: true
          }
        },
        cabinet: {
          select: {
            id: true,
            email: true,
            nom: true,
            prenom: true,
            emailVerified: true
          }
        }
      }
    });
    
    console.log(`📋 ${factures.length} facture(s) en retard trouvée(s)`);
    
    for (const facture of factures) {
      try {
        // Calculer le nombre de jours de retard
        const joursRetard = Math.floor((now - new Date(facture.dateEcheance)) / (1000 * 60 * 60 * 24));
        
        // Notifier seulement à 1, 7 et 15 jours de retard
        if (![1, 7, 15].includes(joursRetard)) {
          continue;
        }
        
        // Vérifier si une notification a déjà été envoyée pour ce niveau de retard
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const existingNotification = await prisma.notification.findFirst({
          where: {
            utilisateurId: facture.cabinet.id,
            titre: {
              contains: facture.numeroFacture
            },
            message: {
              contains: `${joursRetard} jour${joursRetard > 1 ? 's' : ''}`
            },
            dateEnvoi: {
              gte: today
            }
          }
        });
        
        if (existingNotification) {
          console.log(`ℹ️ Notification déjà envoyée pour la facture ${facture.id} (${joursRetard} jours), skip`);
          continue;
        }
        
        const clientNom = facture.dossier 
          ? `${facture.dossier.clientPrenom || ''} ${facture.dossier.clientNom || ''}`.trim() 
          : 'Client inconnu';
        
        const titre = `💶 Alerte : Facture en retard`;
        const message = `La facture ${facture.numeroFacture} (${clientNom}) est en retard de ${joursRetard} jour${joursRetard > 1 ? 's' : ''}. Montant : ${facture.totalTTC.toFixed(2)} €.`;
        
        const emailSubject = `Alerte : Facture ${facture.numeroFacture} en retard de ${joursRetard} jour${joursRetard > 1 ? 's' : ''}`;
        const emailBody = `
          <h2>Alerte : Facture en retard</h2>
          <p>Bonjour ${facture.cabinet.prenom},</p>
          <p>La facture suivante est en retard de <strong>${joursRetard} jour${joursRetard > 1 ? 's' : ''}</strong> :</p>
          <ul>
            <li><strong>Numéro :</strong> ${facture.numeroFacture}</li>
            <li><strong>Client :</strong> ${clientNom}</li>
            <li><strong>Montant TTC :</strong> ${facture.totalTTC.toFixed(2)} €</li>
            <li><strong>Date d'échéance :</strong> ${new Date(facture.dateEcheance).toLocaleDateString('fr-FR')}</li>
            <li><strong>Jours de retard :</strong> ${joursRetard}</li>
          </ul>
          <p>Veuillez relancer le client pour le règlement.</p>
        `;
        
        await createCriticalNotification(
          facture.cabinet.id,
          NOTIFICATION_TYPES.FACTURE,
          titre,
          message,
          emailSubject,
          emailBody,
          facture.id,
          'facture'
        );
        
        console.log(`✅ Notification critique créée pour la facture ${facture.numeroFacture} (${joursRetard} jours de retard)`);
      } catch (error) {
        console.error(`❌ Erreur lors du traitement de la facture ${facture.id}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des factures en retard:', error);
  }
}

/**
 * RÈGLE 3 : Vérifier les tâches et échéances du jour
 */
async function checkTodayTasks(today) {
  console.log('✅ Vérification des tâches et échéances du jour...');
  
  try {
    const startOfDay = new Date(today);
    const endOfDay = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
    
    const evenements = await prisma.evenement.findMany({
      where: {
        dateDebut: {
          gte: startOfDay,
          lte: endOfDay
        },
        type: {
          in: ['TACHE', 'ECHEANCE']
        },
        isArchived: false
      },
      include: {
        utilisateur: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });
    
    console.log(`📋 ${evenements.length} tâche(s)/échéance(s) trouvée(s) pour aujourd'hui`);
    
    for (const evenement of evenements) {
      try {
        // Vérifier si une notification a déjà été envoyée aujourd'hui
        const existingNotification = await prisma.notification.findFirst({
          where: {
            utilisateurId: evenement.utilisateurId,
            titre: {
              contains: evenement.titre
            },
            dateEnvoi: {
              gte: startOfDay
            }
          }
        });
        
        if (existingNotification) {
          console.log(`ℹ️ Notification déjà envoyée pour l'événement ${evenement.id}, skip`);
          continue;
        }
        
        const titre = `✅ ${evenement.type === 'TACHE' ? 'Tâche' : 'Échéance'} à faire aujourd'hui`;
        const message = `${evenement.type === 'TACHE' ? 'Tâche' : 'Échéance'} : "${evenement.titre}"`;
        
        await createSecondaryNotification(
          evenement.utilisateurId,
          evenement.type === 'TACHE' ? NOTIFICATION_TYPES.TACHE : NOTIFICATION_TYPES.ECHEANCE,
          titre,
          message,
          evenement.id,
          'evenement'
        );
        
        console.log(`✅ Notification secondaire créée pour l'événement "${evenement.titre}"`);
      } catch (error) {
        console.error(`❌ Erreur lors du traitement de l'événement ${evenement.id}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des tâches et échéances:', error);
  }
}


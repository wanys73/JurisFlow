import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';
import { sendEventReminderEmail } from '../services/emailService.js';

/**
 * Job Cron pour envoyer des rappels d'événements 48h avant
 * S'exécute tous les jours à 8h00
 */
export const startEventReminderJob = () => {
  // Planifier le job pour s'exécuter tous les jours à 8h00
  cron.schedule('0 8 * * *', async () => {
    console.log('🔔 Démarrage du job de rappel d\'événements...');
    
    try {
      // Calculer la date dans 48 heures
      const now = new Date();
      const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      // Créer une plage de temps (48h ± 1h pour éviter les problèmes de timing)
      const startTime = new Date(in48Hours.getTime() - 60 * 60 * 1000); // 47h
      const endTime = new Date(in48Hours.getTime() + 60 * 60 * 1000); // 49h
      
      console.log(`📅 Recherche d'événements entre ${startTime.toISOString()} et ${endTime.toISOString()}`);
      
      // Trouver tous les événements dans cette plage de temps
      const evenements = await prisma.evenement.findMany({
        where: {
          dateDebut: {
            gte: startTime,
            lte: endTime
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
      
      console.log(`📋 ${evenements.length} événement(s) trouvé(s) dans 48h`);
      
      // Traiter chaque événement
      for (const evenement of evenements) {
        try {
          // Vérifier que l'utilisateur a un email vérifié
          if (!evenement.utilisateur.emailVerified) {
            console.log(`⚠️ Utilisateur ${evenement.utilisateur.email} n'a pas d'email vérifié, skip`);
            continue;
          }
          
          // Vérifier si une notification a déjà été envoyée pour cet événement
          // (pour éviter les doublons si le job s'exécute plusieurs fois)
          const existingNotification = await prisma.notification.findFirst({
            where: {
              utilisateurId: evenement.utilisateurId,
              titre: {
                contains: evenement.titre
              },
              dateEnvoi: {
                gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) // Dans les dernières 24h
              }
            }
          });
          
          if (existingNotification) {
            console.log(`ℹ️ Notification déjà envoyée pour l'événement ${evenement.id}, skip`);
            continue;
          }
          
          // Envoyer l'email de rappel
          try {
            await sendEventReminderEmail(evenement.utilisateur.email, {
              titre: evenement.titre,
              description: evenement.description,
              dateDebut: evenement.dateDebut
            });
            console.log(`✅ Email de rappel envoyé à ${evenement.utilisateur.email} pour l'événement "${evenement.titre}"`);
          } catch (emailError) {
            console.error(`❌ Erreur lors de l'envoi de l'email pour l'événement ${evenement.id}:`, emailError);
            // Continuer même si l'email échoue
          }
          
          // Créer la notification in-app
          try {
            const dateDebutFormatted = new Date(evenement.dateDebut).toLocaleDateString('fr-FR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
            
            await prisma.notification.create({
              data: {
                utilisateurId: evenement.utilisateurId,
                titre: `🔔 Rappel : ${evenement.titre}`,
                message: `Vous avez un événement prévu dans 48 heures : "${evenement.titre}" le ${dateDebutFormatted}.`,
                dateEnvoi: new Date()
              }
            });
            console.log(`✅ Notification in-app créée pour l'événement "${evenement.titre}"`);
          } catch (notificationError) {
            console.error(`❌ Erreur lors de la création de la notification pour l'événement ${evenement.id}:`, notificationError);
          }
          
        } catch (error) {
          console.error(`❌ Erreur lors du traitement de l'événement ${evenement.id}:`, error);
          // Continuer avec les autres événements
        }
      }
      
      console.log('✅ Job de rappel d\'événements terminé');
    } catch (error) {
      console.error('❌ Erreur dans le job de rappel d\'événements:', error);
    }
  }, {
    timezone: 'Europe/Paris' // Ajuster selon votre fuseau horaire
  });
  
  console.log('✅ Job de rappel d\'événements planifié (tous les jours à 8h00)');
};


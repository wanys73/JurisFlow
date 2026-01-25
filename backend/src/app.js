// ⚠️ CRITIQUE : Charger les variables d'environnement EN PREMIER
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { prisma } from './lib/prisma.js';

// Import des routes
import authRoutes from './routes/authRoutes.js';
import dossierRoutes from './routes/dossierRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import iaRoutes from './routes/iaRoutes.js';
import factureRoutes from './routes/factureRoutes.js';
import statistiqueRoutes from './routes/statistiqueRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import evenementRoutes from './routes/evenementRoutes.js';
import rapportRoutes from './routes/rapportRoutes.js';
import cabinetRoutes from './routes/cabinetRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';

// Import des middlewares d'erreur
import {
  notFound,
  errorHandler,
  handleCastError,
  handleDuplicateKeyError,
  handleValidationError
} from './middleware/errorMiddleware.js';

// Import du middleware d'audit
import { auditMiddleware } from './middleware/auditMiddleware.js';

// Import des jobs cron
import { startEventReminderJob } from './jobs/eventReminderJob.js';
import { startNotificationJob } from './jobs/notificationJob.js';

// Initialisation de l'application Express
const app = express();

// === CONFIGURATION DE SÉCURITÉ ===

// Helmet pour sécuriser les headers HTTP
app.use(helmet());

// CORS - Configuration pour permettre les requêtes depuis le frontend
// En développement, autoriser plusieurs ports localhost
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [process.env.FRONTEND_URL || 'http://localhost:5173']
  : [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean); // Filtrer les valeurs undefined

app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origin (ex: Postman, curl)
    if (!origin) return callback(null, true);
    
    // En développement, autoriser tous les localhost
    if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
      return callback(null, true);
    }
    
    // Vérifier si l'origine est autorisée
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting pour prévenir les attaques par force brute
// ⚠️ DÉSACTIVÉ COMPLÈTEMENT EN DÉVELOPPEMENT pour éviter les blocages
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 1000 en dev, 100 en prod
  message: {
    success: false,
    message: 'Trop de requêtes depuis cette adresse IP, veuillez réessayer plus tard.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // En développement, désactiver complètement le rate limiting
  skip: (req) => process.env.NODE_ENV === 'development'
});

// Appliquer le rate limiting à toutes les requêtes
app.use('/api/', limiter);

// Rate limiting plus strict pour l'authentification
// ⚠️ DÉSACTIVÉ COMPLÈTEMENT EN DÉVELOPPEMENT
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 10 : 100, // 100 en dev, 10 en prod
  message: {
    success: false,
    message: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes.'
  },
  skipSuccessfulRequests: true,
  // En développement, désactiver complètement le rate limiting
  skip: (req) => process.env.NODE_ENV === 'development'
});

// === MIDDLEWARES ===

// Parser JSON
app.use(express.json({ limit: '10mb' }));

// Parser URL-encoded
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// === MIDDLEWARES D'APPLICATION ===

// Middleware d'audit (traces toutes les actions pour conformité RGPD)
// Appliqué après parsing mais avant les routes
app.use('/api', auditMiddleware);

// === ROUTES ===

// Route de santé (health check)
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'JurisFlow API est opérationnelle',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Route de développement pour réinitialiser le rate limiting
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/dev/reset-rate-limit', (req, res) => {
    // Note: express-rate-limit stocke en mémoire, donc un redémarrage du serveur réinitialise
    res.status(200).json({
      success: true,
      message: 'Pour réinitialiser le rate limiting, redémarrez le serveur. Les limites ont été augmentées en développement (1000 requêtes/15min).'
    });
  });
}

// Routes d'authentification avec rate limiting strict
app.use('/api/auth', authLimiter, authRoutes);

// Routes des dossiers
app.use('/api/dossiers', dossierRoutes);

// Routes des documents
app.use('/api', documentRoutes);

// Routes de génération IA
app.use('/api/documents', iaRoutes);
// Routes de chat IA
app.use('/api/ia', iaRoutes);

// Routes de facturation
app.use('/api/factures', factureRoutes);

// Routes de statistiques
app.use('/api/statistiques', statistiqueRoutes);

// Routes des clients
app.use('/api/clients', clientRoutes);

// Routes Agenda/Événements
app.use('/api', evenementRoutes);

// Routes Rapports (statistiques avancées)
app.use('/api', rapportRoutes);

// Routes Cabinet (paramètres)
app.use('/api', cabinetRoutes);
app.use('/api/notifications', notificationRoutes);

// Studio IA - Conversations
app.use('/api/studio-ia', conversationRoutes);

// === GESTION DES ERREURS ===

// Middlewares de gestion d'erreurs spécifiques
app.use(handleCastError);
app.use(handleDuplicateKeyError);
app.use(handleValidationError);

// Middleware pour les routes non trouvées
app.use(notFound);

// Middleware général de gestion des erreurs
app.use(errorHandler);

// === CONNEXION À LA BASE DE DONNÉES ===

const connectDB = async (retries = 5, delay = 5000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Tentative de connexion ${attempt}/${retries} à la base de données...`);
      
      // Tester la connexion Prisma avec timeout plus long (60s pour Supabase)
      await Promise.race([
        prisma.$connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout de connexion (60s)')), 60000)
        )
      ]);
      
      // Vérifier la connexion avec une requête simple (avec timeout)
      await Promise.race([
        prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout de requête (10s)')), 10000)
        )
      ]);
      
      console.log(`✅ Base de données PostgreSQL (Supabase) connectée`);
      console.log(`📊 Connexion Prisma opérationnelle`);
      return true;
    } catch (error) {
      if (attempt === retries) {
        console.error(`❌ Erreur de connexion à la base de données après ${retries} tentatives: ${error.message}`);
        console.error(`📍 Vérifiez DATABASE_URL dans le fichier .env`);
        console.error(`💡 Astuce: Utilisez le port 6543 (pooler) avec ?connect_timeout=60&pool_timeout=60&pgbouncer=true`);
        console.error(`💡 Exemple: postgresql://...@aws-0-xxx.pooler.supabase.com:6543/postgres?connect_timeout=60&pool_timeout=60&pgbouncer=true`);
        console.error(`⚠️  Le serveur va démarrer mais certaines fonctionnalités seront indisponibles.`);
        // NE PAS FAIRE process.exit(1) - permet au serveur de démarrer même si la DB est temporairement inaccessible
        return false;
      }
      const nextDelay = delay * attempt; // Délai progressif : 5s, 10s, 15s, 20s
      console.warn(`⚠️  Tentative ${attempt}/${retries} échouée: ${error.message}`);
      console.warn(`⏳ Nouvelle tentative dans ${nextDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, nextDelay));
    }
  }
  return false;
};

// === DÉMARRAGE DU SERVEUR ===

// Port forcé 5087 (npx kill-port 5087 est exécuté avant nodemon via script dev)
const PORT = parseInt(process.env.PORT, 10) || 5087;

const startServer = async () => {
  // Connexion à la base de données
  await connectDB();

  // Démarrer le job cron pour les rappels d'événements
  startEventReminderJob();

  // Démarrage du serveur sur le port 5087 uniquement (pas de bascule)
  const server = app.listen(PORT, () => {
    console.log(`\n🚀 Serveur JurisFlow démarré avec succès`);
    console.log(`📡 Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`💚 API Health Check: http://localhost:${PORT}/health`);
    console.log(`\n📚 Endpoints disponibles:`);
    console.log(`   POST   /api/auth/register  - Inscription`);
    console.log(`   POST   /api/auth/login     - Connexion`);
    console.log(`   POST   /api/auth/refresh   - Rafraîchir le token`);
    console.log(`   POST   /api/auth/logout    - Déconnexion`);
    console.log(`   GET    /api/auth/me        - Profil utilisateur`);
    console.log(`   GET    /api/auth/confirm/:token - Confirmer email`);
    console.log(`   GET    /api/notifications  - Notifications non lues`);
    console.log(`   PUT    /api/notifications/:id/lu - Marquer comme lue`);
    console.log(`   GET    /api/dossiers       - Lister les dossiers`);
    console.log(`   POST   /api/dossiers       - Créer un dossier`);
    console.log(`   GET    /api/dossiers/:id   - Voir un dossier`);
    console.log(`   PUT    /api/dossiers/:id   - Modifier un dossier`);
    console.log(`   DELETE /api/dossiers/:id   - Supprimer un dossier`);
    console.log(`   POST   /api/dossiers/:id/documents - Uploader des documents`);
    console.log(`   GET    /api/dossiers/:id/documents - Lister les documents`);
    console.log(`   GET    /api/documents/:id/download - Télécharger un document`);
    console.log(`   DELETE /api/documents/:id          - Supprimer un document`);
    console.log(`   GET    /api/documents/templates    - Templates disponibles (IA)`);
    console.log(`   POST   /api/documents/generate     - Générer document avec IA`);
    console.log(`   POST   /api/ia/chat                - Chat avec l'IA (conseils juridiques)`);
    console.log(`   GET    /api/factures              - Lister les factures`);
    console.log(`   POST   /api/factures              - Créer une facture`);
    console.log(`   GET    /api/factures/:id          - Voir une facture`);
    console.log(`   PUT    /api/factures/:id          - Modifier une facture`);
    console.log(`   DELETE /api/factures/:id          - Supprimer une facture`);
    console.log(`   PATCH  /api/factures/:id/payer    - Marquer comme payée`);
    console.log(`   GET    /api/statistiques/kpi      - KPIs du tableau de bord`);
    console.log(`   GET    /api/statistiques/revenus-mensuels - Revenus des 12 derniers mois`);
    console.log(`\n⏳ En attente de requêtes...\n`);
  });

  // Gestion des erreurs de démarrage du serveur (port 5087 forcé)
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Le port ${PORT} est déjà utilisé. Libérez-le puis relancez :`);
      console.error(`   ./STOP.sh   ou   npx kill-port ${PORT}`);
      process.exit(1);
    } else {
      console.error(`❌ Erreur lors du démarrage du serveur: ${error.message}`);
      process.exit(1);
    }
  });
};

// Gestion des erreurs non capturées
process.on('unhandledRejection', async (err) => {
  console.error('❌ Erreur non gérée (Unhandled Rejection):', err);
  console.log('🛑 Arrêt du serveur...');
  await prisma.$disconnect();
  process.exit(1);
});

process.on('uncaughtException', async (err) => {
  console.error('❌ Exception non capturée (Uncaught Exception):', err);
  console.log('🛑 Arrêt du serveur...');
  await prisma.$disconnect();
  process.exit(1);
});

// Fermeture propre de Prisma à l'arrêt
process.on('SIGINT', async () => {
  console.log('\n🛑 Arrêt du serveur...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Arrêt du serveur...');
  await prisma.$disconnect();
  process.exit(0);
});

// Démarrage de l'application
startServer();

export default app;


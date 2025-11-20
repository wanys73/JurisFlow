import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
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

// Import des middlewares d'erreur
import {
  notFound,
  errorHandler,
  handleCastError,
  handleDuplicateKeyError,
  handleValidationError
} from './middleware/errorMiddleware.js';

// Configuration des variables d'environnement
dotenv.config();

// Initialisation de l'application Express
const app = express();

// === CONFIGURATION DE SÉCURITÉ ===

// Helmet pour sécuriser les headers HTTP
app.use(helmet());

// CORS - Configuration pour permettre les requêtes depuis le frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting pour prévenir les attaques par force brute
// En développement, limite plus élevée pour éviter les blocages
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 1000 en dev, 100 en prod
  message: {
    success: false,
    message: 'Trop de requêtes depuis cette adresse IP, veuillez réessayer plus tard.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // En développement, ne pas bloquer complètement
  skip: (req) => process.env.NODE_ENV === 'development' && req.path === '/health'
});

// Appliquer le rate limiting à toutes les requêtes
app.use('/api/', limiter);

// Rate limiting plus strict pour l'authentification
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 10 : 100, // 100 en dev, 10 en prod
  message: {
    success: false,
    message: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes.'
  },
  skipSuccessfulRequests: true,
});

// === MIDDLEWARES ===

// Parser JSON
app.use(express.json({ limit: '10mb' }));

// Parser URL-encoded
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

const connectDB = async () => {
  try {
    // Tester la connexion Prisma
    await prisma.$connect();
    console.log(`✅ Base de données PostgreSQL (Supabase) connectée`);
    
    // Vérifier la connexion avec une requête simple
    await prisma.$queryRaw`SELECT 1`;
    console.log(`📊 Connexion Prisma opérationnelle`);

  } catch (error) {
    console.error(`❌ Erreur de connexion à la base de données: ${error.message}`);
    process.exit(1);
  }
};

// === DÉMARRAGE DU SERVEUR ===

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connexion à la base de données
  await connectDB();

  // Démarrage du serveur
  app.listen(PORT, () => {
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


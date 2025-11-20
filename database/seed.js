import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../backend/src/models/User.js';

// Charger les variables d'environnement
dotenv.config({ path: '../backend/.env' });

// Données de test
const users = [
  {
    nom: 'Dupont',
    prenom: 'Jean',
    email: 'jean.dupont@cabinet-dupont.fr',
    password: 'Password123!',
    role: 'admin',
    cabinet: {
      nom: 'Cabinet Dupont & Associés',
      adresse: '15 Avenue des Champs-Élysées, 75008 Paris',
      telephone: '+33 1 42 56 78 90',
      siren: '123456789'
    },
    emailVerified: true
  },
  {
    nom: 'Martin',
    prenom: 'Sophie',
    email: 'sophie.martin@cabinet-dupont.fr',
    password: 'Password123!',
    role: 'collaborateur',
    emailVerified: true
  },
  {
    nom: 'Bernard',
    prenom: 'Pierre',
    email: 'pierre.bernard@avocat-bernard.fr',
    password: 'Password123!',
    role: 'admin',
    cabinet: {
      nom: 'Cabinet Bernard',
      adresse: '28 Rue de la République, 69002 Lyon',
      telephone: '+33 4 78 42 35 67',
      siren: '987654321'
    },
    emailVerified: true
  }
];

// Fonction pour se connecter à la base de données
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connexion à MongoDB réussie');
  } catch (error) {
    console.error('❌ Erreur de connexion à MongoDB:', error);
    process.exit(1);
  }
};

// Fonction pour supprimer toutes les données existantes
const deleteData = async () => {
  try {
    await User.deleteMany();
    console.log('🗑️  Données existantes supprimées');
  } catch (error) {
    console.error('❌ Erreur lors de la suppression des données:', error);
    process.exit(1);
  }
};

// Fonction pour importer les données de test
const importData = async () => {
  try {
    await User.create(users);
    console.log('✅ Données de test importées avec succès');
    console.log('\n📧 Comptes créés:');
    users.forEach(user => {
      console.log(`   - ${user.email} (${user.role}) - Mot de passe: Password123!`);
    });
  } catch (error) {
    console.error('❌ Erreur lors de l\'import des données:', error);
    process.exit(1);
  }
};

// Script principal
const seedDatabase = async () => {
  console.log('\n🌱 Démarrage du seeding de la base de données...\n');
  
  await connectDB();
  
  // Vérifier les arguments de la ligne de commande
  if (process.argv[2] === '-d') {
    await deleteData();
  } else if (process.argv[2] === '-i') {
    await deleteData();
    await importData();
  } else {
    console.log('Usage:');
    console.log('  node seed.js -d   Supprimer toutes les données');
    console.log('  node seed.js -i   Supprimer et importer les données de test');
    process.exit(0);
  }
  
  console.log('\n✨ Opération terminée avec succès\n');
  process.exit(0);
};

// Exécuter le script
seedDatabase();


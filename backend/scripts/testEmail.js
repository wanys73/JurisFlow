import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 Test de configuration email Gmail\n');
console.log('═══════════════════════════════════════════════════════════════\n');

// Vérifier les variables d'environnement
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;
const emailService = process.env.EMAIL_SERVICE || 'gmail';

console.log('📋 Configuration détectée:');
console.log(`   EMAIL_SERVICE: ${emailService}`);
console.log(`   EMAIL_USER: ${emailUser ? emailUser.substring(0, 10) + '...' : '❌ NON DÉFINI'}`);
console.log(`   EMAIL_PASS: ${emailPass ? '✅ DÉFINI (' + emailPass.length + ' caractères)' : '❌ NON DÉFINI'}`);
console.log(`   Format EMAIL_PASS: ${emailPass ? (emailPass.includes(' ') ? '⚠️  CONTIENT DES ESPACES' : '✅ Pas d\'espaces') : 'N/A'}`);
console.log('');

if (!emailUser || !emailPass) {
  console.error('❌ Variables d\'environnement manquantes !');
  process.exit(1);
}

// Créer le transporter
console.log('🔧 Création du transporter email...');
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: emailUser,
    pass: emailPass.trim() // Enlever les espaces éventuels
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Tester la connexion
console.log('🔐 Test de connexion à Gmail...\n');

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ ERREUR DE CONNEXION:');
    console.error(`   Code: ${error.code || 'N/A'}`);
    console.error(`   Message: ${error.message}`);
    console.error(`   Response: ${error.response || 'N/A'}`);
    console.error('');
    
    if (error.code === 'EAUTH') {
      console.error('💡 PROBLÈMES POSSIBLES:');
      console.error('   1. Le mot de passe d\'application n\'est pas correct');
      console.error('   2. La validation en 2 étapes n\'est pas activée sur le compte Gmail');
      console.error('   3. Le mot de passe contient des espaces (enlevez-les)');
      console.error('   4. Le mot de passe d\'application a été révoqué');
      console.error('');
      console.error('🔧 SOLUTIONS:');
      console.error('   1. Allez sur: https://myaccount.google.com/apppasswords');
      console.error('   2. Créez un nouveau mot de passe d\'application');
      console.error('   3. Copiez-le SANS ESPACES dans votre .env');
      console.error('   4. Vérifiez que EMAIL_USER = ninisius@gmail.com (exactement)');
    }
    
    process.exit(1);
  } else {
    console.log('✅ CONNEXION RÉUSSIE !');
    console.log('   Le serveur email est prêt à envoyer des emails.\n');
    
    // Tester l'envoi d'un email
    console.log('📧 Test d\'envoi d\'email...');
    const testEmail = {
      from: `"JurisFlow Test" <${emailUser}>`,
      to: emailUser, // Envoyer à soi-même pour tester
      subject: 'Test Email JurisFlow',
      text: 'Ceci est un email de test depuis JurisFlow. Si vous recevez ce message, la configuration email fonctionne correctement !',
      html: '<p>Ceci est un <strong>email de test</strong> depuis JurisFlow.</p><p>Si vous recevez ce message, la configuration email fonctionne correctement !</p>'
    };
    
    transporter.sendMail(testEmail, (error, info) => {
      if (error) {
        console.error('❌ Erreur lors de l\'envoi:', error.message);
        process.exit(1);
      } else {
        console.log('✅ Email de test envoyé avec succès !');
        console.log(`   Message ID: ${info.messageId}`);
        console.log(`   Vérifiez votre boîte mail: ${emailUser}`);
        process.exit(0);
      }
    });
  }
});

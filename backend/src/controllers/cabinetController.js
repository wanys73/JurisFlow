import { prisma } from '../lib/prisma.js';
import { uploadCabinetFile, deleteFromSupabase } from '../config/supabaseStorage.js';

// Helper pour obtenir le cabinetId
const getCabinetId = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  return user.role === 'ADMIN' ? user.id : user.id;
};

// @desc    Récupérer les paramètres du cabinet
// @route   GET /api/cabinet/settings
// @access  Private
export const getCabinetSettings = async (req, res) => {
  try {
    const cabinetId = await getCabinetId(req.user.userId);

    const cabinet = await prisma.user.findUnique({
      where: { id: cabinetId },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        cabinetNom: true,
        cabinetAdresse: true,
        cabinetSiret: true,
        cabinetTvaIntracom: true,
        cabinetEmailContact: true,
        cabinetTelephoneContact: true,
        cabinetLogoUrl: true,
        cabinetSignatureUrl: true,
        cabinetKbisUrl: true,
        cabinetMentionsLegales: true
      }
    });

    if (!cabinet) {
      return res.status(404).json({
        success: false,
        message: 'Cabinet non trouvé'
      });
    }

    res.status(200).json({
      success: true,
      data: { cabinet }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des paramètres',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Mettre à jour les paramètres du cabinet
// @route   PUT /api/cabinet/settings
// @access  Private (Admin uniquement)
export const updateCabinetSettings = async (req, res) => {
  try {
    const cabinetId = await getCabinetId(req.user.userId);

    // Vérifier que l'utilisateur est admin
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Seul l\'administrateur peut modifier les paramètres du cabinet'
      });
    }

    // Récupérer le cabinet existant
    const cabinetExistant = await prisma.user.findUnique({
      where: { id: cabinetId }
    });

    if (!cabinetExistant) {
      return res.status(404).json({
        success: false,
        message: 'Cabinet non trouvé'
      });
    }

    // Préparer les données de mise à jour
    const updateData = {};

    // Champs texte
    if (req.body.nom !== undefined) updateData.nom = req.body.nom;
    if (req.body.prenom !== undefined) updateData.prenom = req.body.prenom;
    if (req.body.cabinetNom !== undefined) updateData.cabinetNom = req.body.cabinetNom;
    if (req.body.cabinetAdresse !== undefined) updateData.cabinetAdresse = req.body.cabinetAdresse;
    if (req.body.cabinetSiret !== undefined) updateData.cabinetSiret = req.body.cabinetSiret;
    if (req.body.cabinetTvaIntracom !== undefined) updateData.cabinetTvaIntracom = req.body.cabinetTvaIntracom;
    if (req.body.cabinetEmailContact !== undefined) updateData.cabinetEmailContact = req.body.cabinetEmailContact;
    if (req.body.cabinetTelephoneContact !== undefined) updateData.cabinetTelephoneContact = req.body.cabinetTelephoneContact;
    if (req.body.cabinetMentionsLegales !== undefined) updateData.cabinetMentionsLegales = req.body.cabinetMentionsLegales;

    // Gérer la suppression de fichiers
    if (req.body.removeLogo === 'true') {
      console.log('🗑️ Suppression du logo demandée');
      if (cabinetExistant.cabinetLogoUrl) {
        try {
          await deleteFromSupabase(cabinetExistant.cabinetLogoUrl);
          console.log('✅ Logo supprimé de Supabase');
        } catch (err) {
          console.error('❌ Erreur suppression logo:', err);
        }
      }
      updateData.cabinetLogoUrl = null;
    }

    if (req.body.removeSignature === 'true') {
      console.log('🗑️ Suppression de la signature demandée');
      if (cabinetExistant.cabinetSignatureUrl) {
        try {
          await deleteFromSupabase(cabinetExistant.cabinetSignatureUrl);
          console.log('✅ Signature supprimée de Supabase');
        } catch (err) {
          console.error('❌ Erreur suppression signature:', err);
        }
      }
      updateData.cabinetSignatureUrl = null;
    }

    // Gérer les uploads de fichiers (logo, signature, KBIS)
    console.log('📁 Fichiers reçus:', req.files ? Object.keys(req.files) : 'aucun');
    
    if (req.files) {
      // Logo
      if (req.files.logo) {
        const logoFile = req.files.logo[0];
        console.log('📤 Upload logo:', logoFile.originalname, logoFile.size, 'bytes');
        
        // Supprimer l'ancien logo si existe
        if (cabinetExistant.cabinetLogoUrl) {
          try {
            await deleteFromSupabase(cabinetExistant.cabinetLogoUrl);
            console.log('🗑️ Ancien logo supprimé');
          } catch (err) {
            console.error('Erreur suppression ancien logo:', err);
          }
        }

        // Upload le nouveau logo
        const logoResult = await uploadCabinetFile(logoFile, 'logos');
        updateData.cabinetLogoUrl = logoResult.url;
        console.log('✅ Logo uploadé:', logoResult.url);
      }

      // Signature
      if (req.files.signature) {
        try {
          const signatureFile = req.files.signature[0];
          console.log('📤 Upload signature:', signatureFile.originalname, signatureFile.size, 'bytes');
          console.log('📊 Signature file details:', {
            fieldname: signatureFile.fieldname,
            encoding: signatureFile.encoding,
            mimetype: signatureFile.mimetype,
            bufferSize: signatureFile.buffer?.length,
            hasBuffer: !!signatureFile.buffer
          });
          
          // Vérifier que le buffer existe
          if (!signatureFile.buffer) {
            console.error('❌ Erreur: Pas de buffer dans le fichier signature');
            throw new Error('Fichier signature invalide : buffer manquant');
          }
          
          // Vérifier le type MIME
          if (!signatureFile.mimetype || !signatureFile.mimetype.startsWith('image/')) {
            console.error('❌ Erreur: Type MIME invalide pour la signature:', signatureFile.mimetype);
            throw new Error('Le fichier signature doit être une image');
          }
          
          // Supprimer l'ancienne signature si existe
          if (cabinetExistant.cabinetSignatureUrl) {
            try {
              await deleteFromSupabase(cabinetExistant.cabinetSignatureUrl);
              console.log('🗑️ Ancienne signature supprimée');
            } catch (err) {
              console.error('⚠️ Erreur suppression ancienne signature (non bloquant):', err.message);
            }
          }

          // Upload la nouvelle signature
          console.log('🚀 Tentative d\'upload de la signature vers Supabase...');
          const signatureResult = await uploadCabinetFile(signatureFile, 'signatures');
          updateData.cabinetSignatureUrl = signatureResult.url;
          console.log('✅ Signature uploadée avec succès:', signatureResult.url);
        } catch (error) {
          console.error('❌ === ERREUR LORS DE LA SAUVEGARDE DE LA SIGNATURE ===');
          console.error('Message:', error.message);
          console.error('Stack:', error.stack);
          console.error('Type:', error.constructor.name);
          if (error.response) {
            console.error('Response:', error.response);
          }
          throw new Error(`Erreur technique lors de la sauvegarde de la signature: ${error.message}`);
        }
      }

      // KBIS
      if (req.files.kbis) {
        const kbisFile = req.files.kbis[0];
        console.log('📤 Upload KBIS:', kbisFile.originalname, kbisFile.size, 'bytes');
        
        // Supprimer l'ancien KBIS si existe
        if (cabinetExistant.cabinetKbisUrl) {
          try {
            await deleteFromSupabase(cabinetExistant.cabinetKbisUrl);
            console.log('🗑️ Ancien KBIS supprimé');
          } catch (err) {
            console.error('Erreur suppression ancien KBIS:', err);
          }
        }

        // Upload le nouveau KBIS
        const kbisResult = await uploadCabinetFile(kbisFile, 'documents-legaux');
        updateData.cabinetKbisUrl = kbisResult.url;
        console.log('✅ KBIS uploadé:', kbisResult.url);
      }
    }

    // Mettre à jour le cabinet
    console.log('💾 Mise à jour de la BDD avec:', Object.keys(updateData));
    const cabinetUpdated = await prisma.user.update({
      where: { id: cabinetId },
      data: updateData,
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        cabinetNom: true,
        cabinetAdresse: true,
        cabinetSiret: true,
        cabinetTvaIntracom: true,
        cabinetEmailContact: true,
        cabinetTelephoneContact: true,
        cabinetLogoUrl: true,
        cabinetSignatureUrl: true,
        cabinetKbisUrl: true,
        cabinetMentionsLegales: true
      }
    });

    console.log('✅ Cabinet mis à jour:', {
      nom: cabinetUpdated.cabinetNom,
      logo: cabinetUpdated.cabinetLogoUrl,
      signature: cabinetUpdated.cabinetSignatureUrl
    });

    res.status(200).json({
      success: true,
      data: { cabinet: cabinetUpdated },
      message: 'Paramètres du cabinet mis à jour avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour des paramètres:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour des paramètres',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Mettre à jour le mot de passe de l'utilisateur
// @route   PUT /api/cabinet/change-password
// @access  Private
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe actuel et le nouveau mot de passe sont requis'
      });
    }

    // Récupérer l'utilisateur avec le mot de passe
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier le mot de passe actuel
    const bcrypt = await import('bcryptjs');
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Mot de passe actuel incorrect'
      });
    }

    // Hasher le nouveau mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Mettre à jour le mot de passe
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { password: hashedPassword }
    });

    res.status(200).json({
      success: true,
      message: 'Mot de passe mis à jour avec succès'
    });

  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du changement de mot de passe',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


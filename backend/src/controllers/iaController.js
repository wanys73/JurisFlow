import OpenAI from 'openai';
import PDFDocument from 'pdfkit';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { supabase } from '../config/supabaseStorage.js';

// Configuration OpenAI (lazy initialization - seulement quand nécessaire)
let openai = null;

const getOpenAIClient = () => {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('La clé API OpenAI n\'est pas configurée. Veuillez ajouter OPENAI_API_KEY dans votre fichier .env');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
};

// Templates de documents juridiques
const TEMPLATES_JURIDIQUES = {
  mise_en_demeure: {
    nom: 'Mise en demeure',
    description: 'Lettre formelle de mise en demeure',
    prompt: (dossier, client, cabinet) => `Tu es un assistant juridique expert. Rédige une mise en demeure professionnelle et formelle.

CONTEXTE DU DOSSIER :
- Dossier : ${dossier.nom}
- Description : ${dossier.description || 'Non spécifiée'}
- Type d'affaire : ${dossier.typeAffaire || 'Non spécifié'}

INFORMATIONS DU CLIENT (destinataire de la mise en demeure) :
- Nom : ${client?.prenom} ${client?.nom}
- Adresse : ${client?.adresse || 'Non spécifiée'}

INFORMATIONS DU CABINET :
- Cabinet : ${cabinet?.nom || 'Cabinet'}
- Adresse : ${cabinet?.adresse || ''}

INSTRUCTIONS :
1. Utilise un ton formel et juridique
2. Structure : En-tête, Objet, Corps (mise en demeure), Délai, Conséquences, Formule de politesse
3. Mentionne un délai de 8 jours pour régulariser la situation
4. Inclus les mentions légales appropriées
5. Longueur : environ 400-500 mots

Rédige uniquement le contenu de la mise en demeure, sans ajouter de commentaires.`
  },

  contrat_service: {
    nom: 'Contrat de prestation de services',
    description: 'Contrat entre le cabinet et le client',
    prompt: (dossier, client, cabinet) => `Tu es un assistant juridique expert. Rédige un contrat de prestation de services juridiques professionnel.

CONTEXTE :
- Dossier : ${dossier.nom}
- Type d'affaire : ${dossier.typeAffaire || 'Services juridiques'}

CLIENT :
- Nom : ${client?.prenom} ${client?.nom}
- Email : ${client?.email || ''}

CABINET (prestataire) :
- Nom : ${cabinet?.nom || 'Cabinet'}
- Adresse : ${cabinet?.adresse || ''}

INSTRUCTIONS :
1. Structure complète du contrat :
   - Article 1 : Objet du contrat
   - Article 2 : Durée et prise d'effet
   - Article 3 : Obligations du prestataire
   - Article 4 : Obligations du client
   - Article 5 : Honoraires
   - Article 6 : Confidentialité
   - Article 7 : Résiliation
   - Article 8 : Droit applicable et juridiction
2. Ton formel et juridique
3. Clauses standards pour un contrat de services juridiques
4. Longueur : environ 600-800 mots

Rédige uniquement le contrat, sans commentaires.`
  },

  assignation: {
    nom: 'Assignation en justice',
    description: 'Acte d\'assignation pour une procédure',
    prompt: (dossier, client, cabinet) => `Tu es un assistant juridique expert. Rédige une assignation en justice.

CONTEXTE DU DOSSIER :
- Affaire : ${dossier.nom}
- Description : ${dossier.description || ''}
- Type : ${dossier.typeAffaire || 'Civil'}
- Juridiction : ${dossier.juridiction || 'Tribunal compétent'}

DEMANDEUR (client) :
- Nom : ${client?.prenom} ${client?.nom}
- Adresse : ${client?.adresse || ''}

AVOCAT :
- Cabinet : ${cabinet?.nom || 'Cabinet'}

INSTRUCTIONS :
1. Structure de l'assignation :
   - En-tête (juridiction, date)
   - Identification du demandeur et du défendeur
   - Exposé des faits
   - Prétentions et fondement juridique
   - Dispositif (demandes au tribunal)
   - Mention des pièces
2. Ton formel et juridique
3. Références aux articles de loi pertinents
4. Longueur : environ 700-900 mots

Rédige uniquement l'assignation, sans commentaires.`
  },

  requete: {
    nom: 'Requête',
    description: 'Requête simple devant le juge',
    prompt: (dossier, client, cabinet) => `Tu es un assistant juridique expert. Rédige une requête simple.

CONTEXTE :
- Dossier : ${dossier.nom}
- Description : ${dossier.description || ''}
- Type d'affaire : ${dossier.typeAffaire || ''}
- Juridiction : ${dossier.juridiction || 'Tribunal compétent'}

REQUÉRANT :
- Nom : ${client?.prenom} ${client?.nom}

AVOCAT :
- Cabinet : ${cabinet?.nom || 'Cabinet'}

INSTRUCTIONS :
1. Structure : En-tête, Objet, Exposé, Demandes, Formule de politesse
2. Ton formel et respectueux
3. Argumentation juridique claire
4. Longueur : environ 400-600 mots

Rédige uniquement la requête.`
  },

  courrier_simple: {
    nom: 'Courrier juridique',
    description: 'Courrier professionnel',
    prompt: (dossier, client, cabinet) => `Tu es un assistant juridique expert. Rédige un courrier juridique professionnel.

CONTEXTE :
- Dossier : ${dossier.nom}
- Description : ${dossier.description || ''}

DESTINATAIRE :
- Nom : ${client?.prenom} ${client?.nom}

EXPÉDITEUR :
- Cabinet : ${cabinet?.nom || 'Cabinet'}
- Adresse : ${cabinet?.adresse || ''}

INSTRUCTIONS :
1. Courrier formel avec en-tête, objet, corps, formule de politesse
2. Ton professionnel et courtois
3. Clair et concis
4. Longueur : environ 300-400 mots

Rédige uniquement le courrier.`
  },

  conclusions: {
    nom: 'Conclusions',
    description: 'Conclusions devant le tribunal',
    prompt: (dossier, client, cabinet) => `Tu es un assistant juridique expert. Rédige des conclusions.

AFFAIRE :
- Dossier : ${dossier.nom}
- Type : ${dossier.typeAffaire || 'Civil'}
- Juridiction : ${dossier.juridiction || 'Tribunal'}

PARTIE REPRÉSENTÉE :
- Nom : ${client?.prenom} ${client?.nom}

AVOCAT :
- Cabinet : ${cabinet?.nom || 'Cabinet'}

INSTRUCTIONS :
1. Structure : En-tête, Exposé des faits, Moyens et prétentions, Dispositif
2. Argumentation juridique solide
3. Références aux textes de loi
4. Ton formel et professionnel
5. Longueur : environ 800-1000 mots

Rédige uniquement les conclusions.`
  }
};

// @desc    Générer un document juridique avec l'IA
// @route   POST /api/documents/generate
// @access  Private
export const generateDocument = async (req, res) => {
  try {
    const { dossierId, templateType, promptContextuel } = req.body;

    // Validation
    if (!dossierId) {
      return res.status(400).json({
        success: false,
        message: 'L\'ID du dossier est requis'
      });
    }

    if (!templateType) {
      return res.status(400).json({
        success: false,
        message: 'Le type de document est requis'
      });
    }

    if (!TEMPLATES_JURIDIQUES[templateType]) {
      return res.status(400).json({
        success: false,
        message: 'Type de document non reconnu',
        templatesDisponibles: Object.keys(TEMPLATES_JURIDIQUES)
      });
    }

    // La vérification de la clé OpenAI sera faite dans getOpenAIClient()

    // ÉTAPE 1 : Récupérer les données du dossier
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });
    const cabinetId = user.role === 'ADMIN' ? user.id : user.id;

    const dossier = await prisma.dossier.findFirst({
      where: {
        id: dossierId,
        cabinetId
      },
      include: {
        responsable: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true
          }
        }
      }
    });

    if (!dossier) {
      return res.status(404).json({
        success: false,
        message: 'Dossier non trouvé'
      });
    }

    // Récupérer les infos du cabinet
    const cabinetUser = await prisma.user.findUnique({
      where: { id: cabinetId }
    });
    const cabinet = {
      nom: cabinetUser?.cabinetNom,
      adresse: cabinetUser?.cabinetAdresse
    };

    // ÉTAPE 2 : Construire le prompt
    const template = TEMPLATES_JURIDIQUES[templateType];
    const client = {
      nom: dossier.clientNom,
      prenom: dossier.clientPrenom,
      email: dossier.clientEmail,
      telephone: dossier.clientTelephone,
      adresse: dossier.clientAdresse
    };
    let systemPrompt = template.prompt(dossier, client, cabinet);

    // Ajouter le prompt contextuel si fourni
    if (promptContextuel && promptContextuel.trim()) {
      systemPrompt += `\n\nCONTEXTE SUPPLÉMENTAIRE :\n${promptContextuel}`;
    }

    // ÉTAPE 3 : Appeler OpenAI
    console.log('📝 Génération du document avec OpenAI...');
    
    let openaiClient;
    try {
      openaiClient = getOpenAIClient();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message || 'La clé API OpenAI n\'est pas configurée'
      });
    }
    
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Tu es un assistant juridique expert spécialisé dans la rédaction de documents juridiques en français. Tu rédiges des documents professionnels, formels et conformes aux normes juridiques françaises.'
        },
        {
          role: 'user',
          content: systemPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const contenuGenere = completion.choices[0].message.content;

    // ÉTAPE 4 : Convertir en PDF avec PDFKit
    console.log('📄 Conversion en PDF...');

    const pdfBuffer = await new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 72, right: 72 }
      });

      const chunks = [];
      
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // En-tête
      doc.fontSize(18).font('Helvetica-Bold');
      doc.text(template.nom.toUpperCase(), { align: 'center' });
      doc.moveDown(0.5);

      // Date et infos cabinet
      doc.fontSize(10).font('Helvetica');
      doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, { align: 'right' });
      if (cabinet?.nom) {
        doc.text(cabinet.nom, { align: 'right' });
      }
      if (cabinet?.adresse) {
        doc.text(cabinet.adresse, { align: 'right' });
      }
      doc.moveDown(2);

      // Contenu généré
      doc.fontSize(11).font('Helvetica');
      
      // Diviser le contenu en paragraphes et les ajouter
      const paragraphes = contenuGenere.split('\n\n');
      paragraphes.forEach((paragraphe, index) => {
        if (paragraphe.trim()) {
          doc.text(paragraphe.trim(), {
            align: 'justify',
            lineGap: 5
          });
          
          if (index < paragraphes.length - 1) {
            doc.moveDown(1);
          }
        }
      });

      // Pied de page
      doc.moveDown(2);
      doc.fontSize(9).font('Helvetica-Oblique');
      doc.text('Document généré automatiquement par JurisFlow', { align: 'center' });

      doc.end();
    });

    // ÉTAPE 5 : Uploader sur S3
    console.log('☁️ Upload vers Supabase Storage...');

    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    const nomFichier = `${template.nom.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}_${uniqueSuffix}.pdf`;
    const keyS3 = `dossiers/${dossierId}/documents_generes/${nomFichier}`;

    // Upload vers Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(keyS3, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
        metadata: {
          'generated-by': 'jurisflow-ia',
          'template-type': templateType,
          'dossier-id': dossierId,
          'uploader-id': req.user.userId,
          'generated-at': new Date().toISOString()
        }
      });

    if (uploadError) {
      throw uploadError;
    }

    // Obtenir l'URL publique
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(keyS3);

    const urlS3 = urlData.publicUrl;

    // ÉTAPE 6 : Sauvegarder en base de données
    console.log('💾 Sauvegarde en base de données...');

    const document = await prisma.document.create({
      data: {
        nomFichier,
        urlS3,
        keyS3,
        typeMime: 'application/pdf',
        taille: pdfBuffer.length,
        dossierId: dossierId,
        uploaderId: req.user.userId,
        description: `Document généré par IA : ${template.nom}`,
        categorie: 'AUTRE'
      },
      include: {
        uploader: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true
          }
        }
      }
    });

    // ÉTAPE 7 : Mettre à jour la timeline du dossier
    await prisma.dossierTimeline.create({
      data: {
        action: 'Document généré par IA',
        description: `Un ${template.nom} a été généré automatiquement`,
        auteurId: req.user.userId,
        dossierId: dossierId,
        date: new Date()
      }
    });

    console.log('✅ Document généré avec succès');

    // Formater le document pour la réponse
    const documentFormatted = {
      id: document.id,
      nomFichier: document.nomFichier,
      urlS3: document.urlS3,
      keyS3: document.keyS3,
      typeMime: document.typeMime,
      taille: document.taille,
      dossier: document.dossierId,
      uploader: document.uploader,
      description: document.description,
      categorie: document.categorie,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt
    };

    // Réponse
    res.status(201).json({
      success: true,
      message: 'Document généré avec succès',
      data: {
        document: documentFormatted,
        contenu: contenuGenere, // Renvoyer aussi le contenu pour prévisualisation
        template: template.nom
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de la génération du document:', error);

    // Erreur OpenAI
    if (error.error && error.error.type) {
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'appel à OpenAI',
        details: error.error.message
      });
    }

    // Erreur S3
    if (error.name === 'S3ServiceException') {
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'upload vers S3'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération du document'
    });
  }
};

// @desc    Lister les templates disponibles
// @route   GET /api/documents/templates
// @access  Private
export const getTemplates = async (req, res) => {
  try {
    const templates = Object.keys(TEMPLATES_JURIDIQUES).map(key => ({
      id: key,
      nom: TEMPLATES_JURIDIQUES[key].nom,
      description: TEMPLATES_JURIDIQUES[key].description
    }));

    res.status(200).json({
      success: true,
      data: {
        templates
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des templates:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des templates'
    });
  }
};


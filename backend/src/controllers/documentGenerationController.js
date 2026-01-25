import { prisma } from '../lib/prisma.js';
import { generateDocument, getAvailableDocumentTypes } from '../services/documentGenerationService.js';
import { uploadBuffer } from '../config/supabaseStorage.js';
import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, TextRun } from 'docx';

// @desc    Récupérer les types de documents disponibles
// @route   GET /api/studio-ia/document-types
// @access  Private
export const getDocumentTypes = async (req, res) => {
  try {
    const types = getAvailableDocumentTypes();
    
    res.status(200).json({
      success: true,
      data: { types }
    });
  } catch (error) {
    console.error('Erreur récupération types documents:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des types'
    });
  }
};

// @desc    Générer un document avec l'IA
// @route   POST /api/studio-ia/generate-document
// @access  Private
export const generateDocumentIA = async (req, res) => {
  try {
    const { documentType, options, dossierId, conversationId, saveToStorage = true } = req.body;
    const userId = req.user.userId;

    // Validation
    if (!documentType) {
      return res.status(400).json({
        success: false,
        message: 'Le type de document est requis'
      });
    }

    // Récupérer les infos du cabinet de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        cabinetNom: true,
        cabinetAdresse: true,
        cabinetSiret: true,
        cabinetTelephoneContact: true,
        cabinetEmailContact: true,
        nom: true,
        prenom: true
      }
    });

    // Enrichir les options avec les infos du cabinet
    const enrichedOptions = {
      ...options,
      cabinet: {
        nom: user.cabinetNom || `Cabinet ${user.prenom} ${user.nom}`,
        adresse: user.cabinetAdresse || '',
        siret: user.cabinetSiret || '',
        telephone: user.cabinetTelephoneContact || '',
        email: user.cabinetEmailContact || '',
        representant: `${user.prenom} ${user.nom}`
      }
    };

    console.log(`🔄 Génération document type: ${documentType}`);

    // Générer le document
    const content = await generateDocument(documentType, enrichedOptions);

    // Créer un titre basé sur le type et le contenu
    const title = options.objet || options.titre || `${documentType.replace(/-/g, ' ')} - ${new Date().toLocaleDateString('fr-FR')}`;

    // Sauvegarder dans la base de données
    const generatedDoc = await prisma.generatedDocument.create({
      data: {
        documentType: documentType.toUpperCase().replace(/-/g, '_'),
        content,
        title,
        userId,
        dossierId: dossierId || null,
        conversationId: conversationId || null,
        generationOptions: JSON.stringify(options)
      }
    });

    let downloadUrl = null;
    let keyS3 = null;

    // Sauvegarder dans Supabase Storage si demandé
    if (saveToStorage) {
      try {
        const fileName = `${title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.txt`;
        const filePath = `generated-documents/${userId}/${fileName}`;
        
        // Upload le contenu en tant que buffer
        const buffer = Buffer.from(content, 'utf-8');
        const result = await uploadBuffer(buffer, filePath, 'text/plain');

        downloadUrl = result.publicUrl;
        keyS3 = filePath;

        // Mettre à jour le document avec l'URL
        await prisma.generatedDocument.update({
          where: { id: generatedDoc.id },
          data: {
            urlS3: downloadUrl,
            keyS3
          }
        });

        console.log('✅ Document sauvegardé dans Supabase Storage');
      } catch (storageError) {
        console.error('⚠️  Erreur sauvegarde Supabase Storage:', storageError);
        // Ne pas bloquer si le storage échoue
      }
    }

    res.status(201).json({
      success: true,
      data: {
        documentId: generatedDoc.id,
        content,
        title,
        downloadUrl,
        keyS3
      }
    });

  } catch (error) {
    console.error('❌ Erreur génération document:', error);

    if (error.message?.includes('Type de document non supporté')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    if (error.message?.includes('OPENAI_API_KEY')) {
      return res.status(500).json({
        success: false,
        message: 'La clé API OpenAI n\'est pas configurée'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération du document'
    });
  }
};

// @desc    Récupérer les documents générés
// @route   GET /api/studio-ia/generated-documents
// @access  Private
export const getGeneratedDocuments = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20, dossierId, documentType } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      userId,
      isArchived: false
    };

    if (dossierId) {
      where.dossierId = dossierId;
    }

    if (documentType) {
      where.documentType = documentType.toUpperCase().replace(/-/g, '_');
    }

    const [documents, total] = await Promise.all([
      prisma.generatedDocument.findMany({
        where,
        include: {
          dossier: {
            select: {
              id: true,
              nom: true,
              numeroAffaire: true
            }
          },
          conversation: {
            select: {
              id: true,
              title: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.generatedDocument.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: {
        documents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Erreur récupération documents générés:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des documents'
    });
  }
};

// @desc    Récupérer un document généré
// @route   GET /api/studio-ia/generated-documents/:id
// @access  Private
export const getGeneratedDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const document = await prisma.generatedDocument.findFirst({
      where: {
        id,
        userId
      },
      include: {
        dossier: {
          select: {
            id: true,
            nom: true,
            numeroAffaire: true
          }
        },
        conversation: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    res.status(200).json({
      success: true,
      data: { document }
    });

  } catch (error) {
    console.error('Erreur récupération document:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du document'
    });
  }
};

// @desc    Mettre à jour un document généré
// @route   PATCH /api/studio-ia/generated-documents/:id
// @access  Private
export const updateGeneratedDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, title, syncStorage = false } = req.body;
    const userId = req.user.userId;

    const document = await prisma.generatedDocument.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    const updated = await prisma.generatedDocument.update({
      where: { id },
      data: {
        content: content || document.content,
        title: title || document.title
      }
    });

    // Optionnel : resynchroniser le fichier dans Supabase Storage
    if (syncStorage && content) {
      const filePath = document.keyS3 || `generated-documents/${userId}/${(title || document.title).replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.txt`;
      const buffer = Buffer.from(content, 'utf-8');
      const result = await uploadBuffer(buffer, filePath, 'text/plain', true);

      await prisma.generatedDocument.update({
        where: { id },
        data: {
          urlS3: result.publicUrl,
          keyS3: filePath
        }
      });
    }

    res.status(200).json({
      success: true,
      data: { document: updated }
    });

  } catch (error) {
    console.error('Erreur mise à jour document:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour'
    });
  }
};

// @desc    Supprimer un document généré
// @route   DELETE /api/studio-ia/generated-documents/:id
// @access  Private
export const deleteGeneratedDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const document = await prisma.generatedDocument.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    // Archiver plutôt que supprimer
    await prisma.generatedDocument.update({
      where: { id },
      data: { isArchived: true }
    });

    res.status(200).json({
      success: true,
      message: 'Document archivé'
    });

  } catch (error) {
    console.error('Erreur suppression document:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression'
    });
  }
};

// @desc    Exporter un document généré (PDF/DOCX/TXT)
// @route   GET /api/studio-ia/generated-documents/:id/export?format=pdf|docx|txt
// @access  Private
export const exportGeneratedDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'txt' } = req.query;
    const userId = req.user.userId;

    const document = await prisma.generatedDocument.findFirst({
      where: { id, userId }
    });

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document non trouvé' });
    }

    const filename = `${document.title || 'document'}.${format}`;

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      const pdf = new PDFDocument({ margin: 50 });
      pdf.pipe(res);
      pdf.fontSize(12).text(document.content || '', { align: 'left' });
      pdf.end();
      return;
    }

    if (format === 'docx') {
      const paragraphs = (document.content || '').split('\n').map(line =>
        new Paragraph({ children: [new TextRun(line)] })
      );
      const docxDoc = new Document({
        sections: [{ children: paragraphs }]
      });
      const buffer = await Packer.toBuffer(docxDoc);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
      return;
    }

    // Default: txt
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(document.content || '');
  } catch (error) {
    console.error('Erreur export document:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'export' });
  }
};

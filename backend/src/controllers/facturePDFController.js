import PDFDocument from 'pdfkit';
import { prisma } from '../lib/prisma.js';

// Helper pour obtenir le cabinetId
const getCabinetId = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  return user.role === 'ADMIN' ? user.id : user.id;
};

// @desc    Générer un PDF professionnel de facture
// @route   GET /api/factures/:id/pdf
// @access  Private
export const generateFacturePDF = async (req, res) => {
  try {
    const cabinetId = await getCabinetId(req.user.userId);

    // Récupérer la facture avec toutes les informations nécessaires
    const facture = await prisma.facture.findFirst({
      where: {
        id: req.params.id,
        cabinetId,
        isArchived: false
      },
      include: {
        dossier: {
          select: {
            id: true,
            nom: true,
            clientNom: true,
            clientPrenom: true,
            clientEmail: true,
            clientTelephone: true,
            clientAdresse: true
          }
        },
        cabinet: {
          select: {
            nom: true,
            prenom: true,
            email: true,
            cabinetTelephone: true,
            cabinetAdresse: true,
            cabinetNom: true
          }
        },
        lignes: {
          orderBy: {
            id: 'asc'
          }
        }
      }
    });

    if (!facture) {
      return res.status(404).json({
        success: false,
        message: 'Facture non trouvée'
      });
    }

    // Créer le document PDF
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Facture ${facture.numeroFacture}`,
        Author: 'JurisFlow',
        Subject: 'Facture'
      }
    });
    

    // Configurer les headers pour le téléchargement AVANT de pipe
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Facture_${facture.numeroFacture}.pdf"`);

    // Pipe le PDF vers la réponse
    doc.pipe(res);

    // === EN-TÊTE ===
    // Logo / Nom du cabinet (à gauche)
    let cabinetNom = 'Cabinet Juridique';
    if (facture.cabinet?.cabinetNom) {
      cabinetNom = facture.cabinet.cabinetNom;
    } else if (facture.cabinet?.prenom && facture.cabinet?.nom) {
      cabinetNom = `${facture.cabinet.prenom} ${facture.cabinet.nom}`;
    } else if (facture.cabinet?.nom) {
      cabinetNom = facture.cabinet.nom;
    } else if (facture.cabinet?.prenom) {
      cabinetNom = facture.cabinet.prenom;
    }
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .text(cabinetNom, 50, 50, { align: 'left' });

    // Informations du cabinet
    doc.fontSize(9)
       .font('Helvetica')
       .text('Cabinet d\'avocats', 50, 80, { align: 'left' });
    
    if (facture.cabinet?.email) {
      doc.text(`Email: ${facture.cabinet.email}`, 50, 92, { align: 'left' });
    }
    if (facture.cabinet?.cabinetTelephone) {
      doc.text(`Tél: ${facture.cabinet.cabinetTelephone}`, 50, 104, { align: 'left' });
    }
    if (facture.cabinet?.cabinetAdresse) {
      doc.text(`Adresse: ${facture.cabinet.cabinetAdresse}`, 50, 116, { align: 'left' });
    }

    // Titre FACTURE (à droite)
    // Calculer la largeur du texte pour un alignement parfait
    doc.fontSize(32)
       .font('Helvetica-Bold')
       .fillColor('#1e40af');
    
    const factureText = 'FACTURE';
    const textWidth = doc.widthOfString(factureText);
    const pageWidth = 595; // Largeur A4 en points
    const rightMargin = 50;
    const xPosition = pageWidth - rightMargin - textWidth;
    
    doc.text(factureText, xPosition, 50);

    // Numéro de facture
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#000000');
    
    const numeroText = `N° ${facture.numeroFacture}`;
    const numeroWidth = doc.widthOfString(numeroText);
    const numeroXPosition = pageWidth - rightMargin - numeroWidth;
    
    doc.text(numeroText, numeroXPosition, 90);

    // Date d'émission
    const dateEmission = facture.dateEmission 
      ? new Date(facture.dateEmission).toLocaleDateString('fr-FR', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        })
      : new Date().toLocaleDateString('fr-FR', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        });
    doc.fontSize(10)
       .font('Helvetica');
    const dateText = `Date d'émission: ${dateEmission}`;
    const dateWidth = doc.widthOfString(dateText);
    const dateXPosition = pageWidth - rightMargin - dateWidth;
    doc.text(dateText, dateXPosition, 110);

    // Date d'échéance
    if (facture.dateEcheance) {
      const dateEcheance = new Date(facture.dateEcheance).toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
      const echeanceText = `Date d'échéance: ${dateEcheance}`;
      const echeanceWidth = doc.widthOfString(echeanceText);
      const echeanceXPosition = pageWidth - rightMargin - echeanceWidth;
      doc.text(echeanceText, echeanceXPosition, 125);
    }

    // === INFORMATIONS CLIENT ===
    let yPos = 150;
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .text('FACTURÉ À:', 50, yPos);

    yPos += 15;
    doc.fontSize(8)
       .font('Helvetica');

    if (facture.dossier?.clientNom || facture.dossier?.clientPrenom) {
      const clientNom = `${facture.dossier.clientPrenom || ''} ${facture.dossier.clientNom || ''}`.trim();
      doc.text(clientNom, 50, yPos);
      yPos += 10;
    }

    if (facture.dossier?.clientAdresse) {
      doc.text(facture.dossier.clientAdresse, 50, yPos);
      yPos += 10;
    }

    if (facture.dossier?.clientEmail) {
      doc.text(`Email: ${facture.dossier.clientEmail}`, 50, yPos);
      yPos += 10;
    }

    if (facture.dossier?.clientTelephone) {
      doc.text(`Tél: ${facture.dossier.clientTelephone}`, 50, yPos);
    }

    // === LIGNES DE FACTURATION ===
    yPos = 230;
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .text('DÉTAIL DES PRESTATIONS:', 50, yPos);

    yPos += 15;

    // En-tête du tableau
    doc.fontSize(7)
       .font('Helvetica-Bold')
       .fillColor('#ffffff')
       .rect(50, yPos, 495, 14)
       .fill('#1e40af');

    doc.text('Description', 60, yPos + 4);
    doc.text('Qté', 350, yPos + 4, { width: 50, align: 'right' });
    doc.text('Prix unit.', 410, yPos + 4, { width: 60, align: 'right' });
    doc.text('Total', 480, yPos + 4, { width: 60, align: 'right' });

    yPos += 18;
    doc.fillColor('#000000');

    // Lignes de facturation
    facture.lignes.forEach((ligne, index) => {
      const totalLigne = (ligne.quantite || 0) * (ligne.prixUnitaire || 0);

      // Fond alterné pour les lignes
      if (index % 2 === 0) {
        doc.rect(50, yPos - 2, 495, 14)
           .fillColor('#f3f4f6')
           .fill()
           .fillColor('#000000');
      }

      doc.fontSize(7)
         .font('Helvetica')
         .text(ligne.description || '', 60, yPos, { width: 280 });

      doc.text((ligne.quantite || 0).toString(), 350, yPos, { width: 50, align: 'right' });
      doc.text(formatEuro(ligne.prixUnitaire || 0), 410, yPos, { width: 60, align: 'right' });
      doc.text(formatEuro(totalLigne), 480, yPos, { width: 60, align: 'right' });

      yPos += 14;
    });

    // === TOTAUX ===
    yPos += 6;
    const totalHT = facture.totalHT || 0;
    const tva = facture.tva || 20;
    const montantTVA = totalHT * (tva / 100);
    const totalTTC = facture.totalTTC || 0;

    // Ligne de séparation
    doc.moveTo(350, yPos)
       .lineTo(545, yPos)
       .stroke();

    yPos += 10;

    // Total HT
    doc.fontSize(8)
       .font('Helvetica')
       .text('Total HT:', 350, yPos, { width: 100, align: 'right' });
    doc.font('Helvetica-Bold')
       .text(formatEuro(totalHT), 460, yPos, { width: 85, align: 'right' });

    yPos += 12;

    // TVA
    doc.font('Helvetica')
       .text(`TVA (${tva}%):`, 350, yPos, { width: 100, align: 'right' });
    doc.font('Helvetica-Bold')
       .text(formatEuro(montantTVA), 460, yPos, { width: 85, align: 'right' });

    yPos += 15;

    // Total TTC
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('#1e40af')
       .text('Total TTC:', 350, yPos, { width: 100, align: 'right' });
    doc.text(formatEuro(totalTTC), 460, yPos, { width: 85, align: 'right' });

    // === NOTES ===
    if (facture.notes) {
      yPos += 20;
      doc.fontSize(8)
         .font('Helvetica-Bold')
         .fillColor('#000000')
         .text('Notes:', 50, yPos);

      yPos += 10;
      doc.fontSize(7)
         .font('Helvetica')
         .text(facture.notes, 50, yPos, { width: 495, align: 'left' });
    }

    // === PIED DE PAGE ===
    // Ajouter le pied de page en bas de la page (seulement si on est sur la première page)
    const pageHeight = 842; // Hauteur A4 en points
    const footerY = pageHeight - 30;
    
    doc.fontSize(7)
       .font('Helvetica')
       .fillColor('#666666')
       .text(
         `JurisFlow - Facture ${facture.numeroFacture}`,
         50,
         footerY,
         { align: 'center', width: 495 }
       );

    // Finaliser le PDF
    doc.end();

  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    
    // Si la réponse a déjà été envoyée (début du stream), on ne peut pas envoyer d'erreur JSON
    if (res.headersSent) {
      return;
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération du PDF',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper pour formater les montants en euros
const formatEuro = (montant) => {
  // Convertir en nombre si ce n'est pas déjà le cas
  const num = typeof montant === 'string' ? parseFloat(montant) : montant;
  
  // Formater manuellement pour éviter les problèmes avec PDFKit
  const parts = num.toFixed(2).split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];
  
  // Ajouter des espaces pour les milliers (de droite à gauche)
  let formattedInteger = '';
  for (let i = integerPart.length - 1, count = 0; i >= 0; i--, count++) {
    if (count > 0 && count % 3 === 0) {
      formattedInteger = ' ' + formattedInteger;
    }
    formattedInteger = integerPart[i] + formattedInteger;
  }
  
  return formattedInteger + ',' + decimalPart + ' €';
};


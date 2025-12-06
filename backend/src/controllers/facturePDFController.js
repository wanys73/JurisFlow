import PDFDocument from 'pdfkit';
import { prisma } from '../lib/prisma.js';
import https from 'https';
import http from 'http';

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
            client: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                email: true,
                telephone: true,
                adresse: true
              }
            },
            clientNom: true,
            clientPrenom: true,
            clientEmail: true,
            clientTelephone: true,
            clientAdresse: true
          }
        },
        client: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
            telephone: true,
            adresse: true
          }
        },
        cabinet: {
          select: {
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
            cabinetMentionsLegales: true
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

    // Debug : Logger les infos client et cabinet pour vérifier
    console.log('=== DEBUG FACTURE PDF ===');
    console.log('Facture ID:', facture.id);
    console.log('Facture numero:', facture.numeroFacture);
    console.log('Client direct:', facture.client ? {
      id: facture.client.id,
      nom: facture.client.nom,
      prenom: facture.client.prenom,
      email: facture.client.email
    } : null);
    console.log('Client via dossier:', facture.dossier?.client ? {
      id: facture.dossier.client.id,
      nom: facture.dossier.client.nom,
      prenom: facture.dossier.client.prenom
    } : null);
    console.log('Anciens champs client:', {
      clientNom: facture.dossier?.clientNom,
      clientPrenom: facture.dossier?.clientPrenom,
      clientEmail: facture.dossier?.clientEmail
    });
    console.log('Cabinet:', {
      nom: facture.cabinet?.cabinetNom,
      logo: facture.cabinet?.cabinetLogoUrl,
      siret: facture.cabinet?.cabinetSiret
    });
    console.log('Nombre de lignes:', facture.lignes?.length);
    console.log('========================');

    // Créer le document PDF avec marges réduites
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40, // Réduit de 50 à 40
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
    let yPosHeader = 40; // Réduit de 50 à 40
    
    // Logo du cabinet (si disponible)
    if (facture.cabinet?.cabinetLogoUrl) {
      try {
        console.log('📷 === TÉLÉCHARGEMENT DU LOGO ===');
        console.log('URL complète:', facture.cabinet.cabinetLogoUrl);
        
        // Télécharger l'image depuis l'URL
        const logoData = await new Promise((resolve, reject) => {
          const logoUrl = facture.cabinet.cabinetLogoUrl;
          const protocol = logoUrl.startsWith('https') ? https : http;
          
          console.log('🌐 Protocole:', protocol === https ? 'HTTPS' : 'HTTP');
          console.log('🔗 Envoi de la requête GET...');
          
          const request = protocol.get(logoUrl, (response) => {
            console.log('📡 Réponse reçue - Status:', response.statusCode);
            console.log('📋 Headers:', response.headers);
            
            if (response.statusCode === 301 || response.statusCode === 302) {
              console.log('↪️ Redirection vers:', response.headers.location);
              reject(new Error(`Redirection ${response.statusCode} vers ${response.headers.location}`));
              return;
            }
            
            if (response.statusCode !== 200) {
              reject(new Error(`HTTP ${response.statusCode}`));
              return;
            }
            
            const chunks = [];
            response.on('data', (chunk) => {
              chunks.push(chunk);
              console.log('📦 Chunk reçu:', chunk.length, 'bytes');
            });
            
            response.on('end', () => {
              const buffer = Buffer.concat(chunks);
              console.log('✅ Image téléchargée complète:', buffer.length, 'bytes');
              console.log('🎨 Type MIME:', response.headers['content-type']);
              resolve(buffer);
            });
            
            response.on('error', (err) => {
              console.error('❌ Erreur response:', err);
              reject(err);
            });
          });
          
          request.on('error', (err) => {
            console.error('❌ Erreur requête HTTP:', err);
            reject(err);
          });
          
          request.setTimeout(10000, () => {
            console.error('⏱️ Timeout après 10s');
            request.destroy();
            reject(new Error('Timeout'));
          });
        });
        
        console.log('🖼️ Insertion du logo dans le PDF à la position (40, ' + yPosHeader + ')...');
        doc.image(logoData, 40, yPosHeader, { 
          fit: [60, 60],
          align: 'left'
        });
        console.log('✅ Logo inséré avec succès dans le PDF');
        yPosHeader = 40; // On garde la position pour le texte à droite du logo
      } catch (error) {
        console.error('❌ === ERREUR LOGO ===');
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        console.error('URL tentée:', facture.cabinet.cabinetLogoUrl);
        // Continuer sans logo
      }
    } else {
      console.log('⚠️ Pas de logo configuré (cabinetLogoUrl est null ou undefined)');
    }
    
    // Nom du cabinet (à gauche ou sous le logo)
    let cabinetNom = 'Cabinet Juridique';
    if (facture.cabinet?.cabinetNom) {
      cabinetNom = facture.cabinet.cabinetNom;
    } else if (facture.cabinet?.prenom && facture.cabinet?.nom) {
      cabinetNom = `${facture.cabinet.prenom} ${facture.cabinet.nom}`;
    }
    
    const xPosLeft = facture.cabinet?.cabinetLogoUrl ? 110 : 40;
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#000000')
       .text(cabinetNom, xPosLeft, yPosHeader, { width: 200 });

    // Informations du cabinet
    doc.fontSize(7)
       .font('Helvetica');
    
    let yPosInfo = yPosHeader + 20;
    
    if (facture.cabinet?.cabinetAdresse) {
      const adresseLines = facture.cabinet.cabinetAdresse.split('\n');
      adresseLines.forEach(line => {
        doc.text(line.trim(), xPosLeft, yPosInfo, { width: 200 });
        yPosInfo += 8;
      });
    }
    
    const contactEmail = facture.cabinet?.cabinetEmailContact || facture.cabinet?.email;
    if (contactEmail) {
      doc.text(contactEmail, xPosLeft, yPosInfo);
      yPosInfo += 8;
    }
    
    if (facture.cabinet?.cabinetTelephoneContact) {
      doc.text(facture.cabinet.cabinetTelephoneContact, xPosLeft, yPosInfo);
    }

    // Titre FACTURE (à droite) - Réduit
    const pageWidth = 595;
    const rightMargin = 40;
    
    doc.fontSize(28)
       .font('Helvetica-Bold')
       .fillColor('#1e40af');
    
    const factureText = 'FACTURE';
    const textWidth = doc.widthOfString(factureText);
    const xPosition = pageWidth - rightMargin - textWidth;
    
    doc.text(factureText, xPosition, 40);

    // Numéro de facture
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#000000');
    
    const numeroText = `N° ${facture.numeroFacture}`;
    const numeroWidth = doc.widthOfString(numeroText);
    const numeroXPosition = pageWidth - rightMargin - numeroWidth;
    
    doc.text(numeroText, numeroXPosition, 75);

    // Date d'émission
    const dateEmission = facture.dateEmission 
      ? new Date(facture.dateEmission).toLocaleDateString('fr-FR', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        })
      : new Date().toLocaleDateString('fr-FR', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        });
    doc.fontSize(8)
       .font('Helvetica');
    const dateText = `Émission : ${dateEmission}`;
    const dateWidth = doc.widthOfString(dateText);
    const dateXPosition = pageWidth - rightMargin - dateWidth;
    doc.text(dateText, dateXPosition, 93);

    // Date d'échéance
    if (facture.dateEcheance) {
      const dateEcheance = new Date(facture.dateEcheance).toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
      const echeanceText = `Échéance : ${dateEcheance}`;
      const echeanceWidth = doc.widthOfString(echeanceText);
      const echeanceXPosition = pageWidth - rightMargin - echeanceWidth;
      doc.text(echeanceText, echeanceXPosition, 105);
    }

    // === INFORMATIONS CLIENT ===
    let yPos = 130; // Réduit de 155 à 130
    doc.fontSize(8)
       .font('Helvetica-Bold')
       .fillColor('#000000')
       .text('FACTURÉ À :', 40, yPos);

    yPos += 10;
    doc.fontSize(7)
       .font('Helvetica');

    // Déterminer le client (priorité: facture.client > dossier.client > anciens champs)
    const client = facture.client || facture.dossier?.client;
    
    console.log('Client déterminé pour le PDF:', client);
    
    if (client) {
      // Utiliser les données du client (nouveau format)
      const clientNom = `${client.prenom || ''} ${client.nom || ''}`.trim();
      if (clientNom) {
        doc.font('Helvetica-Bold').text(clientNom, 40, yPos);
        yPos += 9;
      }
      
      if (client.adresse) {
        const adresseLines = client.adresse.split('\n');
        adresseLines.forEach(line => {
          doc.font('Helvetica').text(line.trim(), 40, yPos, { width: 250 });
          yPos += 8;
        });
      }
      
      if (client.email) {
        doc.text(client.email, 40, yPos);
        yPos += 8;
      }
      
      if (client.telephone) {
        doc.text(client.telephone, 40, yPos);
        yPos += 8;
      }
    } else if (facture.dossier?.clientNom || facture.dossier?.clientPrenom) {
      // Fallback sur les anciens champs
      const clientNom = `${facture.dossier.clientPrenom || ''} ${facture.dossier.clientNom || ''}`.trim();
      if (clientNom) {
        doc.font('Helvetica-Bold').text(clientNom, 40, yPos);
        yPos += 9;
      }

      if (facture.dossier.clientAdresse) {
        const adresseLines = facture.dossier.clientAdresse.split('\n');
        adresseLines.forEach(line => {
          doc.font('Helvetica').text(line.trim(), 40, yPos, { width: 250 });
          yPos += 8;
        });
      }

      if (facture.dossier.clientEmail) {
        doc.text(facture.dossier.clientEmail, 40, yPos);
        yPos += 8;
      }

      if (facture.dossier.clientTelephone) {
        doc.text(facture.dossier.clientTelephone, 40, yPos);
        yPos += 8;
      }
    } else {
      console.warn('⚠️ AUCUN CLIENT TROUVÉ pour la facture:', facture.id);
      doc.font('Helvetica').text('Client non renseigné', 40, yPos);
      yPos += 8;
    }

    // === LIGNES DE FACTURATION ===
    yPos = Math.max(yPos + 10, 195); // Position optimisée
    doc.fontSize(8)
       .font('Helvetica-Bold')
       .fillColor('#000000')
       .text('DÉTAIL DES PRESTATIONS', 40, yPos);

    yPos += 10;

    // En-tête du tableau
    doc.fontSize(7)
       .font('Helvetica-Bold')
       .fillColor('#ffffff')
       .rect(40, yPos, 515, 11)
       .fill('#1e40af');

    doc.text('Description', 45, yPos + 3);
    doc.text('Qté', 380, yPos + 3, { width: 40, align: 'right' });
    doc.text('P.U.', 430, yPos + 3, { width: 50, align: 'right' });
    doc.text('Total', 490, yPos + 3, { width: 60, align: 'right' });

    yPos += 12;
    doc.fillColor('#000000');

    // Lignes de facturation
    facture.lignes.forEach((ligne, index) => {
      const totalLigne = (ligne.quantite || 0) * (ligne.prixUnitaire || 0);

      // Fond alterné pour les lignes
      if (index % 2 === 0) {
        doc.rect(40, yPos - 1, 515, 11)
           .fillColor('#f9fafb')
           .fill()
           .fillColor('#000000');
      }

      doc.fontSize(6.5)
         .font('Helvetica')
         .text(ligne.description || '', 45, yPos, { width: 320 });

      doc.text((ligne.quantite || 0).toString(), 380, yPos, { width: 40, align: 'right' });
      doc.text(formatEuro(ligne.prixUnitaire || 0), 430, yPos, { width: 50, align: 'right' });
      doc.text(formatEuro(totalLigne), 490, yPos, { width: 60, align: 'right' });

      yPos += 11;
    });

    // === TOTAUX ===
    yPos += 4;
    const totalHT = facture.totalHT || 0;
    const tva = facture.tva || 20;
    const montantTVA = totalHT * (tva / 100);
    const totalTTC = facture.totalTTC || 0;

    // Ligne de séparation
    doc.strokeColor('#cccccc')
       .moveTo(380, yPos)
       .lineTo(555, yPos)
       .stroke();

    yPos += 6;

    // Total HT
    doc.fontSize(7)
       .font('Helvetica')
       .fillColor('#000000')
       .text('Total HT :', 380, yPos, { width: 100, align: 'right' });
    doc.font('Helvetica-Bold')
       .text(formatEuro(totalHT), 490, yPos, { width: 60, align: 'right' });

    yPos += 8;

    // TVA
    doc.font('Helvetica')
       .text(`TVA (${tva}%) :`, 380, yPos, { width: 100, align: 'right' });
    doc.font('Helvetica-Bold')
       .text(formatEuro(montantTVA), 490, yPos, { width: 60, align: 'right' });

    yPos += 10;

    // Total TTC
    doc.fontSize(8)
       .font('Helvetica-Bold')
       .fillColor('#1e40af')
       .text('Total TTC :', 380, yPos, { width: 100, align: 'right' });
    doc.text(formatEuro(totalTTC), 490, yPos, { width: 60, align: 'right' });

    // === NOTES (si présentes et si on a de la place) ===
    if (facture.notes && yPos < 650) {
      yPos += 12;
      doc.fontSize(6.5)
         .font('Helvetica-Bold')
         .fillColor('#000000')
         .text('Notes :', 40, yPos);

      yPos += 7;
      doc.fontSize(6)
         .font('Helvetica')
         .text(facture.notes, 40, yPos, { width: 515, align: 'left' });
      yPos += 10;
    }

    // === SIGNATURE (si disponible, facture envoyée/payée ET on a de la place) ===
    const maxContentY = 720; // Position max avant le pied de page forcé
    
    console.log('🖊️ Vérification de la signature:');
    console.log('  - SignatureUrl:', facture.cabinet?.cabinetSignatureUrl);
    console.log('  - Statut facture:', facture.statut);
    console.log('  - Position Y:', yPos);
    console.log('  - Conditions:', {
      hasSignature: !!facture.cabinet?.cabinetSignatureUrl,
      statutOK: facture.statut === 'PAYEE' || facture.statut === 'ENVOYEE',
      spaceOK: yPos < 650
    });
    
    if (facture.cabinet?.cabinetSignatureUrl && 
        (facture.statut === 'PAYEE' || facture.statut === 'ENVOYEE') &&
        yPos < 650) {
      try {
        console.log('✅ Conditions remplies, téléchargement de la signature...');
        
        const signatureData = await new Promise((resolve, reject) => {
          const protocol = facture.cabinet.cabinetSignatureUrl.startsWith('https') ? https : http;
          protocol.get(facture.cabinet.cabinetSignatureUrl, (response) => {
            console.log('📡 Réponse signature, status:', response.statusCode);
            
            if (response.statusCode !== 200) {
              reject(new Error(`HTTP ${response.statusCode}`));
              return;
            }
            
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => {
              const buffer = Buffer.concat(chunks);
              console.log('✅ Signature téléchargée:', buffer.length, 'bytes');
              resolve(buffer);
            });
            response.on('error', reject);
          }).on('error', reject);
        });
        
        // Positionnement fixe en bas à droite de la page
        const signatureWidth = 120; // Largeur agrandie
        const signatureHeight = 50; // Hauteur agrandie
        const pageHeight = 842; // Hauteur page A4
        const footerHeight = 760; // Position du pied de page
        
        // Position signature : juste au-dessus du pied de page, alignée à droite
        const yPosSignature = footerHeight - signatureHeight - 25; // 25px d'espace au-dessus du pied de page
        const xPosSignature = 555 - signatureWidth; // Aligné à droite (555 = largeur page - marge droite)
        
        doc.fontSize(7)
           .font('Helvetica')
           .fillColor('#000000')
           .text('Signature :', xPosSignature, yPosSignature - 12);
        
        doc.image(signatureData, xPosSignature, yPosSignature, { 
          fit: [signatureWidth, signatureHeight],
          align: 'right'
        });
        console.log('✅ Signature insérée dans le PDF (bas droite, position fixe:', yPosSignature, ')');
        
        // Ne pas modifier yPos car la signature est en position absolue
      } catch (error) {
        console.error('❌ Erreur lors du chargement de la signature:', error);
      }
    } else {
      console.log('⚠️ Signature non affichée, raison:', 
        !facture.cabinet?.cabinetSignatureUrl ? 'Pas de signature configurée' :
        !(facture.statut === 'PAYEE' || facture.statut === 'ENVOYEE') ? `Statut incorrect: ${facture.statut}` :
        'Position Y trop basse'
      );
    }

    // === PIED DE PAGE (FORCÉ SUR PAGE 1) ===
    // Position absolue pour garantir une seule page
    const pageHeight = 842;
    const footerY = 760; // Position fixe pour le pied de page (garantit page 1)
    
    console.log('Position finale du contenu:', yPos);
    console.log('Position du pied de page:', footerY);
    
    // Si le contenu dépasse, on réduit encore l'espace
    if (yPos > footerY - 40) {
      console.warn('⚠️ Contenu trop long, ajustement du pied de page');
    }
    
    // Ligne séparatrice
    doc.strokeColor('#e2e8f0')
       .moveTo(40, footerY)
       .lineTo(555, footerY)
       .stroke();
    
    // Informations légales
    doc.fontSize(6.5)
       .font('Helvetica')
       .fillColor('#64748b');
    
    let footerText = '';
    
    if (facture.cabinet?.cabinetSiret) {
      footerText += `SIRET : ${facture.cabinet.cabinetSiret}`;
    }
    
    if (facture.cabinet?.cabinetTvaIntracom) {
      if (footerText) footerText += '  •  ';
      footerText += `TVA : ${facture.cabinet.cabinetTvaIntracom}`;
    }
    
    if (footerText) {
      doc.text(footerText, 40, footerY + 7, { align: 'center', width: 515 });
    }
    
    // Mentions légales (compactes)
    if (facture.cabinet?.cabinetMentionsLegales) {
      doc.fontSize(5.5)
         .text(facture.cabinet.cabinetMentionsLegales, 40, footerY + 16, { 
           align: 'center', 
           width: 515,
           lineGap: 1
         });
    }

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


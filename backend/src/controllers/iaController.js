import OpenAI from 'openai';
import PDFDocument from 'pdfkit';
import crypto from 'crypto';
import https from 'https';
import http from 'http';
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

// Prompt Système pour JurisFlow AI
const PROMPT_SYSTEM_JURISFLOW = `Tu es un Juriste spécialisé en droit français et un assistant de cabinet d'avocats senior, nommé "JurisFlow AI". Ton rôle est de générer des documents juridiques ou de fournir des conseils juridiques clairs et précis pour des professionnels du droit.

Ton ton doit être formel, impartial et professionnel.

Exigences Spécifiques :

Pour les documents juridiques, utilise la terminologie juridique française appropriée (ex: 'attendu que', 'par ces motifs', 'assignation', 'mise en demeure').

Tes réponses doivent être structurées (en-têtes, paragraphes numérotés ou listes).

Si la requête le permet, cite des références juridiques ou des articles de loi (simulés s'ils ne sont pas disponibles, mais qui sonnent authentiques) pour donner du poids au document.

Ne réponds jamais à des questions qui sortent du cadre légal ou professionnel.`;

// Instructions strictes pour la génération de documents
const INSTRUCTIONS_FORMAT_DOCUMENT = `

⚠️ FORMAT DE SORTIE OBLIGATOIRE :
- Rédige UNIQUEMENT le contenu du document juridique
- NE PAS ajouter de phrases d'introduction comme "Bien sûr, voici votre document..." ou "Voici le document demandé..."
- NE PAS ajouter de formules de politesse finales ou de commentaires
- Commence directement par l'en-tête du document (si applicable) ou le premier paragraphe
- Le texte doit être prêt à être inséré directement dans un PDF sans modification
- PAS DE MARKDOWN : Ne pas utiliser #, **, *, ou tout autre symbole Markdown
- Utilise uniquement du texte brut avec des sauts de ligne pour structurer`;

// Fonction pour nettoyer le contenu généré (supprimer les phrases d'introduction et les balises Markdown)
const nettoyerContenuGenere = (contenu, cabinetNom = '', destinataireNom = '') => {
  if (!contenu) return contenu;

  let contenuNettoye = contenu.trim();

  // Supprimer les balises Markdown (###, ##, #, **, etc.)
  contenuNettoye = contenuNettoye
    .replace(/^#{1,6}\s+/gm, '') // Supprimer les titres Markdown (#, ##, ###, etc.)
    .replace(/\*\*(.+?)\*\*/g, '$1') // Supprimer le gras **texte**
    .replace(/\*(.+?)\*/g, '$1') // Supprimer l'italique *texte*
    .replace(/`(.+?)`/g, '$1') // Supprimer le code `texte`
    .replace(/\[(.+?)\]\(.+?\)/g, '$1'); // Supprimer les liens [texte](url) -> texte

  // Supprimer les phrases d'introduction communes
  const phrasesIntroduction = [
    /^Bien sûr,?\s*(voici|voilà)/i,
    /^Voici\s+(votre|le|un)/i,
    /^Voilà\s+(votre|le|un)/i,
    /^Je\s+(vous\s+)?(présente|fournis|rédige)/i,
    /^Voici\s+le\s+document\s+demandé/i,
    /^Voici\s+votre\s+document/i,
    /^Je\s+vous\s+envoie/i,
    /^Voici\s+la\s+rédaction/i,
    /^J'ai\s+rédigé/i,
    /^Voici\s+une\s+rédaction/i
  ];

  phrasesIntroduction.forEach(pattern => {
    contenuNettoye = contenuNettoye.replace(pattern, '').trim();
  });

  // Supprimer les formules de politesse finales communes
  const formulesPolitesse = [
    /\n\s*(Cordialement|Bien\s+cordialement|Sincèrement|Respectueusement)[\s,.]*$/i,
    /\n\s*(J'espère\s+que\s+cela\s+vous\s+convient|N'hésitez\s+pas\s+à\s+me\s+contacter)[\s,.]*$/i,
    /\n\s*(Si\s+vous\s+avez\s+des\s+questions|Pour\s+toute\s+question)[\s,.]*$/i
  ];

  formulesPolitesse.forEach(pattern => {
    contenuNettoye = contenuNettoye.replace(pattern, '').trim();
  });

  // Supprimer les deux-points suivis d'un saut de ligne au début
  contenuNettoye = contenuNettoye.replace(/^:\s*\n/, '').trim();

  // Remplacer les placeholders de signature par un marqueur spécial pour insertion ultérieure
  contenuNettoye = contenuNettoye
    .replace(/\[Signature[^\]]*\]/gi, '{{SIGNATURE_PLACEHOLDER}}')
    .replace(/\n\s*Signature\s*\n/gi, '\n{{SIGNATURE_PLACEHOLDER}}\n')
    .replace(/\n\s*Signature\s*:\s*\n/gi, '\n{{SIGNATURE_PLACEHOLDER}}\n')
    .replace(/\n\s*\[Signature manuscrite[^\]]*\]\s*\n/gi, '\n{{SIGNATURE_PLACEHOLDER}}\n')
    .replace(/\n\s*Fait à[^\n]*\n/gi, '\n')
    .replace(/\n\s*Fait le[^\n]*\n/gi, '\n');

  // Supprimer les répétitions du titre "MISE EN DEMEURE" (garder uniquement la première occurrence)
  const miseEnDemeureRegex = /(MISE\s+EN\s+DEMEURE)/gi;
  let firstOccurrence = true;
  contenuNettoye = contenuNettoye.replace(miseEnDemeureRegex, (match) => {
    if (firstOccurrence) {
      firstOccurrence = false;
      return match;
    }
    return ''; // Supprimer les occurrences suivantes
  });

  // Supprimer les répétitions de "[Non communiqué]" ou placeholders similaires
  contenuNettoye = contenuNettoye.replace(/\[Non communiqué\]/gi, '');
  
  // Supprimer les lignes de date (Date : ..., Fait à ... le ..., Fait le ...)
  contenuNettoye = contenuNettoye.replace(/^Date\s*:\s*[^\n]*\n?/gim, '');
  contenuNettoye = contenuNettoye.replace(/^Fait\s+à[^\n]*\n?/gim, '');
  contenuNettoye = contenuNettoye.replace(/^Fait\s+le[^\n]*\n?/gim, '');
  
  // Supprimer les lignes email/téléphone qui peuvent apparaître après le titre (format "email – téléphone")
  contenuNettoye = contenuNettoye.replace(/^[^\n]*@[^\n]*[–\-][^\n]*\d[^\n]*\n?/gim, '');
  contenuNettoye = contenuNettoye.replace(/^[^\n]*@[^\n]*\+[^\n]*\n?/gim, '');
  
  // SUPPRIMER LES BLOCS DU CABINET ET DESTINATAIRE QUI APPARAISSENT JUSTE APRÈS LE TITRE
  const lines = contenuNettoye.split('\n');
  const cleanedLines = [];
  let foundTitle = false;
  let skipNextLines = 0; // Nombre de lignes à sauter après le titre
  let inCabinetBlock = false;
  let inDestinataireBlock = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineLower = line.toLowerCase();
    let shouldSkip = false;
    
    // Détecter le titre "MISE EN DEMEURE"
    if (lineLower.includes('mise en demeure') && !foundTitle) {
      foundTitle = true;
      cleanedLines.push(lines[i]);
      continue;
    }
    
    // Si on vient de trouver le titre, vérifier les lignes suivantes
    if (foundTitle && skipNextLines === 0) {
      // Vérifier si c'est le début d'un bloc cabinet
      if (cabinetNom && cabinetNom.trim()) {
        const cabinetNomLower = cabinetNom.toLowerCase().trim();
        if (lineLower.includes(cabinetNomLower) || cabinetNomLower.includes(lineLower)) {
          inCabinetBlock = true;
          shouldSkip = true;
        }
      }
      
      // Vérifier si c'est une adresse (ligne qui ressemble à une adresse)
      if (!shouldSkip && (line.match(/^\d+.*(rue|avenue|boulevard|allée|chemin|place|impasse)/i) || 
          line.match(/^\d+.*\d{5}/) || // Code postal
          line.match(/@/))) { // Email
        if (inCabinetBlock) {
          shouldSkip = true;
        }
      }
      
      // Vérifier si c'est un email ou téléphone (y compris format "email – téléphone")
      // Cette ligne doit être supprimée même si elle apparaît après le titre mais avant "Objet :"
      // Détection améliorée pour capturer tous les formats : "email – téléphone", "email - téléphone", etc.
      if (!shouldSkip && (line.match(/@/) || line.match(/^\+?\d[\d\s\-\.]+$/) || 
          line.match(/@.*[–\-].*\+?\d/) || line.match(/@.*[–\-].*\d{10}/) ||
          line.match(/.*@.*[–\-].*\d/) || line.match(/.*@.*[–\-].*\+/) ||
          line.match(/.*@.*[–\-].*[0-9]/))) {
        shouldSkip = true; // Toujours supprimer les lignes email/téléphone après le titre
        if (inCabinetBlock) {
          inCabinetBlock = false; // Fin du bloc cabinet
        }
      }
      
      // Supprimer aussi les répétitions du titre "MISE EN DEMEURE" qui peuvent apparaître après
      if (!shouldSkip && lineLower.includes('mise en demeure') && foundTitle) {
        shouldSkip = true; // C'est une répétition du titre
      }
      
      // Vérifier si c'est le début d'un bloc destinataire
      if (!shouldSkip && lineLower.match(/^destinataire\s*$/i)) {
        inDestinataireBlock = true;
        shouldSkip = true;
      }
      
      // Si on est dans un bloc destinataire, supprimer les lignes suivantes (nom, adresse)
      if (!shouldSkip && inDestinataireBlock) {
        if (destinataireNom && destinataireNom.trim()) {
          const destinataireNomLower = destinataireNom.toLowerCase().trim();
          if (lineLower.includes(destinataireNomLower) || line.length < 50) {
            shouldSkip = true;
            // Si c'est une ligne vide après, c'est la fin du bloc
            if (i + 1 < lines.length && lines[i + 1].trim() === '') {
              inDestinataireBlock = false;
            }
          }
        } else {
          // Si pas de nom de destinataire, supprimer jusqu'à la ligne vide
          if (line.length > 0) {
            shouldSkip = true;
          } else {
            inDestinataireBlock = false;
          }
        }
      }
      
      // Supprimer aussi les lignes de date qui peuvent apparaître après le titre
      if (!shouldSkip && (line.match(/^Date\s*:/i) || line.match(/^Fait\s+(à|le)/i))) {
        shouldSkip = true;
      }
      
      // Si on trouve "Objet :" ou un numéro (1., 2., etc.), on arrête de supprimer
      if (!shouldSkip && (line.match(/^Objet\s*:/i) || line.match(/^\d+\.\s+/))) {
        inCabinetBlock = false;
        inDestinataireBlock = false;
        foundTitle = false; // On a passé la zone d'en-tête
      }
    }
    
    // Vérifier les répétitions dans le reste du document (après 30% du contenu)
    if (!shouldSkip && i > lines.length * 0.3 && !foundTitle) {
      // Vérifier les répétitions du cabinet
      if (cabinetNom && cabinetNom.trim()) {
        const cabinetNomLower = cabinetNom.toLowerCase().trim();
        if (lineLower.includes(cabinetNomLower) || cabinetNomLower.includes(lineLower)) {
          if (line.length < 60 && !line.match(/[.!?]$/) && !line.match(/^(1\.|2\.|3\.|4\.|5\.|Objet|Destinataire|MISE|Signature|Document généré|Pour le cabinet)/i)) {
            shouldSkip = true;
          }
        }
      }
      
      // Vérifier les répétitions du destinataire
      if (!shouldSkip && destinataireNom && destinataireNom.trim()) {
        const destinataireNomLower = destinataireNom.toLowerCase().trim();
        if (lineLower.match(/^destinataire\s*$/i) || 
            (lineLower.includes(destinataireNomLower) && line.match(/^destinataire/i))) {
          shouldSkip = true;
        }
        if (lineLower === destinataireNomLower && line.length < 50) {
          shouldSkip = true;
        }
      }
    }
    
    if (!shouldSkip) {
      cleanedLines.push(lines[i]);
    }
  }
  
  contenuNettoye = cleanedLines.join('\n');
  
  // Supprimer les blocs répétés du cabinet (plusieurs lignes consécutives) partout dans le document
  if (cabinetNom && cabinetNom.trim()) {
    const cabinetNomEscaped = cabinetNom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Supprimer les blocs qui commencent par le nom du cabinet et se répètent
    const cabinetBlockPattern = new RegExp(`(${cabinetNomEscaped}[^\\n]*\\n){2,}`, 'gi');
    contenuNettoye = contenuNettoye.replace(cabinetBlockPattern, '');
    
    // Supprimer aussi les blocs avec adresse, email, téléphone du cabinet
    const cabinetInfoPattern = new RegExp(`${cabinetNomEscaped}[^\\n]*\\n[^\\n]*(rue|avenue|boulevard|allée|@|\\+\\d)[^\\n]*\\n`, 'gi');
    contenuNettoye = contenuNettoye.replace(cabinetInfoPattern, '');
  }
  
  // Supprimer les sections "Destinataire" répétées partout dans le document
  if (destinataireNom && destinataireNom.trim()) {
    const destinataireNomEscaped = destinataireNom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Supprimer "Destinataire" suivi du nom sur plusieurs lignes
    const destinataireSectionPattern = new RegExp(`Destinataire\\s*\\n\\s*${destinataireNomEscaped}[^\\n]*\\n`, 'gi');
    contenuNettoye = contenuNettoye.replace(destinataireSectionPattern, '');
  }
  
  // Supprimer les lignes vides multiples (plus de 2 lignes vides consécutives)
  contenuNettoye = contenuNettoye.replace(/\n{3,}/g, '\n\n');

  return contenuNettoye;
};

// Templates de documents juridiques
const TEMPLATES_JURIDIQUES = {
  mise_en_demeure: {
    nom: 'Mise en demeure',
    description: 'Lettre formelle de mise en demeure',
    prompt: (dossier, client, cabinet, dateEmission, promptContextuel = '') => {
      // Extraire la ville du cabinet depuis l'adresse
      const cabinetVille = cabinet?.adresse ? cabinet.adresse.split(',').pop().trim() : '[Non communiqué]';
      
      // Parser le prompt contextuel pour extraire les informations supplémentaires
      let montant = '';
      let delai = '8 jours francs à compter de la réception de la présente mise en demeure';
      let consequences = 'En cas de non-réponse ou de refus de régularisation dans le délai imparti, nous nous verrons contraints de saisir les juridictions compétentes pour obtenir la condamnation au paiement des sommes dues, ainsi que des intérêts de retard et des dommages et intérêts.';
      let faits = dossier.description || '';
      let fondements = '';
      let objet = dossier.nom || 'Mise en demeure';
      
      // Variables pour le destinataire (peuvent être remplacées par le prompt contextuel)
      let destinataireNom = (client?.prenom && client?.nom) ? `${client.prenom} ${client.nom}` : (client?.nom || dossier.clientNom || '');
      let destinataireAdresse = client?.adresse || dossier.clientAdresse || '';
      let destinataireEmail = client?.email || dossier.clientEmail || '';
      let destinataireTelephone = client?.telephone || dossier.clientTelephone || '';
      
      // Si un prompt contextuel est fourni, essayer d'extraire les informations
      if (promptContextuel && promptContextuel.trim()) {
        const contextLower = promptContextuel.toLowerCase();
        
        // Extraire le montant
        const montantMatch = promptContextuel.match(/montant[^:]*:\s*([^\n]+)/i);
        if (montantMatch) {
          // Le montant arrive déjà avec "€" dans le format "1700 €"
          // Nettoyer pour éviter les doubles €
          montant = montantMatch[1].trim().replace(/\s*€\s*€\s*/g, ' €').trim();
        }
        
        // Extraire le destinataire
        const destinataireNomMatch = promptContextuel.match(/destinataire[^:]*nom[^:]*:\s*([^\n]+)/i);
        if (destinataireNomMatch) {
          destinataireNom = destinataireNomMatch[1].trim();
        }
        
        const destinataireAdresseMatch = promptContextuel.match(/destinataire[^:]*adresse[^:]*:\s*([^\n]+)/i);
        if (destinataireAdresseMatch) {
          destinataireAdresse = destinataireAdresseMatch[1].trim();
        }
        
        const destinataireEmailMatch = promptContextuel.match(/destinataire[^:]*email[^:]*:\s*([^\n]+)/i);
        if (destinataireEmailMatch) {
          destinataireEmail = destinataireEmailMatch[1].trim();
        }
        
        const destinataireTelephoneMatch = promptContextuel.match(/destinataire[^:]*téléphone[^:]*:\s*([^\n]+)/i);
        if (destinataireTelephoneMatch) {
          destinataireTelephone = destinataireTelephoneMatch[1].trim();
        }
        
        // Extraire le délai
        const delaiMatch = promptContextuel.match(/délai[^:]*:\s*([^\n]+)/i) ||
                          promptContextuel.match(/délai[^:]*de[^:]*:\s*([^\n]+)/i);
        if (delaiMatch) {
          delai = delaiMatch[1].trim();
        }
        
        // Extraire les conséquences
        const consequencesMatch = promptContextuel.match(/conséquences[^:]*:\s*([^\n]+(?:\n[^\n]+)*)/i);
        if (consequencesMatch) {
          consequences = consequencesMatch[1].trim();
        }
        
        // Extraire les faits
        const faitsMatch = promptContextuel.match(/faits[^:]*:\s*([^\n]+(?:\n[^\n]+)*)/i) ||
                         promptContextuel.match(/exposé[^:]*:\s*([^\n]+(?:\n[^\n]+)*)/i);
        if (faitsMatch) {
          faits = faitsMatch[1].trim();
        }
        
        // Extraire les fondements juridiques
        const fondementsMatch = promptContextuel.match(/fondement[^:]*:\s*([^\n]+(?:\n[^\n]+)*)/i);
        if (fondementsMatch) {
          fondements = fondementsMatch[1].trim();
        }
        
        // Extraire l'objet
        const objetMatch = promptContextuel.match(/objet[^:]*:\s*([^\n]+)/i);
        if (objetMatch) {
          objet = objetMatch[1].trim();
        }
      }
      
      // Construire le bloc cabinet (uniquement si les infos sont disponibles)
      let blocCabinet = '';
      if (cabinet?.nom) blocCabinet += `${cabinet.nom}\n`;
      if (cabinet?.adresse) blocCabinet += `${cabinet.adresse}\n`;
      const contactInfo = [];
      if (cabinet?.emailContact) contactInfo.push(cabinet.emailContact);
      if (cabinet?.telephoneContact) contactInfo.push(cabinet.telephoneContact);
      if (contactInfo.length > 0) blocCabinet += contactInfo.join(' – ');
      
      // Construire le bloc destinataire (utiliser les infos extraites du prompt contextuel si disponibles)
      let blocDestinataire = '';
      if (destinataireNom || destinataireAdresse) {
        blocDestinataire = '\nDestinataire\n';
        if (destinataireNom) {
          blocDestinataire += `${destinataireNom}\n`;
        }
        if (destinataireAdresse) {
          blocDestinataire += `${destinataireAdresse}\n`;
        }
        blocDestinataire += '\n';
      }
      
      // Construire la date (uniquement si la ville est disponible)
      let ligneDate = '';
      if (cabinetVille && cabinetVille !== '[Non communiqué]') {
        ligneDate = `              Fait à ${cabinetVille}, le ${dateEmission}\n\n`;
      } else {
        ligneDate = `              Fait le ${dateEmission}\n\n`;
      }
      
      // Construire le montant (uniquement si disponible) - le montant arrive déjà avec "€"
      let ligneMontant = '';
      if (montant) {
        // Le montant arrive déjà avec "€" du prompt contextuel, ne pas en ajouter un autre
        ligneMontant = `Montant demandé : ${montant}\n\n`;
      }
      
      // Construire la signature (uniquement si le nom du cabinet est disponible)
      let blocSignature = '';
      if (cabinet?.nom) {
        blocSignature = '\n\nSignature :\n' + cabinet.nom + '\n';
      }
      
      return `${PROMPT_SYSTEM_JURISFLOW}

Tu es une IA spécialisée dans la rédaction juridique française.

Tu dois produire un document de mise en demeure parfaitement mis en page, au format A4, avec une structure fixe sans aucune répétition.

RÈGLES STRUCTURELLES ABSOLUES (À RESPECTER 100%) :

AUCUNE répétition des éléments suivants :
- nom du cabinet
- adresse du cabinet
- email
- téléphone
- titre "MISE EN DEMEURE"
- bloc de signature

Le bloc du cabinet doit apparaître UNE SEULE FOIS, EN HAUT DE PAGE.
Jamais au milieu, jamais en bas.

Le titre "MISE EN DEMEURE" doit apparaître UNE SEULE FOIS et doit être CENTRÉ.

CONTRAINTES DE STYLE :
- Alignement du texte : justifié.
- Aucun doublon dans tout le document.
- Pas de markdown (pas de #, pas de gras, pas de symboles Markdown).
- Pas de répétition automatique du bloc de coordonnées à la fin.
- Format adapté à une page A4 exportée en PDF.

GESTION DES DONNÉES MANQUANTES :
Si une info n'est pas fournie, ne pas l'afficher dans le document généré. Ne jamais écrire "[Non communiqué]" ou des placeholders.

INTERDIT :
- Dupliquer un bloc.
- Réécrire le nom du cabinet plusieurs fois.
- Mettre le bloc cabinet en bas de page.
- Générer deux titres "MISE EN DEMEURE".
- Insérer des textes automatiques supplémentaires.
- Utiliser des balises Markdown (#, **, etc.).

STRUCTURE STRICTE DU DOCUMENT (À RESPECTER EXACTEMENT) :

${blocCabinet}${blocDestinataire}
                   MISE EN DEMEURE

${ligneDate}Objet : ${objet}

1. Exposé des faits

${faits || 'À compléter selon le contexte du dossier.'}

2. Fondement juridique

${fondements || `En application des articles pertinents du Code civil et du Code de commerce relatifs à ${dossier.typeAffaire || 'la matière concernée'}, notamment les articles relatifs aux obligations contractuelles et à la responsabilité civile.`}

3. Demande précise

${ligneMontant || 'Montant demandé : [À déterminer selon le dossier] €\n\n'}4. Délai de régularisation

${delai}

5. Conséquences en cas de non-réponse

${consequences}${blocSignature}

${INSTRUCTIONS_FORMAT_DOCUMENT}

IMPORTANT FINAL : 
- Génère UNIQUEMENT le contenu brut du document selon la structure ci-dessus.
- Ne répète JAMAIS le bloc du cabinet, le titre, ou la signature.
- Si une information n'est pas fournie dans la structure ci-dessus, ne l'invente pas et ne l'affiche pas.
- Commence directement par le bloc du cabinet (s'il est fourni), puis la section Destinataire (si fournie), puis le titre centré "MISE EN DEMEURE".`;
    }
  },

  contrat_service: {
    nom: 'Contrat de prestation de services',
    description: 'Contrat entre le cabinet et le client',
    prompt: (dossier, client, cabinet, dateEmission) => `Rédige un contrat de prestation de services juridiques professionnel en droit français.

📋 CONTEXTE DU DOSSIER :
- Nom du dossier : ${dossier.nom}
- Nature de l'affaire : ${dossier.typeAffaire || 'Services juridiques'}
- Description : ${dossier.description || 'Non spécifiée'}
- Date d'établissement : ${dateEmission}

👤 INFORMATIONS DU CLIENT (cocontractant) :
- Nom complet : ${client?.prenom || ''} ${client?.nom || ''}
- Adresse complète : ${client?.adresse || 'Non spécifiée'}
- Email : ${client?.email || 'Non spécifié'}
- Téléphone : ${client?.telephone || 'Non spécifié'}

🏛️ INFORMATIONS DU CABINET (prestataire) :
- Nom du cabinet : ${cabinet?.nom || 'Cabinet'}
- Adresse complète : ${cabinet?.adresse || 'Non spécifiée'}
- Email de contact : ${cabinet?.emailContact || 'Non spécifié'}
- Téléphone : ${cabinet?.telephoneContact || 'Non spécifié'}
- SIRET : ${cabinet?.siret || 'Non spécifié'}
- TVA Intracommunautaire : ${cabinet?.tvaIntracom || 'Non spécifiée'}

📝 INSTRUCTIONS DE RÉDACTION :
1. Structure complète du contrat avec articles numérotés :
   - Article 1 : Objet du contrat (préciser la nature des services juridiques)
   - Article 2 : Durée et prise d'effet
   - Article 3 : Obligations du prestataire (cabinet)
   - Article 4 : Obligations du client
   - Article 5 : Honoraires et modalités de paiement
   - Article 6 : Confidentialité et secret professionnel
   - Article 7 : Résiliation et conditions
   - Article 8 : Droit applicable et juridiction compétente
2. Utilise la terminologie juridique française appropriée
3. Cite les articles pertinents du Code civil (ex: articles 1101, 1134, 1153)
4. Ton formel et juridique
5. Longueur : environ 600-800 mots

${INSTRUCTIONS_FORMAT_DOCUMENT}`
  },

  assignation: {
    nom: 'Assignation en justice',
    description: 'Acte d\'assignation pour une procédure',
    prompt: (dossier, client, cabinet, dateEmission) => `Rédige une assignation en justice professionnelle en droit français.

📋 CONTEXTE DE L'AFFAIRE :
- Nom de l'affaire : ${dossier.nom}
- Description précise : ${dossier.description || 'Non spécifiée'}
- Nature du litige : ${dossier.typeAffaire || 'Civil'}
- Juridiction compétente : ${dossier.juridiction || 'Tribunal compétent'}
- Date de l'assignation : ${dateEmission}

👤 INFORMATIONS DU DEMANDEUR (client représenté) :
- Nom complet : ${client?.prenom || ''} ${client?.nom || ''}
- Adresse complète : ${client?.adresse || 'Non spécifiée'}
- Email : ${client?.email || 'Non spécifié'}
- Téléphone : ${client?.telephone || 'Non spécifié'}

🏛️ INFORMATIONS DU CABINET (avocat du demandeur) :
- Nom du cabinet : ${cabinet?.nom || 'Cabinet'}
- Adresse complète : ${cabinet?.adresse || 'Non spécifiée'}
- Email de contact : ${cabinet?.emailContact || 'Non spécifié'}
- Téléphone : ${cabinet?.telephoneContact || 'Non spécifié'}

📝 INSTRUCTIONS DE RÉDACTION :
1. Structure obligatoire de l'assignation :
   - En-tête : Juridiction, date, numéro de rôle (à compléter)
   - Identification du demandeur et du défendeur
   - Exposé des faits chronologique et détaillé
   - Moyens de droit et fondement juridique
   - Prétentions et dispositif (demandes précises au tribunal)
   - Mention des pièces justificatives
2. Utilise la terminologie juridique française ('attendu que', 'par ces motifs', 'demandons qu'il plaise au tribunal')
3. Cite les articles de loi pertinents (Code civil, Code de procédure civile, etc.)
4. Ton formel, impartial et professionnel
5. Longueur : environ 700-900 mots

${INSTRUCTIONS_FORMAT_DOCUMENT}`
  },

  requete: {
    nom: 'Requête',
    description: 'Requête simple devant le juge',
    prompt: (dossier, client, cabinet, dateEmission) => `Rédige une requête simple professionnelle en droit français.

📋 CONTEXTE DU DOSSIER :
- Nom du dossier : ${dossier.nom}
- Description : ${dossier.description || 'Non spécifiée'}
- Nature de l'affaire : ${dossier.typeAffaire || 'Non spécifiée'}
- Juridiction compétente : ${dossier.juridiction || 'Tribunal compétent'}
- Date de la requête : ${dateEmission}

👤 INFORMATIONS DU REQUÉRANT (client) :
- Nom complet : ${client?.prenom || ''} ${client?.nom || ''}
- Adresse complète : ${client?.adresse || 'Non spécifiée'}
- Email : ${client?.email || 'Non spécifié'}
- Téléphone : ${client?.telephone || 'Non spécifié'}

🏛️ INFORMATIONS DU CABINET (avocat) :
- Nom du cabinet : ${cabinet?.nom || 'Cabinet'}
- Adresse complète : ${cabinet?.adresse || 'Non spécifiée'}
- Email de contact : ${cabinet?.emailContact || 'Non spécifié'}
- Téléphone : ${cabinet?.telephoneContact || 'Non spécifié'}

📝 INSTRUCTIONS DE RÉDACTION :
1. Structure obligatoire :
   - En-tête : Juridiction, date
   - Objet : Résumé de la demande
   - Exposé des faits et du droit
   - Demandes précises au juge
   - Formule de politesse formelle
2. Utilise la terminologie juridique française appropriée
3. Argumentation juridique claire avec références aux articles de loi
4. Ton formel, respectueux et professionnel
5. Longueur : environ 400-600 mots

${INSTRUCTIONS_FORMAT_DOCUMENT}`
  },

  courrier_simple: {
    nom: 'Courrier juridique',
    description: 'Courrier professionnel',
    prompt: (dossier, client, cabinet, dateEmission) => `Rédige un courrier juridique professionnel en droit français.

📋 CONTEXTE DU DOSSIER :
- Nom du dossier : ${dossier.nom}
- Description : ${dossier.description || 'Non spécifiée'}
- Nature de l'affaire : ${dossier.typeAffaire || 'Non spécifiée'}
- Date d'émission : ${dateEmission}

👤 INFORMATIONS DU DESTINATAIRE :
- Nom complet : ${client?.prenom || ''} ${client?.nom || ''}
- Adresse complète : ${client?.adresse || 'Non spécifiée'}
- Email : ${client?.email || 'Non spécifié'}

🏛️ INFORMATIONS DU CABINET (expéditeur) :
- Nom du cabinet : ${cabinet?.nom || 'Cabinet'}
- Adresse complète : ${cabinet?.adresse || 'Non spécifiée'}
- Email de contact : ${cabinet?.emailContact || 'Non spécifié'}
- Téléphone : ${cabinet?.telephoneContact || 'Non spécifié'}

📝 INSTRUCTIONS DE RÉDACTION :
1. Structure formelle :
   - En-tête avec coordonnées du cabinet
   - Objet : Sujet du courrier
   - Corps : Message clair et structuré
   - Formule de politesse formelle
2. Ton professionnel, courtois et formel
3. Utilise la terminologie juridique appropriée si nécessaire
4. Clair, concis et direct
5. Longueur : environ 300-400 mots

${INSTRUCTIONS_FORMAT_DOCUMENT}`
  },

  conclusions: {
    nom: 'Conclusions',
    description: 'Conclusions devant le tribunal',
    prompt: (dossier, client, cabinet, dateEmission) => `Rédige des conclusions professionnelles en droit français.

📋 CONTEXTE DE L'AFFAIRE :
- Nom de l'affaire : ${dossier.nom}
- Description : ${dossier.description || 'Non spécifiée'}
- Nature du litige : ${dossier.typeAffaire || 'Civil'}
- Juridiction compétente : ${dossier.juridiction || 'Tribunal'}
- Date des conclusions : ${dateEmission}

👤 INFORMATIONS DE LA PARTIE REPRÉSENTÉE :
- Nom complet : ${client?.prenom || ''} ${client?.nom || ''}
- Adresse complète : ${client?.adresse || 'Non spécifiée'}
- Email : ${client?.email || 'Non spécifié'}
- Téléphone : ${client?.telephone || 'Non spécifié'}

🏛️ INFORMATIONS DU CABINET (avocat) :
- Nom du cabinet : ${cabinet?.nom || 'Cabinet'}
- Adresse complète : ${cabinet?.adresse || 'Non spécifiée'}
- Email de contact : ${cabinet?.emailContact || 'Non spécifié'}
- Téléphone : ${cabinet?.telephoneContact || 'Non spécifié'}

📝 INSTRUCTIONS DE RÉDACTION :
1. Structure obligatoire des conclusions :
   - En-tête : Juridiction, date, parties
   - Exposé des faits : Récit chronologique et détaillé
   - Moyens de droit : Argumentation juridique structurée
   - Prétentions : Demandes précises
   - Dispositif : Formule finale avec demandes au tribunal
2. Utilise la terminologie juridique française ('attendu que', 'par ces motifs', 'concluons')
3. Argumentation juridique solide avec citations d'articles de loi pertinents
4. Références aux textes de loi (Code civil, Code de procédure civile, jurisprudence)
5. Ton formel, impartial et professionnel
6. Longueur : environ 800-1000 mots

${INSTRUCTIONS_FORMAT_DOCUMENT}`
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

    // Récupérer les infos complètes du cabinet
    const cabinetUser = await prisma.user.findUnique({
      where: { id: cabinetId }
    });
    
    console.log('🏛️ Données du cabinet récupérées:', {
      nom: cabinetUser?.cabinetNom,
      logoUrl: cabinetUser?.cabinetLogoUrl ? 'présent' : 'absent',
      signatureUrl: cabinetUser?.cabinetSignatureUrl ? 'présent' : 'absent'
    });
    
    const cabinet = {
      nom: cabinetUser?.cabinetNom || 'Cabinet',
      adresse: cabinetUser?.cabinetAdresse || '',
      emailContact: cabinetUser?.cabinetEmailContact || '',
      telephoneContact: cabinetUser?.cabinetTelephoneContact || '',
      siret: cabinetUser?.cabinetSiret || '',
      tvaIntracom: cabinetUser?.cabinetTvaIntracom || '',
      cabinetLogoUrl: cabinetUser?.cabinetLogoUrl || null,
      cabinetSignatureUrl: cabinetUser?.cabinetSignatureUrl || null,
      cabinetMentionsLegales: cabinetUser?.cabinetMentionsLegales || ''
    };

    // ÉTAPE 2 : Construire le prompt avec toutes les données contextuelles
    const template = TEMPLATES_JURIDIQUES[templateType];
    const client = {
      nom: dossier.clientNom || '',
      prenom: dossier.clientPrenom || '',
      email: dossier.clientEmail || '',
      telephone: dossier.clientTelephone || '',
      adresse: dossier.clientAdresse || ''
    };

    // Date d'émission au format français
    const dateEmission = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Extraire les infos du destinataire du prompt contextuel AVANT de construire le prompt
    let destinataireNomPDF = (client?.prenom && client?.nom) ? `${client.prenom} ${client.nom}` : (client?.nom || dossier.clientNom || '');
    let destinataireAdressePDF = client?.adresse || dossier.clientAdresse || '';
    let destinataireEmailPDF = client?.email || dossier.clientEmail || '';
    let destinataireTelephonePDF = client?.telephone || dossier.clientTelephone || '';
    
    if (promptContextuel && promptContextuel.trim()) {
      const destinataireNomMatch = promptContextuel.match(/destinataire[^:]*nom[^:]*:\s*([^\n]+)/i);
      if (destinataireNomMatch) {
        destinataireNomPDF = destinataireNomMatch[1].trim();
      }
      
      const destinataireAdresseMatch = promptContextuel.match(/destinataire[^:]*adresse[^:]*:\s*([^\n]+)/i);
      if (destinataireAdresseMatch) {
        destinataireAdressePDF = destinataireAdresseMatch[1].trim();
      }
      
      const destinataireEmailMatch = promptContextuel.match(/destinataire[^:]*email[^:]*:\s*([^\n]+)/i);
      if (destinataireEmailMatch) {
        destinataireEmailPDF = destinataireEmailMatch[1].trim();
      }
      
      const destinataireTelephoneMatch = promptContextuel.match(/destinataire[^:]*téléphone[^:]*:\s*([^\n]+)/i);
      if (destinataireTelephoneMatch) {
        destinataireTelephonePDF = destinataireTelephoneMatch[1].trim();
      }
    }

    // Construire le prompt avec toutes les données (incluant le prompt contextuel)
    let systemPrompt = template.prompt(dossier, client, cabinet, dateEmission, promptContextuel || '');
    
    // Log pour debug : afficher les 500 premiers caractères du prompt
    console.log('📝 Prompt système (premiers 500 caractères):', systemPrompt.substring(0, 500));
    console.log('📝 Longueur totale du prompt:', systemPrompt.length, 'caractères');

    // ÉTAPE 3 : Appeler OpenAI avec le prompt système JurisFlow AI
    console.log('📝 Génération du document avec OpenAI (JurisFlow AI)...');
    
    let openaiClient;
    try {
      openaiClient = getOpenAIClient();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message || 'La clé API OpenAI n\'est pas configurée'
      });
    }
    
    // Le prompt détaillé avec les règles strictes doit être dans le message système
    // Le prompt système générique est intégré dans le prompt détaillé
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: systemPrompt // Le prompt détaillé avec toutes les règles strictes
        },
        {
          role: 'user',
          content: 'Génère maintenant le document de mise en demeure en respectant strictement toutes les règles et la structure fournie.'
        }
      ],
      temperature: 0.3, // Réduire la température pour plus de cohérence et moins de créativité
      max_tokens: 2500
    });

    let contenuGenere = completion.choices[0].message.content;
    
    // Nettoyer le contenu généré pour supprimer les phrases d'introduction et les répétitions
    contenuGenere = nettoyerContenuGenere(contenuGenere, cabinet?.nom, destinataireNomPDF);
    console.log('✅ Contenu généré et nettoyé');

    // ÉTAPE 4 : Télécharger la signature AVANT de créer le PDF
    // PAS DE LOGO pour les documents générés par l'IA (seulement pour les factures)
    let logoData = null; // Toujours null pour les documents IA
    let signatureData = null;
    
    console.log('🔍 Vérification des URLs:', {
      logoUrl: 'NON UTILISÉ (documents IA)',
      signatureUrl: cabinet?.cabinetSignatureUrl || 'NON DÉFINI'
    });
    
    // Télécharger la signature
    if (cabinet?.cabinetSignatureUrl) {
      try {
        console.log('🖊️ Téléchargement de la signature depuis:', cabinet.cabinetSignatureUrl);
        
        signatureData = await new Promise((resolve, reject) => {
          const signatureUrl = cabinet.cabinetSignatureUrl;
          console.log('🔗 URL de la signature:', signatureUrl);
          const protocol = signatureUrl.startsWith('https') ? https : http;
          
          const request = protocol.get(signatureUrl, (response) => {
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
          });
          
          request.on('error', reject);
          request.setTimeout(10000, () => {
            request.destroy();
            reject(new Error('Timeout'));
          });
        });
      } catch (error) {
        console.error('❌ Erreur lors du chargement de la signature:', error.message);
        signatureData = null;
      }
    }

    // ÉTAPE 5 : Convertir en PDF avec PDFKit
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

      // Constantes pour la gestion des sauts de page
      const PAGE_HEIGHT = 842; // Hauteur d'une page A4 en points
      const MARGIN_BOTTOM = 50;
      const MIN_SPACE_REQUIRED = 200; // Espace minimum requis avant de forcer un saut de page
      const PAGE_BREAK_THRESHOLD = PAGE_HEIGHT - MARGIN_BOTTOM - MIN_SPACE_REQUIRED; // ~592 points

      // Fonction helper pour vérifier et forcer un saut de page si nécessaire
      const checkPageBreak = (requiredSpace = MIN_SPACE_REQUIRED) => {
        const currentY = doc.y;
        const threshold = PAGE_HEIGHT - MARGIN_BOTTOM - requiredSpace;
        
        if (currentY > threshold) {
          console.log(`📄 Saut de page forcé à Y=${currentY.toFixed(2)} (seuil: ${threshold.toFixed(2)})`);
          doc.addPage();
          return true;
        }
        return false;
      };

      // Fonction helper pour estimer la hauteur d'un texte
      const estimateTextHeight = (text, fontSize, lineGap = 5) => {
        const maxWidth = doc.page.width - 144; // Largeur disponible (marges gauche + droite)
        const lineHeight = fontSize * 1.2; // Hauteur approximative d'une ligne
        
        // Utiliser heightOfString de PDFKit pour une estimation précise
        try {
          const height = doc.heightOfString(text, { 
            width: maxWidth,
            lineGap: lineGap
          });
          return height;
        } catch (e) {
          // Fallback : estimation basique
          const lines = Math.ceil(text.length / 80); // Approximation : ~80 caractères par ligne
          return lines * lineHeight + (lines - 1) * lineGap;
        }
      };

      // ===== EN-TÊTE PROFESSIONNEL À DEUX COLONNES =====
      const startY = 50; // Position Y de départ
      const leftMargin = 72; // Marge gauche
      const rightMargin = 72; // Marge droite
      const pageWidth = doc.page.width;
      const contentWidth = pageWidth - leftMargin - rightMargin;
      const columnWidth = 220; // Largeur fixe pour chaque colonne
      const spaceBetweenColumns = 60; // Espace entre les deux colonnes
      const leftColumnX = leftMargin;
      const rightColumnX = leftMargin + columnWidth + spaceBetweenColumns; // Colonne droite
      
      let currentY = startY;
      
      // === COLONNE GAUCHE : EXPÉDITEUR (CABINET) ===
      // PAS DE LOGO pour les documents générés par l'IA (seulement pour les factures)
      let logoInserted = false;
      currentY = startY; // Commencer directement sans logo
      
      // Informations du cabinet (colonne gauche, sous le logo)
      doc.fontSize(10).font('Helvetica-Bold');
      if (cabinet?.nom) {
        doc.text(cabinet.nom, leftColumnX, currentY, { width: columnWidth, align: 'left' });
        currentY = doc.y + 4;
      }
      
      doc.fontSize(9).font('Helvetica');
      if (cabinet?.adresse) {
        doc.text(cabinet.adresse, leftColumnX, currentY, { width: columnWidth, align: 'left' });
        currentY = doc.y + 3;
      }
      
      if (cabinet?.emailContact) {
        doc.text(cabinet.emailContact, leftColumnX, currentY, { width: columnWidth, align: 'left' });
        currentY = doc.y + 3;
      }
      
      if (cabinet?.telephoneContact) {
        doc.text(cabinet.telephoneContact, leftColumnX, currentY, { width: columnWidth, align: 'left' });
        currentY = doc.y + 3;
      }
      
      const leftColumnEndY = currentY;
      
      // === COLONNE DROITE : DESTINATAIRE (CLIENT/ADVERSAIRE) ===
      // Utiliser les infos du destinataire extraites du prompt contextuel
      const hasDestinataireNom = destinataireNomPDF && destinataireNomPDF.trim();
      const hasDestinataireAdresse = destinataireAdressePDF && destinataireAdressePDF.trim();
      const hasDestinataireInfo = hasDestinataireNom || hasDestinataireAdresse || destinataireEmailPDF || destinataireTelephonePDF;
      
      let rightColumnEndY = startY; // Par défaut, pas de colonne droite
      
      // Afficher la colonne droite UNIQUEMENT si on a au moins un nom ou une adresse
      if (hasDestinataireInfo && (hasDestinataireNom || hasDestinataireAdresse)) {
        currentY = startY; // Commencer au même niveau que la colonne gauche
        
        // Label "Destinataire :" en gras
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('Destinataire :', rightColumnX, currentY, { width: columnWidth, align: 'left' });
        currentY = doc.y + 3;
        
        doc.fontSize(10).font('Helvetica-Bold');
        if (hasDestinataireNom) {
          doc.text(destinataireNomPDF, rightColumnX, currentY, { width: columnWidth, align: 'left' });
          currentY = doc.y + 4;
        }
        
        doc.fontSize(9).font('Helvetica');
        if (hasDestinataireAdresse) {
          doc.text(destinataireAdressePDF, rightColumnX, currentY, { width: columnWidth, align: 'left' });
          currentY = doc.y + 3;
        }
        
        if (destinataireEmailPDF) {
          doc.text(destinataireEmailPDF, rightColumnX, currentY, { width: columnWidth, align: 'left' });
          currentY = doc.y + 3;
        }
        
        if (destinataireTelephonePDF) {
          doc.text(destinataireTelephonePDF, rightColumnX, currentY, { width: columnWidth, align: 'left' });
          currentY = doc.y + 3;
        }
        
        rightColumnEndY = currentY;
      }
      
      // === TITRE DU DOCUMENT (centré, sous les colonnes) ===
      // Si pas de colonne droite, utiliser uniquement la colonne gauche
      const headerEndY = hasDestinataireInfo && (hasDestinataireNom || hasDestinataireAdresse)
        ? Math.max(leftColumnEndY, rightColumnEndY) + 20
        : leftColumnEndY + 20;
      doc.y = headerEndY;
      
      // Définir la largeur du texte AVANT de l'utiliser
      const textWidth = doc.page.width - leftMargin - rightMargin;
      
      // Réinitialiser la position X à la marge gauche pour éviter tout décalage
      doc.x = leftMargin;
      
      doc.fontSize(18).font('Helvetica-Bold');
      // Titre centré avec position X et largeur explicites
      doc.text(template.nom.toUpperCase(), {
        align: 'center',
        width: textWidth,
        x: leftMargin
      });
      doc.moveDown(1); // Espacement après le titre (pas de date)

      // Contenu généré - FORCER la position X à la marge gauche à chaque paragraphe
      doc.x = leftMargin;
      doc.fontSize(11).font('Helvetica');
      
      // Variable pour suivre si la signature a été insérée
      let signatureInserted = false;
      
      // Diviser le contenu en paragraphes et les ajouter avec gestion des sauts de page
      const paragraphes = contenuGenere.split('\n\n');
      
      paragraphes.forEach((paragraphe, index) => {
        if (paragraphe.trim()) {
          let paragrapheTrim = paragraphe.trim();
          
          // Vérifier si ce paragraphe contient le placeholder de signature
          const hasSignaturePlaceholder = paragrapheTrim.includes('{{SIGNATURE_PLACEHOLDER}}');
          
          if (hasSignaturePlaceholder && signatureData) {
            // Remplacer le placeholder par l'image de la signature
            const parts = paragrapheTrim.split('{{SIGNATURE_PLACEHOLDER}}');
            
            // Écrire le texte avant le placeholder
            if (parts[0].trim()) {
              checkPageBreak(150); // Espace pour signature
              doc.x = leftMargin; // FORCER la position X
              doc.text(parts[0].trim(), {
                align: 'justify',
                lineGap: 5,
                width: textWidth,
                x: leftMargin
              });
              doc.moveDown(1);
            }
            
            // Insérer la signature
            try {
              if (Buffer.isBuffer(signatureData)) {
                checkPageBreak(80); // Vérifier l'espace pour la signature
                
                // Mention "Pour le cabinet" avant la signature
                if (cabinet?.nom) {
                  doc.fontSize(10).font('Helvetica');
                  doc.text(`Pour le cabinet ${cabinet.nom},`, {
                    align: 'left',
                    width: textWidth,
                    x: leftMargin
                  });
                  doc.moveDown(1);
                }
                
                const signatureY = doc.y;
                const signatureWidth = 120;
                const signatureHeight = 50;
                const signatureX = doc.page.width - rightMargin - signatureWidth;
                
                doc.image(signatureData, signatureX, signatureY, { 
                  fit: [signatureWidth, signatureHeight]
                });
                console.log('✅ Signature insérée à la place du placeholder');
                signatureInserted = true;
                doc.y = signatureY + signatureHeight + 10;
              }
            } catch (error) {
              console.error('❌ Erreur lors de l\'insertion de la signature:', error.message);
              doc.moveDown(1);
            }
            
            // Écrire le texte après le placeholder (s'il y en a)
            if (parts[1] && parts[1].trim()) {
              doc.x = leftMargin; // FORCER la position X
              doc.text(parts[1].trim(), {
                align: 'justify',
                lineGap: 5,
                width: textWidth,
                x: leftMargin
              });
            }
            
            return; // Passer au paragraphe suivant
          }
          
          // Vérifier si c'est un titre (texte court en majuscules ou formatage spécial)
          const isTitle = (paragrapheTrim.length < 100 && paragrapheTrim === paragrapheTrim.toUpperCase()) ||
                         /^[A-ZÉÈÊÀÇ][A-ZÉÈÊÀÇ\s]{0,80}$/.test(paragrapheTrim);
          
          // Détecter les sous-titres numérotés (1., 2., 3., etc.) - amélioration de la détection
          // Détection plus permissive pour capturer tous les sous-titres numérotés
          // Exemples : "1. Exposé des faits", "2. Fondement juridique", etc.
          // Simplification : si ça commence par un chiffre suivi d'un point et d'un espace, c'est un sous-titre
          const isNumberedSubtitle = /^\d+\.\s+/.test(paragrapheTrim);
          
          // Log pour déboguer
          if (isNumberedSubtitle) {
            console.log('🔍 Sous-titre détecté:', paragrapheTrim.substring(0, 50));
          }
          
          // Détecter les sections importantes (formules de politesse, etc.)
          const importantKeywords = [
            'cordialement', 'respectueusement', 'sincèrement', 'salutations',
            'demandons', 'concluons', 'par ces motifs', 'attendu que'
          ];
          const isImportantSection = importantKeywords.some(keyword => 
            paragrapheTrim.toLowerCase().includes(keyword)
          ) && paragrapheTrim.length < 200;
          
          // Estimer l'espace nécessaire pour ce paragraphe
          const estimatedHeight = estimateTextHeight(paragrapheTrim, 11, 5);
          
          // Vérifier et forcer un saut de page si nécessaire
          let requiredSpace;
          if (isTitle) {
            requiredSpace = 250;
          } else if (isNumberedSubtitle) {
            requiredSpace = 150; // Espace pour sous-titre numéroté
          } else if (isImportantSection) {
            requiredSpace = 200;
          } else {
            requiredSpace = estimatedHeight + 50;
          }
          
          checkPageBreak(requiredSpace);
          
          // FORCER la position X à la marge gauche AVANT chaque paragraphe
          doc.x = leftMargin;
          
          // Si c'est un titre, le formater différemment
          if (isTitle) {
            checkPageBreak(100);
            doc.fontSize(13).font('Helvetica-Bold');
            doc.text(paragrapheTrim, {
              align: 'left',
              lineGap: 8,
              width: textWidth,
              x: leftMargin
            });
            doc.fontSize(11).font('Helvetica');
            doc.moveDown(0.5);
          } else if (isNumberedSubtitle) {
            // Sous-titre numéroté en gras (1. Exposé des faits, 2. Fondement juridique, etc.)
            console.log('✅ Formatage en gras du sous-titre:', paragrapheTrim.substring(0, 50));
            checkPageBreak(80);
            // FORCER la position X et le formatage en gras AVANT d'écrire
            doc.x = leftMargin;
            doc.fontSize(11);
            doc.font('Helvetica-Bold'); // FORCER le gras
            doc.fillColor('black'); // S'assurer que la couleur est noire
            doc.text(paragrapheTrim, {
              align: 'left',
              lineGap: 6,
              width: textWidth,
              x: leftMargin
            });
            // Remettre en normal après
            doc.font('Helvetica');
            doc.fontSize(11);
            doc.moveDown(0.3);
          } else {
            // Paragraphe normal - justifié (aligné à gauche et à droite)
            // FORCER la position X à chaque fois
            doc.x = leftMargin;
            doc.text(paragrapheTrim, {
              align: 'justify',
              lineGap: 5,
              width: textWidth,
              x: leftMargin
            });
          }
          
          // Espacement entre paragraphes (sauf pour le dernier)
          if (index < paragraphes.length - 1) {
            checkPageBreak(100);
            doc.moveDown(1);
          }
        }
      });

      // === SIGNATURE (si pas encore insérée) ET PIED DE PAGE ===
      // Si la signature n'a pas été insérée via le placeholder, l'insérer maintenant
      if (signatureData && !signatureInserted) {
        checkPageBreak(150); // Espace pour signature + pied de page
        doc.moveDown(2);
        
        // Mention "Pour le cabinet"
        if (cabinet?.nom) {
          doc.x = leftMargin; // FORCER la position X
          doc.fontSize(10).font('Helvetica');
          doc.text(`Pour le cabinet ${cabinet.nom},`, {
            align: 'left',
            width: textWidth,
            x: leftMargin
          });
          doc.moveDown(1.5);
        }
        
        // Insérer la signature alignée à droite
        try {
          if (Buffer.isBuffer(signatureData)) {
            const signatureY = doc.y;
            const signatureWidth = 120;
            const signatureHeight = 50;
            const signatureX = doc.page.width - rightMargin - signatureWidth;
            
            doc.image(signatureData, signatureX, signatureY, { 
              fit: [signatureWidth, signatureHeight]
            });
            console.log('✅ Signature insérée en fin de document');
            doc.y = signatureY + signatureHeight + 15;
          }
        } catch (error) {
          console.error('❌ Erreur lors de l\'insertion de la signature:', error.message);
          doc.moveDown(1);
        }
      } else {
        // Vérifier l'espace pour le pied de page
        checkPageBreak(50);
        doc.moveDown(2);
      }
      
      // Pied de page avec mentions légales (en bas de la dernière page)
      const footerY = PAGE_HEIGHT - MARGIN_BOTTOM - 20;
      
      // S'assurer qu'on a assez d'espace pour le footer
      if (doc.y > footerY - 30) {
        // Si on est trop bas, on est déjà sur une nouvelle page virtuelle
        // Le footer sera ajouté après
      }
      
      // Positionner le footer en bas de la page actuelle
      const currentPageY = doc.y;
      doc.y = footerY;
      
      doc.fontSize(7).font('Helvetica-Oblique');
      let footerText = 'Document généré automatiquement par JurisFlow';
      
      if (cabinet?.siret || cabinet?.tvaIntracom || cabinet?.cabinetMentionsLegales) {
        footerText += ' | ';
        const mentions = [];
        if (cabinet?.siret) mentions.push(`SIRET: ${cabinet.siret}`);
        if (cabinet?.tvaIntracom) mentions.push(`TVA: ${cabinet.tvaIntracom}`);
        if (cabinet?.cabinetMentionsLegales) mentions.push(cabinet.cabinetMentionsLegales);
        footerText += mentions.join(' - ');
      }
      
      doc.text(footerText, { 
        align: 'center', 
        width: doc.page.width - leftMargin - rightMargin,
        x: leftMargin
      });

      doc.end();
    });

    // ÉTAPE 6 : Uploader sur S3
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

    // ÉTAPE 7 : Sauvegarder en base de données
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

    // ÉTAPE 8 : Mettre à jour la timeline du dossier
    await prisma.dossierTimeline.create({
      data: {
        action: 'Document généré par IA',
        description: `Un ${template.nom} a été généré automatiquement`,
        auteurId: req.user.userId,
        dossierId: dossierId,
        date: new Date()
      }
    });

    // ÉTAPE 9 : Créer une notification (secondaire -> cloche uniquement)
    try {
      const { createSecondaryNotification, NOTIFICATION_TYPES } = await import('../services/notificationService.js');
      
      // Notifier le responsable du dossier (si différent de l'utilisateur actuel)
      const userIdToNotify = dossier.responsableId || req.user.userId;
      
      await createSecondaryNotification(
        userIdToNotify,
        NOTIFICATION_TYPES.DOCUMENT,
        '📄 Nouveau document généré',
        `Un ${template.nom} a été généré automatiquement pour le dossier "${dossier.nom}".`,
        document.id,
        'document'
      );
    } catch (notificationError) {
      console.error('Erreur lors de la création de la notification (non bloquant):', notificationError);
    }

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

// @desc    Chat avec l'IA pour conseils juridiques
// @route   POST /api/ia/chat
// @access  Private
export const chatIA = async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    // Validation
    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le message est requis'
      });
    }

    // Vérifier la clé OpenAI
    let openaiClient;
    try {
      openaiClient = getOpenAIClient();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message || 'La clé API OpenAI n\'est pas configurée'
      });
    }

    // Construire l'historique de conversation avec le prompt système JurisFlow AI
    const messages = [
      {
        role: 'system',
        content: PROMPT_SYSTEM_JURISFLOW
      },
      // Ajouter l'historique si fourni
      ...history.map(msg => ({
        role: msg.role || 'user',
        content: msg.content
      })),
      // Ajouter le message actuel
      {
        role: 'user',
        content: message.trim()
      }
    ];

    console.log('💬 Chat IA - Envoi du message à OpenAI...');
    
    // Appeler OpenAI
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
      temperature: 0.7,
      max_tokens: 1500
    });

    const response = completion.choices[0].message.content;

    console.log('✅ Chat IA - Réponse reçue');

    // Retourner la réponse
    res.status(200).json({
      success: true,
      data: {
        response: response,
        message: message,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors du chat IA:', error);

    // Erreur OpenAI
    if (error.error && error.error.type) {
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'appel à OpenAI',
        details: error.error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors du chat avec l\'IA'
    });
  }
};


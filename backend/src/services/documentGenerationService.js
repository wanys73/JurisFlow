import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Prompts système optimisés pour chaque type de document
 */
const DOCUMENT_PROMPTS = {
  'mise-en-demeure': {
    systemPrompt: `Tu es un avocat expert en droit français spécialisé dans la rédaction de mises en demeure.

Tu dois générer une mise en demeure formelle qui respecte STRICTEMENT :
- Les normes juridiques françaises
- Le formalisme requis (en-tête cabinet, destinataire, objet, corps, formule de politesse)
- Un ton ferme mais professionnel
- Les mentions légales obligatoires

Structure attendue :
1. En-tête du cabinet (nom, adresse, SIRET, contact)
2. Coordonnées du destinataire
3. Date et lieu
4. Objet : Mise en demeure
5. Corps du document :
   - Exposé des faits (contexte, obligations non respectées)
   - Fondement juridique (articles de loi, contrat, jurisprudence)
   - Demandes précises (montant, actions requises)
   - Délai de réponse (généralement 8 à 15 jours)
   - Conséquences en cas de non-réponse (action en justice, pénalités)
6. Formule de politesse formelle
7. Signature du cabinet

Le document doit être prêt à être imprimé et envoyé.`,
    
    userTemplate: (options) => {
      const {
        destinataire = {},
        montantReclame,
        exposeFaits,
        fondementJuridique,
        delaiRegularisation = '8 jours francs à compter de la réception de la présente mise en demeure',
        consequencesNonReponse,
        instructionsSupplementaires,
        dossierInfo = {}
      } = options;

      return `Rédige une mise en demeure avec les informations suivantes :

DESTINATAIRE :
- Prénom : ${destinataire.prenom || 'Non fourni'}
- Nom : ${destinataire.nom || 'Non fourni'}
- Adresse : ${destinataire.adresse || 'Non fournie'}
- Email : ${destinataire.email || 'Non fourni'}
- Téléphone : ${destinataire.telephone || 'Non fourni'}

DOSSIER CONCERNÉ :
- Titre : ${dossierInfo.title || 'Non fourni'}
- Référence : ${dossierInfo.reference || 'Non fournie'}

MONTANT RÉCLAMÉ : ${montantReclame ? `${montantReclame} €` : 'Non spécifié'}

EXPOSÉ DES FAITS :
${exposeFaits || 'À compléter'}

FONDEMENT JURIDIQUE :
${fondementJuridique || 'À préciser'}

DÉLAI DE RÉGULARISATION :
${delaiRegularisation}

CONSÉQUENCES EN CAS DE NON-RÉPONSE :
${consequencesNonReponse || 'Saisie du juge compétent et demande de dommages-intérêts pour préjudice subi'}

INSTRUCTIONS SUPPLÉMENTAIRES :
${instructionsSupplementaires || 'Aucune'}

Rédige la mise en demeure complète et prête à être envoyée.`;
    }
  },

  'contrat-prestation': {
    systemPrompt: `Tu es un juriste expert en droit des contrats français.

Tu dois générer un contrat professionnel qui respecte :
- Le Code civil français (articles 1582 et suivants)
- Les mentions légales obligatoires
- Une structure claire et équilibrée
- La protection des deux parties (prestataire et client)

Structure attendue :
1. Titre : CONTRAT DE PRESTATION DE SERVICES
2. Identification des parties (préambule)
3. Article 1 - Objet du contrat
4. Article 2 - Obligations du prestataire
5. Article 3 - Obligations du client
6. Article 4 - Durée et résiliation
7. Article 5 - Conditions financières
8. Article 6 - Propriété intellectuelle
9. Article 7 - Confidentialité
10. Article 8 - Responsabilité et garanties
11. Article 9 - Force majeure
12. Article 10 - Litiges et juridiction compétente
13. Date, lieu et signatures

Le contrat doit être complet, équilibré et juridiquement opposable.`,
    
    userTemplate: (options) => {
      const {
        destinataire = {},
        montantReclame,
        exposeFaits,
        fondementJuridique,
        instructionsSupplementaires
      } = options;

      return `Rédige un contrat de prestation de services avec les informations suivantes :

CLIENT (BÉNÉFICIAIRE) :
- Prénom : ${destinataire.prenom || 'Non fourni'}
- Nom : ${destinataire.nom || 'Non fourni'}
- Adresse : ${destinataire.adresse || 'Non fournie'}
- Email : ${destinataire.email || 'Non fourni'}
- Téléphone : ${destinataire.telephone || 'Non fourni'}

PRESTATIONS ET CONDITIONS :
${exposeFaits || 'À compléter'}

PRIX DE LA PRESTATION : ${montantReclame ? `${montantReclame} €` : 'Non spécifié'}

CLAUSES SPÉCIFIQUES OU FONDEMENTS :
${fondementJuridique || 'Aucune clause spécifique'}

INSTRUCTIONS SUPPLÉMENTAIRES :
${instructionsSupplementaires || 'Aucune'}

Rédige le contrat complet et juridiquement valable.`;
    }
  },

  'assignation': {
    systemPrompt: `Tu es un avocat expert en procédure civile française.

Tu dois générer une assignation qui respecte :
- Les articles 54 et suivants du Code de procédure civile
- Le formalisme strict des actes de procédure
- La clarification des prétentions et des moyens
- Les mentions obligatoires

Structure attendue :
1. EN-TÊTE : "ASSIGNATION"
2. Identification du demandeur (avec avocat)
3. "ASSIGNE"
4. Identification du défendeur
5. "À COMPARAÎTRE" devant le tribunal compétent
6. Indication de la juridiction, lieu, date d'audience (si connue)
7. EXPOSÉ DES FAITS (chronologie, contexte)
8. PRÉTENTIONS (demandes chiffrées et précises)
9. MOYENS DE DROIT (fondement juridique, articles, jurisprudence)
10. PIÈCES JUSTIFICATIVES (liste numérotée)
11. Mentions obligatoires (délais, constitution d'avocat)
12. Date, lieu et signature de l'huissier ou de l'avocat

Le document doit être rigoureux, structuré et respecter le formalisme judiciaire.`,
    
    userTemplate: (options) => {
      const {
        destinataire = {},
        montantReclame,
        exposeFaits,
        fondementJuridique,
        consequencesNonReponse,
        instructionsSupplementaires
      } = options;

      return `Rédige un acte d'assignation en justice avec les informations suivantes :

DÉFENDEUR (PERSONNE ASSIGNÉE) :
- Prénom : ${destinataire.prenom || 'Non fourni'}
- Nom : ${destinataire.nom || 'Non fourni'}
- Adresse : ${destinataire.adresse || 'Non fournie'}

EXPOSÉ DES FAITS :
${exposeFaits || 'À compléter'}

FONDEMENT JURIDIQUE :
${fondementJuridique || 'À préciser'}

PRÉTENTIONS :
${consequencesNonReponse || 'Demande de condamnation'}

MONTANT RÉCLAMÉ : ${montantReclame ? `${montantReclame} €` : 'Non spécifié'}

INSTRUCTIONS SUPPLÉMENTAIRES :
${instructionsSupplementaires || 'Aucune'}

Rédige l'assignation complète conforme aux exigences du CPC.`;
    }
  },

  'requete': {
    systemPrompt: `Tu es un avocat expert en procédure d'urgence française.

Tu dois générer une requête qui respecte :
- Les articles du Code de procédure civile
- Le formalisme des requêtes (plus simple qu'une assignation)
- La clarté des demandes
- Les mentions obligatoires

Structure attendue :
1. EN-TÊTE : "REQUÊTE"
2. "DEVANT" [juridiction compétente]
3. "POUR" [identification du requérant et de son avocat]
4. "CONTRE" [identification du défendeur si applicable, ou "sans adversaire" pour les procédures gracieuses]
5. EXPOSÉ DES FAITS
6. DEMANDES (prétentions claires et précises)
7. FONDEMENT JURIDIQUE (articles de loi)
8. PIÈCES JUSTIFICATIVES (liste numérotée)
9. Formule finale ("PAR CES MOTIFS, il plaît au tribunal de...")
10. Date, lieu et signature de l'avocat

Le document doit être concis, structuré et conforme aux exigences procédurales.`,
    
    userTemplate: (options) => {
      const {
        montantReclame,
        exposeFaits,
        fondementJuridique,
        consequencesNonReponse,
        instructionsSupplementaires
      } = options;

      return `Rédige une requête devant le juge avec les informations suivantes :

OBJET DE LA REQUÊTE :
${consequencesNonReponse || 'À préciser'}

EXPOSÉ SOMMAIRE :
${exposeFaits || 'À compléter'}

FONDEMENT JURIDIQUE :
${fondementJuridique || 'À préciser'}

MONTANT CONCERNÉ : ${montantReclame ? `${montantReclame} €` : 'Non applicable'}

INSTRUCTIONS SUPPLÉMENTAIRES :
${instructionsSupplementaires || 'Aucune'}

Rédige la requête complète prête à être déposée.`;
    }
  },

  'courrier-juridique': {
    systemPrompt: `Tu es un avocat expert en correspondance juridique professionnelle.

Tu dois générer un courrier formel qui respecte :
- Le ton professionnel et courtois mais ferme
- La structure d'un courrier administratif/juridique
- La précision des demandes ou informations transmises
- Les mentions de suivi (accusé de réception, délais)

Structure attendue :
1. En-tête du cabinet (nom, adresse, contact)
2. Coordonnées du destinataire
3. Date et lieu
4. Objet du courrier (concis)
5. Référence (si applicable)
6. Corps du courrier :
   - Formule d'appel ("Madame, Monsieur,")
   - Contexte et rappel des faits
   - Objet de la demande ou de l'information
   - Arguments juridiques si nécessaire
   - Demande d'action précise ou délai de réponse
   - Mention des suites envisagées
7. Formule de politesse formelle
8. Signature

Le courrier doit être clair, structuré et adapté au destinataire (client, adversaire, administration).`,
    
    userTemplate: (options) => {
      const {
        destinataire = {},
        montantReclame,
        exposeFaits,
        fondementJuridique,
        instructionsSupplementaires
      } = options;

      return `Rédige un courrier juridique professionnel avec les informations suivantes :

DESTINATAIRE :
- Prénom : ${destinataire.prenom || 'Non fourni'}
- Nom : ${destinataire.nom || 'Non fourni'}
- Adresse : ${destinataire.adresse || 'Non fournie'}

OBJET DU COURRIER :
${exposeFaits || 'À compléter'}

FONDEMENT OU RÉFÉRENCES JURIDIQUES :
${fondementJuridique || 'Aucune référence spécifique'}

MONTANT CONCERNÉ : ${montantReclame ? `${montantReclame} €` : 'Non applicable'}

INSTRUCTIONS SUPPLÉMENTAIRES :
${instructionsSupplementaires || 'Aucune'}

Rédige le courrier complet et professionnel.`;
    }
  },

  'conclusions': {
    systemPrompt: `Tu es un avocat expert en plaidoirie écrite française.

Tu dois générer des conclusions qui respectent :
- Les articles 753 et suivants du Code de procédure civile
- Le formalisme des conclusions (dispositif, moyens, prétentions)
- La rigueur juridique et l'argumentation structurée
- Les mentions obligatoires

Structure attendue :
1. EN-TÊTE : "CONCLUSIONS"
2. Identification de la juridiction
3. Identification des parties (demandeur/défendeur, avec avocats)
4. RAPPEL DES FAITS (synthèse chronologique)
5. PROCÉDURE (historique des actes de procédure)
6. EN DROIT (argumentation juridique structurée) :
   - Sur [point 1] : moyens de droit, articles, jurisprudence
   - Sur [point 2] : idem
7. SUR LES DEMANDES (réponse aux prétentions adverses si défense)
8. DISPOSITIF (PAR CES MOTIFS) :
   - Demandes chiffrées et précises
   - Condamnation aux dépens
9. Date, lieu et signature de l'avocat

Les conclusions doivent être argumentées, structurées et juridiquement fondées.`,
    
    userTemplate: (options) => {
      const {
        destinataire = {},
        montantReclame,
        exposeFaits,
        fondementJuridique,
        consequencesNonReponse,
        instructionsSupplementaires
      } = options;

      return `Rédige des conclusions devant le tribunal avec les informations suivantes :

PARTIE ADVERSE :
- Prénom : ${destinataire.prenom || 'Non fourni'}
- Nom : ${destinataire.nom || 'Non fourni'}

EXPOSÉ DES FAITS :
${exposeFaits || 'À compléter'}

DISCUSSION JURIDIQUE ET MOYENS :
${fondementJuridique || 'À préciser'}

PRÉTENTIONS :
${consequencesNonReponse || 'À définir'}

MONTANT RÉCLAMÉ : ${montantReclame ? `${montantReclame} €` : 'Non applicable'}

INSTRUCTIONS SUPPLÉMENTAIRES :
${instructionsSupplementaires || 'Aucune'}

Rédige les conclusions complètes prêtes à être déposées.`;
    }
  }
};

// ========================================
// FONCTION PRINCIPALE DE GÉNÉRATION
// ========================================

/**
 * Générer un document juridique avec l'IA
 * @param {string} documentType - Type de document (mise-en-demeure, contrat-prestation, etc.)
 * @param {Object} options - Options de génération (cabinet, destinataire, contenu, etc.)
 * @returns {Promise<string>} - Contenu du document généré
 */
export const generateDocument = async (documentType, options) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY n\'est pas configurée dans les variables d\'environnement');
  }

  const promptConfig = DOCUMENT_PROMPTS[documentType];
  
  if (!promptConfig) {
    throw new Error(`Type de document non supporté : ${documentType}`);
  }

  const { systemPrompt, userTemplate } = promptConfig;
  const userPrompt = userTemplate(options);

  console.log(`📄 Génération document type: ${documentType}`);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3,
    max_tokens: 2500
  });

  return completion.choices[0].message.content;
};

/**
 * Obtenir la liste des types de documents disponibles
 * @returns {Array<Object>} - Liste des types avec leurs descriptions
 */
export const getAvailableDocumentTypes = () => {
  return [
    { id: 'mise-en-demeure', label: 'Mise en demeure', description: 'Lettre formelle de mise en demeure' },
    { id: 'contrat-prestation', label: 'Contrat de prestation', description: 'Contrat de prestation de services' },
    { id: 'assignation', label: 'Assignation en justice', description: 'Acte d\'assignation pour procédure' },
    { id: 'requete', label: 'Requête', description: 'Requête simple devant le juge' },
    { id: 'courrier-juridique', label: 'Courrier juridique', description: 'Courrier professionnel formel' },
    { id: 'conclusions', label: 'Conclusions', description: 'Conclusions devant le tribunal' }
  ];
};

export default {
  generateDocument,
  getAvailableDocumentTypes,
  DOCUMENT_PROMPTS
};

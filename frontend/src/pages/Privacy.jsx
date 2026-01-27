import React from 'react';
import Layout from '../components/Layout';
import { Shield, Lock, Eye, FileText, Calendar, Mail } from 'lucide-react';

const Privacy = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-primary-50 dark:from-secondary-900 dark:to-secondary-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full mb-4">
              <Shield className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <h1 className="text-4xl font-bold text-secondary-900 dark:text-white mb-4">
              Politique de Confidentialité
            </h1>
            <p className="text-lg text-secondary-600 dark:text-secondary-400">
              JurisFlow - Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Content */}
          <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-lg p-8 space-y-8">
            
            {/* Introduction */}
            <section>
              <h2 className="text-2xl font-semibold text-secondary-900 dark:text-white mb-4">
                1. Introduction
              </h2>
              <p className="text-secondary-700 dark:text-secondary-300 leading-relaxed">
                JurisFlow ("nous", "notre", "l'application") est une application SaaS dédiée aux professionnels du droit. 
                Nous nous engageons à protéger votre vie privée et vos données personnelles conformément au Règlement Général 
                sur la Protection des Données (RGPD) et à la législation française applicable.
              </p>
            </section>

            {/* Données collectées */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <Mail className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                <h2 className="text-2xl font-semibold text-secondary-900 dark:text-white">
                  2. Données Collectées
                </h2>
              </div>
              <p className="text-secondary-700 dark:text-secondary-300 mb-4">
                Nous collectons les données suivantes pour assurer le fonctionnement de l'application :
              </p>
              <ul className="list-disc list-inside space-y-2 text-secondary-700 dark:text-secondary-300 ml-4">
                <li><strong>Données d'identification :</strong> Nom, prénom, adresse email, numéro de téléphone</li>
                <li><strong>Données professionnelles :</strong> Informations relatives à votre cabinet d'avocats (nom, adresse, SIRET)</li>
                <li><strong>Données de connexion :</strong> Adresse IP, logs d'accès, cookies techniques</li>
                <li><strong>Données métier :</strong> Dossiers clients, documents juridiques, factures, rendez-vous</li>
                <li><strong>Données de calendrier Google :</strong> Uniquement les événements de votre calendrier Google pour affichage dans l'application</li>
              </ul>
            </section>

            {/* Utilisation des données */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <Eye className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                <h2 className="text-2xl font-semibold text-secondary-900 dark:text-white">
                  3. Utilisation des Données
                </h2>
              </div>
              <p className="text-secondary-700 dark:text-secondary-300 mb-4">
                Vos données sont utilisées exclusivement pour :
              </p>
              <ul className="list-disc list-inside space-y-2 text-secondary-700 dark:text-secondary-300 ml-4">
                <li>Fournir et améliorer les services de l'application</li>
                <li>Gérer votre compte utilisateur et vos préférences</li>
                <li>Traiter vos dossiers, documents et factures</li>
                <li>Afficher vos événements Google Calendar dans l'application (lecture seule)</li>
                <li>Vous contacter concernant votre compte ou les services</li>
                <li>Respecter nos obligations légales et réglementaires</li>
              </ul>
            </section>

            {/* Accès Google Calendar */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                <h2 className="text-2xl font-semibold text-secondary-900 dark:text-white">
                  4. Accès au Calendrier Google
                </h2>
              </div>
              <div className="bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-500 p-4 rounded">
                <p className="text-secondary-700 dark:text-secondary-300 leading-relaxed">
                  <strong>Important :</strong> Si vous choisissez de connecter votre compte Google Calendar, 
                  nous accédons <strong>uniquement en lecture seule</strong> à vos événements pour les afficher 
                  dans l'application JurisFlow. Nous ne modifions, ne supprimons, ni ne partageons vos événements 
                  avec des tiers. Vous pouvez révoquer cet accès à tout moment depuis les paramètres de votre compte 
                  Google ou depuis l'application.
                </p>
              </div>
            </section>

            {/* Partage des données */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <Lock className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                <h2 className="text-2xl font-semibold text-secondary-900 dark:text-white">
                  5. Partage et Confidentialité
                </h2>
              </div>
              <p className="text-secondary-700 dark:text-secondary-300 mb-4">
                <strong>Nous ne vendons, ne louons, ni ne partageons vos données personnelles avec des tiers</strong>, 
                sauf dans les cas suivants :
              </p>
              <ul className="list-disc list-inside space-y-2 text-secondary-700 dark:text-secondary-300 ml-4">
                <li>Avec votre consentement explicite</li>
                <li>Pour respecter une obligation légale ou une décision judiciaire</li>
                <li>Avec nos prestataires techniques (hébergement, sauvegarde) sous contrat de confidentialité strict</li>
                <li>En cas de fusion, acquisition ou cession d'actifs (avec notification préalable)</li>
              </ul>
            </section>

            {/* Sécurité */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                <h2 className="text-2xl font-semibold text-secondary-900 dark:text-white">
                  6. Sécurité des Données
                </h2>
              </div>
              <p className="text-secondary-700 dark:text-secondary-300 leading-relaxed">
                Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données 
                contre l'accès non autorisé, la perte, la destruction ou l'altération :
              </p>
              <ul className="list-disc list-inside space-y-2 text-secondary-700 dark:text-secondary-300 ml-4 mt-4">
                <li>Chiffrement des données en transit (HTTPS/TLS)</li>
                <li>Chiffrement des données sensibles en base de données</li>
                <li>Authentification forte et gestion sécurisée des mots de passe</li>
                <li>Audit logs et traçabilité des accès (conformité RGPD)</li>
                <li>Sauvegardes régulières et sécurisées</li>
                <li>Hébergement sur des infrastructures certifiées (Supabase, Vercel)</li>
              </ul>
            </section>

            {/* Vos droits */}
            <section>
              <h2 className="text-2xl font-semibold text-secondary-900 dark:text-white mb-4">
                7. Vos Droits (RGPD)
              </h2>
              <p className="text-secondary-700 dark:text-secondary-300 mb-4">
                Conformément au RGPD, vous disposez des droits suivants :
              </p>
              <ul className="list-disc list-inside space-y-2 text-secondary-700 dark:text-secondary-300 ml-4">
                <li><strong>Droit d'accès :</strong> Obtenir une copie de vos données personnelles</li>
                <li><strong>Droit de rectification :</strong> Corriger vos données inexactes</li>
                <li><strong>Droit à l'effacement :</strong> Supprimer vos données (sous réserve des obligations légales)</li>
                <li><strong>Droit à la portabilité :</strong> Récupérer vos données dans un format structuré</li>
                <li><strong>Droit d'opposition :</strong> Vous opposer au traitement de vos données</li>
                <li><strong>Droit à la limitation :</strong> Limiter le traitement de vos données</li>
                <li><strong>Droit de retirer votre consentement :</strong> À tout moment pour l'accès Google Calendar</li>
              </ul>
              <p className="text-secondary-700 dark:text-secondary-300 mt-4">
                Pour exercer ces droits, contactez-nous à : <a href="mailto:contact@jurisapp-smart-pro.com" className="text-primary-600 dark:text-primary-400 hover:underline">contact@jurisapp-smart-pro.com</a>
              </p>
            </section>

            {/* Conservation */}
            <section>
              <h2 className="text-2xl font-semibold text-secondary-900 dark:text-white mb-4">
                8. Conservation des Données
              </h2>
              <p className="text-secondary-700 dark:text-secondary-300 leading-relaxed">
                Nous conservons vos données personnelles pendant la durée nécessaire aux finalités pour lesquelles 
                elles ont été collectées, et conformément aux obligations légales applicables (notamment les obligations 
                de conservation des documents comptables et juridiques). En cas de suppression de compte, vos données 
                sont supprimées dans un délai de 30 jours, sauf obligation légale de conservation.
              </p>
            </section>

            {/* Cookies */}
            <section>
              <h2 className="text-2xl font-semibold text-secondary-900 dark:text-white mb-4">
                9. Cookies et Technologies Similaires
              </h2>
              <p className="text-secondary-700 dark:text-secondary-300 leading-relaxed">
                Nous utilisons des cookies techniques strictement nécessaires au fonctionnement de l'application 
                (authentification, préférences utilisateur). Ces cookies ne nécessitent pas votre consentement. 
                Nous n'utilisons pas de cookies de tracking publicitaire.
              </p>
            </section>

            {/* Modifications */}
            <section>
              <h2 className="text-2xl font-semibold text-secondary-900 dark:text-white mb-4">
                10. Modifications de cette Politique
              </h2>
              <p className="text-secondary-700 dark:text-secondary-300 leading-relaxed">
                Nous nous réservons le droit de modifier cette politique de confidentialité. Toute modification 
                sera communiquée via l'application et la date de mise à jour sera indiquée en haut de cette page. 
                Nous vous encourageons à consulter régulièrement cette page.
              </p>
            </section>

            {/* Contact */}
            <section className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                <h2 className="text-2xl font-semibold text-secondary-900 dark:text-white">
                  11. Contact
                </h2>
              </div>
              <p className="text-secondary-700 dark:text-secondary-300 leading-relaxed">
                Pour toute question concernant cette politique de confidentialité ou le traitement de vos données, 
                vous pouvez nous contacter à :
              </p>
              <div className="mt-4 space-y-2 text-secondary-700 dark:text-secondary-300">
                <p><strong>Email :</strong> <a href="mailto:contact@jurisapp-smart-pro.com" className="text-primary-600 dark:text-primary-400 hover:underline">contact@jurisapp-smart-pro.com</a></p>
                <p><strong>Site web :</strong> <a href="https://jurisapp-smart-pro.com" className="text-primary-600 dark:text-primary-400 hover:underline">https://jurisapp-smart-pro.com</a></p>
              </div>
            </section>

          </div>

          {/* Footer */}
          <div className="text-center mt-8 text-secondary-600 dark:text-secondary-400">
            <p>© {new Date().getFullYear()} JurisFlow. Tous droits réservés.</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Privacy;

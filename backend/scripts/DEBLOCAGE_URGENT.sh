#!/bin/bash

# =============================================================================
# SCRIPT DE DÉBLOCAGE URGENT
# À exécuter si l'utilisateur est bloqué après la Phase Forteresse
# =============================================================================

echo "🚨 DÉBLOCAGE URGENT - JurisFlow"
echo "================================"
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Demander l'email du compte à débloquer
echo -e "${BLUE}📧 Quel est l'email du compte à débloquer ?${NC}"
read -p "Email: " EMAIL

if [ -z "$EMAIL" ]; then
  echo -e "${RED}❌ Email requis${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}🔧 Déblocage du compte: $EMAIL${NC}"
echo ""

# =============================================================================
# Étape 1 : Réparer le compte (assigner PREMIUM, activer, etc.)
# =============================================================================
echo "Étape 1/4 : Réparation du compte en base de données"
echo "----------------------------------------------------"

cd "$(dirname "$0")/.."

node scripts/fixAccount.js "$EMAIL"

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Compte réparé${NC}"
else
  echo -e "${RED}❌ Erreur lors de la réparation du compte${NC}"
  exit 1
fi

echo ""

# =============================================================================
# Étape 2 : Vérifier NODE_ENV=development
# =============================================================================
echo "Étape 2/4 : Vérification de NODE_ENV"
echo "-------------------------------------"

if grep -q "NODE_ENV=development" .env; then
  echo -e "${GREEN}✅ NODE_ENV=development (Rate limiting désactivé)${NC}"
else
  echo -e "${YELLOW}⚠️  NODE_ENV non trouvé, ajout...${NC}"
  echo "NODE_ENV=development" >> .env
  echo -e "${GREEN}✅ NODE_ENV=development ajouté au .env${NC}"
fi

echo ""

# =============================================================================
# Étape 3 : Redémarrer le backend
# =============================================================================
echo "Étape 3/4 : Redémarrage du backend"
echo "-----------------------------------"

echo -e "${YELLOW}🔄 Arrêt du backend...${NC}"
../STOP.sh 2>/dev/null || killall -9 node 2>/dev/null || true

sleep 2

echo -e "${YELLOW}🚀 Démarrage du backend...${NC}"
../START.sh &

echo -e "${GREEN}✅ Backend en cours de redémarrage...${NC}"
sleep 5

echo ""

# =============================================================================
# Étape 4 : Test de connexion
# =============================================================================
echo "Étape 4/4 : Test de connexion"
echo "------------------------------"

echo -e "${BLUE}Entrez votre mot de passe pour tester la connexion :${NC}"
read -sp "Mot de passe: " PASSWORD
echo ""
echo ""

echo -e "${YELLOW}🔐 Test de connexion...${NC}"

RESPONSE=$(curl -s -X POST http://localhost:5087/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

# Vérifier si on a un token
TOKEN=$(echo "$RESPONSE" | jq -r '.data.tokens.accessToken // empty')

if [ ! -z "$TOKEN" ]; then
  echo -e "${GREEN}✅ CONNEXION RÉUSSIE !${NC}"
  echo ""
  echo "Informations du compte :"
  echo "$RESPONSE" | jq -r '.data.user | "  - Nom: \(.prenom) \(.nom)\n  - Email: \(.email)\n  - Plan: \(.planType)\n  - Role: \(.role)"'
  echo ""
  echo -e "${GREEN}🎉 DÉBLOCAGE TERMINÉ AVEC SUCCÈS${NC}"
  echo ""
  echo "Vous pouvez maintenant :"
  echo "  1. Ouvrir http://localhost:5174"
  echo "  2. Vous connecter avec $EMAIL"
  echo "  3. Accéder au Studio IA (plan PREMIUM)"
  echo ""
else
  echo -e "${RED}❌ ÉCHEC DE LA CONNEXION${NC}"
  echo ""
  echo "Détails de l'erreur :"
  echo "$RESPONSE" | jq '.'
  echo ""
  echo "Actions de dépannage :"
  echo "  1. Vérifier que le backend est bien démarré (http://localhost:5087/health)"
  echo "  2. Vérifier les logs backend : tail -50 /tmp/jurisflow-backend.log"
  echo "  3. Vérifier le compte en base : SELECT * FROM users WHERE email = '$EMAIL';"
  echo ""
fi

echo ""
echo "================================"
echo "Fin du script de déblocage"
echo "================================"

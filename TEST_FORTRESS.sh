#!/bin/bash

# =============================================================================
# Script de test de la Phase "Forteresse & Business"
# =============================================================================

echo "🧪 Tests Phase Forteresse & Business"
echo "======================================"
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="http://localhost:5087/api"
TOKEN=""  # À remplir après connexion

# =============================================================================
# Test 1 : Connexion et récupération du token
# =============================================================================
echo "📝 Test 1 : Authentification"
echo "----------------------------"
read -p "Email: " EMAIL
read -sp "Mot de passe: " PASSWORD
echo ""

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.tokens.accessToken')

if [ "$TOKEN" != "null" ] && [ ! -z "$TOKEN" ]; then
  echo -e "${GREEN}✅ Connexion réussie${NC}"
  echo "Token: ${TOKEN:0:50}..."
else
  echo -e "${RED}❌ Échec de connexion${NC}"
  echo "Réponse: $LOGIN_RESPONSE"
  exit 1
fi
echo ""

# =============================================================================
# Test 2 : Vérifier le plan utilisateur
# =============================================================================
echo "📝 Test 2 : Vérification du plan utilisateur"
echo "----------------------------------------------"

ME_RESPONSE=$(curl -s -X GET "$API_URL/auth/me" \
  -H "Authorization: Bearer $TOKEN")

PLAN_TYPE=$(echo $ME_RESPONSE | jq -r '.data.user.planType')

if [ "$PLAN_TYPE" != "null" ]; then
  echo -e "${GREEN}✅ Plan détecté: $PLAN_TYPE${NC}"
else
  echo -e "${YELLOW}⚠️  Champ planType non trouvé (migration Prisma en cours?)${NC}"
fi
echo ""

# =============================================================================
# Test 3 : Tester l'accès au Studio IA (gatekeeper)
# =============================================================================
echo "📝 Test 3 : Gatekeeper PREMIUM (Studio IA)"
echo "-------------------------------------------"

CONVERSATIONS_RESPONSE=$(curl -s -X GET "$API_URL/studio-ia/conversations" \
  -H "Authorization: Bearer $TOKEN")

REQUIRES_PREMIUM=$(echo $CONVERSATIONS_RESPONSE | jq -r '.requiresPremium')

if [ "$PLAN_TYPE" == "BASIC" ]; then
  if [ "$REQUIRES_PREMIUM" == "true" ]; then
    echo -e "${GREEN}✅ Gatekeeper fonctionne : accès bloqué pour BASIC${NC}"
  else
    echo -e "${RED}❌ Gatekeeper défaillant : BASIC ne devrait pas accéder${NC}"
  fi
elif [ "$PLAN_TYPE" == "PREMIUM" ]; then
  if [ "$REQUIRES_PREMIUM" == "true" ]; then
    echo -e "${RED}❌ Gatekeeper défaillant : PREMIUM devrait accéder${NC}"
  else
    echo -e "${GREEN}✅ PREMIUM a accès au Studio IA${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Plan inconnu ou non défini${NC}"
fi
echo ""

# =============================================================================
# Test 4 : Récupérer les dossiers urgents
# =============================================================================
echo "📝 Test 4 : Dossiers urgents (Killer Feature)"
echo "-----------------------------------------------"

URGENT_RESPONSE=$(curl -s -X GET "$API_URL/dossiers/urgent" \
  -H "Authorization: Bearer $TOKEN")

URGENT_COUNT=$(echo $URGENT_RESPONSE | jq -r '.data.total')

if [ "$URGENT_COUNT" != "null" ]; then
  echo -e "${GREEN}✅ Route /dossiers/urgent fonctionne${NC}"
  echo "Dossiers urgents trouvés: $URGENT_COUNT"
  
  if [ "$URGENT_COUNT" -gt 0 ]; then
    echo ""
    echo "Détails des dossiers urgents:"
    echo "$URGENT_RESPONSE" | jq -r '.data.urgentDossiers[] | "  - \(.nom) : \(.daysRemaining) jours (\(.urgencyLevel))"'
  fi
else
  echo -e "${RED}❌ Erreur lors de la récupération des dossiers urgents${NC}"
  echo "Réponse: $URGENT_RESPONSE"
fi
echo ""

# =============================================================================
# Test 5 : Créer un dossier (test audit log)
# =============================================================================
echo "📝 Test 5 : Audit Log (traçabilité)"
echo "------------------------------------"

CREATE_DOSSIER_RESPONSE=$(curl -s -X POST "$API_URL/dossiers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Test Fortress '$(date +%s)'",
    "description": "Dossier créé pour tester l'\''audit log",
    "statut": "Ouvert"
  }')

DOSSIER_ID=$(echo $CREATE_DOSSIER_RESPONSE | jq -r '.data.dossier.id')

if [ "$DOSSIER_ID" != "null" ] && [ ! -z "$DOSSIER_ID" ]; then
  echo -e "${GREEN}✅ Dossier créé (ID: $DOSSIER_ID)${NC}"
  echo "⚠️  Vérifier manuellement la table activity_logs en base :"
  echo "   SELECT * FROM activity_logs WHERE target='Dossier' ORDER BY timestamp DESC LIMIT 5;"
else
  echo -e "${RED}❌ Échec de création du dossier${NC}"
  echo "Réponse: $CREATE_DOSSIER_RESPONSE"
fi
echo ""

# =============================================================================
# Résumé
# =============================================================================
echo ""
echo "================================"
echo "🏁 Tests terminés"
echo "================================"
echo ""
echo "Vérifications manuelles recommandées :"
echo "1. Audit Log : SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 10;"
echo "2. Plan Type : SELECT id, email, \"planType\" FROM users;"
echo "3. Échéances : SELECT id, nom, \"dateEcheance\" FROM dossiers WHERE \"dateEcheance\" IS NOT NULL;"
echo ""
echo "Pour tester l'upgrade PREMIUM (si BASIC) :"
echo "  UPDATE users SET \"planType\" = 'PREMIUM' WHERE email = '$EMAIL';"
echo ""

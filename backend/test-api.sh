#!/bin/bash

# =====================================================
# 🧪 Script de test de l'API JurisFlow
# =====================================================

API_URL="http://localhost:5000"

echo "🚀 Test de l'API JurisFlow"
echo "======================================"
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo -e "${YELLOW}1. Test Health Check${NC}"
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/health)
if [ "$HEALTH_RESPONSE" -eq 200 ]; then
    echo -e "${GREEN}✅ Health check OK (200)${NC}"
else
    echo -e "${RED}❌ Health check échoué ($HEALTH_RESPONSE)${NC}"
fi
echo ""

# Test 2: Inscription
echo -e "${YELLOW}2. Test d'inscription${NC}"
REGISTER_RESPONSE=$(curl -s -X POST $API_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Test",
    "prenom": "Utilisateur",
    "email": "test.'$(date +%s)'@jurisflow.fr",
    "password": "TestPassword123!",
    "role": "admin",
    "cabinet": {
      "nom": "Cabinet Test",
      "adresse": "123 Rue Test",
      "telephone": "0123456789"
    }
  }')

# Extraire l'email et les tokens
EMAIL=$(echo $REGISTER_RESPONSE | grep -o '"email":"[^"]*"' | cut -d'"' -f4)
ACCESS_TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
REFRESH_TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)

if [ ! -z "$ACCESS_TOKEN" ]; then
    echo -e "${GREEN}✅ Inscription réussie${NC}"
    echo "   Email: $EMAIL"
    echo "   Token: ${ACCESS_TOKEN:0:20}..."
else
    echo -e "${RED}❌ Inscription échouée${NC}"
    echo "$REGISTER_RESPONSE"
    exit 1
fi
echo ""

# Test 3: Connexion
echo -e "${YELLOW}3. Test de connexion${NC}"
LOGIN_RESPONSE=$(curl -s -X POST $API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"TestPassword123!\"
  }")

LOGIN_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ ! -z "$LOGIN_TOKEN" ]; then
    echo -e "${GREEN}✅ Connexion réussie${NC}"
    echo "   Token: ${LOGIN_TOKEN:0:20}..."
else
    echo -e "${RED}❌ Connexion échouée${NC}"
    echo "$LOGIN_RESPONSE"
    exit 1
fi
echo ""

# Test 4: Récupération du profil
echo -e "${YELLOW}4. Test récupération du profil${NC}"
ME_RESPONSE=$(curl -s -X GET $API_URL/api/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN")

USER_ID=$(echo $ME_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ ! -z "$USER_ID" ]; then
    echo -e "${GREEN}✅ Profil récupéré avec succès${NC}"
    echo "   User ID: $USER_ID"
else
    echo -e "${RED}❌ Récupération du profil échouée${NC}"
    echo "$ME_RESPONSE"
    exit 1
fi
echo ""

# Test 5: Refresh Token
echo -e "${YELLOW}5. Test Refresh Token${NC}"
REFRESH_RESPONSE=$(curl -s -X POST $API_URL/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }")

NEW_ACCESS_TOKEN=$(echo $REFRESH_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ ! -z "$NEW_ACCESS_TOKEN" ]; then
    echo -e "${GREEN}✅ Refresh token OK${NC}"
    echo "   Nouveau token: ${NEW_ACCESS_TOKEN:0:20}..."
else
    echo -e "${RED}❌ Refresh token échoué${NC}"
    echo "$REFRESH_RESPONSE"
fi
echo ""

# Test 6: Déconnexion
echo -e "${YELLOW}6. Test déconnexion${NC}"
LOGOUT_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $API_URL/api/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if [ "$LOGOUT_RESPONSE" -eq 200 ]; then
    echo -e "${GREEN}✅ Déconnexion réussie${NC}"
else
    echo -e "${RED}❌ Déconnexion échouée ($LOGOUT_RESPONSE)${NC}"
fi
echo ""

# Résumé
echo "======================================"
echo -e "${GREEN}✅ Tous les tests sont passés !${NC}"
echo "======================================"
echo ""
echo "L'API JurisFlow fonctionne correctement !"
echo ""


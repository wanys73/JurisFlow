#!/bin/bash

# Script de démarrage pour JurisFlow
# Ce script arrête tous les processus existants et démarre proprement le backend et le frontend

echo "🛑 Arrêt des processus existants..."
pkill -9 -f "node.*app.js" 2>/dev/null
pkill -9 -f nodemon 2>/dev/null
pkill -9 -f "vite" 2>/dev/null
sleep 2

# Définir le répertoire de base
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

echo "🔍 Vérification des ports..."
BACKEND_DIR="$SCRIPT_DIR/backend"
if [ ! -d "$BACKEND_DIR" ]; then
  echo "❌ Erreur: Répertoire backend non trouvé: $BACKEND_DIR"
  exit 1
fi

PORT=$(grep "^PORT=" "$BACKEND_DIR/.env" | cut -d'=' -f2)
echo "   Port backend configuré: $PORT"

# Libérer le port si nécessaire
lsof -ti:$PORT 2>/dev/null | xargs kill -9 2>/dev/null
lsof -ti:5173 2>/dev/null | xargs kill -9 2>/dev/null

echo "🚀 Démarrage du backend sur le port $PORT..."
cd "$BACKEND_DIR" || exit 1
# Utiliser NODE_OPTIONS pour forcer le flush immédiat des logs
NODE_OPTIONS="--no-warnings" npm run dev 2>&1 | tee /tmp/jurisflow-backend.log &
BACKEND_PID=$!
echo "   Backend démarré (PID: $BACKEND_PID)"
echo "   Logs: tail -f /tmp/jurisflow-backend.log"
echo "   Pour voir les logs de débogage: tail -f /tmp/jurisflow-backend.log | grep -v 'prisma:query'"

sleep 3

echo "🚀 Démarrage du frontend..."
FRONTEND_DIR="$SCRIPT_DIR/frontend"
if [ ! -d "$FRONTEND_DIR" ]; then
  echo "❌ Erreur: Répertoire frontend non trouvé: $FRONTEND_DIR"
  exit 1
fi

cd "$FRONTEND_DIR" || exit 1
npm run dev > /tmp/jurisflow-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend démarré (PID: $FRONTEND_PID)"
echo "   Logs: tail -f /tmp/jurisflow-frontend.log"

sleep 3

echo ""
echo "✅ Application démarrée !"
echo ""
echo "📡 Backend:  http://localhost:$PORT"
echo "🌐 Frontend: http://localhost:5173"
echo ""
echo "Pour arrêter: ./STOP.sh"
echo ""

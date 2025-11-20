#!/bin/bash

# Script de démarrage pour JurisFlow
# Ce script arrête tous les processus existants et démarre proprement le backend et le frontend

echo "🛑 Arrêt des processus existants..."
pkill -9 -f "node.*app.js" 2>/dev/null
pkill -9 -f nodemon 2>/dev/null
pkill -9 -f "vite" 2>/dev/null
sleep 2

echo "🔍 Vérification des ports..."
cd "$(dirname "$0")/backend"
PORT=$(grep "^PORT=" .env | cut -d'=' -f2)
echo "   Port backend configuré: $PORT"

# Libérer le port si nécessaire
lsof -ti:$PORT 2>/dev/null | xargs kill -9 2>/dev/null

echo "🚀 Démarrage du backend sur le port $PORT..."
cd "$(dirname "$0")/backend"
npm run dev > /tmp/jurisflow-backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend démarré (PID: $BACKEND_PID)"
echo "   Logs: tail -f /tmp/jurisflow-backend.log"

sleep 3

echo "🚀 Démarrage du frontend..."
cd "$(dirname "$0")/frontend"
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
echo "Pour arrêter: ./stop.sh"
echo ""

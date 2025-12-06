#!/bin/bash
# Script pour voir les logs du backend en temps réel

echo "🔍 Recherche des processus Node.js backend..."
echo ""

# Trouver le processus nodemon
NODEMON_PID=$(ps aux | grep "nodemon src/app.js" | grep -v grep | awk '{print $2}')

if [ -z "$NODEMON_PID" ]; then
    echo "❌ Aucun processus nodemon trouvé"
    echo "💡 Lancez le backend avec: npm run dev"
    exit 1
fi

echo "✅ Processus nodemon trouvé (PID: $NODEMON_PID)"
echo ""
echo "📋 Les logs s'affichent dans le terminal où vous avez lancé nodemon"
echo ""
echo "💡 Pour voir les logs en temps réel:"
echo "   1. Ouvrez le terminal où vous avez lancé 'npm run dev'"
echo "   2. Les logs avec 🔵 et 🔴 devraient s'afficher automatiquement"
echo ""
echo "🔍 Vérification du port 5000..."
lsof -ti:5000 > /dev/null 2>&1 && echo "✅ Backend actif sur le port 5000" || echo "❌ Backend non actif sur le port 5000"


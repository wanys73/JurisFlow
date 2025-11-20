#!/bin/bash

# Script d'arrêt pour JurisFlow

echo "🛑 Arrêt de JurisFlow..."

pkill -9 -f "node.*app.js" 2>/dev/null
pkill -9 -f nodemon 2>/dev/null
pkill -9 -f "vite" 2>/dev/null

sleep 1

echo "✅ Tous les processus arrêtés"

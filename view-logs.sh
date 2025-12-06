#!/bin/bash

# Script pour voir les logs de débogage en temps réel
# Usage: ./view-logs.sh

echo "📊 Affichage des logs de débogage en temps réel..."
echo "   (Appuyez sur Ctrl+C pour arrêter)"
echo ""
echo "Filtrage: Logs de débogage uniquement (sans requêtes Prisma)"
echo ""

tail -f /tmp/jurisflow-backend.log | grep --line-buffered -v "prisma:query"


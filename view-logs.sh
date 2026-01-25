#!/bin/bash

# Script pour afficher les logs de JurisFlow

echo "📊 Logs JurisFlow"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Choisissez une option :"
echo "  1) Logs Backend (en temps réel)"
echo "  2) Logs Frontend (en temps réel)"
echo "  3) Logs Backend (dernières 50 lignes)"
echo "  4) Logs Frontend (dernières 50 lignes)"
echo "  5) Les deux (dernières 20 lignes)"
echo "  6) Quitter"
echo ""
read -p "Votre choix (1-6): " choice

case $choice in
  1)
    echo ""
    echo "📡 Logs Backend en temps réel (Ctrl+C pour arrêter):"
    echo "───────────────────────────────────────────────────────────"
    tail -f /tmp/jurisflow-backend.log 2>/dev/null || echo "❌ Fichier de log backend non trouvé"
    ;;
  2)
    echo ""
    echo "🌐 Logs Frontend en temps réel (Ctrl+C pour arrêter):"
    echo "───────────────────────────────────────────────────────────"
    tail -f /tmp/jurisflow-frontend.log 2>/dev/null || echo "❌ Fichier de log frontend non trouvé"
    ;;
  3)
    echo ""
    echo "📡 Dernières 50 lignes du Backend:"
    echo "───────────────────────────────────────────────────────────"
    tail -50 /tmp/jurisflow-backend.log 2>/dev/null || echo "❌ Fichier de log backend non trouvé"
    ;;
  4)
    echo ""
    echo "🌐 Dernières 50 lignes du Frontend:"
    echo "───────────────────────────────────────────────────────────"
    tail -50 /tmp/jurisflow-frontend.log 2>/dev/null || echo "❌ Fichier de log frontend non trouvé"
    ;;
  5)
    echo ""
    echo "📡 Dernières 20 lignes du Backend:"
    echo "───────────────────────────────────────────────────────────"
    tail -20 /tmp/jurisflow-backend.log 2>/dev/null || echo "❌ Fichier de log backend non trouvé"
    echo ""
    echo "🌐 Dernières 20 lignes du Frontend:"
    echo "───────────────────────────────────────────────────────────"
    tail -20 /tmp/jurisflow-frontend.log 2>/dev/null || echo "❌ Fichier de log frontend non trouvé"
    ;;
  6)
    echo "Au revoir !"
    exit 0
    ;;
  *)
    echo "❌ Choix invalide"
    exit 1
    ;;
esac

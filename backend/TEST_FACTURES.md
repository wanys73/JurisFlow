# Test de la route Factures

Pour tester manuellement la route :

1. Obtenir un token d'authentification (via login)
2. Tester la route avec curl :

```bash
# Sans filtre
curl -X GET "http://localhost:5000/api/factures" \
  -H "Authorization: Bearer VOTRE_TOKEN"

# Avec filtre statut
curl -X GET "http://localhost:5000/api/factures?statut=Envoyée" \
  -H "Authorization: Bearer VOTRE_TOKEN"

# Avec filtre statut encodé
curl -X GET "http://localhost:5000/api/factures?statut=Envoy%C3%A9e" \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

Les logs devraient apparaître dans le terminal où nodemon tourne avec les emojis 🔵 et 🔴.


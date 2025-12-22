# FlashRV Premium Frontend

## Dépendances
- Node.js 18+ (ou 20 LTS)

## Installation
```bash
npm install
cp .env.example .env
npm run dev
```

## Auth (Keycloak)
- Inscription/connexion gérées par Keycloak
- Connexion possible par téléphone (username) OU email (Login with email)

Assure-toi que:
- VITE_OIDC_AUTHORITY pointe vers ton realm Keycloak
- VITE_OIDC_REDIRECT_URI = http://localhost:5173/auth/callback

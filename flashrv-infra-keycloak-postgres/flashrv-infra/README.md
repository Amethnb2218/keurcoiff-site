# FlashRV Infra (Keycloak + PostgreSQL)

## Prérequis
- Docker Desktop

## Lancer
```bash
docker compose up -d
```

## Accès
- Keycloak: http://localhost:8081 (admin/admin)
- Postgres App: localhost:5432 (flashrv/flashrv)
- Postgres Keycloak: localhost:5433 (keycloak/keycloak)

## Connexion téléphone ou email
- username = téléphone
- loginWithEmailAllowed = true
=> l'utilisateur peut saisir téléphone OU email.

# FlashRV Backend (Spring Boot + Keycloak)

## Prérequis
- Java 17
- Maven
- PostgreSQL (ou infra docker)
- Keycloak (infra docker)

## Lancer
```bash
mvn spring-boot:run
```

## Sécurité (réel)
- Inscription/connexion gérées par Keycloak (pas de mode démo)
- Spring Boot valide les JWT Keycloak (issuer-uri)

## Endpoints
- GET /api/health (public)
- GET /api/salons (public)
- GET /api/salons/{id} (public)
- GET /api/salons/{id}/services (public)
- POST /api/bookings (auth)
- GET /api/bookings/me (auth)
- GET /api/me (auth)

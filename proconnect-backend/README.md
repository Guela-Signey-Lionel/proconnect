# ProConnect — Backend Spring Boot

Réseau social interne d'entreprise. Backend en Spring Boot, architecture
**monolithe modulaire** (voir le cahier des charges Spring Boot du projet),
prêt pour un déploiement de production avec Docker.

## Stack

- **Langage / Framework** : Java 21, Spring Boot 3.3
- **Base de données** : PostgreSQL, migrations gérées par Flyway
- **ORM** : Spring Data JPA / Hibernate
- **Cache / temps réel** : Redis, Spring WebSocket (STOMP)
- **Tâches asynchrones** : Spring Async (`@Async`) + RabbitMQ (Spring AMQP)
- **Stockage fichiers** : S3 / MinIO (client MinIO officiel, compatible API S3)
- **Authentification** : JWT (jjwt) + Spring Security
- **Documentation API** : OpenAPI / Swagger UI (springdoc-openapi)
- **Tests** : JUnit 5, Spring Boot Test, MockMvc, Testcontainers, H2 (tests unitaires/intégration légers)
- **Conteneurisation** : Docker, docker-compose
- **CI/CD** : GitHub Actions

## Structure du projet

```
proconnect/
├── pom.xml
├── src/main/java/com/entreprise/proconnect/
│   ├── ProconnectApplication.java
│   ├── config/            # Security, WebSocket (STOMP), Redis, Async, OpenAPI, MinIO
│   ├── common/             # BaseEntity, PageResponse, exceptions, validation
│   ├── accounts/            # User (UserDetails), JWT, inscription, mot de passe
│   ├── profiles/             # Profil pro, compétences, expériences, recherche
│   ├── connections/           # Invitations, connexions, blocage
│   ├── feed/                   # Publications, likes, commentaires, médias
│   ├── messaging/                # Conversations, messages, STOMP temps réel
│   └── notifications/             # Notifications + push STOMP
├── src/main/resources/
│   ├── application.yml         # config commune
│   ├── application-dev.yml
│   ├── application-prod.yml
│   └── db/migration/            # scripts Flyway (V1__init_schema.sql)
├── src/test/java/...              # tests JUnit (contexte, auth, flux feed complet)
├── Dockerfile
├── docker-compose.yml
└── .github/workflows/ci.yml
```

Chaque module suit la même organisation : entités JPA, repository Spring Data,
un `*Service` portant les règles métier (ex. `ConnectionService` implémente
les règles de la section 40 du cahier des charges), un contrôleur REST, et un
sous-package `dto/` pour les objets d'entrée/sortie (records Java).

## Démarrage rapide (développement)

```bash
cp .env.example .env   # adapter les secrets

# Démarrer les dépendances (Postgres, Redis, RabbitMQ, MinIO, Mailpit)
docker compose up -d db redis rabbitmq minio mailpit

# IMPORTANT : si le stack Docker complet tourne (conteneurs `app` + `nginx`),
# arrêtez-les pour libérer le port 8080 avant de lancer le backend localement :
docker compose stop app nginx

# Le profil `dev` pointe par défaut sur l'infra Docker :
#   Postgres : localhost:5434 (5432 = PostgreSQL système, 5433 = autre service)
#   Redis : localhost:6379 · RabbitMQ : localhost:5672 · Mailpit SMTP : localhost:1025
mvn spring-boot:run
```

Le profil `dev` ne nécessite aucune variable d'environnement supplémentaire ;
`DATABASE_URL`, etc. restent surchargeables (`cp .env.example .env` n'est utilisé
que par le stack Docker — voir `docker-compose.yml`, service `app`).

L'API écoute alors sur `http://localhost:8080`, la doc Swagger sur
`http://localhost:8080/api/docs`, et le endpoint WebSocket (STOMP + SockJS)
sur `ws://localhost:8080/ws/messaging` et `ws://localhost:8080/ws/notifications`
(authentification via `?token=<jwt>`).

## Démarrage avec Docker (production-like)

```bash
cp .env.example .env   # adapter les secrets
docker compose up --build
```

## Points d'entrée API principaux

| Endpoint                                                 | Description                            |
|----------------------------------------------------------|----------------------------------------|
| `POST /api/v1/auth/register/`                            | Création de compte                     |
| `POST /api/v1/auth/login/`                               | Connexion (JWT access + refresh)       |
| `GET  /api/v1/profiles/?search=...`                      | Recherche d'employés                   |
| `POST /api/v1/connections/`                              | Envoyer une invitation                 |
| `POST /api/v1/connections/{id}/accept/`                  | Accepter une invitation                |
| `GET/POST /api/v1/feed/posts/`                           | Fil d'actualité / publier              |
| `POST /api/v1/feed/posts/{id}/like/`                     | Aimer une publication                  |
| `GET/POST /api/v1/messages/conversations/{id}/messages/` | Historique / envoyer un message        |
| `GET /api/v1/notifications/`                             | Mes notifications                      |
| STOMP `/topic/conversations/{id}`                        | Messages temps réel d'une conversation |
| STOMP `/user/queue/notifications`                        | Notifications temps réel personnelles  |
| `GET /api/docs`                                          | Documentation Swagger UI               |

Toutes les listes sont paginées (`?page=&size=`), et l'authentification se
fait via l'en-tête `Authorization: Bearer <access_token>`.

## Tests

```bash
mvn test
```

Les tests couvrent : le chargement complet du contexte Spring (tous les
modules), l'inscription/connexion (JWT), et un scénario de bout en bout
(publication → like → commentaire → notifications).

## ⚠️ Note sur la compilation dans cet environnement

Ce projet a été écrit et relu avec soin (cohérence des noms de méthodes,
imports, types, équilibrage des accolades vérifié automatiquement), mais
**n'a pas pu être compilé avec `mvn` dans l'environnement où il a été généré**,
faute d'accès à Maven Central pour télécharger les dépendances Spring Boot.
Contrairement à la version Django (validée avec `manage.py check`, migrations
réelles et tests exécutés), cette version Spring Boot n'a donc pas subi de
validation par compilation réelle. Avant de vous y fier en production,
lancez `mvn clean verify` dans un environnement avec accès réseau normal —
c'est la première chose à faire.

## Étapes restantes avant une mise en production réelle

- exécuter `mvn clean verify` pour valider la compilation et les tests ;
- brancher un fournisseur SSO/LDAP si l'entreprise en dispose (Spring Security
  OAuth2 Client / Spring LDAP — section 43 du cahier des charges) ;
- ajuster les règles de confidentialité fines (profils privés, visibilité des
  publications par connexions) selon les décisions validées en section 50 ;
- configurer le monitoring (Actuator + Micrometer + Prometheus/Grafana sont
  prêts à être branchés) et un pipeline de sauvegarde PostgreSQL automatisé ;
- remplacer le broker STOMP en mémoire (`enableSimpleBroker`) par un relais
  vers un vrai broker (RabbitMQ STOMP plugin) si vous déployez plusieurs
  instances derrière un load balancer ;
- durcir la politique de mot de passe et activer le MFA si requis.

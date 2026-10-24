#!/bin/sh
# Entry point du conteneur proconnect sur Render.
#
# Render fournit les connexions aux datastores au format URI :
#   DATABASE_URL = postgresql://user:password@host:port/dbname   (Render Postgres)
#   REDIS_URL    = redis://[default:password@]red-xxxx:6379      (Render Key Value)
#
# Spring Boot attend de son côté :
#   SPRING_DATASOURCE_URL = jdbc:postgresql://host:port/dbname
#   REDIS_HOST / REDIS_PORT / REDIS_PASSWORD
# Ce script effectue la traduction avant de lancer l'application. En local
# (docker-compose / mvn spring-boot:run), ces variables ne sont pas des URI et
# le script ne change rien : les valeurs par défaut du docker-compose s'appliquent.

set -e

# ---------------------------------------------------------------------------
# Render Postgres -> URL JDBC
# ---------------------------------------------------------------------------
if [ -n "$DATABASE_URL" ]; then
  case "$DATABASE_URL" in
    postgres://*|postgres*://*|postgresql://*|jdbc:postgresql://*)
      if [ "${DATABASE_URL#jdbc:}" != "$DATABASE_URL" ]; then
        # Déjà au format JDBC : rien à faire.
        :
      else
        R_DB_REST="${DATABASE_URL#*://}"
        R_DB_PATH="${R_DB_REST#*@}"                       # host:port/db[?params]
        R_DB_HOSTPORT="${R_DB_PATH%%/*}"                  # host:port
        R_DB_NAME="${R_DB_PATH#*/}"                       # db[?params]
        case "$R_DB_NAME" in
          *\?*) R_DB_NAME="${R_DB_NAME%%\?*}" ;;
        esac
        export SPRING_DATASOURCE_URL="jdbc:postgresql://${R_DB_HOSTPORT}/${R_DB_NAME}"
      fi
      ;;
  esac
fi

# ---------------------------------------------------------------------------
# Render Key Value (Redis) -> hôte / port / mot de passe séparés
# ---------------------------------------------------------------------------
if [ -n "$REDIS_URL" ]; then
  case "$REDIS_URL" in
    redis://*|rediss://*)
      R_REDIS_REST="${REDIS_URL#*://}"
      R_REDIS_PATH="$R_REDIS_REST"
      case "$R_REDIS_REST" in
        *@*)
          R_REDIS_AUTH="${R_REDIS_REST%%@*}"              # user:password (si présent)
          R_REDIS_PATH="${R_REDIS_REST#*@}"               # host:port[/db]
          # On retire l'utilisateur ("default:" éventuel) pour ne garder que le mot de passe.
          export REDIS_PASSWORD="${R_REDIS_AUTH#*:}"
          ;;
      esac
      R_REDIS_HOSTPORT="${R_REDIS_PATH%%/*}"              # host:port
      export REDIS_HOST="${R_REDIS_HOSTPORT%%:*}"
      export REDIS_PORT="${R_REDIS_HOSTPORT#*:}"
      case "$REDIS_PORT" in
        *[!0-9]*|"") export REDIS_PORT="6379" ;;
      esac
      ;;
  esac
fi

exec java -jar /app/app.jar

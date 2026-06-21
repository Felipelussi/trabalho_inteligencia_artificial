#!/bin/sh
set -e

# O Ollama (com os modelos ja baixados) e garantido pelo depends_on:service_healthy
# do docker-compose, entao aqui so precisamos indexar os materiais uma vez.

if [ ! -f /app/data/.ingested ]; then
  echo "[tutor] Primeira execucao: indexando os materiais (pode levar alguns minutos)..."
  pnpm ingest
  touch /app/data/.ingested
  echo "[tutor] Indexacao concluida."
fi

exec "$@"

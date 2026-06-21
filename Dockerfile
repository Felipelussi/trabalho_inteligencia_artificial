# Imagem da aplicacao (Tutor + Recuperador). O Ollama roda em outro container.
FROM node:22-bookworm

WORKDIR /app

# pnpm (lockfileVersion 9.0)
RUN npm install -g pnpm@9

# Instala dependencias primeiro (camada cacheada)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Codigo-fonte e materiais
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
COPY materials ./materials
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# O banco (indice vetorial + memoria) fica em um volume persistente
ENV TUTOR_DB_URL=file:/app/data/tutor.db
RUN mkdir -p /app/data

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["pnpm", "chat"]

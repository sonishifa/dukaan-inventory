# syntax=docker/dockerfile:1
# Multi-stage build: install -> build -> small runtime image.

# 1) Install dependencies (cached unless package files change)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2) Build the Next.js app in "standalone" mode
FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG GITHUB_SHA=""
ENV GITHUB_SHA=${GITHUB_SHA}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3) Runtime image: only the built server, static files, migrations and scripts
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S app && adduser -S app -G app

COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
COPY --from=build --chown=app:app /app/migrations ./migrations
COPY --from=build --chown=app:app /app/scripts ./scripts
COPY --chown=app:app docker/entrypoint.sh ./entrypoint.sh

USER app
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["sh", "./entrypoint.sh"]

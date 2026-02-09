############################################
# MENTIS - Production Dockerfile for EasyPanel
############################################
# Alpine + Prisma binaryTarget linux-musl-openssl-3.0.x. OpenSSL en runner para el engine.

# 1) Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Evitar OOM en next build
ENV NODE_OPTIONS="--max-old-space-size=2048"

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Prisma generate no conecta al DB; solo necesita URL válida
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"

RUN npx prisma generate

RUN npm run build


# 2) Runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Prisma en Alpine necesita libssl.so.3
RUN apk add --no-cache openssl

RUN addgroup -S mentis && adduser -S mentis -G mentis

# Copy standalone build output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Ensure node_modules exist (they are included in standalone output)
ENV NODE_OPTIONS="--max-old-space-size=512"

USER mentis

EXPOSE 3000

CMD ["node", "server.js"]





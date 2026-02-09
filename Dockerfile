############################################
# MENTIS - Production Dockerfile for EasyPanel
############################################
# Alpine + Prisma con binaryTarget linux-musl-openssl-3.0.x para que el motor cargue (libssl.so.3).

# 1) Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npx prisma generate

RUN npm run build


# 2) Runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Prisma en Alpine necesita OpenSSL (libssl.so.3); sin esto falla el login
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





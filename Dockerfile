############################################
# MENTIS - Production Dockerfile for EasyPanel
############################################
# Usamos Debian (slim) en lugar de Alpine para que Prisma tenga libssl compatible.
# En Alpine faltaba libssl.so.1.1 y el motor de Prisma no arrancaba (login fallaba).

# 1) Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma Client (required for @prisma/client)
RUN npx prisma generate

# Build Next.js app (standalone output is enabled in next.config.js)
RUN npm run build


# 2) Runtime stage
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Dependencias para Prisma en runtime (OpenSSL + libc)
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r mentis && useradd -r -g mentis mentis

# Copy standalone build output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Ensure node_modules exist (they are included in standalone output)
ENV NODE_OPTIONS="--max-old-space-size=512"

USER mentis

EXPOSE 3000

CMD ["node", "server.js"]





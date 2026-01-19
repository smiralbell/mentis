############################################
# MENTIS - Production Dockerfile for EasyPanel
############################################

# 1) Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Build Next.js app (standalone output is enabled in next.config.js)
RUN npm run build


# 2) Runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user for security
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





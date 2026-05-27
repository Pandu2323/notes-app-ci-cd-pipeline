# ── Stage 1: Dependencies ──────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Install build tools for native modules (better-sqlite3 needs them)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --only=production

# ── Stage 2: Production Image ──────────────────────────────────────────────────
FROM node:20-alpine AS production

RUN apk add --no-cache wget

LABEL maintainer="notes-app-cicd"
LABEL description="Notes App Backend API"

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001 -G nodejs

WORKDIR /app

# Copy production deps from builder
COPY --from=deps /app/node_modules ./node_modules
COPY src/ ./src/
COPY package.json ./

# Create data directory for SQLite
RUN mkdir -p /app/data && chown -R nodeuser:nodejs /app

USER nodeuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "src/index.js"]

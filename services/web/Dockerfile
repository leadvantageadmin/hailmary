# Web Service Dockerfile
# Next.js application with schema integration

# Install dependencies stage
FROM node:18-slim AS deps
WORKDIR /app

# Install system dependencies for schema integration
RUN apt-get update && apt-get install -y \
    curl \
    jq \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json pnpm-workspace.yaml* ./

# Install pnpm and dependencies
RUN corepack enable && corepack prepare pnpm@9.11.0 --activate
RUN pnpm install --frozen-lockfile || pnpm install

# Schema integration stage
FROM node:18-slim AS schema
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    jq \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy schema integration scripts
COPY scripts/pull-schema.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/pull-schema.sh

# Create schema directory
RUN mkdir -p /app/data/schema

# Set schema API configuration
ARG SCHEMA_VERSION=latest
ARG SCHEMA_API_URL=http://schema-api:3001

# Pull schema from schema API (skip during build, will be handled at runtime)
# RUN cd /app && \
#     SCHEMA_VERSION=$SCHEMA_VERSION \
#     SCHEMA_API_URL=$SCHEMA_API_URL \
#     TARGET_DIR=/app/data/schema \
#     /usr/local/bin/pull-schema.sh

# Build stage
FROM node:18-slim AS builder
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.11.0 --activate

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/pnpm-lock.yaml* ./

# Copy schema from schema stage
COPY --from=schema /app/data/schema ./data/schema

# Copy application source
COPY . .

# Copy schema to prisma directory for generation
RUN mkdir -p ./prisma && cp ./data/schema/schema.prisma ./prisma/schema.prisma

# Generate Prisma client
RUN pnpm prisma:generate

# Build the application
RUN pnpm build

# Production stage
FROM node:18-slim AS runner
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN groupadd --gid 1001 nodejs
RUN useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nextjs

# Copy built application
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy node_modules with generated Prisma client
COPY --from=builder /app/node_modules ./node_modules

# Copy schema files
COPY --from=builder /app/data/schema ./data/schema
COPY --from=builder /app/prisma ./prisma

# Set ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Set environment variables
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server.js"]

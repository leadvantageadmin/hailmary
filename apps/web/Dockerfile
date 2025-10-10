# Install deps
FROM node:18-slim AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml* ./
COPY apps/web/package.json apps/web/package.json
RUN corepack enable && corepack prepare pnpm@9.11.0 --activate && pnpm install --filter @app/web

# Build
FROM node:18-slim AS builder
WORKDIR /app
# Install OpenSSL for Prisma generation
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY . .
RUN corepack enable && pnpm install --no-frozen-lockfile
WORKDIR /app/apps/web
RUN ls -la ../../node_modules/.pnpm/ | grep -E "(bcryptjs|jsonwebtoken)" || echo "Dependencies not found in workspace"
RUN pnpm prisma:generate
RUN pnpm build

# Run
FROM node:18-slim AS runner
WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
COPY --from=builder /app/apps/web/.next/standalone .
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/node_modules ./apps/web/node_modules
RUN mkdir -p ./apps/web/public
COPY --from=builder /app/apps/web/public ./apps/web/public
# Copy Prisma schema to the runner stage
COPY --from=builder /app/apps/web/prisma ./apps/web/prisma
EXPOSE 3000
CMD ["node", "apps/web/server.js"]

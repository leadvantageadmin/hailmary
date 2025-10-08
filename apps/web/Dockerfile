# Install deps
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml* ./
COPY apps/web/package.json apps/web/package.json
RUN corepack enable && corepack prepare pnpm@9.11.0 --activate && pnpm install --filter @app/web

# Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules /app/node_modules
COPY . .
WORKDIR /app/apps/web
RUN corepack enable && pnpm install --prefer-offline  && pnpm prisma:generate && pnpm build

# Run
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/web/.next/standalone .
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public 2>/dev/null || mkdir -p ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]

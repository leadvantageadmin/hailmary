# Customer Search Platform (Local-first, OSS, Containerized)

Local-first, open-source stack for read-heavy customer search. Develop on Docker Compose; deploy same containers to GCP.

## Stack
- PostgreSQL + PostGIS (source of truth)
- OpenSearch (search/read)
- Redis (cache)
- Next.js (web + API)
- Ingestor (batch ETL)

## Quickstart
1) cp apps/web/.env.example apps/web/.env.local
   cp apps/ingestor/.env.example apps/ingestor/.env.local
2) docker compose up -d --build
3) docker compose exec web pnpm prisma migrate deploy
4) open http://localhost:3000

## Services
- Web: http://localhost:3000
- Postgres: localhost:5432 (app/app)
- OpenSearch: http://localhost:9200
- Redis: localhost:6379

## Layout
- apps/web (Next.js + Prisma)
- apps/ingestor (Python worker)
- packages/shared (types + validators)
- data (local files)

## Deploy (GCP later)
- Web → Cloud Run, Ingestor → Cloud Run Job, Postgres → Cloud SQL, OpenSearch → GKE/GCE, Redis → Memorystore.

MIT

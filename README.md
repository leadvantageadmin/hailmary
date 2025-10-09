# Customer Search Platform (Local-first, OSS, Containerized)

Local-first, open-source stack for read-heavy customer search. Develop on Docker Compose; deploy same containers to GCP.

## Stack
- PostgreSQL + PostGIS (source of truth)
- OpenSearch (search/read)
- Redis (cache)
- Next.js (web + API)
- Ingestor (batch ETL)

## Quickstart
1) cp apps/web/env.local.example apps/web/.env.local
   cp apps/ingestor/env.local.example apps/ingestor/.env.local
2) docker compose up -d --build
3) Create User table and admin user (see RUNBOOK.md)
4) open http://localhost:3000

## Services
- Web: http://localhost:3000
- Postgres: localhost:5432 (app/app)
- OpenSearch: http://localhost:9200
- Redis: localhost:6379

## Layout
- `apps/web` (Next.js + Prisma + Authentication)
- `apps/ingestor` (Python worker)
- `packages/shared` (types + validators)
- `data` (local files)
- `deployment/` (deployment scripts and configurations)

## Authentication
- Login page: http://localhost:3000/login
- Admin panel: http://localhost:3000/admin
- Search page: http://localhost:3000/search (requires authentication)
- Default admin: admin@leadvantageglobal.com / admin123

## Deployment
See `deployment/` directory for deployment scripts and configurations:
- Production deployment: `deployment/VM-DEPLOYMENT.md`
- Production Docker Compose: `deployment/docker-compose.production.yml`

MIT

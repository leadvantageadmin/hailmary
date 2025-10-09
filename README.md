# Customer Search Platform (Local-first, OSS, Containerized)

Local-first, open-source stack for read-heavy customer search. Develop on Docker Compose; deploy same containers to GCP.

## Stack
- PostgreSQL + PostGIS (source of truth)
- OpenSearch (search/read)
- Redis (cache)
- Next.js (web + API)
- Ingestor (batch ETL)

## Quickstart

### Local Development
```bash
# Start local development environment
./scripts/hailmary.sh local

# Or use individual scripts
./scripts/local-deploy.sh
```

### VM Deployment
```bash
# Deploy to VM
./scripts/hailmary.sh vm

# Or use individual scripts
./scripts/vm-deploy.sh
```

### Manual Setup (Alternative)
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
- `scripts/` (management scripts for local and VM)
- `deployment/` (deployment scripts and configurations)

## Authentication
- Login page: http://localhost:3000/login
- Admin panel: http://localhost:3000/admin
- Search page: http://localhost:3000/search (requires authentication)
- Default admin: admin@leadvantageglobal.com / admin123

## Management Scripts

### Unified Interface
```bash
# Show help
./scripts/hailmary.sh help

# Local development
./scripts/hailmary.sh local deploy    # Start local environment
./scripts/hailmary.sh local status    # Check status
./scripts/hailmary.sh local logs      # View logs
./scripts/hailmary.sh local ingest    # Run data ingestion
./scripts/hailmary.sh local cleanup   # Clean up

# VM deployment
./scripts/hailmary.sh vm deploy       # Deploy to VM
./scripts/hailmary.sh vm status       # Check VM status
./scripts/hailmary.sh vm logs         # View VM logs
./scripts/hailmary.sh vm ingest       # Run data ingestion on VM
```

### Individual Scripts
- **Local**: `scripts/local-*.sh` (deploy, stop, restart, status, logs, ingest, cleanup)
- **VM**: `scripts/vm-*.sh` (deploy, status, logs, ingest)
- **Deployment**: `deployment/vm-manage.sh` (comprehensive VM management)

## Docker Compose Organization
See `DOCKER-COMPOSE.md` for detailed information about Docker Compose file organization:
- Local development: `docker-compose.yml` (root level)
- Production/VM: `deployment/docker-compose.production.yml`

## Deployment
See `deployment/` directory for deployment scripts and configurations:
- Production deployment: `deployment/VM-DEPLOYMENT.md`
- Production Docker Compose: `deployment/docker-compose.production.yml`

MIT

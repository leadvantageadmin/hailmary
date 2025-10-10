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

#### Prerequisites
- GCP VM instance with at least 2GB RAM and 20GB disk space
- VM should have `http-server` and `https-server` network tags
- Firewall rules allowing HTTP (port 80) and HTTPS (port 443) traffic
- SSH access configured with your GCP credentials

#### Quick Setup (New VM)
```bash
# Complete VM setup (handles all requirements automatically)
./scripts/setup-vm.sh
```

#### Standard Deployment
```bash
# Deploy to existing VM
./scripts/hailmary.sh vm deploy

# Or use the deploy script directly
./scripts/deploy.sh vm
```

#### Post-Deployment
```bash
# Upload and ingest data
./scripts/hailmary.sh vm upload-csv data/your-file.csv
./scripts/hailmary.sh vm ingest

# Check status
./scripts/hailmary.sh vm status
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

## Data Ingestion

The platform uses a **hybrid ingestion approach** that automatically selects the optimal method based on dataset size for maximum performance.

### Ingestion Methods

| Dataset Size | Method | Performance | Use Case |
|--------------|--------|-------------|----------|
| **< 1,000 records** | API (Prisma) | ~2-3 seconds | Development, small datasets |
| **1,000+ records** | Raw SQL Bulk | ~2-5 seconds | Medium datasets, staging |
| **1,000,000+ records** | PostgreSQL COPY | ~30-60 seconds | Production, large datasets |

### How It Works

1. **Automatic Method Selection**: The ingestor analyzes dataset size and chooses the optimal method
2. **API Method** (`< 1,000 records`):
   - Uses `/api/bulk-import` endpoint with Prisma ORM
   - Full validation, error handling, and transaction safety
   - Best for development and small datasets

3. **Raw SQL Method** (`1,000+ records`):
   - Direct PostgreSQL bulk insert with `executemany()`
   - Optimized for medium to large datasets
   - Uses `ON CONFLICT DO UPDATE` for upserts

4. **COPY Method** (`1,000,000+ records` - Future):
   - PostgreSQL `COPY` command for ultra-fast bulk loads
   - Temporary table + merge approach
   - Ready for production-scale datasets

### Running Data Ingestion

```bash
# Local ingestion
./scripts/ingest.sh local

# VM ingestion  
./scripts/ingest.sh vm

# Rebuild database schema and re-ingest
./scripts/rebuild-schema.sh
```

### Data Format

The system expects CSV files with the following structure:
- **Location**: `data/customers.csv`
- **Employee Size Formats**: Supports "100-500", "1000+", "1000 to 5000", "1000"
- **Null Handling**: Empty fields are automatically converted to NULL
- **Upsert Logic**: Uses `externalSource` + `externalId` for conflict resolution

### Performance Characteristics

- **Small Datasets**: API method provides full validation and consistency
- **Large Datasets**: Raw SQL method offers 10x+ performance improvement
- **Million+ Records**: COPY method ready for enterprise-scale data loads
- **OpenSearch Indexing**: All methods include automatic search index updates

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

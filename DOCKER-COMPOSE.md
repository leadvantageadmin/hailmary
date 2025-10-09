# Docker Compose Organization

This document explains the organization of Docker Compose files in the HailMary Customer Search Platform.

## File Structure

### Root Level (Local Development)
- **`docker-compose.yml`** - Main local development configuration
  - Exposes all services on localhost ports
  - Uses local environment files (`.env.local`)
  - Includes all services: postgres, opensearch, redis, web, ingestor

### Deployment Level (Production/VM)
- **`deployment/docker-compose.production.yml`** - Production configuration
  - Services only accessible within Docker network (except nginx)
  - Uses production environment file (`.env`)
  - Includes nginx reverse proxy
  - Optimized for VM deployment

## Environment Files

### Local Development
- **`apps/web/.env.local`** - Web service environment (created from `env.local.example`)
- **`apps/ingestor/.env.local`** - Ingestor service environment (created from `env.local.example`)

### Production
- **`deployment/.env`** - Production environment (created from `env.production.example`)

## Usage

### Local Development
```bash
# Start local development environment
./scripts/hailmary.sh local deploy

# Or directly with docker-compose
docker-compose up -d --build
```

### Production/VM Deployment
```bash
# Deploy to VM
./scripts/hailmary.sh vm deploy

# Or directly with docker-compose
docker-compose -f deployment/docker-compose.production.yml up -d --build
```

## Service Ports

### Local Development
- Web App: http://localhost:3000
- PostgreSQL: localhost:5432
- OpenSearch: http://localhost:9200
- Redis: localhost:6379

### Production (via Nginx)
- Web App: http://VM_IP:8080 (HTTP) / https://VM_IP:8443 (HTTPS)
- Note: OpenSearch and Redis are only accessible within the VM (ports blocked in GCP)

## Key Differences

| Aspect | Local | Production |
|--------|-------|------------|
| Database | `app/app/app` | `postgres/password/hailmary` |
| Ports | All exposed | Only nginx exposed |
| Network | Default bridge | Custom `app-network` |
| Nginx | Not included | Included as reverse proxy |
| Environment | `.env.local` files | Single `.env` file |

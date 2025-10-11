# Deployment Files

This directory contains essential deployment files for the HailMary Customer Search Platform.

## Files Overview

- **`docker-compose.production.yml`** - Production Docker Compose configuration
- **`env.production`** - Environment variables template for production
- **`nginx.conf`** - Nginx configuration for reverse proxy

## Quick Start

### VM Deployment

#### Complete Setup (New VM)
```bash
# Complete VM setup (handles all requirements automatically)
./scripts/setup-vm.sh
```

#### Standard Deployment
```bash
# Deploy to VM using unified script
./scripts/hailmary.sh vm deploy

# Or use deploy script directly
./scripts/deploy.sh vm

# Check status
./scripts/hailmary.sh vm status

# View logs
./scripts/hailmary.sh vm logs
```

#### Data Ingestion
```bash
# Upload CSV files
./scripts/hailmary.sh vm upload-csv data/your-file.csv

# Ingest data
./scripts/hailmary.sh vm ingest
```

### Environment Setup
1. Copy `env.production` to `.env` in the project root
2. Update environment variables as needed
3. Run deployment using the unified script

## Usage

All deployment operations are handled through the unified `scripts/hailmary.sh` script:

- **Deploy**: `./scripts/hailmary.sh vm deploy`
- **Status**: `./scripts/hailmary.sh vm status`
- **Logs**: `./scripts/hailmary.sh vm logs [service]`
- **Restart**: `./scripts/hailmary.sh vm restart`
- **Stop**: `./scripts/hailmary.sh vm stop`

For complete script documentation, see the main project README.md.

## Docker Compose Organization

- **Local Development**: Use `docker-compose.yml` in the root directory
- **Production (VM/GCP)**: Use `docker-compose.production.yml` in this directory

See `DOCKER-COMPOSE.md` in the root directory for detailed information about the organization and differences between local and production configurations.

## Access Points

- **Application**: http://hailmary.leadvantageglobal.com
- **Login**: http://hailmary.leadvantageglobal.com/login
- **Note**: OpenSearch and Redis are only accessible within the VM (ports blocked in GCP)
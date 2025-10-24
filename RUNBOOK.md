# HailMary Services Runbook

## 🏗️ Architecture Overview

HailMary is a microservices-based application with the following services:

- **🐘 PostgreSQL** - Primary database service
- **🔴 Redis** - Caching and session management
- **📥 Ingestor** - Data ingestion and processing service
- **🌐 Web** - Next.js web application
- **🔄 CDC** - Change Data Capture service (Elasticsearch/OpenSearch)
- **📊 Schema** - Schema management service (separate repo)

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Git
- Node.js 18+ (for local development)
- Python 3.8+ (for local development)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/leadvantageadmin/hailmary.git
   cd hailmary
   ```

2. **Start services in order**
   ```bash
   # Start PostgreSQL first (local mode)
   cd services/postgres && ./scripts/start.sh local
   
   # Start Redis (local mode)
   cd ../redis && ./scripts/start.sh local
   
   # Start Schema service (local mode)
   cd ../schema && ./scripts/start.sh local
   
   # Start CDC service (local mode)
   cd ../cdc && ./scripts/start.sh local
   
   # Start Ingestor service (local mode)
   cd ../ingestor && ./scripts/start.sh local
   
   # Start Web service (local mode)
   cd ../web && ./scripts/start.sh local
   ```

3. **Verify services are running**
   ```bash
   # Check PostgreSQL (port 5433)
   docker ps | grep hailmary-postgres
   
   # Check all services
   docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
   ```

4. **Access the application**
   - Web Application: http://localhost:3000
   - Admin Panel: http://localhost:3000/admin
   - Direct Search: http://localhost:3000/direct-search

## 📋 Service Details

### 🐘 PostgreSQL Service

**Purpose**: Primary database for the application with automatic materialized view refresh

#### **Local Development Setup**

**Prerequisites**:
- Docker and Docker Compose installed
- Port 5433 available (local development port)

**Start Service**:
```bash
cd services/postgres
./scripts/start.sh local
# or simply (local is default)
./scripts/start.sh
```

**Configuration (Local)**:
- Port: 5433 (mapped from container 5432)
- Database: app
- User: app
- Password: app
- Data Directory: `./data/postgres`
- Logs Directory: `./logs/postgres`
- Materialized View Refresh: 10-second polling interval

**Connection String**: `postgresql://app:app@localhost:5433/app`

#### **VM/Production Setup**

**Prerequisites**:
- VM with Docker and Docker Compose installed
- Port 5433 available
- Environment variables configured

**Start Service**:
```bash
# On VM
cd /opt/hailmary/services/postgres
./scripts/start.sh vm
```

**Configuration (VM)**:
- Port: 5433 (mapped from container 5432)
- Database: app
- User: app
- Password: app
- Data Directory: `./data/postgres`
- Logs Directory: `./logs/postgres`
- Materialized View Refresh: 30-second polling interval
- Deployment Mode: vm

**Connection String**: `postgresql://app:app@<vm-ip>:5433/app`

#### **Environment Variables**

**Required in `.env` file**:
```bash
# PostgreSQL Configuration
POSTGRES_USER=app
POSTGRES_PASSWORD=app
POSTGRES_DB=app
POSTGRES_PORT=5433

# Deployment Mode (for VM)
DEPLOYMENT_MODE=vm

# Data Paths
POSTGRES_DATA_PATH=./data/postgres
POSTGRES_LOGS_PATH=./logs/postgres
SCHEMA_DATA_PATH=./data/schema

# Optional: pgAdmin Configuration
PGADMIN_EMAIL=admin@hailmary.local
PGADMIN_PASSWORD=admin
PGADMIN_PORT=8080
```

#### **Daily Operations**

**Service Management**:
```bash
# Start service
./scripts/start.sh [local|vm]

# Stop service
./scripts/stop.sh [local|vm]

# Restart service
./scripts/restart.sh [local|vm]

# Check service health
./scripts/health-check.sh [local|vm]

# View service logs
./scripts/logs.sh [local|vm]

# View specific log types
./scripts/logs.sh [local|vm] -f          # Follow logs
./scripts/logs.sh [local|vm] --postgres  # PostgreSQL logs only
./scripts/logs.sh [local|vm] --refresh   # Materialized view refresh logs only
```

**Database Operations**:
```bash
# Run database migrations
./scripts/run-migrations.sh [local|vm]

# Validate schema
./scripts/validate-schema.sh [local|vm]

# Pull latest schema from schema service
./scripts/pull-schema.sh [local|vm]

# Clean up old data (use with caution)
./scripts/cleanup-data.sh [local|vm]
```

**Materialized View Management**:
```bash
# Start materialized view refresh service
./scripts/materialized-view-refresh-service.sh [local|vm] start

# Stop materialized view refresh service
./scripts/materialized-view-refresh-service.sh [local|vm] stop

# Check materialized view refresh status
./scripts/materialized-view-refresh-service.sh [local|vm] status

# View materialized view refresh logs
docker compose logs materialized-view-refresh
```

**Direct Database Access**:
```bash
# Connect to database
docker compose exec postgres psql -U app -d app

# Run SQL commands
docker compose exec postgres psql -U app -d app -c "SELECT * FROM \"User\" LIMIT 5;"

# Backup database
docker compose exec postgres pg_dump -U app app > backup.sql

# Restore database
docker compose exec -T postgres psql -U app -d app < backup.sql
```

#### **Services Included**

The PostgreSQL service includes two containers:

1. **PostgreSQL Database** (`hailmary-postgres`)
   - Main database container
   - Port: 5433 (external) → 5432 (internal)
   - Health check: `docker exec hailmary-postgres pg_isready -U app -d app`

2. **Materialized View Refresh** (`hailmary-materialized-view-refresh`)
   - Automatic materialized view refresh service
   - Polling interval: 10s (local) / 30s (VM)
   - Monitors for data changes and refreshes views automatically

#### **Health Checks**

**Quick Health Check**:
```bash
# Check if containers are running
docker ps | grep hailmary-postgres
docker ps | grep hailmary-materialized-view-refresh

# Test database connection
docker compose exec postgres pg_isready -U app -d app

# Check materialized view refresh logs
docker compose logs materialized-view-refresh --tail 10
```

**Comprehensive Health Check**:
```bash
./scripts/health-check.sh [local|vm]
```

#### **Troubleshooting**

**Common Issues**:

1. **Service won't start**:
   ```bash
   # Check Docker is running
   docker info
   
   # Check port conflicts
   netstat -tulpn | grep :5433
   
   # Check logs
   ./scripts/logs.sh [local|vm]
   ```

2. **Database connection issues**:
   ```bash
   # Verify PostgreSQL is running
   docker ps | grep postgres
   
   # Test connection
   docker compose exec postgres pg_isready -U app -d app
   
   # Check database logs
   docker compose logs postgres
   ```

3. **Materialized view refresh not working**:
   ```bash
   # Check if service is running
   docker ps | grep materialized-view-refresh
   
   # Check logs
   docker compose logs materialized-view-refresh
   
   # Restart materialized view refresh
   ./scripts/materialized-view-refresh-service.sh [local|vm] restart
   ```

4. **Permission issues (VM)**:
   ```bash
   # Fix data directory permissions
   sudo chown -R $(whoami):$(whoami) ./data
   
   # Fix log directory permissions
   sudo chown -R $(whoami):$(whoami) ./logs
   ```

**Dependencies**: None (base service)

**Ports**: 5433 (external), 5432 (internal container)

---

### 🔴 Redis Service

**Purpose**: Caching and session management

**Local Deployment**:
```bash
cd services/redis
./scripts/start.sh
```

**VM Deployment**:
```bash
# On VM
cd /opt/hailmary/services/redis
./scripts/start.sh
```

**Configuration**:
- Port: 6379
- Data Directory: `./data/redis`
- Logs Directory: `./logs/redis`

**Management Scripts**:
- `start.sh` - Start the service
- `stop.sh` - Stop the service
- `health-check.sh` - Check service health
- `logs.sh` - View service logs

**Dependencies**: None (base service)

**Health Check**: `docker exec hailmary-redis redis-cli ping`

---

### 📥 Ingestor Service

**Purpose**: Data ingestion and processing from CSV files to PostgreSQL database

#### **Local Development Setup**

**Prerequisites**:
- Docker and Docker Compose installed
- Port 8080 available
- PostgreSQL service running

**Start Service**:
```bash
cd services/ingestor
./scripts/start.sh local
# or simply (local is default)
./scripts/start.sh
```

**Configuration (Local)**:
- Port: 8080
- Database: PostgreSQL (host.docker.internal:5433)
- Data Directory: `./data/csv`
- Logs Directory: `./data/logs`
- Schema Directory: `./data/schema`

**Connection String**: `http://localhost:8080`

#### **VM/Production Setup**

**Prerequisites**:
- VM with Docker and Docker Compose installed
- Port 8080 available
- PostgreSQL service running
- Environment variables configured

**Start Service**:
```bash
# On VM
cd /opt/hailmary/services/ingestor
./scripts/start.sh vm
```

**Configuration (VM)**:
- Port: 8080
- Database: PostgreSQL (postgres:5433)
- Data Directory: `./data/csv`
- Logs Directory: `./data/logs`
- Schema Directory: `./data/schema`
- Deployment Mode: vm

**Connection String**: `http://<vm-ip>:8080`

#### **Environment Variables**

**Required in `.env` file**:
```bash
# PostgreSQL Configuration
POSTGRES_HOST=host.docker.internal
POSTGRES_PORT=5433
POSTGRES_DB=app
POSTGRES_USER=app
POSTGRES_PASSWORD=app

# Ingestor Configuration
INGESTION_BATCH_SIZE=1000
LOG_LEVEL=INFO
INGESTOR_PORT=8080

# Schema Service Integration
GITHUB_REPO=leadvantageadmin/hailmary-schema
SCHEMA_VERSION=v2.1.0
GITHUB_TOKEN=your-github-token-here

# Data Paths
CSV_DATA_PATH=./data/csv
SCHEMA_DATA_PATH=./data/schema
LOGS_PATH=./data/logs

# Timezone
TZ=UTC

# Deployment Mode (for VM deployment)
DEPLOYMENT_MODE=local
```

#### **Daily Operations**

**Service Management**:
```bash
# Start service
./scripts/start.sh [local|vm]

# Stop service
./scripts/stop.sh [local|vm]

# Restart service
./scripts/restart.sh [local|vm]

# Check service health
./scripts/health-check.sh [local|vm]

# View service logs
./scripts/logs.sh [local|vm]

# View specific log types
./scripts/logs.sh [local|vm] -f          # Follow logs
./scripts/logs.sh [local|vm] -t 100      # Show last 100 lines
./scripts/logs.sh [local|vm] -e          # Show only errors
./scripts/logs.sh [local|vm] -c          # Show container logs
```

**Data Ingestion Operations**:
```bash
# Ingest a single CSV file
./scripts/ingest-single.sh <filename>

# Test ingestion process
./scripts/test-ingestion.sh

# Test schema integration
./scripts/test-schema-integration.sh

# Verify schema integration
./scripts/verify-schema-integration.sh

# Pull latest schema from schema service
./scripts/pull-schema.sh [local|vm]
```

**Direct API Access**:
```bash
# Health check
curl http://localhost:8080/health

# Ingest CSV file via API
curl -X POST http://localhost:8080/ingest \
  -H "Content-Type: application/json" \
  -d '{"filename": "data.csv"}'

# Get ingestion status
curl http://localhost:8080/status

# List available CSV files
curl http://localhost:8080/files
```

#### **Health Checks**

**Quick Health Check**:
```bash
# Check if container is running
docker ps | grep hailmary-ingestor

# Test API endpoint
curl -f http://localhost:8080/health

# Check logs
./scripts/logs.sh [local|vm] --tail 20
```

**Comprehensive Health Check**:
```bash
./scripts/health-check.sh [local|vm]
```

#### **Troubleshooting**

**Common Issues**:

1. **Service won't start**:
   ```bash
   # Check Docker is running
   docker info
   
   # Check port conflicts
   netstat -tulpn | grep :8080
   
   # Check PostgreSQL dependency
   docker ps | grep hailmary-postgres
   
   # Check logs
   ./scripts/logs.sh [local|vm]
   ```

2. **Database connection issues**:
   ```bash
   # Verify PostgreSQL is running
   docker ps | grep postgres
   
   # Test database connection
   docker compose exec postgres psql -U app -d app -c "SELECT 1;"
   
   # Check database logs
   docker compose logs postgres
   ```

3. **CSV ingestion issues**:
   ```bash
   # Check CSV file format
   head -5 ./data/csv/your-file.csv
   
   # Check ingestion logs
   ./scripts/logs.sh [local|vm] -e
   
   # Test with single file
   ./scripts/ingest-single.sh your-file.csv
   ```

4. **Schema integration issues**:
   ```bash
   # Check schema files
   ls -la ./data/schema/
   
   # Test schema integration
   ./scripts/test-schema-integration.sh
   
   # Pull latest schema
   ./scripts/pull-schema.sh [local|vm]
   ```

5. **Permission issues (VM)**:
   ```bash
   # Fix data directory permissions
   sudo chown -R $(whoami):$(whoami) ./data
   
   # Fix log directory permissions
   sudo chown -R $(whoami):$(whoami) ./logs
   ```

**Dependencies**: PostgreSQL only (OpenSearch handled by CDC service)

**Ports**: 8080 (external)

---

### 🌐 Web Service

**Purpose**: Next.js web application

**Local Deployment**:
```bash
cd services/web
./scripts/start.sh
```

**VM Deployment**:
```bash
# On VM
cd /opt/hailmary/services/web
./scripts/start.sh
```

**Configuration**:
- Port: 3000
- Environment: production
- Database URL: postgresql://app:app@localhost:5432/app
- OpenSearch URL: http://localhost:9201
- Redis URL: redis://localhost:6379

**Management Scripts**:
- `start.sh` - Start the service
- `stop.sh` - Stop the service
- `restart.sh` - Restart the service
- `dev.sh` - Start in development mode
- `health-check.sh` - Check service health
- `logs.sh` - View service logs

**Dependencies**: PostgreSQL, Redis, OpenSearch, Schema API

**Health Check**: `curl -f http://localhost:3000/api/health`

---

### 🔄 CDC Service

**Purpose**: Change Data Capture with Elasticsearch/OpenSearch

**Local Deployment**:
```bash
cd services/cdc
./scripts/start.sh
```

**VM Deployment**:
```bash
# On VM
cd /opt/hailmary/services/cdc
./scripts/start.sh
```

**Configuration**:
- OpenSearch Port: 9201
- Redis Port: 6380
- Data Directory: `./data/elasticsearch`
- Logs Directory: `./logs/elasticsearch`

**Management Scripts**:
- `start.sh` - Start the service
- `stop.sh` - Stop the service
- `health-check.sh` - Check service health
- `logs.sh` - View service logs
- `setup-cdc.sh` - Setup CDC configuration

**Dependencies**: PostgreSQL, Redis

**Health Check**: `curl -f http://localhost:9201/_cluster/health`

---

### 📊 Schema Service

**Purpose**: Schema management and versioning

**Local Deployment**:
```bash
cd services/schema
./scripts/start.sh
```

**VM Deployment**:
```bash
# On VM
cd /opt/hailmary/services/schema
./scripts/start.sh
```

**Configuration**:
- Port: 3001
- Environment: production

**Management Scripts**:
- `start.sh` - Start the service
- `stop.sh` - Stop the service
- `health-check.sh` - Check service health
- `logs.sh` - View service logs
- `publish.sh` - Publish schema version
- `validate-schema.sh` - Validate schema

**Dependencies**: None (standalone service)

**Health Check**: `curl -f http://localhost:3001/health`

## 🔧 VM Deployment Strategy

### Prerequisites for VM
- Ubuntu 20.04+ or CentOS 8+
- Docker and Docker Compose installed
- Git installed
- Firewall configured for required ports
- Sufficient disk space (50GB+ recommended)

### VM Setup Process

#### Option 1: Automated Setup (Recommended)
```bash
# From your local machine, run the setup script
./scripts/setup-vm.sh <vm-ip> [ssh-user] [ssh-key]

# Example:
./scripts/setup-vm.sh 34.123.45.67 ubuntu ~/.ssh/gcp_key
```

#### Option 2: Manual Setup
1. **Install Docker and Docker Compose**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install docker.io docker-compose
   sudo systemctl enable docker
   sudo systemctl start docker
   
   # Add user to docker group
   sudo usermod -aG docker $USER
   ```

2. **Clone repository on VM**
   ```bash
   git clone https://github.com/leadvantageadmin/hailmary.git /opt/hailmary
   cd /opt/hailmary
   ```

3. **Configure environment variables**
   ```bash
   # Create environment files for each service
   cp services/postgres/env.example services/postgres/.env
   cp services/redis/env.example services/redis/.env
   cp services/web/env.example services/web/.env
   cp services/ingestor/env.example services/ingestor/.env
   cp services/cdc/env.example services/cdc/.env
   cp services/schema/env.example services/schema/.env
   ```

4. **Start services in order**
   ```bash
   # Start base services (VM mode)
   cd services/postgres && ./scripts/start.sh vm
   cd ../redis && ./scripts/start.sh vm
   cd ../schema && ./scripts/start.sh vm
   
   # Start application services (VM mode)
   cd ../cdc && ./scripts/start.sh vm
   cd ../ingestor && ./scripts/start.sh vm
   cd ../web && ./scripts/start.sh vm
   ```

### VM Update Process

#### Update from Local Machine
```bash
# Pull latest code and update VM deployment
./scripts/update-vm.sh [branch]

# Example:
./scripts/update-vm.sh main
```

#### Update on VM
```bash
# SSH into VM and run update
ssh -i ~/.ssh/gcp_key ubuntu@<vm-ip>
cd /opt/hailmary
git pull origin main

# Restart services if needed
/opt/hailmary/start-all.sh
```

### VM Service Management

**Create systemd services for auto-start**:

```bash
# Create systemd service for each service
sudo tee /etc/systemd/system/hailmary-postgres.service > /dev/null <<EOF
[Unit]
Description=HailMary PostgreSQL Service
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/hailmary/services/postgres
ExecStart=/opt/hailmary/services/postgres/scripts/start.sh
ExecStop=/opt/hailmary/services/postgres/scripts/stop.sh
User=root

[Install]
WantedBy=multi-user.target
EOF

# Enable and start services
sudo systemctl daemon-reload
sudo systemctl enable hailmary-postgres
sudo systemctl start hailmary-postgres
```

## 🔍 Monitoring and Troubleshooting

### Health Checks
```bash
# Check all services
./scripts/health-check-all.sh

# Check individual services
cd services/postgres && ./scripts/health-check.sh
cd services/redis && ./scripts/health-check.sh
cd services/web && ./scripts/health-check.sh
cd services/ingestor && ./scripts/health-check.sh
cd services/cdc && ./scripts/health-check.sh
cd services/schema && ./scripts/health-check.sh
```

### Logs
```bash
# View all service logs
./scripts/logs-all.sh

# View individual service logs
cd services/postgres && ./scripts/logs.sh
cd services/redis && ./scripts/logs.sh
cd services/web && ./scripts/logs.sh
cd services/ingestor && ./scripts/logs.sh
cd services/cdc && ./scripts/logs.sh
cd services/schema && ./scripts/logs.sh
```

### Common Issues

1. **Service won't start**
   - Check Docker is running: `docker info`
   - Check port conflicts: `netstat -tulpn | grep :PORT`
   - Check logs: `./scripts/logs.sh`

2. **Database connection issues**
   - Verify PostgreSQL is running: `docker ps | grep postgres`
   - Check connection: `docker exec hailmary-postgres pg_isready -U app -d app`

3. **Web service issues**
   - Check dependencies are running
   - Verify environment variables
   - Check logs: `cd services/web && ./scripts/logs.sh`

## 📊 Port Configuration

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5433 | Database (external) |
| Redis | 6379 | Cache |
| Web | 3000 | Web Application |
| Ingestor | 8080 | Data Processing |
| CDC - Elasticsearch | 9200 | Search Engine HTTP API |
| CDC - Elasticsearch Transport | 9300 | Search Engine Internal Communication |
| CDC - Redis | 6379 | Cache and Checkpointing |
| Schema API | 3001 | Schema Management |
| pgAdmin | 8080 | Database Admin (optional) |

## 🔐 Security Considerations

1. **Change default passwords** in production
2. **Use environment variables** for sensitive data
3. **Configure firewall** to restrict access
4. **Use HTTPS** in production
5. **Regular security updates** for base images

## 📈 Scaling Considerations

1. **Database**: Consider read replicas for high traffic
2. **Web Service**: Use load balancer for multiple instances
3. **Redis**: Configure clustering for high availability
4. **Monitoring**: Implement proper monitoring and alerting

## CDC Service

**Purpose**: Real-time Change Data Capture (CDC) from PostgreSQL to Elasticsearch using PGSync

### Local Development Setup

```bash
# Navigate to CDC service directory
cd services/cdc

# Create environment file from template
cp .env.example .env

# Start CDC service in local mode
./scripts/start.sh local

# Check service health
./scripts/health-check.sh local

# View service logs
./scripts/manage-cdc.sh logs local
```

### VM/Production Setup

```bash
# Navigate to CDC service directory
cd /opt/hailmary/services/cdc

# Create environment file from template
cp .env.example .env

# Update deployment mode to VM
sed -i 's/DEPLOYMENT_MODE=local/DEPLOYMENT_MODE=vm/' .env

# Start CDC service in VM mode
./scripts/start.sh vm

# Check service health
./scripts/health-check.sh vm
```

### Configuration

#### Local Development
- **PostgreSQL Host**: `host.docker.internal:5433`
- **Elasticsearch**: `localhost:9200`
- **Redis**: `localhost:6379`
- **PGSync**: Connects to PostgreSQL via Docker network

#### VM/Production
- **PostgreSQL Host**: `hailmary-postgres:5432`
- **Elasticsearch**: `localhost:9200`
- **Redis**: `localhost:6379`
- **PGSync**: Connects to PostgreSQL via hailmary-network

### Connection Strings

```bash
# Elasticsearch
http://localhost:9200

# Redis
localhost:6379

# PostgreSQL (via PGSync)
hailmary-postgres:5432 (VM) / host.docker.internal:5433 (local)
```

### Environment Variables

```bash
# PostgreSQL Configuration (for PGSync)
PG_HOST=hailmary-postgres          # VM: hailmary-postgres, Local: host.docker.internal
PG_PORT=5432                       # VM: 5432, Local: 5433
PG_DATABASE=app
PG_USER=app
PG_PASSWORD=app

# Elasticsearch Configuration
ELASTICSEARCH_PORT=9200
ELASTICSEARCH_TRANSPORT_PORT=9300

# Redis Configuration
REDIS_PORT=6379

# PGSync Configuration
PGSYNC_LOG_LEVEL=INFO
PGSYNC_BATCH_SIZE=1000
PGSYNC_FLUSH_INTERVAL=1

# Data Paths
ELASTICSEARCH_DATA_PATH=./data/elasticsearch
ELASTICSEARCH_LOGS_PATH=./logs/elasticsearch
REDIS_DATA_PATH=./data/redis
PGSYNC_LOGS_PATH=./logs/pgsync

# Deployment Mode
DEPLOYMENT_MODE=vm                 # vm or local
```

### Daily Operations

#### Service Management
```bash
# Start CDC service
./scripts/start.sh [local|vm]

# Stop CDC service
./scripts/manage-cdc.sh stop [local|vm]

# Restart CDC service
./scripts/manage-cdc.sh restart [local|vm]

# Check service status
./scripts/manage-cdc.sh status [local|vm]

# View service health
./scripts/health-check.sh [local|vm]
```

#### CDC Operations
```bash
# View PGSync logs
./scripts/manage-cdc.sh logs [local|vm]

# List Elasticsearch indices
./scripts/manage-cdc.sh indices [local|vm]

# Check sync status
./scripts/manage-cdc.sh health [local|vm]

# Trigger manual sync (restart PGSync)
./scripts/manage-cdc.sh restart [local|vm]
```

#### Direct Service Access
```bash
# Check Elasticsearch cluster health
curl http://localhost:9200/_cluster/health

# List all indices
curl http://localhost:9200/_cat/indices?v

# Check Redis status
docker-compose exec redis redis-cli ping

# View PGSync container logs
docker-compose logs -f pgsync
```

### Health Checks

#### Quick Health Check
```bash
./scripts/health-check.sh [local|vm]
```

#### Comprehensive Health Check
```bash
# Check all services
docker-compose ps

# Check Elasticsearch
curl -s http://localhost:9200/_cluster/health | jq '.'

# Check Redis
docker-compose exec redis redis-cli info memory

# Check PGSync process
docker-compose exec pgsync pgrep -f python3.11
```

### Troubleshooting

#### Common Issues

**PGSync shows as unhealthy**
```bash
# Check if PGSync process is running
docker-compose exec pgsync pgrep -f python3.11

# Check PGSync logs
docker-compose logs pgsync

# Restart PGSync container
docker-compose restart pgsync
```

**Elasticsearch connection issues**
```bash
# Check Elasticsearch health
curl http://localhost:9200/_cluster/health

# Check Elasticsearch logs
docker-compose logs elasticsearch

# Restart Elasticsearch
docker-compose restart elasticsearch
```

**Redis connection issues**
```bash
# Check Redis status
docker-compose exec redis redis-cli ping

# Check Redis logs
docker-compose logs redis

# Restart Redis
docker-compose restart redis
```

**No data syncing**
```bash
# Check PostgreSQL connection from PGSync
docker-compose exec pgsync sh -c "nc -z hailmary-postgres 5432"

# Check schema.json configuration
cat config/schema.json

# Verify PostgreSQL logical replication
docker-compose exec postgres psql -U app -d app -c "SHOW wal_level;"
```

#### Solutions

**Reset CDC service completely**
```bash
# Stop all services
docker-compose down

# Remove volumes (WARNING: This will delete all data)
docker-compose down -v

# Recreate and start
./scripts/start.sh [local|vm]
```

**Check sync progress**
```bash
# View recent sync activity
docker-compose logs pgsync --tail=50 | grep "Sync"

# Check Elasticsearch document counts
curl -s http://localhost:9200/_cat/indices?v
```

### Dependencies

- **PostgreSQL**: Must be running with logical replication enabled
- **Elasticsearch**: For search indexing
- **Redis**: For PGSync checkpointing
- **Docker Network**: `hailmary-network` for service communication

### Ports

| Service | Port | Description |
|---------|------|-------------|
| Elasticsearch | 9200 | HTTP API |
| Elasticsearch Transport | 9300 | Internal communication |
| Redis | 6379 | Cache and checkpointing |

---

*Last Updated: $(date)*
*Version: 1.0.0*

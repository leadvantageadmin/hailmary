# CDC Service Runbook

**Purpose**: Real-time Change Data Capture (CDC) from PostgreSQL to Elasticsearch using PGSync

## 🚀 Quick Start

### Local Development
```bash
cd services/cdc
./scripts/start.sh local
```

### VM/Production
```bash
cd /opt/hailmary/services/cdc
./scripts/start.sh vm
```

## 📋 Configuration

### Local Development
- PostgreSQL Host: `host.docker.internal:5433`
- Elasticsearch: `localhost:9200`
- Redis: `localhost:6390`
- PGSync: Connects to PostgreSQL via Docker network

### VM/Production
- PostgreSQL Host: `hailmary-postgres:5432`
- Elasticsearch: `localhost:9200`
- Redis: `localhost:6390`
- PGSync: Connects to PostgreSQL via hailmary-network

## 🔧 Daily Operations

### Service Management
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

### CDC Operations
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

### Direct Service Access
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

## 🏥 Health Checks

### Quick Health Check
```bash
./scripts/health-check.sh [local|vm]
```

### Comprehensive Health Check
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

## 🔧 Troubleshooting

### Common Issues

**PostgreSQL wal_level not set to logical (CDC prerequisite)**
```bash
# Check current wal_level
docker-compose exec postgres psql -U app -d app -c "SHOW wal_level;"

# If showing 'replica' instead of 'logical', fix it:
# 1. Set wal_level to logical
docker-compose exec postgres psql -U app -d app -c "ALTER SYSTEM SET wal_level = logical;"

# 2. Restart PostgreSQL for changes to take effect
docker-compose restart postgres

# 3. Verify the change
docker-compose exec postgres psql -U app -d app -c "SHOW wal_level;"
```

**PGSync shows as unhealthy**
```bash
# Check if PGSync process is running
docker-compose exec pgsync pgrep -f python3.11

# Check PGSync logs
docker-compose logs pgsync

# Restart PGSync container
docker-compose restart pgsync
```

**Elasticsearch JVM issues (Permission denied for logs)**
```bash
# Check Elasticsearch logs for JVM errors
docker-compose logs elasticsearch --tail=20

# If you see "Permission denied" for logs/gc.log, fix permissions:
sudo chown -R 1000:1000 ./logs/elasticsearch

# Restart Elasticsearch
docker-compose restart elasticsearch

# Wait for Elasticsearch to start (30-60 seconds)
sleep 30 && docker-compose ps
```

**Redis permission issues (RDB snapshot failures)**
```bash
# Check Redis logs for permission errors
docker-compose logs redis --tail=10

# If you see "Permission denied" for RDB files, fix permissions:
sudo chown -R 999:999 ./data/redis

# Restart Redis
docker-compose restart redis

# Verify Redis is working
docker-compose exec redis redis-cli ping
```

**Bcrypt Hash Corruption on VM (Critical Issue)**
```bash
# ISSUE: Bcrypt hashes get corrupted when inserted via SSH commands on VM
# The $ characters in bcrypt hashes are interpreted as shell variables
# Hash: $2a$12$hcX8vn.6bTRCd3jwvOH0Ju13iuk1rqZxSxKqFSHqW5QosN/i5Jn2.
# Becomes: \a\.6bTRCd3jwvOH0Ju13iuk1rqZxSxKqFSHqW5QosN/i5Jn2.

# SOLUTION: Use SQL files instead of direct SSH commands
# 1. Create SQL file with proper escaping
cat > update_admin.sql << 'EOF'
UPDATE "User" SET password = '$2a$12$hcX8vn.6bTRCd3jwvOH0Ju13iuk1rqZxSxKqFSHqW5QosN/i5Jn2.', "updatedAt" = NOW() WHERE email = 'admin@leadvantageglobal.com';
EOF

# 2. Execute SQL file (bypasses shell interpretation)
docker-compose exec -T postgres psql -U app -d app < update_admin.sql

# 3. Verify hash was stored correctly
docker-compose exec postgres psql -U app -d app -c "SELECT password FROM \"User\" WHERE email = 'admin@leadvantageglobal.com';"
```

### Complete CDC Service Setup on VM (Step-by-Step)
```bash
# 1. Ensure PostgreSQL has wal_level=logical
docker-compose exec postgres psql -U app -d app -c "SHOW wal_level;"
# If not 'logical', set it:
docker-compose exec postgres psql -U app -d app -c "ALTER SYSTEM SET wal_level = logical;"
docker-compose restart postgres

# 2. Fix all permission issues
sudo chown -R $(whoami):$(whoami) ./data ./logs
sudo chown -R 1000:1000 ./data/elasticsearch ./logs/elasticsearch
sudo chown -R 999:999 ./data/redis

# 3. Start CDC service
./scripts/start.sh vm

# 4. Wait for services to start (may take 2-3 minutes)
sleep 60 && ./scripts/health-check.sh vm

# 5. Verify all services are healthy
docker-compose ps
```

## 🔗 Dependencies

- **PostgreSQL**: Must be running with logical replication enabled
- **Elasticsearch**: For search indexing
- **Redis**: For PGSync checkpointing
- **Docker Network**: `hailmary-network` for service communication

## 🌐 Ports

| Service | Port | Description |
|---------|------|-------------|
| Elasticsearch | 9200 | HTTP API |
| Elasticsearch Transport | 9300 | Internal communication |
| Redis | 6390 | Cache and checkpointing |

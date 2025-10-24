# PostgreSQL Service Runbook

**Purpose**: Primary database for the application with automatic materialized view refresh

## 🚀 Quick Start

### Local Development
```bash
cd services/postgres
./scripts/start.sh local
```

### VM/Production
```bash
cd /opt/hailmary/services/postgres
./scripts/start.sh vm
```

## 📋 Configuration

### Local Development
- Port: 5433 (mapped from container 5432)
- Database: app
- User: app
- Password: app
- Data Directory: `./data/postgres`
- Logs Directory: `./logs/postgres`
- Materialized View Refresh: 10-second polling interval

### VM/Production
- Port: 5433 (mapped from container 5432)
- Database: app
- User: app
- Password: app
- Data Directory: `./data/postgres`
- Logs Directory: `./logs/postgres`
- Materialized View Refresh: 30-second polling interval
- Deployment Mode: vm

## 🔧 Daily Operations

### Service Management
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
```

### Database Operations
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

### Materialized View Management
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

### Direct Database Access
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

## 🏥 Health Checks

### Quick Health Check
```bash
# Check if containers are running
docker ps | grep hailmary-postgres
docker ps | grep hailmary-materialized-view-refresh

# Test database connection
docker compose exec postgres pg_isready -U app -d app

# Check materialized view refresh logs
docker compose logs materialized-view-refresh --tail 10
```

### Comprehensive Health Check
```bash
./scripts/health-check.sh [local|vm]
```

## 🔧 Troubleshooting

### Common Issues

1. **Service won't start**
   ```bash
   # Check Docker is running
   docker info
   
   # Check port conflicts
   netstat -tulpn | grep :5433
   
   # Check logs
   ./scripts/logs.sh [local|vm]
   ```

2. **Database connection issues**
   ```bash
   # Verify PostgreSQL is running
   docker ps | grep postgres
   
   # Test connection
   docker compose exec postgres pg_isready -U app -d app
   
   # Check database logs
   docker compose logs postgres
   ```

3. **Materialized view refresh not working**
   ```bash
   # Check if service is running
   docker ps | grep materialized-view-refresh
   
   # Check logs
   docker compose logs materialized-view-refresh
   
   # Restart materialized view refresh
   ./scripts/materialized-view-refresh-service.sh [local|vm] restart
   ```

4. **Permission issues (VM)**
   ```bash
   # Fix data directory permissions
   sudo chown -R $(whoami):$(whoami) ./data
   
   # Fix log directory permissions
   sudo chown -R $(whoami):$(whoami) ./logs
   ```

## 📊 Services Included

1. **PostgreSQL Database** (`hailmary-postgres`)
   - Main database container
   - Port: 5433 (external) → 5432 (internal)
   - Health check: `docker exec hailmary-postgres pg_isready -U app -d app`

2. **Materialized View Refresh** (`hailmary-materialized-view-refresh`)
   - Automatic materialized view refresh service
   - Polling interval: 10s (local) / 30s (VM)
   - Monitors for data changes and refreshes views automatically

## 🔗 Dependencies

- **None**: Base service

## 🌐 Ports

- **PostgreSQL**: 5433 (external), 5432 (internal container)

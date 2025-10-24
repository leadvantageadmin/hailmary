# Redis Service Runbook

**Purpose**: Caching and session management with schema integration

## 🚀 Quick Start

### Local Development
```bash
cd services/redis
./scripts/start.sh local
```

### VM/Production
```bash
cd /opt/hailmary/services/redis
./scripts/start.sh vm
```

## 📋 Configuration

### Local Development
- Port: 6390
- Database: 0
- Password: None (default)
- Data Directory: `./data/redis`
- Logs Directory: `./logs/redis`
- Schema Directory: `./data/schema`

### VM/Production
- Port: 6390
- Database: 0
- Password: None (default)
- Data Directory: `./data/redis`
- Logs Directory: `./logs/redis`
- Schema Directory: `./data/schema`
- Deployment Mode: vm

## 🔧 Daily Operations

### Service Management
```bash
# Start service
./scripts/start.sh [local|vm]

# Stop service
./scripts/stop.sh [local|vm]

# Check service health
./scripts/health-check.sh [local|vm]

# View service logs
./scripts/logs.sh [local|vm]
```

### Schema Management
```bash
# Pull latest schema from schema service
./scripts/pull-schema.sh [local|vm] [VERSION]

# Examples:
./scripts/pull-schema.sh local latest    # Pull latest schema (local mode)
./scripts/pull-schema.sh vm v2.1.0       # Pull specific version (VM mode)
```

### Direct Redis Access
```bash
# Connect to Redis CLI
docker compose exec redis redis-cli

# Run Redis commands
docker compose exec redis redis-cli ping
docker compose exec redis redis-cli info
docker compose exec redis redis-cli keys "*"

# Set and get values
docker compose exec redis redis-cli set "test_key" "test_value"
docker compose exec redis redis-cli get "test_key"

# Monitor Redis commands in real-time
docker compose exec redis redis-cli monitor
```

## 🏥 Health Checks

### Quick Health Check
```bash
# Check if container is running
docker ps | grep hailmary-services-redis

# Test Redis connectivity
docker compose exec redis redis-cli ping

# Check Redis info
docker compose exec redis redis-cli info server
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
   netstat -tulpn | grep :6390
   
   # Check logs
   ./scripts/logs.sh [local|vm]
   ```

2. **Redis connection issues**
   ```bash
   # Verify Redis is running
   docker ps | grep redis
   
   # Test connection
   docker compose exec redis redis-cli ping
   
   # Check Redis logs
   docker compose logs redis
   ```

3. **Memory issues**
   ```bash
   # Check Redis memory usage
   docker compose exec redis redis-cli info memory
   
   # Check memory fragmentation
   docker compose exec redis redis-cli info memory | grep mem_fragmentation_ratio
   
   # Clear Redis cache if needed
   docker compose exec redis redis-cli flushall
   ```

4. **Permission issues (VM)**
   ```bash
   # Fix data directory permissions
   sudo chown -R $(whoami):$(whoami) ./data
   
   # Fix log directory permissions
   sudo chown -R $(whoami):$(whoami) ./logs
   ```

5. **Schema integration issues**
   ```bash
   # Check schema files
   ls -la ./data/schema/
   
   # Pull latest schema
   ./scripts/pull-schema.sh [local|vm] latest
   
   # Verify schema files
   cat ./data/schema/metadata.json
   ```

## 📊 Services Included

1. **Redis Server** (`hailmary-services-redis`)
   - Main Redis container
   - Port: 6390 (external) → 6389 (internal)
   - Health check: `docker exec hailmary-services-redis redis-cli ping`

2. **Redis CLI** (`hailmary-redis-cli`) - Optional
   - Management CLI container
   - Available via `docker compose exec redis-cli redis-cli`

## 🔗 Dependencies

- **None**: Base service (can run independently)
- **Optional**: Schema service for schema integration

## 🌐 Ports

- **Redis**: 6390 (external), 6389 (internal)

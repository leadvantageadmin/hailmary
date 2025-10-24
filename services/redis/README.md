# HailMary Redis Service

Independent Redis service for the HailMary application with schema integration and modular architecture.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Network access to GitHub (for schema pulling)
- HailMary network (`hailmary-network`)

### Start Redis Service
```bash
# Clone and navigate to Redis service
cd services/redis

# Copy environment configuration
cp env.example .env

# Start the service
./scripts/start.sh
```

### Health Check
```bash
# Check Redis health
./scripts/health-check.sh

# View logs
./scripts/logs.sh

# Follow logs
./scripts/logs.sh -f
```

## 📋 Configuration

### Environment Variables
- `REDIS_PORT`: Redis port (default: 6379)
- `REDIS_PASSWORD`: Redis password (optional)
- `REDIS_DB`: Default database (default: 0)
- `GITHUB_REPO`: Schema repository (default: leadvantageadmin/hailmary-schema)
- `SCHEMA_VERSION`: Schema version to use (default: latest)
- `GITHUB_TOKEN`: GitHub token for private repos (optional)

### Redis Configuration
The service uses a custom Redis configuration optimized for:
- **Memory Management**: 256MB limit with LRU eviction
- **Persistence**: RDB snapshots + AOF for durability
- **Performance**: Optimized for caching and session management
- **Monitoring**: Slow log and latency monitoring enabled

## 🔧 Management Commands

### Service Management
```bash
# Start service
./scripts/start.sh

# Stop service
./scripts/stop.sh

# Restart service
./scripts/restart.sh

# Health check
./scripts/health-check.sh
```

### Logging
```bash
# View recent logs
./scripts/logs.sh

# Follow logs
./scripts/logs.sh -f

# View specific number of lines
./scripts/logs.sh -n 100
```

### Schema Integration
```bash
# Pull latest schema
./scripts/pull-schema.sh

# Pull specific schema version
./scripts/pull-schema.sh v2.1.0
```

### Redis CLI Access
```bash
# Connect to Redis CLI
docker compose exec redis redis-cli

# Connect to specific database
docker compose exec redis redis-cli -n 1

# Run Redis commands
docker compose exec redis redis-cli set "key" "value"
docker compose exec redis redis-cli get "key"
```

## 🏗️ Architecture

### Service Components
- **Redis Server**: Main Redis instance with custom configuration
- **Redis CLI**: Management container for Redis operations
- **Schema Integration**: Automatic schema pulling from GitHub
- **Health Monitoring**: Comprehensive health checks

### Data Persistence
- **RDB Snapshots**: Automatic snapshots at intervals
- **AOF Logging**: Append-only file for durability
- **Volume Mounts**: Persistent data storage

### Network Integration
- **External Network**: Connected to `hailmary-network`
- **Port Exposure**: Redis port exposed for external access
- **Service Discovery**: Available to other HailMary services

## 📊 Monitoring

### Health Checks
The service includes comprehensive health monitoring:
- **Container Status**: Docker container health
- **Redis Connectivity**: Ping and response tests
- **Memory Usage**: Memory consumption monitoring
- **Database Status**: Key count per database
- **Persistence Status**: RDB and AOF status

### Metrics Available
- Redis version and uptime
- Connected clients count
- Memory usage and fragmentation
- Database key counts
- Persistence status

## 🔒 Security

### Configuration
- **Password Protection**: Optional Redis password
- **Network Binding**: Configurable bind address
- **Access Control**: Client connection limits

### Best Practices
- Use strong passwords in production
- Limit network access to trusted sources
- Monitor memory usage and connections
- Regular backup of persistent data

## 🚀 Integration

### With Other Services
The Redis service integrates with:
- **PostgreSQL Service**: For caching database queries
- **OpenSearch Service**: For caching search results
- **Ingestor Service**: For caching ingestion status
- **Web Service**: For session management and caching

### Schema Integration
- **Automatic Updates**: Pulls latest schema from GitHub
- **Version Control**: Supports specific schema versions
- **Validation**: Verifies schema files after download

## 🛠️ Troubleshooting

### Common Issues

#### Redis Won't Start
```bash
# Check logs
./scripts/logs.sh

# Check port conflicts
netstat -tulpn | grep 6379

# Restart service
./scripts/restart.sh
```

#### Memory Issues
```bash
# Check memory usage
./scripts/health-check.sh

# Clear Redis data
docker compose exec redis redis-cli flushall

# Restart with fresh data
./scripts/restart.sh
```

#### Schema Issues
```bash
# Re-pull schema
./scripts/pull-schema.sh

# Check schema files
ls -la data/schema/

# Verify schema content
cat data/schema/metadata.json
```

### Log Analysis
```bash
# View error logs
./scripts/logs.sh | grep ERROR

# Follow logs for debugging
./scripts/logs.sh -f

# Check Redis slow log
docker compose exec redis redis-cli slowlog get 10
```

## 📚 Additional Resources

- [Redis Documentation](https://redis.io/documentation)
- [Redis Configuration](https://redis.io/topics/config)
- [Docker Redis Image](https://hub.docker.com/_/redis)
- [HailMary Schema Service](../schema/README.md)

## 🤝 Contributing

1. Follow the modular architecture pattern
2. Update documentation for any changes
3. Test with health checks before committing
4. Ensure schema integration compatibility

## 📄 License

Part of the HailMary project. See main project license.

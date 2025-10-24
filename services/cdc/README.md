# CDC Service - PostgreSQL to Elasticsearch Change Data Capture

This service provides real-time synchronization between PostgreSQL and Elasticsearch using PGSync with Redis for checkpointing.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │     PGSync      │    │  Elasticsearch  │
│   (External)    │───▶│   (Container)   │───▶│   (Container)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │     Redis       │
                       │  (Checkpoint)   │
                       └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- PostgreSQL with logical replication enabled
- Access to `hailmary-network` Docker network

### 1. Configure Environment
```bash
# Copy and edit environment variables
cp .env.example .env
# Edit .env with your PostgreSQL credentials
```

### 2. Start Services
```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### 3. Verify Setup
```bash
# Check Elasticsearch health
curl http://localhost:9200/_cluster/health

# Check indices
curl http://localhost:9200/_cat/indices?v

# Check PGSync status
docker-compose logs pgsync
```

## 📁 Directory Structure

```
services/cdc/
├── docker-compose.yml          # Main service definition
├── .env                        # Environment variables
├── config/
│   ├── schema.json            # PGSync schema configuration
│   └── redis.conf             # Redis configuration
├── data/                      # Persistent data volumes
│   ├── elasticsearch/         # Elasticsearch data
│   └── redis/                 # Redis data
├── logs/                      # Service logs
│   ├── elasticsearch/         # Elasticsearch logs
│   └── pgsync/                # PGSync logs
└── README.md                  # This file
```

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PG_HOST` | `hailmary-postgres` | PostgreSQL hostname |
| `PG_PORT` | `5432` | PostgreSQL port |
| `PG_DATABASE` | `app` | Database name |
| `PG_USER` | `app` | Database user |
| `PG_PASSWORD` | `app` | Database password |
| `ELASTICSEARCH_PORT` | `9200` | Elasticsearch HTTP port |
| `PGSYNC_LOG_LEVEL` | `INFO` | PGSync log level |
| `PGSYNC_BATCH_SIZE` | `1000` | Batch size for sync operations |

### Schema Configuration

The `config/schema.json` file defines:
- Database tables to sync
- Elasticsearch indices
- Field mappings and transformations
- Index settings

## 🔧 Service Details

### Elasticsearch
- **Image**: `elasticsearch:7.17.15`
- **Memory**: 1GB heap (configurable)
- **Ports**: 9200 (HTTP), 9300 (Transport)
- **Data**: Persistent volume at `./data/elasticsearch`
- **Health Check**: Cluster health endpoint

### Redis
- **Image**: `redis:7-alpine`
- **Memory**: 256MB max (LRU eviction)
- **Port**: 6379
- **Data**: Persistent volume at `./data/redis`
- **Health Check**: Redis ping

### PGSync
- **Image**: `toluaina1/pgsync:latest`
- **Memory**: 512MB-1GB
- **Dependencies**: Redis (healthy), Elasticsearch (healthy)
- **Logs**: Persistent volume at `./logs/pgsync`
- **Health Check**: Process monitoring

## 📊 Monitoring

### Health Checks
```bash
# Check all services
docker-compose ps

# Check specific service health
docker-compose exec elasticsearch curl http://localhost:9200/_cluster/health
docker-compose exec redis redis-cli ping
docker-compose exec pgsync pgrep -f pgsync
```

### Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f elasticsearch
docker-compose logs -f redis
docker-compose logs -f pgsync
```

### Metrics
```bash
# Elasticsearch cluster stats
curl http://localhost:9200/_cluster/stats

# Redis info
docker-compose exec redis redis-cli info

# PGSync sync status (from logs)
docker-compose logs pgsync | grep "Sync"
```

## 🔄 Operations

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart pgsync
```

### Update Schema
1. Edit `config/schema.json`
2. Restart PGSync: `docker-compose restart pgsync`

### Index Recreation and Schema Changes

**⚠️ Important**: When making schema changes that affect field mappings or transformations, PGSync will NOT automatically recreate indices. This is because PGSync uses Redis checkpoints to track sync progress and assumes indices already exist.

#### When Index Recreation is Needed
- Field mapping changes (e.g., changing field types)
- Removing or renaming fields in transformations
- Changing index settings or analyzers
- Any changes that require a fresh index structure

#### Proper Index Recreation Process

1. **Clear Redis Checkpoint** (for the affected table):
   ```bash
   # List existing checkpoints
   docker exec hailmary-redis redis-cli keys "*table_name*"
   
   # Clear checkpoint for specific table (e.g., company)
   docker exec hailmary-redis redis-cli del "queue:app_company:meta"
   ```

2. **Delete Elasticsearch Index** (if it exists):
   ```bash
   # Delete the index
   curl -X DELETE "http://localhost:9200/company"
   ```

3. **Restart PGSync Service**:
   ```bash
   docker restart hailmary-pgsync
   ```

4. **Verify Re-sync**:
   ```bash
   # Check PGSync logs for re-sync activity
   docker logs hailmary-pgsync --tail 20
   
   # Verify index recreation
   curl -s "http://localhost:9200/_cat/indices?v" | grep company
   
   # Check field mapping
   curl -s "http://localhost:9200/company/_mapping" | jq '.company.mappings.properties'
   ```

#### Why This Process is Necessary

- **Redis Checkpointing**: PGSync stores sync progress in Redis (`queue:app_table:meta`)
- **Incremental Sync**: PGSync only syncs changes, not full re-indexing
- **Index Assumption**: PGSync assumes indices exist and are properly configured
- **Schema Changes**: Field mapping changes require fresh index structure

#### Example: Fixing Field Mapping Issues

**Problem**: Company `name` field appears as `null` in Elasticsearch, actual name in `description` field.

**Root Cause**: CDC configuration had `"name": "description"` rename transformation.

**Solution**:
1. Remove rename transformation from `config/schema.json`
2. Clear Redis checkpoint: `docker exec hailmary-redis redis-cli del "queue:app_company:meta"`
3. Restart PGSync: `docker restart hailmary-pgsync`
4. PGSync automatically recreates index with correct mapping

### Backup Data
```bash
# Backup Elasticsearch data
tar -czf elasticsearch-backup.tar.gz data/elasticsearch/

# Backup Redis data
tar -czf redis-backup.tar.gz data/redis/
```

### Scale Services
```bash
# Scale PGSync (if needed)
docker-compose up -d --scale pgsync=2
```

## 🐛 Troubleshooting

### Common Issues

1. **PGSync not starting**
   - Check PostgreSQL connection
   - Verify schema.json syntax
   - Check dependencies are healthy

2. **Elasticsearch out of memory**
   - Increase `ES_JAVA_OPTS` in docker-compose.yml
   - Check available system memory

3. **Redis connection issues**
   - Verify Redis is healthy
   - Check network connectivity

4. **Data not syncing**
   - Check PGSync logs for errors
   - Verify PostgreSQL logical replication
   - Check Elasticsearch indices

### Debug Commands
```bash
# Check service connectivity
docker-compose exec pgsync ping elasticsearch
docker-compose exec pgsync ping redis

# Check PostgreSQL connection
docker-compose exec pgsync psql -h hailmary-postgres -U app -d app -c "SELECT 1"

# Check Elasticsearch connection
docker-compose exec pgsync curl http://elasticsearch:9200/_cluster/health
```

## 🔒 Security

- Elasticsearch security is disabled for development
- Redis is not password protected (internal network only)
- PostgreSQL credentials are in environment variables
- All services run in isolated Docker networks

## 📈 Performance Tuning

### Elasticsearch
- Adjust `ES_JAVA_OPTS` for memory
- Configure thread pool sizes
- Set appropriate shard/replica counts

### Redis
- Adjust `maxmemory` and eviction policy
- Configure persistence settings

### PGSync
- Tune `PGSYNC_BATCH_SIZE`
- Adjust `PGSYNC_FLUSH_INTERVAL`
- Monitor sync performance

## 🚀 Production Considerations

1. **Enable Elasticsearch Security**
2. **Use Redis AUTH**
3. **Set up proper monitoring**
4. **Configure log rotation**
5. **Set up automated backups**
6. **Use resource limits**
7. **Enable SSL/TLS**
8. **Set up alerting**

## 📞 Support

For issues or questions:
1. Check the logs first
2. Review this documentation
3. Check PGSync documentation
4. Contact the development team
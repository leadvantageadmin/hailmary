# Logstash Service Runbook

**Purpose**: PostgreSQL to Elasticsearch data synchronization using Logstash with materialized view support

## 🚀 Quick Start

### Local Development
```bash
cd services/logstash
./scripts/start.sh local
```

### VM/Production
```bash
cd /opt/hailmary/services/logstash
./scripts/start.sh vm
```

## 📋 Configuration

### Local Development
- HTTP Port: 9600
- Pipeline Port: 5044
- PostgreSQL: host.docker.internal:5433
- Elasticsearch: host.docker.internal:9200
- Data Directory: `./data/`
- Logs Directory: `./data/logs/`
- Checkpoints Directory: `./data/checkpoints/`

### VM/Production
- HTTP Port: 9600
- Pipeline Port: 5044
- PostgreSQL: hailmary-postgres:5432
- Elasticsearch: elasticsearch:9200
- Data Directory: `./data/`
- Logs Directory: `./data/logs/`
- Checkpoints Directory: `./data/checkpoints/`
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

### Data Synchronization Operations
```bash
# Trigger full sync
./scripts/sync.sh [local|vm] --full

# Sync specific table
./scripts/sync.sh [local|vm] --table company
./scripts/sync.sh [local|vm] --table prospect

# Sync materialized view
./scripts/sync.sh [local|vm] --materialized-view

# Force sync regardless of changes
./scripts/sync.sh [local|vm] --full --force
```

### Direct API Access
```bash
# Health check
curl http://localhost:9600/_node/stats

# Pipeline status
curl http://localhost:9600/_node/pipelines

# Node information
curl http://localhost:9600/_node/info
```

## 🏥 Health Checks

### Quick Health Check
```bash
# Check if containers are running
docker ps | grep hailmary-logstash

# Test HTTP API
curl -f http://localhost:9600/_node/stats

# Check logs
./scripts/logs.sh [local|vm] --tail 20
```

### Comprehensive Health Check
```bash
./scripts/health-check.sh [local|vm]
```

### Health Check Components
- ✅ Container Status: Logstash container running
- ✅ HTTP API: `/_node/stats` responding
- ✅ Pipeline Status: Active pipelines processing data
- ✅ PostgreSQL Connection: Database connectivity
- ✅ Elasticsearch Connection: Search service connectivity
- ✅ Data Directories: File system access
- ✅ Checkpoint Files: Sync state tracking

## 🔧 Troubleshooting

### Common Issues

1. **Service won't start**
   ```bash
   # Check Docker is running
   docker info
   
   # Check port conflicts
   netstat -tulpn | grep :9600
   
   # Check dependencies
   docker ps | grep hailmary-postgres
   docker ps | grep hailmary-elasticsearch
   
   # Check logs
   ./scripts/logs.sh [local|vm]
   ```

2. **Logstash HTTP API not responding**
   ```bash
   # Check container logs
   ./scripts/logs.sh [local|vm] -c
   
   # Check if port is accessible
   curl -v http://localhost:9600/_node/stats
   
   # Restart service
   ./scripts/restart.sh [local|vm]
   ```

3. **Pipelines not processing data**
   ```bash
   # Check pipeline status
   curl http://localhost:9600/_node/pipelines
   
   # Check pipeline logs
   ./scripts/logs.sh [local|vm] -p
   
   # Trigger manual sync
   ./scripts/sync.sh [local|vm] --full
   ```

4. **PostgreSQL connection issues**
   ```bash
   # Verify PostgreSQL is running
   docker ps | grep postgres
   
   # Test database connection
   docker exec hailmary-postgres psql -U app -d app -c "SELECT 1;"
   
   # Check database logs
   docker logs hailmary-postgres
   ```

5. **Elasticsearch connection issues**
   ```bash
   # Verify Elasticsearch is running
   docker ps | grep elasticsearch
   
   # Check cluster health
   curl http://localhost:9200/_cluster/health
   
   # Check indices
   curl http://localhost:9200/_cat/indices?v
   ```

6. **Materialized view not syncing**
   ```bash
   # Check materialized view refresh service
   docker ps | grep materialized-refresh
   
   # Check materialized view logs
   docker logs hailmary-materialized-refresh
   
   # Manual refresh
   docker exec hailmary-postgres psql -U app -d app -c "REFRESH MATERIALIZED VIEW CONCURRENTLY company_prospect_view;"
   
   # Trigger sync
   ./scripts/sync.sh [local|vm] --materialized-view
   ```

7. **Data not appearing in Elasticsearch**
   ```bash
   # Check if data exists in PostgreSQL
   docker exec hailmary-postgres psql -U app -d app -c "SELECT COUNT(*) FROM \"Company\";"
   docker exec hailmary-postgres psql -U app -d app -c "SELECT COUNT(*) FROM company_prospect_view;"
   
   # Check Elasticsearch indices
   curl http://localhost:9200/_cat/indices?v
   
   # Check specific index
   curl http://localhost:9200/company/_count
   
   # Clear checkpoints and resync
   rm -f ./data/checkpoints/*_last_run
   ./scripts/sync.sh [local|vm] --full
   ```

8. **Performance issues**
   ```bash
   # Check container resource usage
   docker stats hailmary-logstash
   
   # Check pipeline throughput
   curl http://localhost:9600/_node/stats | jq '.pipelines'
   
   # Check Elasticsearch performance
   curl http://localhost:9200/_nodes/stats
   ```

### Log Analysis
```bash
# View recent logs
./scripts/logs.sh [local|vm]

# Follow logs in real-time
./scripts/logs.sh [local|vm] -f

# Show only errors
./scripts/logs.sh [local|vm] -e

# Show pipeline-specific logs
./scripts/logs.sh [local|vm] -p

# Show container logs
./scripts/logs.sh [local|vm] -c
```

## 📊 Monitoring

### Key Metrics
- **Pipeline Throughput**: Events processed per second
- **Memory Usage**: JVM heap usage
- **Document Counts**: Elasticsearch index document counts
- **Sync Latency**: Time between database changes and Elasticsearch updates
- **Error Rates**: Failed pipeline events

### Monitoring Commands
```bash
# Get pipeline statistics
curl http://localhost:9600/_node/stats | jq '.pipelines'

# Get memory usage
curl http://localhost:9600/_node/stats | jq '.jvm.mem'

# Get document counts
curl http://localhost:9200/_cat/indices?v

# Check checkpoint status
ls -la ./data/checkpoints/
```

## 🔄 Data Synchronization

### Sync Strategies

1. **Incremental Sync**: Monitors `updatedAt` timestamps for changes
2. **Full Sync**: Complete data refresh (manual trigger)
3. **Materialized View Sync**: Direct querying of materialized views

### Sync Sources

1. **Company Table**: Direct table sync
2. **Prospect Table**: Direct table sync
3. **Materialized View**: `company_prospect_view` sync

### Sync Frequency
- **Base Tables**: Every 30 seconds (configurable)
- **Materialized View**: Every 60 seconds (configurable)
- **Manual Sync**: On-demand via scripts

### Field Mapping Compatibility
- **PGSync Data**: Uses camelCase field names (`firstName`, `lastName`, `jobTitle`)
- **Logstash Data**: Uses lowercase field names (`firstname`, `lastname`, `jobtitle`)
- **API Layer**: Handles both formats seamlessly with fallback mapping
- **Search API**: `source.firstname || source.firstName` pattern for compatibility

## 🔗 Dependencies

### Required Services
- **PostgreSQL**: Database service (port 5432)
- **Elasticsearch**: Search service (port 9200)

### Service Dependencies
```bash
# Start dependencies first
cd ../postgres && ./scripts/start.sh [local|vm]
cd ../cdc && ./scripts/start.sh [local|vm]  # For Elasticsearch

# Then start Logstash service
cd ../logstash && ./scripts/start.sh [local|vm]
```

## 🌐 Ports

### Local Development
- HTTP API: 9600
- Pipeline Port: 5044
- Health Check: 9600/_node/stats

### VM/Production
- HTTP API: 9600
- Pipeline Port: 5044
- Health Check: 9600/_node/stats

### Internal Container Communication
- Logstash → PostgreSQL: 5432
- Logstash → Elasticsearch: 9200

## 📁 Data Management

### Data Directories
- `./data/logs/`: Service logs
- `./data/schema/`: Schema files
- `./data/checkpoints/`: Sync checkpoints

### Checkpoint Files
- `company_last_run`: Company table sync checkpoint
- `prospect_last_run`: Prospect table sync checkpoint
- `materialized_last_run`: Materialized view sync checkpoint

### Checkpoint Management
- **Format**: YAML with ISO 8601 timestamp
- **Location**: `./data/checkpoints/` (persisted via Docker volume)
- **Purpose**: Tracks last processed record for incremental sync
- **VM Deployment**: Copy checkpoint files to avoid full re-sync
- **Git Ignored**: Checkpoint files are excluded from version control

### Log Files
- `./data/logs/logstash.log`: Main Logstash logs
- `./data/logs/sync_manager.log`: Sync manager logs
- `./data/logs/health_monitor.log`: Health monitor logs

## 🔒 Security

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- Secure credential management
- Network isolation

### Access Control
- Environment-based configuration
- Secure credential management
- Container security
- Network isolation

## 🚀 Performance Tuning

### Logstash Configuration
- **Pipeline Workers**: Adjust `LOGSTASH_PIPELINE_WORKERS`
- **Batch Size**: Adjust `LOGSTASH_PIPELINE_BATCH_SIZE`
- **Batch Delay**: Adjust `LOGSTASH_PIPELINE_BATCH_DELAY`

### Memory Settings
- **JVM Heap**: Adjust `LS_JAVA_OPTS`
- **Container Memory**: Adjust Docker memory limits

### Sync Optimization
- **Sync Interval**: Adjust `SYNC_INTERVAL`
- **Materialized View Refresh**: Adjust `MATERIALIZED_VIEW_REFRESH_INTERVAL`

## 📚 API Reference

### Logstash HTTP API Endpoints

#### GET /_node/stats
Returns node statistics including pipeline metrics.

#### GET /_node/pipelines
Returns pipeline status and configuration.

#### GET /_node/info
Returns node information and configuration.

#### POST /_node/hot_threads
Returns hot threads information for debugging.

## 🤝 Integration

### With PostgreSQL Service
- Queries base tables and materialized views
- Monitors data changes via timestamps
- Handles data transformations

### With Elasticsearch Service
- Indexes transformed data
- Maintains index consistency
- Handles bulk indexing operations

### With CDC Service
- Can run alongside PGSync for gradual migration
- Uses same Elasticsearch indexes
- Provides materialized view sync capability

## 🚀 VM Deployment

### Pre-deployment Checklist
1. **Dependencies**: Ensure PostgreSQL and Elasticsearch are running
2. **Checkpoint Files**: Copy from local if available to avoid full re-sync
3. **Environment**: Set `DEPLOYMENT_MODE=vm` in environment variables
4. **Ports**: Ensure ports 9600 and 5044 are available

### Deployment Steps
```bash
# 1. Copy checkpoint files (optional - avoids full re-sync)
scp -r /path/to/local/logstash/data/checkpoints/ user@vm:/opt/hailmary/services/logstash/data/

# 2. Deploy service
cd /opt/hailmary/services/logstash
./scripts/start.sh vm

# 3. Verify deployment
./scripts/health-check.sh vm
```

### Checkpoint Migration
```bash
# Copy checkpoint files to preserve sync state
scp -r services/logstash/data/checkpoints/ user@vm:/opt/hailmary/services/logstash/data/

# Or start fresh (will re-sync all data)
rm -rf /opt/hailmary/services/logstash/data/checkpoints/*
```

### VM Configuration
- **PostgreSQL Host**: `hailmary-postgres` (Docker network)
- **Elasticsearch Host**: `elasticsearch` (Docker network)
- **Data Persistence**: Docker volumes for checkpoints and logs
- **Network**: Internal Docker network communication

## 🆘 Support

For support and questions:
- Check the logs: `./scripts/logs.sh [local|vm]`
- Run health check: `./scripts/health-check.sh [local|vm]`
- Review troubleshooting section above
- Check service dependencies

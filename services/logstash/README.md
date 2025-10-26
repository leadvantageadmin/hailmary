# HailMary Logstash Service

A Logstash-based data synchronization service that replaces PGSync for PostgreSQL to Elasticsearch data synchronization. This service provides better materialized view support and more flexible data transformation capabilities.

## 🚀 Features

- **Materialized View Support**: Direct querying of materialized views without WAL dependency
- **Flexible Data Transformation**: Rich filtering and transformation capabilities
- **Scheduled Sync**: Configurable polling intervals for data synchronization
- **Multiple Data Sources**: Support for both base tables and materialized views
- **Health Monitoring**: Comprehensive health checks and monitoring
- **Schema Integration**: Integrates with GitHub-based schema service
- **Error Handling**: Robust error handling and logging
- **Performance Optimized**: Efficient batch processing and memory management

## 📁 Directory Structure

```
services/logstash/
├── Dockerfile                 # Docker configuration
├── docker-compose.yml         # Service orchestration
├── .env.example              # Environment configuration template
├── README.md                  # This file
├── config/                    # Configuration files
│   ├── logstash.yml          # Logstash configuration
│   ├── pipelines/            # Pipeline configurations
│   │   ├── company.yml       # Company table pipeline
│   │   ├── prospect.yml      # Prospect table pipeline
│   │   └── materialized.yml  # Materialized view pipeline
│   └── templates/            # Index templates
│       ├── company.json      # Company index template
│       ├── prospect.json     # Prospect index template
│       └── company_prospect.json # Materialized view template
├── scripts/                   # Management scripts
│   ├── start.sh              # Start service
│   ├── stop.sh               # Stop service
│   ├── restart.sh            # Restart service
│   ├── health-check.sh       # Health monitoring
│   ├── logs.sh               # Log management
│   ├── sync.sh               # Manual sync trigger
│   └── pull-schema.sh        # Schema integration
├── data/                      # Data directories
│   ├── logs/                 # Service logs
│   ├── schema/               # Schema files
│   └── checkpoints/          # Sync checkpoints
└── lib/                       # Library modules
    ├── sync_manager.py       # Sync orchestration
    ├── materialized_refresh.py # Materialized view refresh
    └── health_monitor.py     # Health monitoring
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following configuration:

```bash
# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=app
POSTGRES_USER=app
POSTGRES_PASSWORD=app

# Elasticsearch Configuration
ELASTICSEARCH_HOST=localhost
ELASTICSEARCH_PORT=9200
ELASTICSEARCH_USE_SSL=false
ELASTICSEARCH_VERIFY_CERTS=false
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=

# Logstash Configuration
LOGSTASH_PORT=5044
LOGSTASH_HTTP_PORT=9600
LOGSTASH_PIPELINE_WORKERS=2
LOGSTASH_PIPELINE_BATCH_SIZE=1000
LOGSTASH_PIPELINE_BATCH_DELAY=50

# Sync Configuration
SYNC_INTERVAL=30
MATERIALIZED_VIEW_REFRESH_INTERVAL=60
CHECKPOINT_RETENTION_DAYS=7

# Schema Service Integration
GITHUB_REPO=leadvantageadmin/hailmary-schema
SCHEMA_VERSION=latest
GITHUB_TOKEN=your_github_token_here

# Data Paths
LOGS_PATH=./data/logs
SCHEMA_PATH=./data/schema
CHECKPOINT_PATH=./data/checkpoints

# Timezone
TZ=UTC
```

## 🚀 Quick Start

### Prerequisites

1. **Docker and Docker Compose** installed
2. **PostgreSQL service** running (see `../postgres/`)
3. **Elasticsearch service** running (see `../cdc/`)
4. **Network** `hailmary-network` created

### Start the Service

```bash
# Start the Logstash service
./scripts/start.sh local

# Check service health
./scripts/health-check.sh local

# View logs
./scripts/logs.sh local
```

### Test the Service

```bash
# Run manual sync
./scripts/sync.sh local

# Check sync status
./scripts/health-check.sh local
```

## 📊 Data Synchronization

### Supported Data Sources

1. **Base Tables**:
   - `Company` table
   - `Prospect` table

2. **Materialized Views**:
   - `company_prospect_view` (primary focus)

### Sync Strategies

1. **Incremental Sync**: Monitors `updatedAt` timestamps for changes
2. **Full Sync**: Complete data refresh (manual trigger)
3. **Materialized View Sync**: Direct querying of materialized views

### Pipeline Configuration

Each data source has its own Logstash pipeline:

- **Company Pipeline**: Syncs Company table data
- **Prospect Pipeline**: Syncs Prospect table data  
- **Materialized View Pipeline**: Syncs materialized view data

## 🔌 API Usage

### Health Check

```bash
curl http://localhost:9600/_node/stats
```

### Manual Sync Trigger

```bash
# Trigger full sync
curl -X POST http://localhost:9600/_node/hot_threads

# Check pipeline status
curl http://localhost:9600/_node/pipelines
```

## 🖥️ CLI Usage

### Manual Sync

```bash
# Full sync all data sources
docker compose exec logstash python lib/sync_manager.py --full-sync

# Sync specific table
docker compose exec logstash python lib/sync_manager.py --table company

# Sync materialized view
docker compose exec logstash python lib/sync_manager.py --materialized-view
```

### Health Check

```bash
docker compose exec logstash python lib/health_monitor.py
```

## 📋 Management Scripts

### Start Service

```bash
./scripts/start.sh [local|vm]
```

- Checks dependencies (PostgreSQL, Elasticsearch)
- Creates necessary directories
- Starts Logstash with configured pipelines
- Waits for health check

### Stop Service

```bash
./scripts/stop.sh [local|vm]
```

- Stops the service gracefully
- Preserves checkpoints and logs
- Shows service status

### Restart Service

```bash
./scripts/restart.sh [local|vm]
```

- Stops and starts the service
- Useful for applying configuration changes

### Health Check

```bash
./scripts/health-check.sh [local|vm]
```

- Comprehensive health monitoring
- Checks container, connectivity, and dependencies
- Shows pipeline statistics and sync status
- Provides troubleshooting commands

### Manual Sync

```bash
./scripts/sync.sh [local|vm] [--full|--table=name|--materialized-view]
```

- Triggers manual data synchronization
- Supports different sync strategies
- Shows sync progress and results

### View Logs

```bash
# Show last 50 lines
./scripts/logs.sh [local|vm]

# Follow logs in real-time
./scripts/logs.sh [local|vm] --follow

# Show only errors
./scripts/logs.sh [local|vm] --errors

# Show pipeline logs
./scripts/logs.sh [local|vm] --pipeline
```

## 🔍 Monitoring and Troubleshooting

### Health Monitoring

The service provides comprehensive health monitoring:

- **Container Status**: Docker container health
- **Pipeline Status**: Logstash pipeline health
- **Connectivity**: PostgreSQL and Elasticsearch connectivity
- **Sync Status**: Last sync times and record counts
- **Performance**: Memory usage and processing rates

### Common Issues

1. **Service won't start**
   - Check if PostgreSQL and Elasticsearch services are running
   - Verify network connectivity
   - Check Docker logs: `docker compose logs`

2. **Sync fails**
   - Verify database connectivity
   - Check Elasticsearch cluster health
   - Review logs for specific error messages

3. **Materialized view not syncing**
   - Ensure materialized view is refreshed
   - Check materialized view pipeline configuration
   - Verify view permissions

4. **Performance issues**
   - Adjust batch size and worker count
   - Monitor system resources
   - Check database and Elasticsearch performance

### Logs

Logs are stored in `./data/logs/` and include:
- Pipeline processing logs
- Error messages
- Performance metrics
- Health check results

## 🔗 Integration

### With PostgreSQL Service

The Logstash service integrates with the PostgreSQL service to:
- Query base tables and materialized views
- Monitor data changes via timestamps
- Handle data transformations

### With Elasticsearch Service

The Logstash service integrates with the Elasticsearch service to:
- Index transformed data
- Maintain index consistency
- Handle bulk indexing operations

### With Schema Service

The Logstash service integrates with the GitHub-based schema service to:
- Pull latest schema definitions
- Ensure data compatibility
- Support schema versioning

## 🚀 Development

### Local Development

1. **Install dependencies**:
   ```bash
   # No additional dependencies needed - uses Docker
   ```

2. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run locally**:
   ```bash
   ./scripts/start.sh local
   ```

### Testing

```bash
# Run health checks
./scripts/health-check.sh local

# Test manual sync
./scripts/sync.sh local --full

# Check logs
./scripts/logs.sh local --follow
```

### Building

```bash
# Build Docker image
docker compose build

# Build with no cache
docker compose build --no-cache
```

## 📈 Performance

### Batch Processing

The service processes data in configurable batches:
- Default batch size: 1000 records
- Configurable via `LOGSTASH_PIPELINE_BATCH_SIZE`
- Optimized for memory usage and performance

### Memory Management

- Streaming data processing
- Batch-based Elasticsearch operations
- Efficient data structures
- Garbage collection optimization

### Monitoring

- Processing time tracking
- Memory usage monitoring
- Error rate tracking
- Performance metrics

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

## 📚 API Reference

### Logstash HTTP API

#### GET /_node/stats
Returns node statistics including pipeline metrics.

#### GET /_node/pipelines
Returns pipeline status and configuration.

#### POST /_node/hot_threads
Returns hot threads information for debugging.

## 🤝 Contributing

1. Follow the established service patterns
2. Update documentation for any changes
3. Test with health checks before committing
4. Ensure schema integration compatibility

## 📄 License

This project is part of the HailMary microservices architecture.

## 🆘 Support

For support and questions:
- Check the logs: `./scripts/logs.sh`
- Run health check: `./scripts/health-check.sh`
- Review troubleshooting section above
- Check service dependencies

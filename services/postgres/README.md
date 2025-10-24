# 🐘 HailMary PostgreSQL Service

[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://www.postgresql.org/)
[![PostGIS](https://img.shields.io/badge/PostGIS-3.4+-green.svg)](https://postgis.net/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

Independent, modular PostgreSQL service for the HailMary Customer Search Platform with integrated schema management and PostGIS support.

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- GitHub Personal Access Token (for schema integration)
- Network: `hailmary-network` (created automatically)

### Basic Usage

```bash
# Start the PostgreSQL service
./scripts/start.sh

# Check service health
./scripts/health-check.sh

# View logs
./scripts/logs.sh

# Stop the service
./scripts/stop.sh
```

### With Schema Integration

```bash
# Set up environment variables
export GITHUB_TOKEN="your_github_token_here"
export GITHUB_REPO="leadvantageadmin/hailmary-schema"
export SCHEMA_VERSION="latest"

# Start with schema integration
./scripts/start.sh
```

## 📁 Service Structure

```
services/postgres/
├── Dockerfile                  # PostgreSQL with PostGIS and tools
├── docker-compose.yml          # Service configuration
├── config/                     # PostgreSQL configuration
│   ├── postgresql.conf        # Performance and tuning
│   └── pg_hba.conf            # Authentication
├── init/                       # Database initialization
│   ├── 01-init-db.sql         # Database and user setup
│   ├── 02-create-extensions.sql # PostGIS and extensions
│   └── 03-setup-permissions.sql # Security and roles
├── scripts/                    # Management scripts
│   ├── start.sh               # Start service
│   ├── stop.sh                # Stop service
│   ├── restart.sh             # Restart service
│   ├── health-check.sh        # Comprehensive health check
│   ├── logs.sh                # View logs
│   ├── pull-schema.sh         # Pull schema from GitHub
│   ├── run-migrations.sh      # Run database migrations
│   └── validate-schema.sh     # Validate schema consistency
└── README.md                  # This documentation
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the service directory:

```bash
# PostgreSQL Configuration
POSTGRES_USER=app
POSTGRES_PASSWORD=app
POSTGRES_DB=app
POSTGRES_PORT=5432

# Schema Service Integration
GITHUB_REPO=leadvantageadmin/hailmary-schema
SCHEMA_VERSION=latest
GITHUB_TOKEN=your_github_token_here

# Data Paths
POSTGRES_DATA_PATH=./data/postgres
POSTGRES_LOGS_PATH=./logs/postgres
SCHEMA_DATA_PATH=./data/schema

# Optional: pgAdmin Configuration
PGADMIN_EMAIL=admin@hailmary.local
PGADMIN_PASSWORD=admin
PGADMIN_PORT=8080
```

### PostgreSQL Configuration

The service includes optimized PostgreSQL configuration:

- **Performance**: Tuned for development and production
- **Memory**: 256MB shared buffers, 4MB work memory
- **Logging**: Comprehensive query and error logging
- **Extensions**: PostGIS, UUID, pg_stat_statements, and more
- **Security**: Role-based access control

## 🗄️ Database Features

### Extensions

- **PostGIS**: Geospatial data support
- **UUID**: UUID generation
- **pg_stat_statements**: Query performance monitoring
- **pg_trgm**: Text similarity and full-text search
- **unaccent**: Text normalization
- **btree_gin/gist**: Advanced indexing
- **hstore**: Key-value storage
- **ltree**: Hierarchical data
- **pgcrypto**: Cryptographic functions
- **citext**: Case-insensitive text

### User Roles

- **app**: Full access (default application user)
- **app_readonly**: Read-only access
- **app_write**: Read/write access
- **app_admin**: Administrative access

### Schema Management

- **Migration Tracking**: Automatic migration history
- **Version Control**: GitHub-based schema distribution
- **Validation**: Schema consistency checks
- **Rollback Support**: Migration rollback capability

## 📋 Management Scripts

### Core Scripts

| Script | Description | Usage |
|--------|-------------|-------|
| `start.sh` | Start PostgreSQL service | `./scripts/start.sh` |
| `stop.sh` | Stop PostgreSQL service | `./scripts/stop.sh` |
| `restart.sh` | Restart PostgreSQL service | `./scripts/restart.sh` |
| `health-check.sh` | Comprehensive health check | `./scripts/health-check.sh` |
| `logs.sh` | View service logs | `./scripts/logs.sh -f` |

### Schema Scripts

| Script | Description | Usage |
|--------|-------------|-------|
| `pull-schema.sh` | Pull schema from GitHub | `./scripts/pull-schema.sh v2.0.0` |
| `run-migrations.sh` | Run database migrations | `./scripts/run-migrations.sh` |
| `validate-schema.sh` | Validate schema consistency | `./scripts/validate-schema.sh` |

### Script Options

```bash
# View logs with options
./scripts/logs.sh -s postgres -n 50 -f

# Health check with detailed output
./scripts/health-check.sh

# Pull specific schema version
./scripts/pull-schema.sh v1.0.0
```

## 🔗 Schema Integration

### GitHub-Based Schema Distribution

The PostgreSQL service integrates with the HailMary Schema Service for:

- **Automatic Schema Updates**: Pull latest schema from GitHub
- **Migration Management**: Run database migrations automatically
- **Version Control**: Track schema versions and changes
- **Consistency Validation**: Ensure database matches expected schema

### Schema Workflow

1. **Pull Schema**: Download schema from GitHub repository
2. **Validate Schema**: Check schema consistency
3. **Run Migrations**: Apply database changes
4. **Verify Changes**: Validate schema after migration

### Example Schema Integration

```bash
# Set up schema integration
export GITHUB_TOKEN="ghp_your_token_here"
export GITHUB_REPO="leadvantageadmin/hailmary-schema"
export SCHEMA_VERSION="v2.0.0"

# Pull and apply schema
./scripts/pull-schema.sh v2.0.0
./scripts/run-migrations.sh
./scripts/validate-schema.sh
```

## 🐳 Docker Services

### Main Services

- **postgres**: PostgreSQL database with PostGIS
- **schema-migrator**: Runs schema migrations (one-time)
- **postgres-admin**: pgAdmin web interface (optional)

### Service Dependencies

```
postgres (base service)
├── schema-migrator (depends on postgres)
└── postgres-admin (depends on postgres, optional)
```

### Network Configuration

- **Network**: `hailmary-network`
- **Port**: 5432 (PostgreSQL), 8080 (pgAdmin)
- **Volumes**: Persistent data, logs, schema files

## 🔍 Monitoring and Health Checks

### Health Check Components

- **Container Status**: Docker container health
- **Connectivity**: PostgreSQL connection test
- **Database Access**: Basic query execution
- **Extensions**: Required extensions verification
- **Migrations**: Schema migration status
- **Resources**: Memory and disk usage
- **Network**: Connection validation

### Health Check Output

```bash
🔍 HailMary PostgreSQL Service Health Check

📦 Checking PostgreSQL Container...
✅ PostgreSQL container is running

🔌 Checking PostgreSQL Connectivity...
✅ PostgreSQL is accepting connections

🗄️ Checking Database Access...
✅ Database access is working

🔧 Checking PostgreSQL Extensions...
✅ Extension 'postgis' is installed
✅ Extension 'uuid-ossp' is installed
✅ Extension 'pg_stat_statements' is installed

📋 Checking Schema Migrations...
✅ Schema migrations table exists (5 migrations applied)

💾 Checking Disk Space...
✅ Disk space is healthy (45% used)

🧠 Checking Memory Usage...
✅ Memory usage is healthy (23%)

🌐 Checking Network Connectivity...
✅ Network connectivity is working

📊 Overall Health Status:
✅ All health checks passed! PostgreSQL service is healthy.
```

## 🛠️ Troubleshooting

### Common Issues

#### Service Won't Start

```bash
# Check Docker status
docker info

# Check network
docker network ls | grep hailmary-network

# View logs
./scripts/logs.sh
```

#### Schema Integration Issues

```bash
# Check GitHub token
echo $GITHUB_TOKEN

# Test GitHub access
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user

# Pull schema manually
./scripts/pull-schema.sh latest
```

#### Database Connection Issues

```bash
# Check PostgreSQL status
docker compose ps postgres

# Test connection
docker compose exec postgres psql -U app -d app -c "SELECT 1;"

# Check health
./scripts/health-check.sh
```

### Log Analysis

```bash
# View recent logs
./scripts/logs.sh -n 100

# Follow logs in real-time
./scripts/logs.sh -f

# View specific service logs
./scripts/logs.sh -s schema-migrator
```

### Database Administration

```bash
# Connect to database
docker compose exec postgres psql -U app -d app

# View migration status
docker compose exec postgres psql -U app -d app -c "SELECT * FROM migration_status;"

# Check user permissions
docker compose exec postgres psql -U app -d app -c "SELECT * FROM user_management;"

# View extension information
docker compose exec postgres psql -U app -d app -c "SELECT * FROM get_extension_info();"
```

## 🔒 Security

### Authentication

- **User Authentication**: Password-based authentication
- **Role-Based Access**: Granular permission system
- **Network Security**: Docker network isolation
- **SSL/TLS**: Configurable encryption support

### Best Practices

- Use strong passwords in production
- Regularly update PostgreSQL and extensions
- Monitor access logs
- Implement backup strategies
- Use environment variables for sensitive data

## 📊 Performance

### Optimization Features

- **Shared Buffers**: 256MB for better caching
- **Work Memory**: 4MB for query operations
- **Maintenance Memory**: 64MB for maintenance tasks
- **Connection Pooling**: Configurable connection limits
- **Query Monitoring**: pg_stat_statements integration

### Monitoring

- **Query Performance**: Track slow queries
- **Resource Usage**: Memory and CPU monitoring
- **Connection Stats**: Active connections tracking
- **Disk Usage**: Storage monitoring

## 🚀 Production Deployment

### Environment Setup

```bash
# Production environment variables
export POSTGRES_PASSWORD="strong_production_password"
export GITHUB_TOKEN="production_github_token"
export SCHEMA_VERSION="v2.0.0"
export POSTGRES_DATA_PATH="/opt/hailmary/data/postgres"
export POSTGRES_LOGS_PATH="/opt/hailmary/logs/postgres"
```

### Backup Strategy

```bash
# Create backup
docker compose exec postgres pg_dump -U app -d app > backup.sql

# Restore backup
docker compose exec -T postgres psql -U app -d app < backup.sql
```

### Scaling Considerations

- **Memory**: Increase shared_buffers for larger datasets
- **Connections**: Adjust max_connections based on load
- **Storage**: Use SSD storage for better performance
- **Network**: Configure connection pooling

## 📚 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [HailMary Schema Service](../schema/README.md)

## 🤝 Contributing

1. Follow the service separation architecture
2. Update documentation for any changes
3. Test all scripts and configurations
4. Ensure backward compatibility
5. Update version numbers appropriately

## 📄 License

This service is part of the HailMary project and follows the same licensing terms.

---

**HailMary PostgreSQL Service** - Independent, scalable, and feature-rich PostgreSQL service with integrated schema management! 🚀

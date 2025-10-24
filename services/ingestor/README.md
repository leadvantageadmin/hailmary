# HailMary Ingestor Service

A Python-based data ingestion service that processes CSV files and ingests data into PostgreSQL. This service is part of the HailMary microservices architecture.

## 🚀 Features

- **CSV Processing**: Handles CSV, TSV, and TXT files with automatic data cleaning and normalization
- **PostgreSQL Storage**: Ingests data into PostgreSQL database
- **Data Normalization**: Automatically creates Customer, Company, and Prospect records from CSV data
- **Batch Processing**: Configurable batch sizes for efficient processing
- **Health Monitoring**: Comprehensive health checks and monitoring
- **CLI & API**: Both command-line interface and REST API for ingestion
- **Schema Integration**: Integrates with GitHub-based schema service
- **Error Handling**: Robust error handling and logging

## 📁 Directory Structure

```
services/ingestor/
├── Dockerfile                 # Docker configuration
├── docker-compose.yml         # Service orchestration
├── requirements.txt           # Python dependencies
├── app.py                     # Main application
├── .env                       # Environment configuration
├── README.md                  # This file
├── lib/                       # Library modules
│   ├── db_operations.py       # PostgreSQL operations
│   ├── csv_processor.py       # CSV processing
│   └── ingestion_manager.py   # Ingestion orchestration
├── scripts/                   # Management scripts
│   ├── start.sh              # Start service
│   ├── stop.sh               # Stop service
│   ├── restart.sh            # Restart service
│   ├── health-check.sh       # Health monitoring
│   ├── logs.sh               # Log management
│   └── test-ingestion.sh     # Test ingestion
├── config/                    # Configuration files
└── data/                      # Data directories
    ├── csv/                   # CSV input files
    ├── logs/                  # Service logs
    └── schema/                # Schema files
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following configuration:

```bash
# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
POSTGRES_DB=hailmary
POSTGRES_USER=app
POSTGRES_PASSWORD=app_password

# Elasticsearch Configuration (handled by CDC service)
# ELASTICSEARCH_HOST=localhost
# ELASTICSEARCH_PORT=9200
# ELASTICSEARCH_USE_SSL=false
# ELASTICSEARCH_VERIFY_CERTS=false

# Ingestor Configuration
INGESTION_BATCH_SIZE=1000
LOG_LEVEL=INFO
INGESTOR_PORT=8080

# Schema Service Integration
GITHUB_REPO=leadvantageadmin/hailmary-schema
SCHEMA_VERSION=latest
GITHUB_TOKEN=your_github_token_here

# Data Paths
CSV_DATA_PATH=./data/csv
LOGS_PATH=./data/logs
SCHEMA_PATH=./data/schema

# Timezone
TZ=UTC
```

## 🚀 Quick Start

### Prerequisites

1. **Docker and Docker Compose** installed
2. **PostgreSQL service** running (see `../postgres/`)
3. **Network** `hailmary-network` created

### Start the Service

```bash
# Start the Ingestor service
./scripts/start.sh

# Check service health
./scripts/health-check.sh

# View logs
./scripts/logs.sh
```

### Test the Service

```bash
# Run comprehensive tests
./scripts/test-ingestion.sh

# Run real ingestion (not dry run)
./scripts/test-ingestion.sh --real
```

## 📊 Data Processing

### CSV File Format

The service expects CSV files with the following columns (case-insensitive):

| Column | Description | Example |
|--------|-------------|---------|
| email | Email address | john.doe@example.com |
| firstName | First name | John |
| lastName | Last name | Doe |
| company | Company name | Example Corp |
| title | Job title | Software Engineer |
| phone | Phone number | 555-1234 |
| address | Street address | 123 Main St |
| city | City | San Francisco |
| state | State/Province | CA |
| country | Country | USA |
| zipCode | ZIP/Postal code | 94105 |
| revenue | Revenue (whole dollars) | 100000 |
| industry | Industry | Technology |

### Data Normalization

The service automatically creates three types of records:

1. **Customer** (legacy support)
2. **Company** (normalized company data)
3. **Prospect** (normalized prospect data linked to companies)

### Domain Extraction

The service automatically extracts company domains from email addresses:
- `john.doe@example.com` → domain: `example.com`
- `ravi.katta@unionbankofindia` → domain: `unionbankofindia.com`
- Invalid emails → domain: `no-domain-available`

## 🔌 API Usage

### Health Check

```bash
curl http://localhost:8080/health
```

### Ingest CSV File

```bash
curl -X POST http://localhost:8080/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "./data/csv/customers.csv",
    "options": {
      "batch_size": 1000,
      "dry_run": false
    }
  }'
```

## 🖥️ CLI Usage

### Ingest Single File

```bash
# Dry run
docker compose exec ingestor python app.py ingest --file ./data/csv/customers.csv --dry-run

# Real ingestion
docker compose exec ingestor python app.py ingest --file ./data/csv/customers.csv --batch-size 1000
```

### Ingest Directory

```bash
# Ingest all CSV files in a directory
docker compose exec ingestor python app.py ingest --directory ./data/csv --batch-size 1000
```

### Health Check

```bash
docker compose exec ingestor python app.py health
```

### Run as Service

```bash
# Start the service on port 8080
docker compose exec ingestor python app.py serve --port 8080
```

## 📋 Management Scripts

### Start Service

```bash
./scripts/start.sh
```

- Checks dependencies (PostgreSQL, Elasticsearch via CDC)
- Creates necessary directories
- Builds and starts the service
- Waits for health check

### Stop Service

```bash
./scripts/stop.sh
```

- Stops the service gracefully
- Preserves data and logs
- Shows service status

### Restart Service

```bash
./scripts/restart.sh
```

- Stops and starts the service
- Useful for applying configuration changes

### Health Check

```bash
./scripts/health-check.sh
```

- Comprehensive health monitoring
- Checks container, connectivity, and dependencies
- Shows log statistics and CSV files
- Provides troubleshooting commands

### View Logs

```bash
# Show last 50 lines
./scripts/logs.sh

# Follow logs in real-time
./scripts/logs.sh --follow

# Show only errors
./scripts/logs.sh --errors

# Show container logs
./scripts/logs.sh --container

# Show log statistics
./scripts/logs.sh --stats
```

### Test Ingestion

```bash
# Run comprehensive tests
./scripts/test-ingestion.sh

# Run real ingestion
./scripts/test-ingestion.sh --real
```

## 🔍 Monitoring and Troubleshooting

### Health Monitoring

The service provides comprehensive health monitoring:

- **Container Status**: Docker container health
- **Connectivity**: HTTP endpoint availability
- **Dependencies**: PostgreSQL connectivity
- **Data Directories**: File system access
- **Logs**: Recent log entries and statistics

### Common Issues

1. **Service won't start**
   - Check if PostgreSQL service is running
   - Verify network connectivity
   - Check Docker logs: `docker compose logs`

2. **Ingestion fails**
   - Verify CSV file format and encoding
   - Check database connectivity
   - Review logs for specific error messages

3. **Performance issues**
   - Adjust batch size in configuration
   - Monitor system resources
   - Check database performance

### Logs

Logs are stored in `./data/logs/ingestor.log` and include:
- Processing progress
- Error messages
- Performance metrics
- Health check results

## 🔗 Integration

### With PostgreSQL Service

The Ingestor service integrates with the PostgreSQL service to:
- Store normalized data in Customer, Company, and Prospect tables
- Handle data conflicts with UPSERT operations
- Maintain referential integrity

### With CDC Service

The Ingestor service works with the CDC service to:
- Automatically sync data changes to search indices
- Maintain search index consistency through database change monitoring
- Provide real-time search index updates

### With Schema Service

The Ingestor service integrates with the GitHub-based schema service to:
- Pull latest schema definitions
- Ensure data compatibility
- Support schema versioning

## 🚀 Development

### Local Development

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run locally**:
   ```bash
   python app.py serve --port 8080
   ```

### Testing

```bash
# Run unit tests
python -m pytest tests/

# Run integration tests
./scripts/test-ingestion.sh

# Run with coverage
python -m pytest --cov=lib tests/
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
- Configurable via `INGESTION_BATCH_SIZE`
- Optimized for memory usage and performance

### Memory Management

- Streaming CSV processing
- Batch-based database operations
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
- XSS protection
- Secure file handling

### Access Control

- Environment-based configuration
- Secure credential management
- Network isolation
- Container security

## 📚 API Reference

### Endpoints

#### GET /health
Returns service health status.

**Response**:
```json
{
  "status": "healthy",
  "components": {
    "database": {
      "status": "healthy",
      "tables": ["Customer", "Company", "Prospect"]
    }
  },
  "timestamp": "2025-10-19T23:00:00Z"
}
```

#### POST /ingest
Ingests a CSV file.

**Request**:
```json
{
  "file_path": "./data/csv/customers.csv",
  "options": {
    "batch_size": 1000,
    "dry_run": false
  }
}
```

**Response**:
```json
{
  "status": "success",
  "file_path": "./data/csv/customers.csv",
  "records_processed": 1000,
  "customers": 1000,
  "companies": 500,
  "prospects": 1000,
  "database_results": {
    "customers": {"status": "success", "count": 1000},
    "companies": {"status": "success", "count": 500},
    "prospects": {"status": "success", "count": 1000}
  },
  "processing_time": 45.2,
  "timestamp": "2025-10-19T23:00:00Z"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is part of the HailMary microservices architecture.

## 🆘 Support

For support and questions:
- Check the logs: `./scripts/logs.sh`
- Run health check: `./scripts/health-check.sh`
- Review troubleshooting section above
- Check service dependencies

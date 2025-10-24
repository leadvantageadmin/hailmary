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

3. **Access the application**
   - Web Application: http://localhost:3000
   - Admin Panel: http://localhost:3000/admin
   - Direct Search: http://localhost:3000/direct-search

## 📋 Service Details

### 🐘 PostgreSQL Service

**Purpose**: Primary database for the application

**Local Deployment**:
```bash
cd services/postgres
./scripts/start.sh local
# or simply (local is default)
./scripts/start.sh
```

**VM Deployment**:
```bash
# On VM
cd /opt/hailmary/services/postgres
./scripts/start.sh vm
```

**Configuration**:
- Port: 5432
- Database: app
- User: app
- Password: app
- Data Directory: `./data/postgres`
- Logs Directory: `./logs/postgres`

**Management Scripts**:
- `start.sh [local|vm]` - Start the service (local is default)
- `stop.sh [local|vm]` - Stop the service
- `restart.sh [local|vm]` - Restart the service
- `health-check.sh [local|vm]` - Check service health
- `logs.sh [local|vm]` - View service logs
- `run-migrations.sh` - Run database migrations

**Dependencies**: None (base service)

**Health Check**: `docker exec hailmary-postgres pg_isready -U app -d app`

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

**Purpose**: Data ingestion and processing

**Local Deployment**:
```bash
cd services/ingestor
./scripts/start.sh
```

**VM Deployment**:
```bash
# On VM
cd /opt/hailmary/services/ingestor
./scripts/start.sh
```

**Configuration**:
- Port: 8000
- Data Directory: `./data/csv`
- Logs Directory: `./logs/ingestor`

**Management Scripts**:
- `start.sh` - Start the service
- `stop.sh` - Stop the service
- `restart.sh` - Restart the service
- `health-check.sh` - Check service health
- `logs.sh` - View service logs
- `ingest-single.sh` - Ingest a single CSV file
- `test-ingestion.sh` - Test ingestion process

**Dependencies**: PostgreSQL, Redis

**Health Check**: `curl -f http://localhost:8000/health`

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
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache |
| Web | 3000 | Web Application |
| Ingestor | 8000 | Data Processing |
| CDC/OpenSearch | 9201 | Search Engine |
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

---

*Last Updated: $(date)*
*Version: 1.0.0*

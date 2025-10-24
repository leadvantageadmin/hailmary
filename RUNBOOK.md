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

3. **Verify services are running**
   ```bash
   # Check PostgreSQL (port 5433)
   docker ps | grep hailmary-postgres
   
   # Check all services
   docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
   ```

4. **Access the application**
   - Web Application: http://localhost:3000
   - Admin Panel: http://localhost:3000/admin
   - Direct Search: http://localhost:3000/direct-search

### VM/Production Setup

1. **SSH to VM and clone repository**
   ```bash
   ssh -i ~/.ssh/gcp_key ubuntu@<vm-ip>
   git clone https://github.com/leadvantageadmin/hailmary.git /opt/hailmary
   cd /opt/hailmary
   ```

2. **Configure environment files**
   ```bash
   # Create environment files for each service
   cp services/postgres/.env.example services/postgres/.env
   cp services/redis/.env.example services/redis/.env
   cp services/web/.env.example services/web/.env
   cp services/ingestor/.env.example services/ingestor/.env
   cp services/cdc/.env.example services/cdc/.env
   ```

3. **Start services in order (VM mode)**
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

## 📋 Service Documentation

Each service has its own detailed runbook:

- **[PostgreSQL Service](docs/postgres-runbook.md)** - Database and materialized views
- **[Redis Service](docs/redis-runbook.md)** - Caching and session management
- **[Ingestor Service](docs/ingestor-runbook.md)** - Data ingestion and processing
- **[CDC Service](docs/cdc-runbook.md)** - Change Data Capture with Elasticsearch
- **[Web Service](docs/web-runbook.md)** - Next.js web application

## 🔍 Common Issues & Solutions

### Service Startup Issues

1. **Port conflicts**
   ```bash
   # Check what's using the port
   netstat -tulpn | grep :PORT
   
   # Stop conflicting services
   docker ps | grep PORT
   docker stop <container-id>
   ```

2. **Docker not running**
   ```bash
   # Start Docker service
   sudo systemctl start docker
   sudo systemctl enable docker
   
   # Add user to docker group
   sudo usermod -aG docker $USER
   # Log out and back in
   ```

3. **Permission issues (VM)**
   ```bash
   # Fix data directory permissions
   sudo chown -R $(whoami):$(whoami) ./data
   
   # Fix log directory permissions
   sudo chown -R $(whoami):$(whoami) ./logs
   ```

### Database Issues

1. **PostgreSQL connection failed**
   ```bash
   # Check if PostgreSQL is running
   docker ps | grep postgres
   
   # Test connection
   docker compose exec postgres pg_isready -U app -d app
   
   # Check logs
   docker compose logs postgres
   ```

2. **Database migrations needed**
   ```bash
   # Run migrations
   cd services/postgres
   ./scripts/run-migrations.sh [local|vm]
   ```

### Authentication Issues

1. **Login not working**
   ```bash
   # Check if user exists in database
   cd services/postgres
   docker compose exec postgres psql -U app -d app -c "SELECT email FROM \"User\";"
   
   # Create admin user if needed
   # See Web Service runbook for details
   ```

2. **Bcrypt hash corruption (VM)**
   ```bash
   # CRITICAL: Use SQL files instead of SSH commands for bcrypt hashes
   # See CDC Service runbook for detailed solution
   ```

### Search Issues

1. **Elasticsearch not responding**
   ```bash
   # Check Elasticsearch health
   curl http://localhost:9200/_cluster/health
   
   # Check CDC service
   cd services/cdc
   ./scripts/health-check.sh [local|vm]
   ```

2. **No search results**
   ```bash
   # Check if data is synced to Elasticsearch
   curl http://localhost:9200/_cat/indices?v
   
   # Check CDC logs
   cd services/cdc
   ./scripts/logs.sh [local|vm]
   ```

## 📊 Port Configuration

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5433 | Database (external) |
| Redis | 6390 | Cache |
| Web | 3000 | Web Application |
| Ingestor | 8080 | Data Processing |
| CDC - Elasticsearch | 9200 | Search Engine HTTP API |
| CDC - Elasticsearch Transport | 9300 | Search Engine Internal Communication |
| CDC - Redis | 6390 | Cache and Checkpointing |
| Schema API | 3001 | Schema Management |
| pgAdmin | 8080 | Database Admin (optional) |

## 🔧 VM Management

### Update VM Deployment
```bash
# From local machine
./scripts/update-vm.sh

# Or manually on VM
ssh -i ~/.ssh/gcp_key ubuntu@<vm-ip>
cd /opt/hailmary
git pull origin main
```

### VM Service Management
```bash
# Check all services
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Check service health
cd services/postgres && ./scripts/health-check.sh vm
cd services/redis && ./scripts/health-check.sh vm
cd services/web && ./scripts/health-check.sh vm
cd services/ingestor && ./scripts/health-check.sh vm
cd services/cdc && ./scripts/health-check.sh vm
```

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

*For detailed service-specific information, see the individual runbooks in the `docs/` directory.*
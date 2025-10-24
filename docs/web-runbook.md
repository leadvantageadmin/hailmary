# Web Service Runbook

**Purpose**: Next.js web application with nginx reverse proxy for external access

## 🚀 Quick Start

### Local Development
```bash
cd services/web
./scripts/start.sh local
```

### VM/Production
```bash
cd /opt/hailmary/services/web
./scripts/start.sh vm
```

## 📋 Configuration

### Local Development
- Web Port: 3000
- Node Environment: development
- Database URL: postgresql://app:app@postgres:5432/app
- Elasticsearch URL: http://elasticsearch:9200
- Redis URL: redis://redis:6389
- Nginx: Not used

### VM/Production
- Web Port: 3000 (internal)
- Node Environment: production
- Database URL: postgresql://app:app@postgres:5432/app
- Elasticsearch URL: http://elasticsearch:9200
- Redis URL: redis://redis:6389
- Nginx: Enabled (port 80)
- External Domain: hailmary.leadvantageglobal.com

## 🔧 Daily Operations

### Service Management
```bash
# Start service
./scripts/start.sh local    # Local development
./scripts/start.sh vm       # VM/production

# Stop service
./scripts/stop.sh local     # Local development
./scripts/stop.sh vm        # VM/production

# Restart service
./scripts/restart.sh local  # Local development
./scripts/restart.sh vm     # VM/production

# Health check
./scripts/health-check.sh local  # Local development
./scripts/health-check.sh vm     # VM/production
```

### Log Management
```bash
# View logs
./scripts/logs.sh local                    # Last 100 lines
./scripts/logs.sh vm -f                    # Follow logs
./scripts/logs.sh local -n 500              # Last 500 lines
./scripts/logs.sh vm -f -n 200             # Follow with 200 lines

# Log files location
./logs/web/                                # Web service logs
```

### Schema Management
```bash
# Pull latest schema
./scripts/pull-schema.sh local             # Local development
./scripts/pull-schema.sh vm                # VM/production
./scripts/pull-schema.sh local v2.1.0      # Specific version
```

### Application Features
- **Search Interface**: Advanced search with pagination and filters
- **Direct Search**: Email-based direct lookup
- **Admin Panel**: User management and system administration
- **Authentication**: Secure login/logout with JWT tokens
- **Profile Management**: User profile updates
- **Responsive Design**: Mobile-friendly interface

## 🏥 Health Checks

### Quick Health Check
```bash
# Check if containers are running
docker ps | grep hailmary-web
docker ps | grep hailmary-nginx  # VM mode only

# Check health endpoint
curl -f http://localhost:3000/api/health  # Local
curl -f http://localhost/api/health        # VM
```

### Comprehensive Health Check
```bash
# Run full health check
./scripts/health-check.sh local  # Local development
./scripts/health-check.sh vm     # VM/production
```

### Health Check Components
- ✅ Container Status: Web service container running
- ✅ Nginx Status: Nginx container running (VM mode)
- ✅ Health Endpoint: `/api/health` responding
- ✅ Main Application: Root endpoint responding
- ✅ Database Connection: PostgreSQL connectivity
- ✅ Search Service: Elasticsearch connectivity
- ✅ Cache Service: Redis connectivity

## 🔧 Troubleshooting

### Common Issues

1. **Port 3000 already in use**
   ```bash
   # Find and stop conflicting service
   docker ps | grep 3000
   docker stop <container-id>
   
   # Or use different port
   export WEB_PORT=3001
   ./scripts/start.sh local
   ```

2. **Web service not responding**
   ```bash
   # Check container logs
   ./scripts/logs.sh local -f
   
   # Check health endpoint
   curl -v http://localhost:3000/api/health
   
   # Restart service
   ./scripts/restart.sh local
   ```

3. **Nginx not working (VM mode)**
   ```bash
   # Check nginx container
   docker ps | grep nginx
   
   # Check nginx logs
   docker logs hailmary-nginx
   
   # Verify nginx configuration
   docker exec hailmary-nginx nginx -t
   ```

4. **Database connection issues**
   ```bash
   # Check PostgreSQL service
   cd ../postgres && ./scripts/health-check.sh local
   
   # Verify database URL
   echo $DATABASE_URL
   ```

5. **Authentication issues**
   ```bash
   # Check JWT secret
   echo $NEXTAUTH_SECRET
   
   # Verify user exists
   cd ../postgres && ./scripts/run-migrations.sh local
   ```

6. **Static file serving issues**
   ```bash
   # Check nginx configuration
   cat nginx.conf
   
   # Verify static file paths
   ls -la public/
   ```

### Performance Issues

1. **Slow page loads**
   ```bash
   # Check Redis cache
   cd ../redis && ./scripts/health-check.sh local
   
   # Check Elasticsearch
   cd ../cdc && ./scripts/health-check.sh local
   ```

2. **High memory usage**
   ```bash
   # Check container resource usage
   docker stats hailmary-web
   
   # Check nginx resource usage (VM mode)
   docker stats hailmary-nginx
   ```

## 🔗 Dependencies

### Required Services
- **PostgreSQL**: Database service (port 5432)
- **Redis**: Cache service (port 6389)
- **Elasticsearch**: Search service (port 9200)
- **Schema API**: Schema management (port 3001)

### Service Dependencies
```bash
# Start dependencies first
cd ../postgres && ./scripts/start.sh local
cd ../redis && ./scripts/start.sh local
cd ../cdc && ./scripts/start.sh local
cd ../schema && ./scripts/start.sh local

# Then start web service
cd ../web && ./scripts/start.sh local
```

## 🌐 Ports

### Local Development
- Web Application: 3000
- Health Check: 3000/api/health

### VM/Production
- Nginx: 80 (external)
- Web Application: 3000 (internal)
- Health Check: 80/api/health (external)

### Internal Container Communication
- Web → PostgreSQL: 5432
- Web → Redis: 6389
- Web → Elasticsearch: 9200
- Web → Schema API: 3001

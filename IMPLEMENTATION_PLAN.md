# 🚀 Service Separation Implementation Plan

## **Phase 1: Directory Structure Creation**

### **Step 1.1: Create Base Directory Structure**
```bash
# Create main directories
mkdir -p services/{postgres,opensearch,redis,web,ingestor}
mkdir -p shared/{docker,config,scripts,docs}
mkdir -p scripts/{main,postgres,opensearch,redis,web,ingestor}
mkdir -p environments/{local,staging,production}
```

### **Step 1.2: Move Existing Code**
```bash
# Move web application
mv apps/web/* services/web/
rmdir apps/web

# Move ingestor application  
mv apps/ingestor/* services/ingestor/
rmdir apps/ingestor

# Remove apps directory
rmdir apps
```

## **Phase 2: Service-Specific Dockerfiles**

### **Step 2.1: PostgreSQL Service**
```dockerfile
# services/postgres/Dockerfile
FROM postgis/postgis:15-3.4

# Copy custom configurations
COPY config/ /etc/postgresql/
COPY init/ /docker-entrypoint-initdb.d/

# Set environment variables
ENV POSTGRES_USER=app
ENV POSTGRES_PASSWORD=app
ENV POSTGRES_DB=app

# Expose port
EXPOSE 5432

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD pg_isready -U app -d app
```

### **Step 2.2: OpenSearch Service**
```dockerfile
# services/opensearch/Dockerfile
FROM opensearchproject/opensearch:2.14.0

# Copy custom configurations
COPY config/ /usr/share/opensearch/config/

# Set environment variables
ENV OPENSEARCH_INITIAL_ADMIN_PASSWORD=admin123!
ENV DISABLE_INSTALL_DEMO_CONFIG=true
ENV discovery.type=single-node
ENV plugins.security.disabled=true
ENV OPENSEARCH_JAVA_OPTS=-Xms1g -Xmx1g

# Expose port
EXPOSE 9200

# Health check
HEALTHCHECK --interval=15s --timeout=5s --retries=10 \
  CMD curl -f http://localhost:9200/_cluster/health
```

### **Step 2.3: Redis Service**
```dockerfile
# services/redis/Dockerfile
FROM redis:7

# Copy custom configuration
COPY config/redis.conf /usr/local/etc/redis/redis.conf

# Expose port
EXPOSE 6379

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD redis-cli ping
```

### **Step 2.4: Web Service**
```dockerfile
# services/web/Dockerfile
# Install deps
FROM node:18-slim AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml* ./
COPY services/web/package.json services/web/package.json
RUN corepack enable && corepack prepare pnpm@9.11.0 --activate && pnpm install --filter @app/web

# Build
FROM node:18-slim AS builder
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY . .
RUN corepack enable && pnpm install --no-frozen-lockfile
WORKDIR /app/services/web
RUN pnpm prisma:generate
RUN pnpm build

# Run
FROM node:18-slim AS runner
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY --from=builder /app/services/web/.next/standalone .
COPY --from=builder /app/services/web/.next/static ./services/web/.next/static
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/web/node_modules ./services/web/node_modules
RUN mkdir -p ./services/web/public
COPY --from=builder /app/services/web/public ./services/web/public
COPY --from=builder /app/services/web/prisma ./services/web/prisma
EXPOSE 3000
CMD ["node", "services/web/server.js"]
```

### **Step 2.5: Ingestor Service**
```dockerfile
# services/ingestor/Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py /app/app.py
COPY lib/ /app/lib/
CMD ["python", "app.py", "/data/customers.csv"]
```

## **Phase 3: Service-Specific Compose Files**

### **Step 3.1: PostgreSQL Compose**
```yaml
# services/postgres/docker-compose.yml
version: '3.8'
services:
  postgres:
    build: .
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: app
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init:/docker-entrypoint-initdb.d
      - ./config:/etc/postgresql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d app"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - hailmary-network

volumes:
  postgres_data:

networks:
  hailmary-network:
    external: true
```

### **Step 3.2: OpenSearch Compose**
```yaml
# services/opensearch/docker-compose.yml
version: '3.8'
services:
  opensearch:
    build: .
    environment:
      - OPENSEARCH_INITIAL_ADMIN_PASSWORD=admin123!
      - DISABLE_INSTALL_DEMO_CONFIG=true
      - discovery.type=single-node
      - plugins.security.disabled=true
      - OPENSEARCH_JAVA_OPTS=-Xms1g -Xmx1g
    ulimits:
      memlock:
        soft: -1
        hard: -1
    ports:
      - "9200:9200"
    volumes:
      - opensearch_data:/usr/share/opensearch/data
      - ./config:/usr/share/opensearch/config
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9200/_cluster/health"]
      interval: 15s
      timeout: 5s
      retries: 10
    networks:
      - hailmary-network

volumes:
  opensearch_data:

networks:
  hailmary-network:
    external: true
```

### **Step 3.3: Redis Compose**
```yaml
# services/redis/docker-compose.yml
version: '3.8'
services:
  redis:
    build: .
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
      - ./config:/usr/local/etc/redis
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - hailmary-network

volumes:
  redis_data:

networks:
  hailmary-network:
    external: true
```

### **Step 3.4: Web Service Compose**
```yaml
# services/web/docker-compose.yml
version: '3.8'
services:
  web:
    build: .
    environment:
      - DATABASE_URL=postgresql://app:app@postgres:5432/app
      - OPENSEARCH_URL=http://opensearch:9200
      - REDIS_URL=redis://redis:6379
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      opensearch:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - hailmary-network

networks:
  hailmary-network:
    external: true
```

### **Step 3.5: Ingestor Service Compose**
```yaml
# services/ingestor/docker-compose.yml
version: '3.8'
services:
  ingestor:
    build: .
    environment:
      - DATABASE_URL=postgresql://app:app@postgres:5432/app
      - OPENSEARCH_URL=http://opensearch:9200
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./data:/data
    depends_on:
      postgres:
        condition: service_healthy
      opensearch:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - hailmary-network

networks:
  hailmary-network:
    external: true
```

## **Phase 4: Management Scripts**

### **Step 4.1: Shared Validation Scripts**
```bash
# shared/scripts/validation/postgres-check.sh
#!/bin/bash
set -e

echo "🔍 Checking PostgreSQL availability..."
if docker-compose -f services/postgres/docker-compose.yml exec postgres pg_isready -U app -d app >/dev/null 2>&1; then
    echo "✅ PostgreSQL is healthy"
    return 0
else
    echo "❌ PostgreSQL is not available"
    return 1
fi
```

```bash
# shared/scripts/validation/opensearch-check.sh
#!/bin/bash
set -e

echo "🔍 Checking OpenSearch availability..."
if curl -f http://localhost:9200/_cluster/health >/dev/null 2>&1; then
    echo "✅ OpenSearch is healthy"
    return 0
else
    echo "❌ OpenSearch is not available"
    return 1
fi
```

```bash
# shared/scripts/validation/redis-check.sh
#!/bin/bash
set -e

echo "🔍 Checking Redis availability..."
if docker-compose -f services/redis/docker-compose.yml exec redis redis-cli ping >/dev/null 2>&1; then
    echo "✅ Redis is healthy"
    return 0
else
    echo "❌ Redis is not available"
    return 1
fi
```

### **Step 4.2: Service Management Scripts**
```bash
# services/postgres/scripts/start.sh
#!/bin/bash
set -e

echo "🚀 Starting PostgreSQL service..."
cd "$(dirname "$0")/.."
docker-compose up -d
echo "✅ PostgreSQL service started"
```

```bash
# services/postgres/scripts/stop.sh
#!/bin/bash
set -e

echo "🛑 Stopping PostgreSQL service..."
cd "$(dirname "$0")/.."
docker-compose down
echo "✅ PostgreSQL service stopped"
```

```bash
# services/postgres/scripts/health-check.sh
#!/bin/bash
set -e

echo "🔍 Checking PostgreSQL health..."
cd "$(dirname "$0")/.."
if docker-compose exec postgres pg_isready -U app -d app; then
    echo "✅ PostgreSQL is healthy"
else
    echo "❌ PostgreSQL health check failed"
    exit 1
fi
```

### **Step 4.3: Main Orchestration Scripts**
```bash
# scripts/main/hailmary.sh
#!/bin/bash
set -e

# Main orchestration script
COMMAND=${1:-"help"}
ENVIRONMENT=${2:-"local"}

case $COMMAND in
    "start")
        echo "🚀 Starting all HailMary services..."
        ./scripts/main/start.sh $ENVIRONMENT
        ;;
    "stop")
        echo "🛑 Stopping all HailMary services..."
        ./scripts/main/stop.sh $ENVIRONMENT
        ;;
    "restart")
        echo "🔄 Restarting all HailMary services..."
        ./scripts/main/restart.sh $ENVIRONMENT
        ;;
    "status")
        echo "📊 Checking all services status..."
        ./scripts/main/status.sh $ENVIRONMENT
        ;;
    "health")
        echo "🔍 Running health checks..."
        ./scripts/main/health-check.sh $ENVIRONMENT
        ;;
    "logs")
        echo "📋 Viewing all logs..."
        ./scripts/main/logs.sh $ENVIRONMENT
        ;;
    *)
        echo "Usage: $0 [start|stop|restart|status|health|logs] [local|staging|production]"
        exit 1
        ;;
esac
```

## **Phase 5: Main Orchestration Compose**

### **Step 5.1: Main Docker Compose**
```yaml
# docker-compose.yml
version: '3.8'

networks:
  hailmary-network:
    driver: bridge

volumes:
  postgres_data:
  opensearch_data:
  redis_data:

services:
  postgres:
    extends:
      file: services/postgres/docker-compose.yml
      service: postgres
  
  opensearch:
    extends:
      file: services/opensearch/docker-compose.yml
      service: opensearch
  
  redis:
    extends:
      file: services/redis/docker-compose.yml
      service: redis
  
  web:
    extends:
      file: services/web/docker-compose.yml
      service: web
    depends_on:
      postgres:
        condition: service_healthy
      opensearch:
        condition: service_healthy
      redis:
        condition: service_healthy
  
  ingestor:
    extends:
      file: services/ingestor/docker-compose.yml
      service: ingestor
    depends_on:
      postgres:
        condition: service_healthy
      opensearch:
        condition: service_healthy
      redis:
        condition: service_healthy
```

## **Phase 6: Environment Configuration**

### **Step 6.1: Environment Templates**
```bash
# environments/local/.env.postgres
POSTGRES_USER=app
POSTGRES_PASSWORD=app
POSTGRES_DB=app
POSTGRES_PORT=5432
```

```bash
# environments/local/.env.opensearch
OPENSEARCH_INITIAL_ADMIN_PASSWORD=admin123!
OPENSEARCH_PORT=9200
OPENSEARCH_JAVA_OPTS=-Xms1g -Xmx1g
```

```bash
# environments/local/.env.redis
REDIS_PORT=6379
REDIS_PASSWORD=
```

```bash
# environments/local/.env.web
DATABASE_URL=postgresql://app:app@postgres:5432/app
OPENSEARCH_URL=http://opensearch:9200
REDIS_URL=redis://redis:6379
NODE_ENV=development
```

```bash
# environments/local/.env.ingestor
DATABASE_URL=postgresql://app:app@postgres:5432/app
OPENSEARCH_URL=http://opensearch:9200
REDIS_URL=redis://redis:6379
```

## **Phase 7: Documentation**

### **Step 7.1: Service Documentation**
```markdown
# services/postgres/README.md
# PostgreSQL Service

## Overview
This service provides the PostgreSQL database for the HailMary application.

## Quick Start
```bash
# Start the service
./scripts/start.sh

# Check health
./scripts/health-check.sh

# View logs
./scripts/logs.sh
```

## Configuration
- Database: app
- User: app
- Password: app
- Port: 5432

## Management
- Start: `./scripts/start.sh`
- Stop: `./scripts/stop.sh`
- Restart: `./scripts/restart.sh`
- Backup: `./scripts/backup.sh`
- Restore: `./scripts/restore.sh`
```

## **Implementation Timeline**

### **Week 1: Foundation**
- [ ] Create directory structure
- [ ] Move existing code
- [ ] Create service-specific Dockerfiles
- [ ] Create service-specific compose files

### **Week 2: Scripts & Validation**
- [ ] Create management scripts
- [ ] Implement dependency validation
- [ ] Create health check scripts
- [ ] Test individual services

### **Week 3: Orchestration**
- [ ] Create main orchestration compose
- [ ] Implement main management scripts
- [ ] Test service dependencies
- [ ] Validate end-to-end functionality

### **Week 4: Documentation & Testing**
- [ ] Create service documentation
- [ ] Test all service combinations
- [ ] Update deployment scripts
- [ ] Final validation and cleanup

## **Benefits After Implementation**

1. **Modularity**: Each service is independent
2. **Scalability**: Scale services individually
3. **Maintainability**: Clear separation of concerns
4. **Development**: Work on services independently
5. **Operations**: Granular monitoring and management
6. **Testing**: Test services in isolation
7. **Deployment**: Deploy services independently

This implementation plan provides a clear roadmap for transforming the monolithic architecture into a modular, scalable microservices system! 🚀

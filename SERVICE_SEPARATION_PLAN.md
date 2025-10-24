# 🏗️ Service Separation Plan - HailMary Project

## **Overview**
Transform the monolithic Docker Compose setup into independent, modular services with separate directories, Dockerfiles, and management scripts. Each service will be self-contained with its own lifecycle management.

## **Current vs Target Architecture**

### **Current Structure**
```
hailmary/
├── docker-compose.yml          # Monolithic setup
├── apps/
│   ├── web/                    # Next.js app
│   └── ingestor/               # Python ingestion
└── deployment/
    └── docker-compose.production.yml
```

### **Target Structure**
```
hailmary/
├── services/
│   ├── postgres/               # Database service
│   ├── opensearch/             # Search service
│   ├── redis/                  # Cache service
│   ├── web/                    # Web application
│   └── ingestor/               # Data ingestion
├── shared/                     # Shared configurations
├── scripts/                    # Service management scripts
└── docker-compose.yml          # Orchestration only
```

## **Service Separation Details**

### **1. PostgreSQL Service** (`services/postgres/`)
```
services/postgres/
├── Dockerfile                  # Custom PostgreSQL setup
├── docker-compose.yml          # Service-specific compose
├── init/                       # Database initialization
│   ├── 01-init-db.sql         # Create database and user
│   ├── 02-create-extensions.sql # PostGIS extensions
│   └── 03-setup-permissions.sql # User permissions
├── config/                     # PostgreSQL configuration
│   ├── postgresql.conf        # Performance tuning
│   └── pg_hba.conf            # Authentication
├── scripts/
│   ├── start.sh               # Start service
│   ├── stop.sh                # Stop service
│   ├── restart.sh             # Restart service
│   ├── backup.sh              # Backup database
│   ├── restore.sh             # Restore database
│   ├── health-check.sh        # Health validation
│   └── logs.sh                # View logs
└── README.md                  # Service documentation
```

### **2. OpenSearch Service** (`services/opensearch/`)
```
services/opensearch/
├── Dockerfile                  # Custom OpenSearch setup
├── docker-compose.yml          # Service-specific compose
├── config/                     # OpenSearch configuration
│   ├── opensearch.yml         # Main configuration
│   └── jvm.options            # JVM settings
├── scripts/
│   ├── start.sh               # Start service
│   ├── stop.sh                # Stop service
│   ├── restart.sh             # Restart service
│   ├── health-check.sh        # Health validation
│   ├── create-index.sh        # Create search indices
│   ├── delete-index.sh        # Delete indices
│   ├── backup.sh              # Backup indices
│   └── logs.sh                # View logs
└── README.md                  # Service documentation
```

### **3. Redis Service** (`services/redis/`)
```
services/redis/
├── Dockerfile                  # Custom Redis setup
├── docker-compose.yml          # Service-specific compose
├── config/                     # Redis configuration
│   └── redis.conf             # Redis settings
├── scripts/
│   ├── start.sh               # Start service
│   ├── stop.sh                # Stop service
│   ├── restart.sh             # Restart service
│   ├── health-check.sh        # Health validation
│   ├── flush.sh               # Clear cache
│   ├── backup.sh              # Backup data
│   └── logs.sh                # View logs
└── README.md                  # Service documentation
```

### **4. Web Service** (`services/web/`)
```
services/web/
├── Dockerfile                  # Next.js application
├── Dockerfile.dev              # Development version
├── docker-compose.yml          # Service-specific compose
├── docker-compose.dev.yml      # Development compose
├── src/                        # Application source (moved from apps/web/)
├── prisma/                     # Database schema
├── scripts/
│   ├── start.sh               # Start service
│   ├── stop.sh                # Stop service
│   ├── restart.sh             # Restart service
│   ├── build.sh               # Build application
│   ├── dev.sh                 # Development mode
│   ├── health-check.sh        # Health validation
│   ├── db-push.sh             # Push schema to DB
│   ├── db-migrate.sh          # Run migrations
│   ├── db-reset.sh            # Reset database
│   └── logs.sh                # View logs
└── README.md                  # Service documentation
```

### **5. Ingestor Service** (`services/ingestor/`)
```
services/ingestor/
├── Dockerfile                  # Python ingestion service
├── docker-compose.yml          # Service-specific compose
├── app.py                      # Main application
├── lib/                        # Utility modules
│   ├── __init__.py
│   ├── utils.py
│   └── db_operations.py
├── requirements.txt            # Python dependencies
├── scripts/
│   ├── start.sh               # Start service
│   ├── stop.sh                # Stop service
│   ├── restart.sh             # Restart service
│   ├── health-check.sh        # Health validation
│   ├── ingest.sh              # Ingest data
│   ├── ingest-single.sh       # Ingest single file
│   ├── validate-deps.sh       # Validate dependencies
│   └── logs.sh                # View logs
└── README.md                  # Service documentation
```

## **Shared Components** (`shared/`)

### **Shared Configurations**
```
shared/
├── docker/                     # Shared Docker configurations
│   ├── base/                  # Base images and common configs
│   ├── networks/              # Docker networks
│   └── volumes/               # Volume definitions
├── config/                     # Shared configuration files
│   ├── environment/           # Environment templates
│   ├── logging/               # Logging configurations
│   └── monitoring/            # Monitoring setups
├── scripts/                    # Shared utility scripts
│   ├── common/                # Common functions
│   ├── validation/            # Dependency validation
│   └── monitoring/            # Health checks
└── docs/                       # Shared documentation
    ├── architecture.md        # System architecture
    ├── deployment.md          # Deployment guide
    └── troubleshooting.md     # Common issues
```

## **Service Management Scripts** (`scripts/`)

### **Main Orchestration Scripts**
```
scripts/
├── hailmary.sh                # Main orchestration script
├── deploy.sh                  # Deploy all services
├── start.sh                   # Start all services
├── stop.sh                    # Stop all services
├── restart.sh                 # Restart all services
├── status.sh                  # Check all services status
├── logs.sh                    # View all logs
├── health-check.sh            # Health check all services
└── cleanup.sh                 # Clean up resources
```

### **Service-Specific Scripts**
```
scripts/
├── postgres/
│   ├── manage.sh              # PostgreSQL management
│   ├── backup.sh              # Database backup
│   ├── restore.sh             # Database restore
│   └── migrate.sh             # Schema migrations
├── opensearch/
│   ├── manage.sh              # OpenSearch management
│   ├── index.sh               # Index management
│   └── backup.sh              # Index backup
├── redis/
│   ├── manage.sh              # Redis management
│   └── backup.sh              # Cache backup
├── web/
│   ├── manage.sh              # Web app management
│   ├── build.sh               # Build application
│   └── deploy.sh              # Deploy application
└── ingestor/
    ├── manage.sh              # Ingestor management
    ├── ingest.sh              # Data ingestion
    └── validate.sh            # Data validation
```

## **Dependency Management**

### **Service Dependencies**
```
PostgreSQL: No dependencies (base service)
OpenSearch: No dependencies (base service)
Redis: No dependencies (base service)
Web: Depends on PostgreSQL, OpenSearch, Redis
Ingestor: Depends on PostgreSQL, OpenSearch, Redis
```

### **Dependency Validation Scripts**
```bash
# Each service has a validate-deps.sh script
services/web/scripts/validate-deps.sh
services/ingestor/scripts/validate-deps.sh

# Shared validation functions
shared/scripts/validation/
├── postgres-check.sh          # Check PostgreSQL availability
├── opensearch-check.sh        # Check OpenSearch availability
├── redis-check.sh             # Check Redis availability
└── network-check.sh           # Check Docker network
```

## **Docker Compose Structure**

### **Main Orchestration** (`docker-compose.yml`)
```yaml
# Main orchestration file - includes all services
version: '3.8'
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

networks:
  default:
    name: hailmary-network

volumes:
  postgres_data:
  opensearch_data:
  redis_data:
```

### **Service-Specific Compose Files**
Each service has its own `docker-compose.yml` for independent management:

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

## **Environment Management**

### **Environment-Specific Configurations**
```
environments/
├── local/                      # Local development
│   ├── .env.postgres
│   ├── .env.opensearch
│   ├── .env.redis
│   ├── .env.web
│   └── .env.ingestor
├── staging/                    # Staging environment
│   └── (same structure)
└── production/                 # Production environment
    └── (same structure)
```

## **Benefits of This Architecture**

### **1. Modularity**
- Each service is self-contained
- Independent development and deployment
- Easy to add/remove services

### **2. Maintainability**
- Clear separation of concerns
- Service-specific documentation
- Independent versioning

### **3. Scalability**
- Scale services independently
- Load balancing per service
- Resource optimization

### **4. Development Experience**
- Work on individual services
- Faster builds and deployments
- Better debugging and testing

### **5. Operations**
- Independent monitoring
- Service-specific backups
- Granular health checks

## **Migration Strategy**

### **Phase 1: Create Service Directories**
1. Create `services/` directory structure
2. Move existing code to appropriate services
3. Create service-specific Dockerfiles

### **Phase 2: Implement Service Scripts**
1. Create management scripts for each service
2. Implement dependency validation
3. Add health checks

### **Phase 3: Update Orchestration**
1. Update main docker-compose.yml
2. Create service-specific compose files
3. Test service independence

### **Phase 4: Documentation & Testing**
1. Create service documentation
2. Test all service combinations
3. Update deployment scripts

## **Implementation Timeline**

- **Week 1**: Create directory structure and move code
- **Week 2**: Implement service scripts and validation
- **Week 3**: Update orchestration and test
- **Week 4**: Documentation and final testing

This architecture provides a solid foundation for a scalable, maintainable microservices system! 🚀

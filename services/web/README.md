# 🌐 HailMary Web Service

## **Overview**
The HailMary Web Service is a Next.js application that provides the user interface and API endpoints for the HailMary platform. It integrates with PostgreSQL, OpenSearch, and Redis services to deliver a comprehensive search and data management experience.

## **Features**
- **Search Interface**: Advanced search with filters and pagination
- **Direct Search**: Quick search functionality
- **Admin Panel**: Administrative interface for system management
- **Authentication**: Secure user authentication system
- **API Endpoints**: RESTful API for data operations
- **Real-time Health Monitoring**: Service dependency health checks

## **Architecture**
```
┌─────────────────────────────────────────────────────────────┐
│                    Web Service                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Next.js Application                    │   │
│  │                                                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │   Frontend  │  │   API       │  │   Auth      │ │   │
│  │  │   Pages     │  │   Routes    │  │   System    │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Service Dependencies                   │   │
│  │                                                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │ PostgreSQL  │  │ OpenSearch  │  │    Redis    │ │   │
│  │  │             │  │             │  │             │ │   │
│  │  │ • Data      │  │ • Search    │  │ • Cache     │ │   │
│  │  │ • Schema    │  │ • Indexing  │  │ • Sessions  │ │   │
│  │  │ • Auth      │  │ • Filters   │  │ • Rate      │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## **Service Dependencies**
- **PostgreSQL**: Database for user data, authentication, and application data
- **OpenSearch**: Search engine for advanced search functionality
- **Redis**: Caching layer and session storage
- **Schema Service**: Database schema management and client generation

## **Quick Start**

### **Prerequisites**
- Docker and Docker Compose
- PostgreSQL service running
- OpenSearch service running
- Redis service running
- GitHub token for schema integration (optional)

### **Start the Service**
```bash
# Start the web service
./scripts/start.sh

# Check service health
./scripts/health-check.sh

# View logs
./scripts/logs.sh
```

### **Stop the Service**
```bash
# Stop the web service
./scripts/stop.sh

# Restart the service
./scripts/restart.sh
```

## **Configuration**

### **Environment Variables**
```bash
# Application Configuration
NODE_ENV=production
WEB_PORT=3000
HOSTNAME=0.0.0.0

# Database Configuration
DATABASE_URL=postgresql://app:app@postgres:5432/app

# OpenSearch Configuration
OPENSEARCH_URL=http://opensearch:9200

# Redis Configuration
REDIS_URL=redis://redis:6379

# Schema Service Configuration
GITHUB_REPO=leadvantageadmin/hailmary-schema
SCHEMA_VERSION=latest
GITHUB_TOKEN=ghp_your_token_here

# Authentication Configuration
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
```

### **Environment File**
Create a `.env` file in the service directory:
```bash
cp env.example .env
# Edit .env with your configuration
```

## **API Endpoints**

### **Health Check**
```http
GET /api/health
```
Returns the health status of the web service and its dependencies.

### **Search**
```http
POST /api/search
Content-Type: application/json

{
  "filters": {
    "company": ["Example Corp"],
    "country": ["United States"],
    "industry": ["Technology"]
  },
  "page": {
    "size": 25,
    "number": 1
  }
}
```

### **Authentication**
```http
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me
```

### **Bulk Import**
```http
POST /api/bulk-import
Content-Type: application/json

{
  "customers": [...],
  "clearExisting": false
}
```

## **Frontend Pages**

### **Main Application**
- **Home**: `http://localhost:3000/`
- **Search**: `http://localhost:3000/search`
- **Direct Search**: `http://localhost:3000/direct-search`
- **Login**: `http://localhost:3000/login`

### **Admin Interface**
- **Admin Panel**: `http://localhost:3000/admin`

## **Schema Integration**

### **Pull Schema Client**
```bash
# Pull latest schema client
./scripts/pull-schema.sh

# Pull specific version
./scripts/pull-schema.sh v2.1.0
```

### **Schema Configuration**
The web service automatically pulls the latest schema client from GitHub during build. The schema client provides:
- Type-safe database operations
- Prisma client generation
- Database schema validation

## **Development**

### **Local Development**
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### **Docker Development**
```bash
# Build development image
docker build -f Dockerfile.dev -t hailmary-web-dev .

# Run development container
docker run -p 3000:3000 hailmary-web-dev
```

## **Management Scripts**

### **Service Management**
- `./scripts/start.sh` - Start the web service
- `./scripts/stop.sh` - Stop the web service
- `./scripts/restart.sh` - Restart the web service
- `./scripts/health-check.sh` - Check service health
- `./scripts/logs.sh` - View service logs

### **Schema Management**
- `./scripts/pull-schema.sh` - Pull schema client from GitHub

## **Monitoring**

### **Health Checks**
The service provides comprehensive health monitoring:
- Web application health
- PostgreSQL connection health
- OpenSearch connection health
- Redis connection health

### **Logs**
```bash
# View recent logs
./scripts/logs.sh

# Follow logs in real-time
./scripts/logs.sh -f

# View more log lines
./scripts/logs.sh '' 500
```

## **Troubleshooting**

### **Common Issues**

#### **Service Won't Start**
1. Check if dependencies are running:
   ```bash
   docker ps | grep hailmary
   ```

2. Check service logs:
   ```bash
   ./scripts/logs.sh
   ```

3. Verify environment variables:
   ```bash
   cat .env
   ```

#### **Database Connection Issues**
1. Verify PostgreSQL is running:
   ```bash
   docker exec hailmary-postgres pg_isready -U app -d app
   ```

2. Check database URL in environment variables

#### **Search Not Working**
1. Verify OpenSearch is running:
   ```bash
   curl http://localhost:9200/_cluster/health
   ```

2. Check OpenSearch URL in environment variables

#### **Cache Issues**
1. Verify Redis is running:
   ```bash
   docker exec hailmary-redis redis-cli ping
   ```

2. Check Redis URL in environment variables

### **Debug Mode**
```bash
# Enable debug logging
export DEBUG=*
./scripts/start.sh
```

## **Performance**

### **Resource Limits**
- **Memory**: 1GB limit, 512MB reservation
- **CPU**: 1.0 limit, 0.5 reservation

### **Optimization**
- **Caching**: Redis caching for search results
- **Database**: Optimized queries with proper indexing
- **Search**: Efficient OpenSearch queries with pagination

## **Security**

### **Authentication**
- NextAuth.js integration
- Secure session management
- Protected API endpoints

### **Environment Security**
- Environment variables for sensitive data
- No hardcoded secrets
- Secure Docker configuration

## **Deployment**

### **Production Deployment**
```bash
# Set production environment variables
export NODE_ENV=production
export DATABASE_URL=postgresql://user:pass@host:5432/db
export OPENSEARCH_URL=http://opensearch-host:9200
export REDIS_URL=redis://redis-host:6379

# Start the service
./scripts/start.sh
```

### **Docker Compose**
```bash
# Start with docker-compose
docker compose up -d

# Start with specific profiles
docker compose --profile schema-update up -d
```

## **Contributing**

### **Code Structure**
```
services/web/
├── src/
│   ├── app/           # Next.js app directory
│   ├── components/    # React components
│   └── lib/          # Utility libraries
├── scripts/          # Management scripts
├── config/           # Configuration files
├── data/            # Data files
├── logs/            # Log files
├── Dockerfile       # Docker configuration
├── docker-compose.yml # Service configuration
└── README.md        # This file
```

### **Adding New Features**
1. Create feature branch
2. Implement changes
3. Update tests
4. Update documentation
5. Submit pull request

## **Support**

### **Documentation**
- [Architecture Diagram](../../ARCHITECTURE_DIAGRAM.md)
- [Service Separation Plan](../../SERVICE_SEPARATION_PLAN.md)
- [Implementation Plan](../../IMPLEMENTATION_PLAN.md)

### **Contact**
- **Team**: HailMary Development Team
- **Repository**: [HailMary Project](https://github.com/leadvantageadmin/hailmary)

---

**Last Updated**: October 2025  
**Version**: 1.0.0  
**Status**: Production Ready

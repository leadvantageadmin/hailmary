# Deployment Consistency Checklist

This checklist ensures the same environment is used from Mac to GCP VM.

## Pre-Deployment Verification

### 1. Local Environment Check
```bash
# Run the verification script
./deployment/verify-environment.sh
```

### 2. Docker Environment Consistency
- [ ] **Base Image**: Using `node:18-slim` (Debian-based)
- [ ] **Prisma Binary Targets**: Includes `debian-openssl-3.0.x` and `linux-arm64-openssl-3.0.x`
- [ ] **OpenSSL**: Explicitly installed in Dockerfile
- [ ] **Multi-stage Build**: Ensures clean, reproducible builds

### 3. Environment Variables
- [ ] **Local**: Uses `docker-compose.yml` with local environment
- [ ] **Production**: Uses `deployment/docker-compose.production.yml` with production environment
- [ ] **Database URLs**: Point to correct services (Docker vs external)

## Deployment Steps

### 1. VM Preparation
```bash
# On GCP VM
sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

### 2. Code Deployment
```bash
# Clone repository
git clone <your-repo-url>
cd hailmary

# Copy environment file
cp deployment/env.production.example .env

# Update environment variables for VM
# Edit .env with VM-specific values
```

### 3. Build and Deploy
```bash
# Build and start services
docker-compose -f deployment/docker-compose.production.yml up -d --build

# Verify deployment
docker-compose -f deployment/docker-compose.production.yml ps
```

## Post-Deployment Verification

### 1. Service Health Checks
```bash
# Check all services are running
docker-compose -f deployment/docker-compose.production.yml ps

# Check web service logs
docker-compose -f deployment/docker-compose.production.yml logs web

# Check database connection
docker-compose -f deployment/docker-compose.production.yml exec web node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect().then(() => console.log('✅ Database connected')).catch(console.error);
"
```

### 2. Application Access
- [ ] **Web App**: Accessible via nginx on port 80
- [ ] **Login Page**: `/login` works
- [ ] **Admin Panel**: `/admin` accessible with admin credentials
- [ ] **Search API**: `/api/search` protected by authentication

## Troubleshooting

### Common Issues

1. **Prisma Binary Mismatch**
   ```bash
   # Regenerate Prisma client
   docker-compose exec web pnpm prisma:generate
   ```

2. **OpenSSL Issues**
   ```bash
   # Check OpenSSL in container
   docker-compose exec web openssl version
   ```

3. **Port Conflicts**
   ```bash
   # Check port usage
   sudo netstat -tlnp | grep :80
   sudo netstat -tlnp | grep :3000
   ```

4. **Environment Variables**
   ```bash
   # Check environment in container
   docker-compose exec web env | grep -E "(DATABASE_URL|OPENSEARCH_URL|REDIS_URL)"
   ```

## Key Differences: Mac vs VM

| Aspect | Mac (Local) | GCP VM (Production) |
|--------|-------------|---------------------|
| **Docker Compose** | `docker-compose.yml` | `deployment/docker-compose.production.yml` |
| **Environment** | `.env.local` | `.env` (production) |
| **Ports** | Direct access (3000) | Nginx proxy (80/443) |
| **Database** | Docker container | Docker container (same) |
| **OpenSearch** | Docker container | Docker container (same) |
| **Redis** | Docker container | Docker container (same) |

## Success Criteria

- [ ] All Docker services start without errors
- [ ] Web application accessible via nginx
- [ ] Database connections work
- [ ] Authentication system functional
- [ ] Search API responds correctly
- [ ] Admin panel accessible

If all criteria are met, the environment is consistent between Mac and GCP VM.

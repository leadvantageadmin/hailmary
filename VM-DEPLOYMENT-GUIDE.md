# VM Deployment Guide

This guide provides comprehensive instructions for deploying the HailMary Customer Search Platform to a GCP VM instance.

## Prerequisites

### VM Requirements
- **Instance Type**: e2-medium or higher (2 vCPUs, 4GB RAM minimum)
- **Disk Space**: At least 20GB (50GB recommended for large datasets)
- **Operating System**: Debian 11 (Bookworm) or Ubuntu 20.04+
- **Network Tags**: `http-server`, `https-server`

### GCP Configuration
- **Firewall Rules**: Allow HTTP (port 80) and HTTPS (port 443) traffic
- **SSH Access**: Configured with your GCP credentials
- **Project**: Set to `leadvantage-global`

## Deployment Methods

### Method 1: Complete Setup (Recommended for New VMs)

This method handles all setup requirements automatically:

```bash
# Run the complete setup script
./scripts/setup-vm.sh
```

**What it does:**
- Installs Docker and Docker Compose
- Clones/updates the repository
- Creates environment files
- Builds and starts all services
- Sets up the database schema
- Verifies the deployment

### Method 2: Standard Deployment

For existing VMs with Docker already installed:

```bash
# Deploy using the unified script
./scripts/hailmary.sh vm deploy

# Or use the deploy script directly
./scripts/deploy.sh vm
```

### Method 3: Individual Scripts

For manual control over each step:

```bash
# Deploy application
./scripts/deploy.sh vm

# Fix database if needed
./scripts/fix-vm-db.sh
```

## Post-Deployment Steps

### 1. Upload Data Files
```bash
# Upload CSV files to the VM
./scripts/hailmary.sh vm upload-csv data/customers.csv
./scripts/hailmary.sh vm upload-csv "data/RPF April 2024.csv"
```

### 2. Ingest Data
```bash
# Run data ingestion
./scripts/hailmary.sh vm ingest
```

### 3. Verify Deployment
```bash
# Check service status
./scripts/hailmary.sh vm status

# View logs
./scripts/hailmary.sh vm logs
```

## Access Points

After successful deployment:

- **Application**: `http://YOUR_VM_IP:8080`
- **Login Page**: `http://YOUR_VM_IP:8080/login`
- **Search Page**: `http://YOUR_VM_IP:8080/search` (requires authentication)
- **Admin Panel**: `http://YOUR_VM_IP:8080/admin`

Default admin credentials:
- **Email**: `admin@leadvantageglobal.com`
- **Password**: `admin123`

## Troubleshooting

### Common Issues

#### 1. Docker Permission Denied
**Error**: `permission denied while trying to connect to the Docker daemon socket`

**Solution**:
```bash
# Add user to docker group and restart Docker
sudo usermod -aG docker $USER
sudo systemctl restart docker
```

#### 2. Database Schema Not Found
**Error**: `relation "public.Customer" does not exist`

**Solution**:
```bash
# Run the database fix script
./scripts/fix-vm-db.sh
```

#### 3. Environment File Not Found
**Error**: `env file not found`

**Solution**:
```bash
# Create environment files
gcloud compute ssh pmomale2024@hail-mary --zone=asia-south1-c --command="
    cd hailmary
    cp deployment/env.production .env
    cp deployment/env.production deployment/.env
"
```

#### 4. OpenSearch Disk Space Issues
**Error**: `disk usage exceeded flood-stage watermark`

**Solution**:
```bash
# Check disk space
gcloud compute ssh pmomale2024@hail-mary --zone=asia-south1-c --command="df -h"

# Clear OpenSearch index if needed
gcloud compute ssh pmomale2024@hail-mary --zone=asia-south1-c --command="
    cd hailmary
    docker-compose -f deployment/docker-compose.production.yml exec opensearch curl -X DELETE 'http://localhost:9200/customers'
"
```

#### 5. Services Not Starting
**Error**: Services fail to start or are unhealthy

**Solution**:
```bash
# Check service logs
./scripts/hailmary.sh vm logs

# Restart services
./scripts/hailmary.sh vm restart

# Rebuild and restart
gcloud compute ssh pmomale2024@hail-mary --zone=asia-south1-c --command="
    cd hailmary
    docker-compose -f deployment/docker-compose.production.yml down
    docker-compose -f deployment/docker-compose.production.yml up -d --build
"
```

### Verification Commands

#### Check VM Status
```bash
# Get VM IP and status
gcloud compute instances describe hail-mary --zone=asia-south1-c --format="value(networkInterfaces[0].accessConfigs[0].natIP,status)"
```

#### Check Application Health
```bash
# Test application endpoint
curl -I http://YOUR_VM_IP:8080

# Check database connection
gcloud compute ssh pmomale2024@hail-mary --zone=asia-south1-c --command="
    cd hailmary
    docker-compose -f deployment/docker-compose.production.yml exec postgres psql -U app -d app -c 'SELECT COUNT(*) FROM \"Customer\";'
"
```

#### Check OpenSearch
```bash
# Test OpenSearch endpoint
gcloud compute ssh pmomale2024@hail-mary --zone=asia-south1-c --command="
    cd hailmary
    docker-compose -f deployment/docker-compose.production.yml exec opensearch curl -X GET 'http://localhost:9200/_cluster/health'
"
```

## Management Commands

### Service Management
```bash
# Start services
./scripts/hailmary.sh vm start

# Stop services
./scripts/hailmary.sh vm stop

# Restart services
./scripts/hailmary.sh vm restart

# View logs
./scripts/hailmary.sh vm logs [service-name]
```

### Data Management
```bash
# Upload CSV
./scripts/hailmary.sh vm upload-csv <file-path>

# Ingest data
./scripts/hailmary.sh vm ingest

# Rebuild schema
./scripts/hailmary.sh vm rebuild-schema
```

### Monitoring
```bash
# Check status
./scripts/hailmary.sh vm status

# View resource usage
gcloud compute ssh pmomale2024@hail-mary --zone=asia-south1-c --command="
    docker stats --no-stream
"
```

## Performance Optimization

### For Large Datasets
- Use VM with at least 4GB RAM
- Increase disk space to 50GB or more
- Monitor OpenSearch memory usage
- Consider using the bulk import method for datasets > 10,000 records

### For High Traffic
- Use VM with 4+ vCPUs
- Enable load balancing if needed
- Monitor application logs for performance issues
- Consider scaling to multiple instances

## Security Considerations

- Change default admin password after deployment
- Use HTTPS in production (configure SSL certificates)
- Restrict SSH access to specific IP ranges
- Regularly update system packages and Docker images
- Monitor application logs for security issues

## Backup and Recovery

### Database Backup
```bash
# Create database backup
gcloud compute ssh pmomale2024@hail-mary --zone=asia-south1-c --command="
    cd hailmary
    docker-compose -f deployment/docker-compose.production.yml exec postgres pg_dump -U app app > backup_$(date +%Y%m%d_%H%M%S).sql
"
```

### Application Backup
```bash
# Backup application data
gcloud compute ssh pmomale2024@hail-mary --zone=asia-south1-c --command="
    cd hailmary
    tar -czf app_backup_$(date +%Y%m%d_%H%M%S).tar.gz data/ deployment/.env
"
```

## Support

For issues not covered in this guide:

1. Check the main project README.md
2. Review the RUNBOOK.md for operational procedures
3. Check application logs using `./scripts/hailmary.sh vm logs`
4. Verify VM resources and network configuration
5. Contact the development team with specific error messages and logs

# VM Deployment Guide for HailMary Customer Search Platform

This guide will help you deploy the HailMary Customer Search Platform to a GCP VM instance using Docker Compose, mimicking your local setup.

## Prerequisites

1. **GCP VM Instance**: A running VM instance with Ubuntu/Debian
2. **Google Cloud CLI**: Installed and authenticated
3. **VM Access**: SSH access to your VM instance
4. **Firewall Rules**: Ports 3000, 5432, 6379, 9200 should be open

## Quick Start

### 1. Configure the Deployment Script

Edit `vm-deploy.sh` and update these variables:

```bash
VM_NAME="your-vm-name"           # Your actual VM name
ZONE="your-vm-zone"              # Your VM's zone (e.g., us-central1-a)
SSH_USER="your-username"         # Your VM username
```

### 2. Run the Deployment

```bash
# Make the script executable (already done)
chmod +x vm-deploy.sh

# Run the deployment
./vm-deploy.sh
```

## Manual Deployment Steps

If you prefer to deploy manually:

### 1. Connect to Your VM

```bash
gcloud compute ssh your-username@your-vm-name --zone=your-zone
```

### 2. Install Docker and Docker Compose

```bash
# Update system
sudo apt-get update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again to apply docker group changes
exit
```

### 3. Clone and Setup the Repository

```bash
# Clone the repository
git clone https://github.com/leadvantageadmin/hailmary.git
cd hailmary

# Create environment file
cp env.vm.example .env

# Create data directory
mkdir -p data
```

### 4. Start the Services

```bash
# Build and start all services
docker-compose up -d --build

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

## VM Management

Use the `vm-manage.sh` script to manage your deployment:

```bash
# Show service status
./vm-manage.sh status

# View logs
./vm-manage.sh logs

# Restart services
./vm-manage.sh restart

# Stop services
./vm-manage.sh stop

# Start services
./vm-manage.sh start

# Update services (pull latest code and restart)
./vm-manage.sh update

# Open SSH shell to VM
./vm-manage.sh shell

# Backup database
./vm-manage.sh backup

# Restore database
./vm-manage.sh restore backup_20240101_120000.sql

# Monitor health
./vm-manage.sh monitor

# Show help
./vm-manage.sh help
```

## Service URLs

After deployment, your services will be available at:

- **Web Application**: http://YOUR_VM_IP:3000
- **OpenSearch**: http://YOUR_VM_IP:9200
- **PostgreSQL**: YOUR_VM_IP:5432
- **Redis**: YOUR_VM_IP:6379

## Data Ingestion

To ingest your customer data:

```bash
# Connect to VM
gcloud compute ssh your-username@your-vm-name --zone=your-zone

# Navigate to project directory
cd hailmary

# Run data ingestion
docker-compose run --rm ingestor python app.py /data/customers.csv --clear
```

## Firewall Configuration

Make sure these ports are open in your GCP firewall:

```bash
# Web application
gcloud compute firewall-rules create allow-hailmary-web \
    --allow tcp:3000 \
    --source-ranges 0.0.0.0/0 \
    --description "Allow HailMary web application"

# OpenSearch (optional, for external access)
gcloud compute firewall-rules create allow-hailmary-opensearch \
    --allow tcp:9200 \
    --source-ranges 0.0.0.0/0 \
    --description "Allow HailMary OpenSearch"

# PostgreSQL (optional, for external access)
gcloud compute firewall-rules create allow-hailmary-postgres \
    --allow tcp:5432 \
    --source-ranges 0.0.0.0/0 \
    --description "Allow HailMary PostgreSQL"
```

## Monitoring and Maintenance

### Health Checks

```bash
# Check all services
./vm-manage.sh monitor

# Check individual services
curl http://YOUR_VM_IP:3000/api/health
curl http://YOUR_VM_IP:9200/_cluster/health
```

### Logs

```bash
# View all logs
./vm-manage.sh logs

# View specific service logs
docker-compose logs web
docker-compose logs ingestor
docker-compose logs postgres
docker-compose logs redis
docker-compose logs opensearch
```

### Backup and Restore

```bash
# Create backup
./vm-manage.sh backup

# List backups
ls -la backups/

# Restore from backup
./vm-manage.sh restore backup_20240101_120000.sql
```

## Troubleshooting

### Common Issues

1. **Services won't start**:
   ```bash
   # Check logs
   docker-compose logs
   
   # Check disk space
   df -h
   
   # Check memory
   free -h
   ```

2. **Port conflicts**:
   ```bash
   # Check what's using ports
   netstat -tlnp | grep -E ':(3000|5432|6379|9200)'
   
   # Kill processes if needed
   sudo kill -9 PID
   ```

3. **Database connection issues**:
   ```bash
   # Check PostgreSQL logs
   docker-compose logs postgres
   
   # Test connection
   docker-compose exec postgres psql -U app -d app -c "SELECT 1;"
   ```

4. **OpenSearch issues**:
   ```bash
   # Check OpenSearch logs
   docker-compose logs opensearch
   
   # Test connection
   curl http://localhost:9200/_cluster/health
   ```

### Performance Optimization

1. **Increase VM resources** if needed
2. **Adjust Docker memory limits** in docker-compose.yml
3. **Enable swap** if running out of memory
4. **Use SSD storage** for better I/O performance

### Security Considerations

1. **Change default passwords** in environment files
2. **Restrict firewall rules** to specific IP ranges
3. **Use SSL/TLS** for production deployments
4. **Regular security updates** for the VM and containers
5. **Backup encryption** for sensitive data

## Cost Optimization

1. **Use preemptible instances** for development
2. **Right-size your VM** based on actual usage
3. **Use committed use discounts** for production
4. **Monitor resource usage** regularly
5. **Stop services** when not in use

## Support

- **Docker Documentation**: https://docs.docker.com/
- **Docker Compose Documentation**: https://docs.docker.com/compose/
- **GCP VM Documentation**: https://cloud.google.com/compute/docs
- **Project Repository**: https://github.com/leadvantageadmin/hailmary

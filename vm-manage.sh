#!/bin/bash

# VM Management Script for HailMary Customer Search Platform
# This script helps manage the application on your GCP VM

set -e

# Configuration
VM_NAME="hail-mary"
ZONE="asia-south1-c"  # Change to your VM's zone
SSH_USER="pmomale2024"  # Replace with your VM username

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to execute commands on VM
execute_on_vm() {
    gcloud compute ssh $SSH_USER@$VM_NAME --zone=$ZONE --command="$1"
}

# Function to show help
show_help() {
    echo -e "${BLUE}HailMary VM Management Script${NC}"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  status     - Show service status"
    echo "  logs       - Show service logs"
    echo "  restart    - Restart all services"
    echo "  stop       - Stop all services"
    echo "  start      - Start all services"
    echo "  update     - Update and restart services"
    echo "  shell      - Open SSH shell to VM"
    echo "  backup     - Backup database"
    echo "  restore    - Restore database from backup"
    echo "  ingest     - Ingest customer data from CSV"
    echo "  monitor    - Monitor service health"
    echo "  help       - Show this help message"
    echo ""
}

# Function to show status
show_status() {
    echo -e "${BLUE}📊 Service Status${NC}"
    execute_on_vm "docker-compose ps"
    echo ""
    echo -e "${BLUE}💾 Disk Usage${NC}"
    execute_on_vm "df -h"
    echo ""
    echo -e "${BLUE}🧠 Memory Usage${NC}"
    execute_on_vm "free -h"
    echo ""
    echo -e "${BLUE}🌐 Network Ports${NC}"
    execute_on_vm "netstat -tlnp | grep -E ':(3000|5432|6379|9200)'"
}

# Function to show logs
show_logs() {
    echo -e "${BLUE}📋 Service Logs${NC}"
    execute_on_vm "docker-compose logs --tail=50 -f"
}

# Function to restart services
restart_services() {
    echo -e "${YELLOW}🔄 Restarting services...${NC}"
    execute_on_vm "docker-compose restart"
    echo -e "${GREEN}✅ Services restarted${NC}"
}

# Function to stop services
stop_services() {
    echo -e "${YELLOW}⏹️ Stopping services...${NC}"
    execute_on_vm "docker-compose down"
    echo -e "${GREEN}✅ Services stopped${NC}"
}

# Function to start services
start_services() {
    echo -e "${YELLOW}▶️ Starting services...${NC}"
    execute_on_vm "docker-compose up -d"
    echo -e "${GREEN}✅ Services started${NC}"
}

# Function to update services
update_services() {
    echo -e "${YELLOW}🔄 Updating services...${NC}"
    execute_on_vm "
        # Navigate to project directory
        cd hailmary || { echo 'Project directory not found'; exit 1; }
        
        # Pull latest changes
        echo 'Pulling latest changes from GitHub...'
        git pull origin main
        
        # Recreate production environment files
        echo 'Recreating production environment files...'
        cp apps/web/env.production apps/web/.env.local
        cp apps/ingestor/env.production apps/ingestor/.env.local
        
        # Rebuild and restart services
        echo 'Rebuilding and restarting services...'
        docker-compose down
        docker-compose up -d --build
        
        # Wait for services to be ready
        echo 'Waiting for services to start...'
        sleep 30
        
        # Show status
        echo 'Service status:'
        docker-compose ps
    "
    echo -e "${GREEN}✅ Services updated${NC}"
}

# Function to open shell
open_shell() {
    echo -e "${BLUE}🐚 Opening SSH shell to VM...${NC}"
    gcloud compute ssh $SSH_USER@$VM_NAME --zone=$ZONE
}

# Function to backup database
backup_database() {
    echo -e "${YELLOW}💾 Creating database backup...${NC}"
    execute_on_vm "
        # Create backup directory
        mkdir -p backups
        
        # Create backup
        docker-compose exec -T postgres pg_dump -U app app > backups/backup_\$(date +%Y%m%d_%H%M%S).sql
        
        echo 'Backup created successfully'
        ls -la backups/
    "
    echo -e "${GREEN}✅ Database backup completed${NC}"
}

# Function to restore database
restore_database() {
    if [ -z "$1" ]; then
        echo -e "${RED}❌ Please provide backup file name${NC}"
        echo "Usage: $0 restore backup_20240101_120000.sql"
        exit 1
    fi
    
    echo -e "${YELLOW}🔄 Restoring database from $1...${NC}"
    execute_on_vm "
        # Stop services
        docker-compose down
        
        # Start only postgres
        docker-compose up -d postgres
        
        # Wait for postgres to be ready
        sleep 10
        
        # Restore database
        docker-compose exec -T postgres psql -U app -d app < backups/$1
        
        # Start all services
        docker-compose up -d
        
        echo 'Database restored successfully'
    "
    echo -e "${GREEN}✅ Database restored${NC}"
}

# Function to ingest data
ingest_data() {
    echo -e "${YELLOW}📥 Ingesting customer data...${NC}"
    execute_on_vm "
        # Navigate to project directory
        cd hailmary || { echo 'Project directory not found'; exit 1; }
        
        # Check if data file exists
        if [ ! -f 'data/customers.csv' ]; then
            echo '❌ customers.csv not found in data/ directory'
            echo 'Please upload your CSV file to the VM first'
            exit 1
        fi
        
        # Run data ingestion
        echo 'Running data ingestion...'
        docker-compose run --rm ingestor python app.py /data/customers.csv --clear
        
        echo 'Data ingestion completed successfully'
    "
    echo -e "${GREEN}✅ Data ingestion completed${NC}"
}

# Function to monitor health
monitor_health() {
    echo -e "${BLUE}🏥 Health Monitoring${NC}"
    execute_on_vm "
        echo '=== Service Health Check ==='
        
        # Check web service
        if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
            echo '✅ Web service: Healthy'
        else
            echo '❌ Web service: Unhealthy'
        fi
        
        # Check OpenSearch
        if curl -f http://localhost:9200/_cluster/health > /dev/null 2>&1; then
            echo '✅ OpenSearch: Healthy'
        else
            echo '❌ OpenSearch: Unhealthy'
        fi
        
        # Check Redis
        if docker-compose exec -T redis redis-cli ping | grep -q PONG; then
            echo '✅ Redis: Healthy'
        else
            echo '❌ Redis: Unhealthy'
        fi
        
        # Check PostgreSQL
        if docker-compose exec -T postgres pg_isready -U app > /dev/null 2>&1; then
            echo '✅ PostgreSQL: Healthy'
        else
            echo '❌ PostgreSQL: Unhealthy'
        fi
        
        echo ''
        echo '=== Resource Usage ==='
        docker stats --no-stream --format 'table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}'
    "
}

# Main script logic
case "$1" in
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    restart)
        restart_services
        ;;
    stop)
        stop_services
        ;;
    start)
        start_services
        ;;
    update)
        update_services
        ;;
    shell)
        open_shell
        ;;
    backup)
        backup_database
        ;;
    restore)
        restore_database "$2"
        ;;
    ingest)
        ingest_data
        ;;
    monitor)
        monitor_health
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac

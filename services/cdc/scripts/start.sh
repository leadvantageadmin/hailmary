#!/bin/bash

# =============================================================================
# CDC Service Startup Script
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CDC_DIR="$(dirname "$SCRIPT_DIR")"

# Function to show usage
show_usage() {
    echo -e "${BLUE}CDC Service Startup Script${NC}"
    echo "=============================="
    echo ""
    echo "Usage: $0 [local|vm]"
    echo ""
    echo "Modes:"
    echo "  local  - Local development mode (default)"
    echo "  vm     - VM/production mode"
    echo ""
    echo "Examples:"
    echo "  $0        # Start in local mode"
    echo "  $0 local  # Start in local mode"
    echo "  $0 vm     # Start in VM mode"
    echo ""
}

# Function to configure for local development
configure_local() {
    echo -e "${BLUE}🔧 Configuring for local development...${NC}"
    
    # Set local-specific environment variables
    export ELASTICSEARCH_PORT=9200
    export REDIS_PORT=6379
    export PG_HOST=host.docker.internal
    export PG_PORT=5433
    
    echo -e "${GREEN}✅ Local configuration complete${NC}"
}

# Function to configure for VM/production
configure_vm() {
    echo -e "${BLUE}🔧 Configuring for VM/production deployment...${NC}"
    
    # Set VM-specific environment variables
    export ELASTICSEARCH_PORT=9200
    export REDIS_PORT=6379
    export PG_HOST=hailmary-postgres
    export PG_PORT=5432
    
    echo -e "${GREEN}✅ VM configuration complete${NC}"
}

# Parse command line arguments
DEPLOYMENT_MODE=${1:-local}

# Validate deployment mode
if [[ "$DEPLOYMENT_MODE" != "local" && "$DEPLOYMENT_MODE" != "vm" ]]; then
    echo -e "${RED}❌ Invalid deployment mode: $DEPLOYMENT_MODE${NC}"
    show_usage
    exit 1
fi

echo -e "${BLUE}🚀 Starting HailMary CDC Service ($DEPLOYMENT_MODE mode)...${NC}"

# Configure based on deployment mode
if [[ "$DEPLOYMENT_MODE" == "local" ]]; then
    configure_local
else
    configure_vm
fi

# Change to CDC directory
cd "$CDC_DIR"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from template...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created .env file from template${NC}"
    else
        echo -e "${RED}❌ No .env.example file found. Please create .env manually.${NC}"
        exit 1
    fi
fi

# Create necessary directories
echo -e "${BLUE}📁 Creating data and log directories...${NC}"
mkdir -p data/elasticsearch data/redis logs/elasticsearch logs/pgsync

# Set proper permissions
chmod 755 data/elasticsearch data/redis logs/elasticsearch logs/pgsync

# Check if PostgreSQL is accessible
echo -e "${BLUE}🔍 Checking PostgreSQL connectivity...${NC}"
if docker network ls | grep -q "hailmary-network"; then
    echo -e "${GREEN}✅ hailmary-network found${NC}"
else
    echo -e "${YELLOW}⚠️  hailmary-network not found. Make sure PostgreSQL service is running.${NC}"
fi

# Start services
echo -e "${BLUE}🐳 Starting Docker services...${NC}"
docker-compose up -d

# Wait for services to be healthy
echo -e "${BLUE}⏳ Waiting for services to be healthy...${NC}"

# Wait for Elasticsearch
echo -e "${BLUE}   Waiting for Elasticsearch...${NC}"
timeout=60
while [ $timeout -gt 0 ]; do
    if docker-compose exec -T elasticsearch curl -f http://localhost:9200/_cluster/health >/dev/null 2>&1; then
        echo -e "${GREEN}   ✅ Elasticsearch is healthy${NC}"
        break
    fi
    sleep 2
    timeout=$((timeout - 2))
done

if [ $timeout -le 0 ]; then
    echo -e "${RED}   ❌ Elasticsearch failed to start within 60 seconds${NC}"
    docker-compose logs elasticsearch
    exit 1
fi

# Wait for Redis
echo -e "${BLUE}   Waiting for Redis...${NC}"
timeout=30
while [ $timeout -gt 0 ]; do
    if docker-compose exec -T redis redis-cli ping >/dev/null 2>&1; then
        echo -e "${GREEN}   ✅ Redis is healthy${NC}"
        break
    fi
    sleep 2
    timeout=$((timeout - 2))
done

if [ $timeout -le 0 ]; then
    echo -e "${RED}   ❌ Redis failed to start within 30 seconds${NC}"
    docker-compose logs redis
    exit 1
fi

# Wait for PGSync
echo -e "${BLUE}   Waiting for PGSync...${NC}"
timeout=60
while [ $timeout -gt 0 ]; do
    if docker-compose exec -T pgsync pgrep -f python3.11 >/dev/null 2>&1; then
        echo -e "${GREEN}   ✅ PGSync is running${NC}"
        break
    fi
    sleep 2
    timeout=$((timeout - 2))
done

if [ $timeout -le 0 ]; then
    echo -e "${RED}   ❌ PGSync failed to start within 60 seconds${NC}"
    docker-compose logs pgsync
    exit 1
fi

# Show service status
echo -e "${BLUE}📊 Service Status:${NC}"
docker-compose ps

# Show initial sync status
echo -e "${BLUE}🔄 Checking initial sync status...${NC}"
sleep 5
docker-compose logs --tail=10 pgsync | grep "Sync" || echo -e "${YELLOW}   No sync activity yet${NC}"

# Show Elasticsearch indices
echo -e "${BLUE}📋 Elasticsearch Indices:${NC}"
curl -s http://localhost:9200/_cat/indices?v || echo -e "${YELLOW}   Could not retrieve indices${NC}"

echo -e "${GREEN}🎉 CDC Service started successfully!${NC}"

# Show service information based on deployment mode
if [[ "$DEPLOYMENT_MODE" == "local" ]]; then
    echo -e "${BLUE}📋 Service Information:${NC}"
    echo -e "   • Elasticsearch: http://localhost:9200"
    echo -e "   • Redis: localhost:6379"
    echo -e "   • PGSync: Connected to PostgreSQL via host.docker.internal:5433"
    echo -e "   • Deployment Mode: local"
else
    echo -e "${BLUE}📋 Service Information:${NC}"
    echo -e "   • Elasticsearch: http://localhost:9200"
    echo -e "   • Redis: localhost:6379"
    echo -e "   • PGSync: Connected to PostgreSQL via hailmary-postgres:5432"
    echo -e "   • Deployment Mode: vm"
fi

echo -e "${BLUE}📝 Useful commands:${NC}"
echo -e "   View logs: ${YELLOW}./scripts/health-check.sh $DEPLOYMENT_MODE${NC}"
echo -e "   Check status: ${YELLOW}docker-compose ps${NC}"
echo -e "   Stop services: ${YELLOW}./scripts/manage-cdc.sh stop${NC}"
echo -e "   Restart PGSync: ${YELLOW}docker-compose restart pgsync${NC}"

#!/bin/bash

# Ingestor Service Start Script
# Starts the HailMary Ingestor service
# Usage: ./start.sh [local|vm]
#   local: Local development deployment (default)
#   vm: VM/production deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get deployment mode from first argument
DEPLOYMENT_MODE=${1:-local}

# Validate deployment mode
if [[ "$DEPLOYMENT_MODE" != "local" && "$DEPLOYMENT_MODE" != "vm" ]]; then
    echo -e "${RED}❌ Invalid deployment mode. Use 'local' or 'vm'${NC}"
    echo "   Usage: ./start.sh [local|vm]"
    exit 1
fi

echo -e "${BLUE}🚀 Starting HailMary Ingestor Service ($DEPLOYMENT_MODE mode)...${NC}"

# Function to configure local development environment
configure_local() {
    echo -e "${BLUE}🔧 Configuring for local development...${NC}"
    
    # Local development configurations
    export POSTGRES_HOST="${POSTGRES_HOST:-host.docker.internal}"
    export POSTGRES_PORT="${POSTGRES_PORT:-5433}"
    export POSTGRES_DB="${POSTGRES_DB:-app}"
    export POSTGRES_USER="${POSTGRES_USER:-app}"
    export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-app}"
    export INGESTOR_PORT="${INGESTOR_PORT:-8080}"
    
    echo -e "${GREEN}✅ Local configuration complete${NC}"
}

# Function to configure VM/production environment
configure_vm() {
    echo -e "${BLUE}🔧 Configuring for VM/production deployment...${NC}"
    
    # VM-specific configurations
    export POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
    export POSTGRES_PORT="${POSTGRES_PORT:-5433}"
    export POSTGRES_DB="${POSTGRES_DB:-app}"
    export POSTGRES_USER="${POSTGRES_USER:-app}"
    export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-app}"
    export INGESTOR_PORT="${INGESTOR_PORT:-8080}"
    
    echo -e "${GREEN}✅ VM configuration complete${NC}"
}

# Configure based on deployment mode
if [[ "$DEPLOYMENT_MODE" == "vm" ]]; then
    configure_vm
else
    configure_local
fi

# Load environment variables
if [ -f .env ]; then
    echo -e "${BLUE}📋 Loading environment variables from .env file...${NC}"
    set -a
    source .env
    set +a
else
    echo -e "${RED}❌ .env file not found!${NC}"
    exit 1
fi

# Function to check dependencies
check_dependencies() {
    echo -e "${BLUE}🔍 Checking dependencies...${NC}"
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running!${NC}"
        exit 1
    fi
    
    # Check if required services are running
    echo -e "${BLUE}🔍 Checking PostgreSQL service...${NC}"
    if ! docker ps | grep -q "hailmary-postgres"; then
        echo -e "${YELLOW}⚠️ PostgreSQL service is not running${NC}"
        echo -e "${BLUE}💡 Start PostgreSQL service first:${NC}"
        if [[ "$DEPLOYMENT_MODE" == "vm" ]]; then
            echo -e "   cd ../postgres && ./scripts/start.sh vm"
        else
            echo -e "   cd ../postgres && ./scripts/start.sh local"
        fi
        exit 1
    fi
    
    echo -e "${GREEN}✅ All dependencies are running${NC}"
}

# Function to create directories
create_directories() {
    echo -e "${BLUE}📁 Creating necessary directories...${NC}"
    
    mkdir -p ./data/csv
    mkdir -p ./data/logs
    mkdir -p ./data/schema
    
    echo -e "${GREEN}✅ Directories created${NC}"
}

# Function to start the service
start_service() {
    echo -e "${BLUE}🚀 Starting Ingestor service...${NC}"
    
    # Build the Docker image
    echo -e "${BLUE}🔨 Building Docker image...${NC}"
    docker compose build
    
    # Start the service
    echo -e "${BLUE}🚀 Starting Ingestor container...${NC}"
    docker compose up -d
    
    # Wait for service to be healthy
    echo -e "${BLUE}⏳ Waiting for Ingestor to be healthy...${NC}"
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker compose ps | grep -q "healthy"; then
            echo -e "${GREEN}✅ Ingestor is healthy and ready!${NC}"
            break
        fi
        
        echo -e "${YELLOW}⏳ Waiting for Ingestor... ($attempt/$max_attempts)${NC}"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        echo -e "${RED}❌ Ingestor failed to start within expected time${NC}"
        echo -e "${BLUE}📋 Checking logs...${NC}"
        docker compose logs --tail=20
        exit 1
    fi
}

# Function to show service information
show_service_info() {
    echo ""
    echo -e "${GREEN}🎉 Ingestor Service started successfully!${NC}"
    echo ""
    echo -e "${BLUE}📋 Service Information:${NC}"
    echo -e "   • Port: ${INGESTOR_PORT:-8080}"
    echo -e "   • Host: localhost"
    echo -e "   • Deployment Mode: $DEPLOYMENT_MODE"
    echo -e "   • Health URL: http://localhost:${INGESTOR_PORT:-8080}/health"
    echo -e "   • CSV Data: ./data/csv"
    echo -e "   • Logs: ./data/logs"
    echo -e "   • PostgreSQL: $POSTGRES_HOST:$POSTGRES_PORT"
    echo ""
    echo -e "${BLUE}🔧 Management Commands:${NC}"
    echo -e "   • View logs: ./scripts/logs.sh $DEPLOYMENT_MODE"
    echo -e "   • Health check: ./scripts/health-check.sh $DEPLOYMENT_MODE"
    echo -e "   • Stop service: ./scripts/stop.sh $DEPLOYMENT_MODE"
    echo -e "   • Restart service: ./scripts/restart.sh $DEPLOYMENT_MODE"
    echo ""
    echo -e "${BLUE}📊 Quick Health Check:${NC}"
    curl -s "http://localhost:${INGESTOR_PORT:-8080}/health" | jq '.' 2>/dev/null || echo "Health check endpoint not ready yet"
}

# Main execution
main() {
    echo -e "${BLUE}🚀 Starting HailMary Ingestor Service${NC}"
    echo "======================================"
    
    check_dependencies
    create_directories
    start_service
    show_service_info
    
    echo ""
    echo -e "${GREEN}✅ Ingestor Service started successfully!${NC}"
}

# Run main function
main "$@"

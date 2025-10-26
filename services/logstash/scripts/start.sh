#!/bin/bash

# Logstash Service Start Script
# Starts the HailMary Logstash service
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

echo -e "${BLUE}🚀 Starting HailMary Logstash Service ($DEPLOYMENT_MODE mode)...${NC}"

# Function to configure local development environment
configure_local() {
    echo -e "${BLUE}🔧 Configuring for local development...${NC}"
    
    # Local development configurations
    export POSTGRES_HOST="${POSTGRES_HOST:-host.docker.internal}"
    export POSTGRES_PORT="${POSTGRES_PORT:-5433}"
    export POSTGRES_DB="${POSTGRES_DB:-app}"
    export POSTGRES_USER="${POSTGRES_USER:-app}"
    export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-app}"
    export ELASTICSEARCH_HOST="${ELASTICSEARCH_HOST:-host.docker.internal}"
    export ELASTICSEARCH_PORT="${ELASTICSEARCH_PORT:-9200}"
    export LOGSTASH_HTTP_PORT="${LOGSTASH_HTTP_PORT:-9600}"
    
    echo -e "${GREEN}✅ Local configuration complete${NC}"
}

# Function to configure VM/production environment
configure_vm() {
    echo -e "${BLUE}🔧 Configuring for VM/production deployment...${NC}"
    
    # VM-specific configurations
    export POSTGRES_HOST="${POSTGRES_HOST:-hailmary-postgres}"
    export POSTGRES_PORT="${POSTGRES_PORT:-5432}"
    export POSTGRES_DB="${POSTGRES_DB:-app}"
    export POSTGRES_USER="${POSTGRES_USER:-app}"
    export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-app}"
    export ELASTICSEARCH_HOST="${ELASTICSEARCH_HOST:-elasticsearch}"
    export ELASTICSEARCH_PORT="${ELASTICSEARCH_PORT:-9200}"
    export LOGSTASH_HTTP_PORT="${LOGSTASH_HTTP_PORT:-9600}"
    
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
    echo -e "${YELLOW}⚠️ .env file not found, using defaults${NC}"
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
    
    echo -e "${BLUE}🔍 Checking Elasticsearch service...${NC}"
    if ! docker ps | grep -q "hailmary-elasticsearch"; then
        echo -e "${YELLOW}⚠️ Elasticsearch service is not running${NC}"
        echo -e "${BLUE}💡 Start CDC service first:${NC}"
        if [[ "$DEPLOYMENT_MODE" == "vm" ]]; then
            echo -e "   cd ../cdc && ./scripts/start.sh vm"
        else
            echo -e "   cd ../cdc && ./scripts/start.sh local"
        fi
        exit 1
    fi
    
    echo -e "${GREEN}✅ All dependencies are running${NC}"
}

# Function to create directories
create_directories() {
    echo -e "${BLUE}📁 Creating necessary directories...${NC}"
    
    mkdir -p ./data/logs
    mkdir -p ./data/schema
    mkdir -p ./data/checkpoints
    
    echo -e "${GREEN}✅ Directories created${NC}"
}

# Function to download PostgreSQL JDBC driver
download_jdbc_driver() {
    echo -e "${BLUE}📥 Downloading PostgreSQL JDBC driver...${NC}"
    
    if [ ! -f "postgresql-42.7.1.jar" ]; then
        curl -L -o postgresql-42.7.1.jar \
            "https://jdbc.postgresql.org/download/postgresql-42.7.1.jar"
        echo -e "${GREEN}✅ JDBC driver downloaded${NC}"
    else
        echo -e "${GREEN}✅ JDBC driver already exists${NC}"
    fi
}

# Function to start the service
start_service() {
    echo -e "${BLUE}🚀 Starting Logstash service...${NC}"
    
    # Build the Docker image
    echo -e "${BLUE}🔨 Building Docker image...${NC}"
    docker-compose build
    
    # Start the service
    echo -e "${BLUE}🚀 Starting Logstash container...${NC}"
    docker-compose up -d
    
    # Wait for service to be healthy
    echo -e "${BLUE}⏳ Waiting for Logstash to be healthy...${NC}"
    local max_attempts=60
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f "http://localhost:${LOGSTASH_HTTP_PORT:-9600}/_node/stats" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Logstash is healthy and ready!${NC}"
            break
        fi
        
        echo -e "${YELLOW}⏳ Waiting for Logstash... ($attempt/$max_attempts)${NC}"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        echo -e "${RED}❌ Logstash failed to start within expected time${NC}"
        echo -e "${BLUE}📋 Checking logs...${NC}"
        docker-compose logs --tail=20
        exit 1
    fi
}

# Function to show service information
show_service_info() {
    echo ""
    echo -e "${GREEN}🎉 Logstash Service started successfully!${NC}"
    echo ""
    echo -e "${BLUE}📋 Service Information:${NC}"
    echo -e "   • HTTP Port: ${LOGSTASH_HTTP_PORT:-9600}"
    echo -e "   • Pipeline Port: ${LOGSTASH_PORT:-5044}"
    echo -e "   • Host: localhost"
    echo -e "   • Deployment Mode: $DEPLOYMENT_MODE"
    echo -e "   • Health URL: http://localhost:${LOGSTASH_HTTP_PORT:-9600}/_node/stats"
    echo -e "   • Logs: ./data/logs"
    echo -e "   • PostgreSQL: $POSTGRES_HOST:$POSTGRES_PORT"
    echo -e "   • Elasticsearch: $ELASTICSEARCH_HOST:$ELASTICSEARCH_PORT"
    echo ""
    echo -e "${BLUE}🔧 Management Commands:${NC}"
    echo -e "   • View logs: ./scripts/logs.sh $DEPLOYMENT_MODE"
    echo -e "   • Health check: ./scripts/health-check.sh $DEPLOYMENT_MODE"
    echo -e "   • Manual sync: ./scripts/sync.sh $DEPLOYMENT_MODE"
    echo -e "   • Stop service: ./scripts/stop.sh $DEPLOYMENT_MODE"
    echo -e "   • Restart service: ./scripts/restart.sh $DEPLOYMENT_MODE"
    echo ""
    echo -e "${BLUE}📊 Quick Health Check:${NC}"
    curl -s "http://localhost:${LOGSTASH_HTTP_PORT:-9600}/_node/stats" | jq '.pipelines' 2>/dev/null || echo "Health check endpoint not ready yet"
}

# Main execution
main() {
    echo -e "${BLUE}🚀 Starting HailMary Logstash Service${NC}"
    echo "============================================="
    
    check_dependencies
    create_directories
    download_jdbc_driver
    start_service
    show_service_info
    
    echo ""
    echo -e "${GREEN}✅ Logstash Service started successfully!${NC}"
}

# Run main function
main "$@"

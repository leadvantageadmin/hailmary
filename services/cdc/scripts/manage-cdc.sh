#!/bin/bash

# CDC Management Script
# Simple script to manage PGSync operations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PGSYNC_URL="http://localhost:8081"
OPENSEARCH_URL="http://localhost:9201"

# Function to show usage
show_usage() {
    echo -e "${BLUE}CDC Management Script${NC}"
    echo "====================="
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  build       - Build CDC (pull schema + generate config)"
    echo "  start       - Start CDC service"
    echo "  stop        - Stop CDC service"
    echo "  restart     - Restart CDC service"
    echo "  status      - Check CDC service status"
    echo "  health      - Check health of all components"
    echo "  sync        - Trigger manual sync"
    echo "  indices     - List OpenSearch indices"
    echo "  logs        - Show CDC service logs"
    echo "  setup       - Setup CDC (run once)"
    echo ""
}

# Function to start CDC service
start_cdc() {
    echo -e "${BLUE}🚀 Starting CDC service...${NC}"
    docker-compose up -d
    echo -e "${GREEN}✅ CDC service started${NC}"
}

# Function to stop CDC service
stop_cdc() {
    echo -e "${BLUE}🛑 Stopping CDC service...${NC}"
    docker-compose down
    echo -e "${GREEN}✅ CDC service stopped${NC}"
}

# Function to restart CDC service
restart_cdc() {
    echo -e "${BLUE}🔄 Restarting CDC service...${NC}"
    docker-compose restart
    echo -e "${GREEN}✅ CDC service restarted${NC}"
}

# Function to check status
check_status() {
    echo -e "${BLUE}📊 CDC Service Status${NC}"
    echo "====================="
    
    # Check if containers are running
    if docker-compose ps | grep -q "Up"; then
        echo -e "${GREEN}✅ CDC containers are running${NC}"
    else
        echo -e "${RED}❌ CDC containers are not running${NC}"
    fi
    
    # Check PGSync health
    if curl -s "$PGSYNC_URL/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PGSync is healthy${NC}"
    else
        echo -e "${RED}❌ PGSync is not responding${NC}"
    fi
    
    # Check OpenSearch
    if curl -s "$OPENSEARCH_URL/_cluster/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OpenSearch is healthy${NC}"
    else
        echo -e "${RED}❌ OpenSearch is not responding${NC}"
    fi
}

# Function to check health
check_health() {
    echo -e "${BLUE}🏥 Health Check${NC}"
    echo "=============="
    
    # PGSync health
    echo -e "${BLUE}PGSync Health:${NC}"
    curl -s "$PGSYNC_URL/health" | jq '.' 2>/dev/null || echo "Failed to get PGSync health"
    
    echo ""
    
    # OpenSearch health
    echo -e "${BLUE}OpenSearch Health:${NC}"
    curl -s "$OPENSEARCH_URL/_cluster/health" | jq '.' 2>/dev/null || echo "Failed to get OpenSearch health"
}

# Function to trigger manual sync
trigger_sync() {
    echo -e "${BLUE}🔄 Triggering manual sync...${NC}"
    
    # PGSync doesn't have a direct sync endpoint, but we can restart it
    # or check if there's a way to trigger sync
    echo -e "${YELLOW}Note: PGSync automatically syncs changes.${NC}"
    echo -e "${YELLOW}To force a full sync, restart the service: $0 restart${NC}"
}

# Function to list indices
list_indices() {
    echo -e "${BLUE}📋 OpenSearch Indices${NC}"
    echo "===================="
    curl -s "$OPENSEARCH_URL/_cat/indices?v" || echo "Failed to list indices"
}

# Function to show logs
show_logs() {
    echo -e "${BLUE}📝 CDC Service Logs${NC}"
    echo "=================="
    docker-compose logs -f --tail=100
}

# Function to build CDC
build_cdc() {
    echo -e "${BLUE}🏗️ Building CDC service...${NC}"
    
    # Run the build script
    if [ -f "./scripts/build-cdc.sh" ]; then
        chmod +x ./scripts/build-cdc.sh
        ./scripts/build-cdc.sh
    else
        echo -e "${RED}❌ Build script not found${NC}"
        exit 1
    fi
}

# Function to setup CDC
setup_cdc() {
    echo -e "${BLUE}🔧 Setting up CDC...${NC}"
    
    # Run the setup script
    if [ -f "./scripts/setup-cdc.sh" ]; then
        chmod +x ./scripts/setup-cdc.sh
        ./scripts/setup-cdc.sh
    else
        echo -e "${RED}❌ Setup script not found${NC}"
        exit 1
    fi
}

# Main execution
case "${1:-}" in
    build)
        build_cdc
        ;;
    start)
        start_cdc
        ;;
    stop)
        stop_cdc
        ;;
    restart)
        restart_cdc
        ;;
    status)
        check_status
        ;;
    health)
        check_health
        ;;
    sync)
        trigger_sync
        ;;
    indices)
        list_indices
        ;;
    logs)
        show_logs
        ;;
    setup)
        setup_cdc
        ;;
    *)
        show_usage
        exit 1
        ;;
esac

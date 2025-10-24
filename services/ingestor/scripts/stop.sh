#!/bin/bash

# Ingestor Service Stop Script
# Stops the HailMary Ingestor service
# Usage: ./stop.sh [local|vm]
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
    echo "   Usage: ./stop.sh [local|vm]"
    exit 1
fi

echo -e "${BLUE}🛑 Stopping HailMary Ingestor Service ($DEPLOYMENT_MODE mode)${NC}"

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

# Function to stop the service
stop_service() {
    echo -e "${BLUE}🛑 Stopping Ingestor service...${NC}"
    
    # Stop the containers
    echo -e "${BLUE}🛑 Stopping Ingestor containers...${NC}"
    docker-compose down
    
    echo -e "${GREEN}✅ Ingestor Service stopped successfully!${NC}"
}

# Function to show service status
show_status() {
    echo -e "${BLUE}📋 Service Status:${NC}"
    docker-compose ps
}

# Function to show data preservation info
show_data_info() {
    echo ""
    echo -e "${BLUE}💾 Data is preserved in:${NC}"
    echo -e "   • CSV data: ./data/csv"
    echo -e "   • Logs: ./data/logs"
    echo -e "   • Schema: ./data/schema"
    echo ""
    echo -e "${BLUE}🚀 To start the service again:${NC}"
    echo -e "   ./scripts/start.sh $DEPLOYMENT_MODE"
    echo ""
    echo -e "${BLUE}🔧 Management Commands:${NC}"
    echo -e "   • Health check: ./scripts/health-check.sh $DEPLOYMENT_MODE"
    echo -e "   • View logs: ./scripts/logs.sh $DEPLOYMENT_MODE"
    echo -e "   • Restart service: ./scripts/restart.sh $DEPLOYMENT_MODE"
}

# Main execution
main() {
    echo -e "${BLUE}🛑 Stopping HailMary Ingestor Service${NC}"
    echo "======================================="
    
    stop_service
    show_status
    show_data_info
}

# Run main function
main "$@"

#!/bin/bash

# Ingestor Service Restart Script
# Restarts the HailMary Ingestor service
# Usage: ./restart.sh [local|vm]
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
    echo "   Usage: ./restart.sh [local|vm]"
    exit 1
fi

echo -e "${BLUE}🔄 Restarting HailMary Ingestor Service ($DEPLOYMENT_MODE mode)${NC}"

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

# Function to restart the service
restart_service() {
    echo -e "${BLUE}🔄 Restarting Ingestor service...${NC}"
    
    # Stop the service
    echo -e "${BLUE}🛑 Stopping Ingestor service...${NC}"
    ./scripts/stop.sh "$DEPLOYMENT_MODE"
    
    # Wait a moment
    echo -e "${BLUE}⏳ Waiting 5 seconds before restart...${NC}"
    sleep 5
    
    # Start the service
    echo -e "${BLUE}🚀 Starting Ingestor service...${NC}"
    ./scripts/start.sh "$DEPLOYMENT_MODE"
}

# Main execution
main() {
    echo -e "${BLUE}🔄 Restarting HailMary Ingestor Service${NC}"
    echo "========================================="
    
    restart_service
    
    echo ""
    echo -e "${GREEN}✅ Ingestor Service restarted successfully!${NC}"
}

# Run main function
main "$@"

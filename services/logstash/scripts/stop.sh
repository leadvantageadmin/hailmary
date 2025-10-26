#!/bin/bash

# Logstash Service Stop Script
# Stops the HailMary Logstash service
# Usage: ./stop.sh [local|vm]

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

echo -e "${BLUE}🛑 Stopping HailMary Logstash Service ($DEPLOYMENT_MODE mode)...${NC}"

# Function to stop the service
stop_service() {
    echo -e "${BLUE}🛑 Stopping Logstash service...${NC}"
    
    # Stop the containers
    docker-compose down
    
    echo -e "${GREEN}✅ Logstash service stopped${NC}"
}

# Function to show service status
show_status() {
    echo -e "${BLUE}📊 Service Status:${NC}"
    
    if docker-compose ps | grep -q "Up"; then
        echo -e "${YELLOW}⚠️ Some containers are still running${NC}"
        docker-compose ps
    else
        echo -e "${GREEN}✅ All containers stopped${NC}"
    fi
}

# Function to show cleanup information
show_cleanup_info() {
    echo ""
    echo -e "${BLUE}🧹 Cleanup Information:${NC}"
    echo -e "   • Data preserved in: ./data/"
    echo -e "   • Logs preserved in: ./data/logs/"
    echo -e "   • Checkpoints preserved in: ./data/checkpoints/"
    echo -e "   • To remove all data: docker-compose down -v"
    echo ""
    echo -e "${BLUE}🔧 Management Commands:${NC}"
    echo -e "   • Start service: ./scripts/start.sh $DEPLOYMENT_MODE"
    echo -e "   • View logs: ./scripts/logs.sh $DEPLOYMENT_MODE"
    echo -e "   • Health check: ./scripts/health-check.sh $DEPLOYMENT_MODE"
}

# Main execution
main() {
    echo -e "${BLUE}🛑 Stopping HailMary Logstash Service${NC}"
    echo "============================================="
    
    stop_service
    show_status
    show_cleanup_info
    
    echo ""
    echo -e "${GREEN}✅ Logstash Service stopped successfully!${NC}"
}

# Run main function
main "$@"

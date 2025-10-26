#!/bin/bash

# Logstash Service Restart Script
# Restarts the HailMary Logstash service
# Usage: ./restart.sh [local|vm]

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

echo -e "${BLUE}🔄 Restarting HailMary Logstash Service ($DEPLOYMENT_MODE mode)...${NC}"

# Function to restart the service
restart_service() {
    echo -e "${BLUE}🛑 Stopping Logstash service...${NC}"
    docker-compose down
    
    echo -e "${BLUE}⏳ Waiting 5 seconds...${NC}"
    sleep 5
    
    echo -e "${BLUE}🚀 Starting Logstash service...${NC}"
    docker-compose up -d
    
    echo -e "${BLUE}⏳ Waiting for service to be healthy...${NC}"
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
    echo -e "${GREEN}🎉 Logstash Service restarted successfully!${NC}"
    echo ""
    echo -e "${BLUE}📋 Service Information:${NC}"
    echo -e "   • HTTP Port: ${LOGSTASH_HTTP_PORT:-9600}"
    echo -e "   • Pipeline Port: ${LOGSTASH_PORT:-5044}"
    echo -e "   • Health URL: http://localhost:${LOGSTASH_HTTP_PORT:-9600}/_node/stats"
    echo -e "   • Deployment Mode: $DEPLOYMENT_MODE"
    echo ""
    echo -e "${BLUE}🔧 Management Commands:${NC}"
    echo -e "   • View logs: ./scripts/logs.sh $DEPLOYMENT_MODE"
    echo -e "   • Health check: ./scripts/health-check.sh $DEPLOYMENT_MODE"
    echo -e "   • Manual sync: ./scripts/sync.sh $DEPLOYMENT_MODE"
    echo -e "   • Stop service: ./scripts/stop.sh $DEPLOYMENT_MODE"
}

# Main execution
main() {
    echo -e "${BLUE}🔄 Restarting HailMary Logstash Service${NC}"
    echo "==============================================="
    
    restart_service
    show_service_info
    
    echo ""
    echo -e "${GREEN}✅ Logstash Service restarted successfully!${NC}"
}

# Run main function
main "$@"

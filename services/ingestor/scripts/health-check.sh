#!/bin/bash

# Ingestor Service Health Check Script
# Comprehensive health check for the Ingestor service
# Usage: ./health-check.sh [local|vm]
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
    echo "   Usage: ./health-check.sh [local|vm]"
    exit 1
fi

echo -e "${BLUE}🔍 HailMary Ingestor Service Health Check ($DEPLOYMENT_MODE mode)${NC}"

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

# Configuration
INGESTOR_URL="http://localhost:${INGESTOR_PORT:-8080}"

# Function to check container status
check_container() {
    echo -e "${BLUE}📦 Checking Ingestor Container...${NC}"
    
    if docker ps | grep -q "hailmary-ingestor"; then
        echo -e "${GREEN}✅ Ingestor container is running${NC}"
        return 0
    else
        echo -e "${RED}❌ Ingestor container is not running${NC}"
        return 1
    fi
}

# Function to check service connectivity
check_connectivity() {
    echo -e "${BLUE}🔌 Checking Ingestor Connectivity...${NC}"
    
    if curl -s "$INGESTOR_URL/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Ingestor is accepting connections${NC}"
        return 0
    else
        echo -e "${RED}❌ Ingestor is not accepting connections${NC}"
        return 1
    fi
}

# Function to check service health
check_health() {
    echo -e "${BLUE}🏥 Checking Service Health...${NC}"
    
    local health_response=$(curl -s "$INGESTOR_URL/health" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$health_response" ]; then
        echo -e "${GREEN}✅ Health endpoint is responding${NC}"
        
        # Parse health status
        local status=$(echo "$health_response" | jq -r '.status // "unknown"' 2>/dev/null)
        
        if [ "$status" = "healthy" ]; then
            echo -e "${GREEN}✅ Service health is good${NC}"
        elif [ "$status" = "degraded" ]; then
            echo -e "${YELLOW}⚠️ Service health is degraded${NC}"
        else
            echo -e "${RED}❌ Service health is poor${NC}"
        fi
        
        # Show component health
        echo -e "${BLUE}📊 Component Health:${NC}"
        echo "$health_response" | jq -r '.components | to_entries[] | "\(.key): \(.value.status)"' 2>/dev/null || echo "Could not parse component health"
        
        return 0
    else
        echo -e "${RED}❌ Health endpoint is not responding${NC}"
        return 1
    fi
}

# Function to check dependencies
check_dependencies() {
    echo -e "${BLUE}🔍 Checking Dependencies...${NC}"
    
    # Check PostgreSQL
    if docker ps | grep -q "hailmary-postgres"; then
        echo -e "${GREEN}✅ PostgreSQL service is running${NC}"
    else
        echo -e "${RED}❌ PostgreSQL service is not running${NC}"
    fi
    
    # Check OpenSearch
    if docker ps | grep -q "hailmary-opensearch"; then
        echo -e "${GREEN}✅ OpenSearch service is running${NC}"
    else
        echo -e "${RED}❌ OpenSearch service is not running${NC}"
    fi
}

# Function to check data directories
check_data_directories() {
    echo -e "${BLUE}📁 Checking Data Directories...${NC}"
    
    local directories=("./data/csv" "./data/logs" "./data/schema")
    
    for dir in "${directories[@]}"; do
        if [ -d "$dir" ]; then
            echo -e "${GREEN}✅ Directory exists: $dir${NC}"
        else
            echo -e "${YELLOW}⚠️ Directory missing: $dir${NC}"
        fi
    done
}

# Function to check logs
check_logs() {
    echo -e "${BLUE}📋 Checking Recent Logs...${NC}"
    
    if [ -f "./data/logs/ingestor.log" ]; then
        echo -e "${GREEN}✅ Log file exists${NC}"
        
        # Show last few lines
        echo -e "${BLUE}📄 Last 5 log entries:${NC}"
        tail -5 "./data/logs/ingestor.log" | sed 's/^/   /'
    else
        echo -e "${YELLOW}⚠️ Log file not found${NC}"
    fi
}

# Function to check CSV files
check_csv_files() {
    echo -e "${BLUE}📊 Checking CSV Files...${NC}"
    
    if [ -d "./data/csv" ]; then
        local csv_count=$(find ./data/csv -name "*.csv" -o -name "*.tsv" -o -name "*.txt" | wc -l)
        echo -e "${GREEN}✅ Found $csv_count CSV files in data directory${NC}"
        
        if [ $csv_count -gt 0 ]; then
            echo -e "${BLUE}📄 CSV files:${NC}"
            find ./data/csv -name "*.csv" -o -name "*.tsv" -o -name "*.txt" | head -5 | sed 's/^/   /'
        fi
    else
        echo -e "${YELLOW}⚠️ CSV data directory not found${NC}"
    fi
}

# Function to show overall status
show_overall_status() {
    echo -e "${BLUE}📊 Overall Health Status:${NC}"
    
    local container_ok=$1
    local connectivity_ok=$2
    local health_ok=$3
    
    if [ $container_ok -eq 0 ] && [ $connectivity_ok -eq 0 ] && [ $health_ok -eq 0 ]; then
        echo -e "${GREEN}✅ Ingestor service is fully operational${NC}"
    elif [ $container_ok -eq 0 ] && [ $connectivity_ok -eq 0 ]; then
        echo -e "${YELLOW}⚠️ Ingestor service is running but has health issues${NC}"
    elif [ $container_ok -eq 0 ]; then
        echo -e "${YELLOW}⚠️ Ingestor service is running but not responding${NC}"
    else
        echo -e "${RED}❌ Ingestor service is not running${NC}"
    fi
}

# Function to show troubleshooting commands
show_troubleshooting() {
    echo ""
    echo -e "${BLUE}🔧 Troubleshooting Commands:${NC}"
    echo -e "   • View logs: ./scripts/logs.sh"
    echo -e "   • Restart service: ./scripts/restart.sh"
    echo -e "   • Check container status: docker compose ps"
    echo -e "   • Test health endpoint: curl '$INGESTOR_URL/health'"
    echo -e "   • Test ingestion: curl -X POST '$INGESTOR_URL/ingest' -H 'Content-Type: application/json' -d '{\"file_path\": \"./data/csv/test.csv\"}'"
}

# Main execution
main() {
    echo -e "${BLUE}🔍 HailMary Ingestor Service Health Check${NC}"
    echo "Starting comprehensive health check..."
    echo ""
    
    # Run health checks
    check_container
    local container_status=$?
    
    check_connectivity
    local connectivity_status=$?
    
    check_health
    local health_status=$?
    
    check_dependencies
    check_data_directories
    check_logs
    check_csv_files
    
    echo ""
    show_overall_status $container_status $connectivity_status $health_status
    show_troubleshooting
}

# Run main function
main "$@"

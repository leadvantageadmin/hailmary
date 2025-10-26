#!/bin/bash

# Logstash Service Manual Sync Script
# Triggers manual data synchronization
# Usage: ./sync.sh [local|vm] [options]

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
    echo "   Usage: ./sync.sh [local|vm] [options]"
    exit 1
fi

# Parse options
FULL_SYNC=false
TABLE_SYNC=""
MATERIALIZED_SYNC=false
FORCE_SYNC=false

# Shift to get options
shift

while [[ $# -gt 0 ]]; do
    case $1 in
        --full)
            FULL_SYNC=true
            shift
            ;;
        --table)
            TABLE_SYNC="$2"
            shift 2
            ;;
        --materialized-view)
            MATERIALIZED_SYNC=true
            shift
            ;;
        --force)
            FORCE_SYNC=true
            shift
            ;;
        -h|--help)
            echo "Usage: ./sync.sh [local|vm] [options]"
            echo ""
            echo "Options:"
            echo "  --full                    Trigger full sync of all data sources"
            echo "  --table TABLE_NAME        Sync specific table (company|prospect)"
            echo "  --materialized-view       Sync materialized view only"
            echo "  --force                   Force sync even if no changes detected"
            echo "  -h, --help                Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./sync.sh local --full                    # Full sync all data"
            echo "  ./sync.sh local --table company           # Sync company table only"
            echo "  ./sync.sh local --materialized-view       # Sync materialized view only"
            echo "  ./sync.sh local --force                   # Force sync regardless of changes"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}🔄 HailMary Logstash Service Manual Sync ($DEPLOYMENT_MODE mode)${NC}"
echo "=================================================================="

# Function to check service status
check_service_status() {
    echo -e "${BLUE}🔍 Checking service status...${NC}"
    
    if ! docker-compose ps | grep -q "Up"; then
        echo -e "${RED}❌ Logstash service is not running${NC}"
        echo -e "${BLUE}💡 Start the service first: ./scripts/start.sh $DEPLOYMENT_MODE${NC}"
        exit 1
    fi
    
    local http_port=${LOGSTASH_HTTP_PORT:-9600}
    if ! curl -f "http://localhost:$http_port/_node/stats" > /dev/null 2>&1; then
        echo -e "${RED}❌ Logstash HTTP API is not responding${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Service is running and healthy${NC}"
}

# Function to trigger full sync
trigger_full_sync() {
    echo -e "${BLUE}🔄 Triggering full sync...${NC}"
    
    # Restart Logstash to trigger full sync
    echo -e "${BLUE}🔄 Restarting Logstash to trigger full sync...${NC}"
    docker-compose restart logstash
    
    # Wait for service to be ready
    echo -e "${BLUE}⏳ Waiting for service to be ready...${NC}"
    local max_attempts=60
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f "http://localhost:${LOGSTASH_HTTP_PORT:-9600}/_node/stats" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Service is ready${NC}"
            break
        fi
        
        echo -e "${YELLOW}⏳ Waiting for service... ($attempt/$max_attempts)${NC}"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        echo -e "${RED}❌ Service failed to start within expected time${NC}"
        exit 1
    fi
}

# Function to trigger table sync
trigger_table_sync() {
    local table_name="$1"
    
    echo -e "${BLUE}🔄 Triggering sync for table: $table_name${NC}"
    
    # Clear checkpoint for specific table
    local checkpoint_file="./data/checkpoints/${table_name}_last_run"
    if [ -f "$checkpoint_file" ]; then
        echo -e "${BLUE}🗑️ Clearing checkpoint for $table_name...${NC}"
        rm -f "$checkpoint_file"
    fi
    
    # Restart Logstash to trigger sync
    echo -e "${BLUE}🔄 Restarting Logstash to trigger $table_name sync...${NC}"
    docker-compose restart logstash
    
    # Wait for service to be ready
    echo -e "${BLUE}⏳ Waiting for service to be ready...${NC}"
    local max_attempts=60
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f "http://localhost:${LOGSTASH_HTTP_PORT:-9600}/_node/stats" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Service is ready${NC}"
            break
        fi
        
        echo -e "${YELLOW}⏳ Waiting for service... ($attempt/$max_attempts)${NC}"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        echo -e "${RED}❌ Service failed to start within expected time${NC}"
        exit 1
    fi
}

# Function to trigger materialized view sync
trigger_materialized_sync() {
    echo -e "${BLUE}🔄 Triggering materialized view sync...${NC}"
    
    # Clear materialized view checkpoint
    local checkpoint_file="./data/checkpoints/materialized_last_run"
    if [ -f "$checkpoint_file" ]; then
        echo -e "${BLUE}🗑️ Clearing materialized view checkpoint...${NC}"
        rm -f "$checkpoint_file"
    fi
    
    # Refresh materialized view in PostgreSQL
    echo -e "${BLUE}🔄 Refreshing materialized view in PostgreSQL...${NC}"
    docker-compose exec -T postgres psql -U app -d app -c "REFRESH MATERIALIZED VIEW CONCURRENTLY company_prospect_view;" || {
        echo -e "${YELLOW}⚠️ Failed to refresh materialized view, continuing with sync...${NC}"
    }
    
    # Restart Logstash to trigger sync
    echo -e "${BLUE}🔄 Restarting Logstash to trigger materialized view sync...${NC}"
    docker-compose restart logstash
    
    # Wait for service to be ready
    echo -e "${BLUE}⏳ Waiting for service to be ready...${NC}"
    local max_attempts=60
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f "http://localhost:${LOGSTASH_HTTP_PORT:-9600}/_node/stats" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Service is ready${NC}"
            break
        fi
        
        echo -e "${YELLOW}⏳ Waiting for service... ($attempt/$max_attempts)${NC}"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        echo -e "${RED}❌ Service failed to start within expected time${NC}"
        exit 1
    fi
}

# Function to show sync status
show_sync_status() {
    echo -e "${BLUE}📊 Sync Status:${NC}"
    
    local http_port=${LOGSTASH_HTTP_PORT:-9600}
    
    # Get pipeline stats
    echo -e "${BLUE}Pipeline Statistics:${NC}"
    curl -s "http://localhost:$http_port/_node/stats" | jq '.pipelines' 2>/dev/null || echo "   Unable to get pipeline stats"
    
    # Check checkpoint files
    echo -e "${BLUE}Checkpoint Files:${NC}"
    if [ -d "./data/checkpoints" ]; then
        ls -la "./data/checkpoints" | grep -E "\.(json|txt)$" | while read line; do
            echo "   $line"
        done
    else
        echo "   No checkpoint directory found"
    fi
}

# Function to show monitoring commands
show_monitoring() {
    echo ""
    echo -e "${BLUE}🔧 Monitoring Commands:${NC}"
    echo -e "   • View logs: ./scripts/logs.sh $DEPLOYMENT_MODE -f"
    echo -e "   • Health check: ./scripts/health-check.sh $DEPLOYMENT_MODE"
    echo -e "   • Check Elasticsearch: curl http://localhost:9200/_cat/indices?v"
    echo -e "   • Check Logstash API: curl http://localhost:${LOGSTASH_HTTP_PORT:-9600}/_node/stats"
}

# Main execution
main() {
    check_service_status
    echo ""
    
    if [ "$FULL_SYNC" = true ]; then
        trigger_full_sync
    elif [ -n "$TABLE_SYNC" ]; then
        if [[ "$TABLE_SYNC" != "company" && "$TABLE_SYNC" != "prospect" ]]; then
            echo -e "${RED}❌ Invalid table name: $TABLE_SYNC${NC}"
            echo -e "${BLUE}Valid table names: company, prospect${NC}"
            exit 1
        fi
        trigger_table_sync "$TABLE_SYNC"
    elif [ "$MATERIALIZED_SYNC" = true ]; then
        trigger_materialized_sync
    else
        echo -e "${YELLOW}⚠️ No sync option specified${NC}"
        echo -e "${BLUE}Use --help for available options${NC}"
        exit 1
    fi
    
    echo ""
    show_sync_status
    show_monitoring
    
    echo ""
    echo -e "${GREEN}🎉 Sync triggered successfully!${NC}"
}

# Run main function
main "$@"

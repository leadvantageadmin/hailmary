#!/bin/bash

# Logstash Service Health Check Script
# Comprehensive health monitoring for the Logstash service
# Usage: ./health-check.sh [local|vm]

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

echo -e "${BLUE}🏥 HailMary Logstash Service Health Check ($DEPLOYMENT_MODE mode)${NC}"
echo "=================================================================="

# Function to check container status
check_container_status() {
    echo -e "${BLUE}📦 Container Status:${NC}"
    
    if docker-compose ps | grep -q "Up"; then
        echo -e "${GREEN}✅ Logstash containers are running${NC}"
        docker-compose ps
    else
        echo -e "${RED}❌ Logstash containers are not running${NC}"
        return 1
    fi
}

# Function to check Logstash HTTP API
check_logstash_api() {
    echo -e "${BLUE}🌐 Logstash HTTP API:${NC}"
    
    local http_port=${LOGSTASH_HTTP_PORT:-9600}
    
    if curl -f "http://localhost:$http_port/_node/stats" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Logstash HTTP API is responding${NC}"
        
        # Get pipeline stats
        echo -e "${BLUE}📊 Pipeline Statistics:${NC}"
        curl -s "http://localhost:$http_port/_node/stats" | jq '.pipelines' 2>/dev/null || echo "   Unable to parse pipeline stats"
    else
        echo -e "${RED}❌ Logstash HTTP API is not responding${NC}"
        return 1
    fi
}

# Function to check pipeline status
check_pipeline_status() {
    echo -e "${BLUE}🔄 Pipeline Status:${NC}"
    
    local http_port=${LOGSTASH_HTTP_PORT:-9600}
    
    # Check if pipelines are running
    local pipeline_stats=$(curl -s "http://localhost:$http_port/_node/stats" | jq '.pipelines' 2>/dev/null)
    
    if [ "$pipeline_stats" != "null" ] && [ "$pipeline_stats" != "{}" ]; then
        echo -e "${GREEN}✅ Pipelines are active${NC}"
        
        # Show pipeline details
        echo -e "${BLUE}📋 Active Pipelines:${NC}"
        echo "$pipeline_stats" | jq 'keys[]' 2>/dev/null | while read pipeline; do
            echo "   • $pipeline"
        done
    else
        echo -e "${YELLOW}⚠️ No active pipelines found${NC}"
    fi
}

# Function to check dependencies
check_dependencies() {
    echo -e "${BLUE}🔗 Dependencies:${NC}"
    
    # Check PostgreSQL
    if docker ps | grep -q "hailmary-postgres"; then
        echo -e "${GREEN}✅ PostgreSQL is running${NC}"
    else
        echo -e "${RED}❌ PostgreSQL is not running${NC}"
    fi
    
    # Check Elasticsearch
    if docker ps | grep -q "hailmary-elasticsearch"; then
        echo -e "${GREEN}✅ Elasticsearch is running${NC}"
        
        # Check Elasticsearch health
        if curl -f "http://localhost:9200/_cluster/health" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Elasticsearch cluster is healthy${NC}"
        else
            echo -e "${YELLOW}⚠️ Elasticsearch cluster health check failed${NC}"
        fi
    else
        echo -e "${RED}❌ Elasticsearch is not running${NC}"
    fi
}

# Function to check data directories
check_data_directories() {
    echo -e "${BLUE}📁 Data Directories:${NC}"
    
    local dirs=("./data/logs" "./data/schema" "./data/checkpoints")
    
    for dir in "${dirs[@]}"; do
        if [ -d "$dir" ]; then
            echo -e "${GREEN}✅ $dir exists${NC}"
        else
            echo -e "${YELLOW}⚠️ $dir does not exist${NC}"
        fi
    done
}

# Function to check logs
check_logs() {
    echo -e "${BLUE}📋 Recent Logs:${NC}"
    
    if [ -f "./data/logs/logstash.log" ]; then
        echo -e "${BLUE}Last 5 log entries:${NC}"
        tail -5 "./data/logs/logstash.log" | sed 's/^/   /'
    else
        echo -e "${YELLOW}⚠️ Log file not found${NC}"
    fi
    
    echo -e "${BLUE}Container logs (last 3 lines):${NC}"
    docker-compose logs --tail=3 | sed 's/^/   /'
}

# Function to check sync status
check_sync_status() {
    echo -e "${BLUE}🔄 Sync Status:${NC}"
    
    # Check checkpoint files
    local checkpoint_dir="./data/checkpoints"
    if [ -d "$checkpoint_dir" ]; then
        echo -e "${BLUE}Checkpoint Files:${NC}"
        ls -la "$checkpoint_dir" | grep -E "\.(json|txt)$" | while read line; do
            echo "   $line"
        done
    else
        echo -e "${YELLOW}⚠️ No checkpoint directory found${NC}"
    fi
}

# Function to show troubleshooting commands
show_troubleshooting() {
    echo ""
    echo -e "${BLUE}🔧 Troubleshooting Commands:${NC}"
    echo -e "   • View logs: ./scripts/logs.sh $DEPLOYMENT_MODE"
    echo -e "   • Manual sync: ./scripts/sync.sh $DEPLOYMENT_MODE"
    echo -e "   • Restart service: ./scripts/restart.sh $DEPLOYMENT_MODE"
    echo -e "   • Check Elasticsearch: curl http://localhost:9200/_cluster/health"
    echo -e "   • Check Logstash API: curl http://localhost:${LOGSTASH_HTTP_PORT:-9600}/_node/stats"
}

# Main execution
main() {
    local overall_status=0
    
    check_container_status || overall_status=1
    echo ""
    
    check_logstash_api || overall_status=1
    echo ""
    
    check_pipeline_status
    echo ""
    
    check_dependencies
    echo ""
    
    check_data_directories
    echo ""
    
    check_logs
    echo ""
    
    check_sync_status
    echo ""
    
    show_troubleshooting
    
    if [ $overall_status -eq 0 ]; then
        echo ""
        echo -e "${GREEN}🎉 All health checks passed!${NC}"
    else
        echo ""
        echo -e "${RED}❌ Some health checks failed${NC}"
        exit 1
    fi
}

# Run main function
main "$@"

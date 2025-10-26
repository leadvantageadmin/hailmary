#!/bin/bash

# Baseline Data Capture Script
# Captures current PostgreSQL and Elasticsearch data counts for tracking
# Usage: ./scripts/capture-baseline-data.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 Capturing Baseline Data for Logstash Implementation${NC}"
echo "============================================================="

# Function to check if service is running
check_service() {
    local service_name=$1
    local container_name=$2
    
    if docker ps | grep -q "$container_name"; then
        echo -e "${GREEN}✅ $service_name is running${NC}"
        return 0
    else
        echo -e "${RED}❌ $service_name is not running${NC}"
        return 1
    fi
}

# Function to get PostgreSQL counts
get_postgres_counts() {
    echo -e "${BLUE}📊 PostgreSQL Table Counts:${NC}"
    
    if check_service "PostgreSQL" "hailmary-postgres"; then
        echo "```bash"
        docker exec hailmary-postgres psql -U app -d app -c "
        SELECT 
          'Company' as table_name, COUNT(*) as row_count FROM \"Company\"
        UNION ALL
        SELECT 
          'Prospect' as table_name, COUNT(*) as row_count FROM \"Prospect\"
        UNION ALL
        SELECT 
          'company_prospect_view' as table_name, COUNT(*) as row_count FROM company_prospect_view;
        "
        echo "```"
        
        # Extract counts for easy copying
        echo -e "${YELLOW}📋 Copy these values to the tracker:${NC}"
        local company_count=$(docker exec hailmary-postgres psql -U app -d app -t -c "SELECT COUNT(*) FROM \"Company\";" | tr -d ' ')
        local prospect_count=$(docker exec hailmary-postgres psql -U app -d app -t -c "SELECT COUNT(*) FROM \"Prospect\";" | tr -d ' ')
        local view_count=$(docker exec hailmary-postgres psql -U app -d app -t -c "SELECT COUNT(*) FROM company_prospect_view;" | tr -d ' ')
        
        echo "Company table: $company_count rows"
        echo "Prospect table: $prospect_count rows"
        echo "company_prospect_view: $view_count rows"
    else
        echo -e "${RED}❌ Cannot get PostgreSQL counts - service not running${NC}"
    fi
}

# Function to get Elasticsearch counts
get_elasticsearch_counts() {
    echo -e "${BLUE}📊 Elasticsearch Index Counts:${NC}"
    
    if check_service "Elasticsearch" "hailmary-elasticsearch"; then
        echo "```bash"
        curl -s "http://localhost:9200/_cat/indices?v" | grep -E "(company|prospect)"
        echo ""
        echo "Individual index counts:"
        curl -s "http://localhost:9200/company/_count" | jq '.count'
        curl -s "http://localhost:9200/prospect/_count" | jq '.count'
        curl -s "http://localhost:9200/company_prospect_view/_count" | jq '.count'
        echo "```"
        
        # Extract counts for easy copying
        echo -e "${YELLOW}📋 Copy these values to the tracker:${NC}"
        local company_count=$(curl -s "http://localhost:9200/company/_count" | jq '.count' 2>/dev/null || echo "N/A")
        local prospect_count=$(curl -s "http://localhost:9200/prospect/_count" | jq '.count' 2>/dev/null || echo "N/A")
        local view_count=$(curl -s "http://localhost:9200/company_prospect_view/_count" | jq '.count' 2>/dev/null || echo "N/A")
        
        echo "company index: $company_count documents"
        echo "prospect index: $prospect_count documents"
        echo "company_prospect_view index: $view_count documents"
    else
        echo -e "${RED}❌ Cannot get Elasticsearch counts - service not running${NC}"
    fi
}

# Function to get PGSync status
get_pgsync_status() {
    echo -e "${BLUE}📊 PGSync Service Status:${NC}"
    
    if check_service "PGSync" "hailmary-pgsync"; then
        echo "```bash"
        cd services/cdc
        ./scripts/health-check.sh local
        echo ""
        echo "Recent PGSync logs:"
        docker-compose logs pgsync --tail 5
        echo "```"
        
        # Check if PGSync is healthy
        if cd services/cdc && ./scripts/health-check.sh local > /dev/null 2>&1; then
            echo -e "${GREEN}✅ PGSync is healthy${NC}"
        else
            echo -e "${YELLOW}⚠️ PGSync has issues${NC}"
        fi
    else
        echo -e "${RED}❌ PGSync is not running${NC}"
    fi
}

# Function to get system info
get_system_info() {
    echo -e "${BLUE}📊 System Information:${NC}"
    echo "```bash"
    echo "Date: $(date)"
    echo "Docker Version: $(docker --version)"
    echo "Available Memory: $(free -h | grep 'Mem:' | awk '{print $2}')"
    echo "Available Disk Space: $(df -h / | tail -1 | awk '{print $4}')"
    echo "```"
}

# Function to generate summary
generate_summary() {
    echo ""
    echo -e "${GREEN}📋 Summary for Tracker:${NC}"
    echo "=================================="
    echo "**Timestamp**: $(date)"
    echo ""
    echo "**PostgreSQL Counts**:"
    if docker ps | grep -q "hailmary-postgres"; then
        local company_count=$(docker exec hailmary-postgres psql -U app -d app -t -c "SELECT COUNT(*) FROM \"Company\";" | tr -d ' ')
        local prospect_count=$(docker exec hailmary-postgres psql -U app -d app -t -c "SELECT COUNT(*) FROM \"Prospect\";" | tr -d ' ')
        local view_count=$(docker exec hailmary-postgres psql -U app -d app -t -c "SELECT COUNT(*) FROM company_prospect_view;" | tr -d ' ')
        echo "- Company table: $company_count rows"
        echo "- Prospect table: $prospect_count rows"
        echo "- company_prospect_view: $view_count rows"
    else
        echo "- PostgreSQL not running"
    fi
    echo ""
    echo "**Elasticsearch Counts**:"
    if docker ps | grep -q "hailmary-elasticsearch"; then
        local company_count=$(curl -s "http://localhost:9200/company/_count" | jq '.count' 2>/dev/null || echo "N/A")
        local prospect_count=$(curl -s "http://localhost:9200/prospect/_count" | jq '.count' 2>/dev/null || echo "N/A")
        local view_count=$(curl -s "http://localhost:9200/company_prospect_view/_count" | jq '.count' 2>/dev/null || echo "N/A")
        echo "- company index: $company_count documents"
        echo "- prospect index: $prospect_count documents"
        echo "- company_prospect_view index: $view_count documents"
    else
        echo "- Elasticsearch not running"
    fi
    echo ""
    echo "**Service Status**:"
    echo "- PostgreSQL: $(docker ps | grep -q "hailmary-postgres" && echo "Running" || echo "Not Running")"
    echo "- Elasticsearch: $(docker ps | grep -q "hailmary-elasticsearch" && echo "Running" || echo "Not Running")"
    echo "- PGSync: $(docker ps | grep -q "hailmary-pgsync" && echo "Running" || echo "Not Running")"
    echo "- Logstash: $(docker ps | grep -q "hailmary-logstash" && echo "Running" || echo "Not Running")"
}

# Main execution
main() {
    echo -e "${BLUE}🚀 Starting baseline data capture...${NC}"
    echo ""
    
    get_postgres_counts
    echo ""
    
    get_elasticsearch_counts
    echo ""
    
    get_pgsync_status
    echo ""
    
    get_system_info
    echo ""
    
    generate_summary
    
    echo ""
    echo -e "${GREEN}✅ Baseline data capture completed!${NC}"
    echo -e "${YELLOW}💡 Copy the summary above to your services/logstash/LOGSTASH_IMPLEMENTATION_TRACKER.md${NC}"
}

# Run main function
main "$@"

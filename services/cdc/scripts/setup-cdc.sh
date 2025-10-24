#!/bin/bash

# CDC Service Setup Script
# Essential setup for PGSync to work with PostgreSQL and OpenSearch

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env ]; then
    echo -e "${BLUE}📋 Loading environment variables from .env file...${NC}"
    set -a
    source .env
    set +a
else
    echo -e "${YELLOW}⚠️ .env file not found, using defaults${NC}"
fi

# Configuration
POSTGRES_HOST=${POSTGRES_HOST:-localhost}
POSTGRES_PORT=${POSTGRES_PORT:-5433}
POSTGRES_DB=${POSTGRES_DB:-app}
POSTGRES_USER=${POSTGRES_USER:-app}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-app}

OPENSEARCH_HOST=${OPENSEARCH_HOST:-localhost}
OPENSEARCH_PORT=${OPENSEARCH_PORT:-9201}

REDIS_HOST=${REDIS_HOST:-localhost}
REDIS_PORT=${REDIS_PORT:-6379}

# Function to wait for service
wait_for_service() {
    local service_name=$1
    local host=$2
    local port=$3
    local max_attempts=30
    local attempt=1
    
    echo -e "${BLUE}⏳ Waiting for $service_name to be ready...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if nc -z "$host" "$port" 2>/dev/null; then
            echo -e "${GREEN}✅ $service_name is ready${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}⏳ Waiting for $service_name... ($attempt/$max_attempts)${NC}"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ $service_name is not ready after $max_attempts attempts${NC}"
    return 1
}

# Function to setup PostgreSQL for CDC
setup_postgres_cdc() {
    echo -e "${BLUE}🐘 Setting up PostgreSQL for CDC...${NC}"
    
    # Check if logical replication is enabled
    local wal_level=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SHOW wal_level;" 2>/dev/null | xargs)
    
    if [ "$wal_level" != "logical" ]; then
        echo -e "${YELLOW}⚠️ PostgreSQL wal_level is not set to 'logical'${NC}"
        echo -e "${YELLOW}   Please update postgresql.conf and set: wal_level = logical${NC}"
        echo -e "${YELLOW}   Then restart PostgreSQL${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ PostgreSQL is configured for logical replication${NC}"
    
    # Create replication slot if it doesn't exist
    local slot_exists=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT 1 FROM pg_replication_slots WHERE slot_name = 'hailmary_cdc';" 2>/dev/null | xargs)
    
    if [ -z "$slot_exists" ]; then
        echo -e "${BLUE}📋 Creating replication slot...${NC}"
        psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT pg_create_logical_replication_slot('hailmary_cdc', 'pgoutput');" || {
            echo -e "${YELLOW}⚠️ Failed to create replication slot, continuing...${NC}"
        }
    else
        echo -e "${GREEN}✅ Replication slot already exists${NC}"
    fi
}

# Function to verify OpenSearch connectivity
verify_opensearch() {
    echo -e "${BLUE}🔍 Verifying OpenSearch connectivity...${NC}"
    
    # Test basic connectivity
    if curl -s "http://$OPENSEARCH_HOST:$OPENSEARCH_PORT/_cluster/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OpenSearch is accessible${NC}"
    else
        echo -e "${RED}❌ Cannot connect to OpenSearch${NC}"
        return 1
    fi
    
    # Note: PGSync will create indices automatically based on schema.json
    echo -e "${BLUE}ℹ️ PGSync will create indices automatically from schema.json${NC}"
}

# Function to test CDC setup
test_cdc_setup() {
    echo -e "${BLUE}🧪 Testing CDC setup...${NC}"
    
    # Test PostgreSQL connection
    if psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL connection test passed${NC}"
    else
        echo -e "${RED}❌ PostgreSQL connection test failed${NC}"
        return 1
    fi
    
    # Test OpenSearch connection
    if curl -s "http://$OPENSEARCH_HOST:$OPENSEARCH_PORT/_cluster/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OpenSearch connection test passed${NC}"
    else
        echo -e "${RED}❌ OpenSearch connection test failed${NC}"
        return 1
    fi
    
    # Test Redis connection
    if nc -z "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null; then
        echo -e "${GREEN}✅ Redis connection test passed${NC}"
    else
        echo -e "${RED}❌ Redis connection test failed${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ All CDC setup tests passed${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}🚀 CDC Service Setup${NC}"
    echo "====================="
    
    # Wait for dependencies
    wait_for_service "PostgreSQL" "$POSTGRES_HOST" "$POSTGRES_PORT" || exit 1
    wait_for_service "OpenSearch" "$OPENSEARCH_HOST" "$OPENSEARCH_PORT" || exit 1
    wait_for_service "Redis" "$REDIS_HOST" "$REDIS_PORT" || exit 1
    
    # Setup PostgreSQL for CDC
    setup_postgres_cdc || {
        echo -e "${RED}❌ PostgreSQL CDC setup failed${NC}"
        exit 1
    }
    
    # Verify OpenSearch connectivity
    verify_opensearch
    
    # Test setup
    test_cdc_setup || {
        echo -e "${RED}❌ CDC setup test failed${NC}"
        exit 1
    }
    
    echo ""
    echo -e "${GREEN}🎉 CDC setup complete!${NC}"
    echo ""
    echo -e "${BLUE}🔧 Next steps:${NC}"
    echo -e "  1. Start the CDC service: docker-compose up -d"
    echo -e "  2. Check PGSync health: curl http://localhost:8081/health"
    echo -e "  3. View OpenSearch indices: curl http://localhost:$OPENSEARCH_PORT/_cat/indices?v"
    echo -e "  4. Monitor logs: docker-compose logs -f pgsync"
    echo ""
    echo -e "${BLUE}📋 Service URLs:${NC}"
    echo -e "  • PGSync: http://localhost:8081"
    echo -e "  • OpenSearch: http://localhost:$OPENSEARCH_PORT"
    echo -e "  • Redis: $REDIS_HOST:$REDIS_PORT"
    echo ""
    echo -e "${BLUE}ℹ️ PGSync will automatically:${NC}"
    echo -e "  • Create OpenSearch indices from schema.json"
    echo -e "  • Sync data from PostgreSQL to OpenSearch"
    echo -e "  • Handle schema changes and index updates"
}

# Run main function
main "$@"

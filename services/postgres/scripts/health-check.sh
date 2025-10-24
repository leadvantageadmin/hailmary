#!/bin/bash
set -e

# PostgreSQL Service Health Check Script
# Comprehensive health check for PostgreSQL service
# Usage: ./health-check.sh [local|vm]
#   local: Local development deployment (default)
#   vm: VM/production deployment

# Get deployment mode from argument
DEPLOYMENT_MODE=${1:-local}

# Validate deployment mode
if [[ "$DEPLOYMENT_MODE" != "local" && "$DEPLOYMENT_MODE" != "vm" ]]; then
    echo "❌ Invalid deployment mode. Use 'local' or 'vm'"
    echo "   Usage: ./health-check.sh [local|vm]"
    exit 1
fi

echo "🔍 HailMary PostgreSQL Service Health Check ($DEPLOYMENT_MODE mode)"

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"

# Change to service directory
cd "$SERVICE_DIR"

# Function to configure local development environment
configure_local() {
    echo "🔧 Configuring for local development..."
    
    # Local development configurations
    export POSTGRES_USER=${POSTGRES_USER:-app}
    export POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-app}
    export POSTGRES_DB=${POSTGRES_DB:-app}
    export POSTGRES_PORT=${POSTGRES_PORT:-5432}
    export POSTGRES_DATA_PATH=${POSTGRES_DATA_PATH:-"./data/postgres"}
    
    echo "✅ Local configuration complete"
}

# Function to configure VM/production environment
configure_vm() {
    echo "🔧 Configuring for VM/production deployment..."
    
    # VM-specific configurations
    export POSTGRES_USER=${POSTGRES_USER:-app}
    export POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-app}
    export POSTGRES_DB=${POSTGRES_DB:-app}
    export POSTGRES_PORT=${POSTGRES_PORT:-5433}
    export POSTGRES_DATA_PATH=${POSTGRES_DATA_PATH:-"/opt/hailmary/services/postgres/data/postgres"}
    
    echo "✅ VM configuration complete"
}

# Configure based on deployment mode
if [[ "$DEPLOYMENT_MODE" == "vm" ]]; then
    configure_vm
else
    configure_local
fi

# Load environment variables if .env file exists
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    local status=$1
    local message=$2
    if [ "$status" = "OK" ]; then
        echo -e "${GREEN}✅ $message${NC}"
    elif [ "$status" = "WARNING" ]; then
        echo -e "${YELLOW}⚠️  $message${NC}"
    else
        echo -e "${RED}❌ $message${NC}"
    fi
}

# Function to check if container is running
check_container() {
    echo -e "${BLUE}📦 Checking PostgreSQL Container...${NC}"
    
    if docker compose ps postgres | grep -q "Up"; then
        print_status "OK" "PostgreSQL container is running"
        return 0
    else
        print_status "ERROR" "PostgreSQL container is not running"
        return 1
    fi
}

# Function to check PostgreSQL connectivity
check_connectivity() {
    echo -e "${BLUE}🔌 Checking PostgreSQL Connectivity...${NC}"
    
    if docker compose exec postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
        print_status "OK" "PostgreSQL is accepting connections"
        return 0
    else
        print_status "ERROR" "PostgreSQL is not accepting connections"
        return 1
    fi
}

# Function to check database access
check_database_access() {
    echo -e "${BLUE}🗄️  Checking Database Access...${NC}"
    
    # Test basic query
    if docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" >/dev/null 2>&1; then
        print_status "OK" "Database access is working"
        return 0
    else
        print_status "ERROR" "Database access failed"
        return 1
    fi
}

# Function to check extensions
check_extensions() {
    echo -e "${BLUE}🔧 Checking PostgreSQL Extensions...${NC}"
    
    local extensions=("postgis" "uuid-ossp" "pg_stat_statements" "pg_trgm" "unaccent")
    local all_ok=true
    
    for ext in "${extensions[@]}"; do
        if docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1 FROM pg_extension WHERE extname = '$ext';" | grep -q "1 row"; then
            print_status "OK" "Extension '$ext' is installed"
        else
            print_status "WARNING" "Extension '$ext' is not installed"
            all_ok=false
        fi
    done
    
    if [ "$all_ok" = true ]; then
        return 0
    else
        return 1
    fi
}

# Function to check schema migrations
check_migrations() {
    echo -e "${BLUE}📋 Checking Schema Migrations...${NC}"
    
    if docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT COUNT(*) FROM schema_migrations;" >/dev/null 2>&1; then
        local migration_count=$(docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM schema_migrations;" | tr -d ' \n')
        print_status "OK" "Schema migrations table exists ($migration_count migrations applied)"
        return 0
    else
        print_status "WARNING" "Schema migrations table not found"
        return 1
    fi
}

# Function to check disk space
check_disk_space() {
    echo -e "${BLUE}💾 Checking Disk Space...${NC}"
    
    local disk_usage=$(df -h "$POSTGRES_DATA_PATH" 2>/dev/null | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ -z "$disk_usage" ]; then
        print_status "WARNING" "Could not check disk space for $POSTGRES_DATA_PATH"
        return 1
    elif [ "$disk_usage" -lt 80 ]; then
        print_status "OK" "Disk space is healthy (${disk_usage}% used)"
        return 0
    elif [ "$disk_usage" -lt 90 ]; then
        print_status "WARNING" "Disk space is getting low (${disk_usage}% used)"
        return 1
    else
        print_status "ERROR" "Disk space is critically low (${disk_usage}% used)"
        return 1
    fi
}

# Function to check memory usage
check_memory() {
    echo -e "${BLUE}🧠 Checking Memory Usage...${NC}"
    
    local memory_usage=$(docker stats --no-stream --format "table {{.MemPerc}}" hailmary-postgres 2>/dev/null | tail -1 | sed 's/%//')
    
    if [ -z "$memory_usage" ]; then
        print_status "WARNING" "Could not check memory usage"
        return 1
    elif [ "$memory_usage" -lt 80 ]; then
        print_status "OK" "Memory usage is healthy (${memory_usage}%)"
        return 0
    elif [ "$memory_usage" -lt 90 ]; then
        print_status "WARNING" "Memory usage is high (${memory_usage}%)"
        return 1
    else
        print_status "ERROR" "Memory usage is critically high (${memory_usage}%)"
        return 1
    fi
}

# Function to check network connectivity
check_network() {
    echo -e "${BLUE}🌐 Checking Network Connectivity...${NC}"
    
    if docker compose exec postgres pg_isready -h localhost -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
        print_status "OK" "Network connectivity is working (port $POSTGRES_PORT)"
        return 0
    else
        print_status "ERROR" "Network connectivity failed (port $POSTGRES_PORT)"
        return 1
    fi
}

# Main health check
main() {
    local overall_status=0
    
    echo "Starting comprehensive health check..."
    echo ""
    
    # Run all checks
    check_container || overall_status=1
    echo ""
    
    check_connectivity || overall_status=1
    echo ""
    
    check_database_access || overall_status=1
    echo ""
    
    check_extensions || overall_status=1
    echo ""
    
    check_migrations || overall_status=1
    echo ""
    
    check_disk_space || overall_status=1
    echo ""
    
    check_memory || overall_status=1
    echo ""
    
    check_network || overall_status=1
    echo ""
    
    # Display overall status
    echo -e "${BLUE}📊 Overall Health Status:${NC}"
    if [ $overall_status -eq 0 ]; then
        print_status "OK" "All health checks passed! PostgreSQL service is healthy."
    else
        print_status "ERROR" "Some health checks failed. Please review the issues above."
    fi
    
    echo ""
    echo "🔧 Troubleshooting Commands:"
    echo "   • View logs: ./scripts/logs.sh $DEPLOYMENT_MODE"
    echo "   • Restart service: ./scripts/restart.sh $DEPLOYMENT_MODE"
    echo "   • Check container status: docker compose ps"
    echo "   • Connect to database: docker compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB"
    echo "   • Run migrations: ./scripts/run-migrations.sh $DEPLOYMENT_MODE"
    echo "   • Validate schema: ./scripts/validate-schema.sh $DEPLOYMENT_MODE"
    
    exit $overall_status
}

# Run main function
main

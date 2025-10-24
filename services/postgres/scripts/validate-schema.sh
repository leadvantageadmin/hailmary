#!/bin/bash
set -e

# PostgreSQL Schema Validation Script
# Validates the current database schema against the expected schema

echo "🔍 Validating PostgreSQL schema..."

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"

# Change to service directory
cd "$SERVICE_DIR"

# Configuration
SCHEMA_DIR=${SCHEMA_DIR:-"./data/schema"}
POSTGRES_USER=${POSTGRES_USER:-app}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-app}
POSTGRES_DB=${POSTGRES_DB:-app}

# Load environment variables if .env file exists
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

echo "🔍 Configuration:"
echo "   • Schema Directory: $SCHEMA_DIR"
echo "   • Database: $POSTGRES_DB"
echo "   • User: $POSTGRES_USER"

# Check if PostgreSQL is running
if ! docker compose ps postgres | grep -q "Up"; then
    echo "❌ PostgreSQL service is not running"
    echo "   Start it with: ./scripts/start.sh"
    exit 1
fi

# Check if schema directory exists
if [ ! -d "$SCHEMA_DIR" ]; then
    echo "❌ Schema directory not found: $SCHEMA_DIR"
    echo "   Pull schema first with: ./scripts/pull-schema.sh"
    exit 1
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

# Function to check if table exists
check_table_exists() {
    local table_name=$1
    local result=$(docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table_name');" | tr -d ' \n')
    echo "$result"
}

# Function to check if column exists
check_column_exists() {
    local table_name=$1
    local column_name=$2
    local result=$(docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '$table_name' AND column_name = '$column_name');" | tr -d ' \n')
    echo "$result"
}

# Function to check if index exists
check_index_exists() {
    local index_name=$1
    local result=$(docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT EXISTS (SELECT FROM pg_indexes WHERE indexname = '$index_name');" | tr -d ' \n')
    echo "$result"
}

# Function to check if function exists
check_function_exists() {
    local function_name=$1
    local result=$(docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT EXISTS (SELECT FROM pg_proc WHERE proname = '$function_name');" | tr -d ' \n')
    echo "$result"
}

# Function to check if view exists
check_view_exists() {
    local view_name=$1
    local result=$(docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT EXISTS (SELECT FROM information_schema.views WHERE table_schema = 'public' AND table_name = '$view_name');" | tr -d ' \n')
    echo "$result"
}

# Main validation
main() {
    local overall_status=0
    
    echo -e "${BLUE}📋 Schema Validation Report${NC}"
    echo ""
    
    # Check schema metadata
    echo -e "${BLUE}📄 Schema Metadata${NC}"
    if [ -f "$SCHEMA_DIR/metadata.json" ]; then
        local schema_version=$(jq -r '.version' "$SCHEMA_DIR/metadata.json")
        local schema_author=$(jq -r '.author' "$SCHEMA_DIR/metadata.json")
        local schema_description=$(jq -r '.description' "$SCHEMA_DIR/metadata.json")
        
        print_status "OK" "Schema metadata found"
        echo "   • Version: $schema_version"
        echo "   • Author: $schema_author"
        echo "   • Description: $schema_description"
    else
        print_status "ERROR" "Schema metadata not found"
        overall_status=1
    fi
    echo ""
    
    # Check Prisma schema file
    echo -e "${BLUE}📄 Prisma Schema File${NC}"
    if [ -f "$SCHEMA_DIR/schema.prisma" ]; then
        print_status "OK" "Prisma schema file found"
        
        # Extract table names from Prisma schema
        local prisma_tables=$(grep -E '^model ' "$SCHEMA_DIR/schema.prisma" | sed 's/model //' | sed 's/ {.*//' | tr -d ' ')
        echo "   • Tables defined in schema: $(echo $prisma_tables | wc -w)"
    else
        print_status "ERROR" "Prisma schema file not found"
        overall_status=1
    fi
    echo ""
    
    # Check database tables
    echo -e "${BLUE}🗄️  Database Tables${NC}"
    local db_tables=$(docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" | tr -d ' \n' | tr '\n' ' ')
    local db_table_count=$(echo $db_tables | wc -w)
    
    if [ $db_table_count -gt 0 ]; then
        print_status "OK" "Database tables found ($db_table_count tables)"
        echo "   • Tables: $db_tables"
    else
        print_status "WARNING" "No database tables found"
        overall_status=1
    fi
    echo ""
    
    # Check specific tables from Prisma schema
    if [ -f "$SCHEMA_DIR/schema.prisma" ]; then
        echo -e "${BLUE}🔍 Table Validation${NC}"
        local prisma_tables=$(grep -E '^model ' "$SCHEMA_DIR/schema.prisma" | sed 's/model //' | sed 's/ {.*//' | tr -d ' ')
        
        for table in $prisma_tables; do
            if [ "$(check_table_exists "$table")" = "t" ]; then
                print_status "OK" "Table '$table' exists"
            else
                print_status "ERROR" "Table '$table' not found"
                overall_status=1
            fi
        done
    fi
    echo ""
    
    # Check schema migrations table
    echo -e "${BLUE}📋 Schema Migrations${NC}"
    if [ "$(check_table_exists "schema_migrations")" = "t" ]; then
        print_status "OK" "Schema migrations table exists"
        
        local migration_count=$(docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM schema_migrations;" | tr -d ' \n')
        echo "   • Applied migrations: $migration_count"
        
        # Show recent migrations
        echo "   • Recent migrations:"
        docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT version, description, applied_at FROM schema_migrations ORDER BY applied_at DESC LIMIT 5;" | tail -n +3 | head -n -2 | while read line; do
            echo "     - $line"
        done
    else
        print_status "ERROR" "Schema migrations table not found"
        overall_status=1
    fi
    echo ""
    
    # Check extensions
    echo -e "${BLUE}🔧 PostgreSQL Extensions${NC}"
    local extensions=("postgis" "uuid-ossp" "pg_stat_statements" "pg_trgm" "unaccent")
    local all_extensions_ok=true
    
    for ext in "${extensions[@]}"; do
        if docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1 FROM pg_extension WHERE extname = '$ext';" | grep -q "1 row"; then
            print_status "OK" "Extension '$ext' is installed"
        else
            print_status "WARNING" "Extension '$ext' is not installed"
            all_extensions_ok=false
        fi
    done
    
    if [ "$all_extensions_ok" = false ]; then
        overall_status=1
    fi
    echo ""
    
    # Check functions
    echo -e "${BLUE}⚙️  Database Functions${NC}"
    local functions=("log_schema_migration" "is_migration_applied" "get_extension_info" "list_users_and_roles")
    local all_functions_ok=true
    
    for func in "${functions[@]}"; do
        if [ "$(check_function_exists "$func")" = "t" ]; then
            print_status "OK" "Function '$func' exists"
        else
            print_status "WARNING" "Function '$func' not found"
            all_functions_ok=false
        fi
    done
    
    if [ "$all_functions_ok" = false ]; then
        overall_status=1
    fi
    echo ""
    
    # Check views
    echo -e "${BLUE}👁️  Database Views${NC}"
    local views=("migration_status" "user_management")
    local all_views_ok=true
    
    for view in "${views[@]}"; do
        if [ "$(check_view_exists "$view")" = "t" ]; then
            print_status "OK" "View '$view' exists"
        else
            print_status "WARNING" "View '$view' not found"
            all_views_ok=false
        fi
    done
    
    if [ "$all_views_ok" = false ]; then
        overall_status=1
    fi
    echo ""
    
    # Overall status
    echo -e "${BLUE}📊 Overall Validation Status${NC}"
    if [ $overall_status -eq 0 ]; then
        print_status "OK" "Schema validation passed! Database schema is consistent."
    else
        print_status "ERROR" "Schema validation failed. Please review the issues above."
    fi
    
    echo ""
    echo "🔧 Troubleshooting Commands:"
    echo "   • Run migrations: ./scripts/run-migrations.sh"
    echo "   • Pull latest schema: ./scripts/pull-schema.sh"
    echo "   • Check database: docker compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB"
    echo "   • View logs: ./scripts/logs.sh"
    
    exit $overall_status
}

# Run main function
main

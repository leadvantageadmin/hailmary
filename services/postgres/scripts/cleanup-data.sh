#!/bin/bash

# PostgreSQL Data Cleanup Script
# Cleans up existing data from application tables
# Usage: ./scripts/cleanup-data.sh [--confirm]

set -e

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"

# Change to service directory
cd "$SERVICE_DIR"

# Load environment variables if .env file exists
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Set default environment variables if not set
export POSTGRES_USER=${POSTGRES_USER:-app}
export POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-app}
export POSTGRES_DB=${POSTGRES_DB:-app}
export POSTGRES_PORT=${POSTGRES_PORT:-5432}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CONFIRM=false

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

# Function to show usage
show_usage() {
    echo "Usage: $0 [--confirm]"
    echo ""
    echo "Options:"
    echo "  --confirm    Skip confirmation prompt and proceed with cleanup"
    echo "  --help       Show this help message"
    echo ""
    echo "This script will clean up data from the following tables:"
    echo "  • Customer"
    echo "  • Company"
    echo "  • Prospect"
    echo ""
    echo "Note: User, MaterializedViewError, and MaterializedViewLog tables are preserved."
    echo ""
    echo "⚠️  WARNING: This will permanently delete all data from these tables!"
    echo "   Schema and system tables will be preserved."
}

# Function to check if PostgreSQL is running
check_postgres() {
    echo -e "${BLUE}🔍 Checking PostgreSQL service...${NC}"
    
    if ! docker-compose ps postgres | grep -q "Up"; then
        print_status "ERROR" "PostgreSQL service is not running"
        echo -e "${BLUE}💡 Start PostgreSQL service first:${NC}"
        echo -e "   ./scripts/start.sh"
        exit 1
    fi
    
    print_status "OK" "PostgreSQL service is running"
}

# Function to get table row counts
get_table_counts() {
    echo -e "${BLUE}📊 Current table row counts:${NC}"
    
    local tables=("Customer" "Company" "Prospect")
    
    for table in "${tables[@]}"; do
        local count=$(docker-compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM \"$table\";" 2>/dev/null | tr -d ' \n' || echo "0")
        if [ "$count" = "0" ]; then
            echo -e "   • $table: ${YELLOW}0 rows${NC}"
        else
            echo -e "   • $table: ${RED}$count rows${NC}"
        fi
    done
}

# Function to confirm cleanup
confirm_cleanup() {
    if [ "$CONFIRM" = "true" ]; then
        return 0
    fi
    
    echo ""
    echo -e "${YELLOW}⚠️  WARNING: This will permanently delete all data from application tables!${NC}"
    echo -e "${YELLOW}   This action cannot be undone.${NC}"
    echo ""
    echo -e "${BLUE}Tables that will be cleaned:${NC}"
    echo "   • Customer"
    echo "   • Company" 
    echo "   • Prospect"
    echo ""
    echo -e "${GREEN}Note: User, MaterializedViewError, and MaterializedViewLog tables will be preserved.${NC}"
    echo ""
    
    read -p "Are you sure you want to proceed? (yes/no): " -r
    echo
    
    if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        return 0
    else
        echo -e "${BLUE}Cleanup cancelled by user.${NC}"
        exit 0
    fi
}

# Function to cleanup tables
cleanup_tables() {
    echo -e "${BLUE}🧹 Starting data cleanup...${NC}"
    
    local tables=("Customer" "Company" "Prospect")
    local total_deleted=0
    
    for table in "${tables[@]}"; do
        echo -e "${BLUE}🗑️  Cleaning table: $table${NC}"
        
        # Get count before deletion
        local before_count=$(docker-compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM \"$table\";" 2>/dev/null | tr -d ' \n' || echo "0")
        
        # Delete all rows
        local result=$(docker-compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "DELETE FROM \"$table\";" 2>&1)
        
        if [ $? -eq 0 ]; then
            print_status "OK" "Cleaned $table ($before_count rows deleted)"
            total_deleted=$((total_deleted + before_count))
        else
            print_status "ERROR" "Failed to clean $table: $result"
        fi
    done
    
    echo ""
    echo -e "${GREEN}✅ Data cleanup completed!${NC}"
    echo -e "${BLUE}📊 Total rows deleted: $total_deleted${NC}"
}

# Function to reset sequences
reset_sequences() {
    echo -e "${BLUE}🔄 Resetting auto-increment sequences...${NC}"
    
    # Reset sequences for tables that have them
    local sequences=(
        "Customer_id_seq"
        "Company_id_seq" 
        "Prospect_id_seq"
    )
    
    for seq in "${sequences[@]}"; do
        echo -e "${BLUE}🔄 Resetting sequence: $seq${NC}"
        local result=$(docker-compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT setval('\"$seq\"', 1, false);" 2>&1)
        
        if [ $? -eq 0 ]; then
            print_status "OK" "Reset sequence $seq"
        else
            # Sequence might not exist, which is OK
            echo -e "${YELLOW}⚠️  Sequence $seq not found (this is normal if table doesn't have auto-increment)${NC}"
        fi
    done
}

# Function to refresh materialized views
refresh_materialized_views() {
    echo -e "${BLUE}🔄 Refreshing materialized views...${NC}"
    
    # Get list of materialized views
    local views=$(docker-compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT matviewname FROM pg_matviews WHERE schemaname = 'public';" 2>/dev/null | tr -d ' \n' || echo "")
    
    if [ -n "$views" ]; then
        echo -e "${BLUE}📋 Found materialized views: $views${NC}"
        
        # Refresh each materialized view
        for view in $views; do
            echo -e "${BLUE}🔄 Refreshing materialized view: $view${NC}"
            local result=$(docker-compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "REFRESH MATERIALIZED VIEW \"$view\";" 2>&1)
            
            if [ $? -eq 0 ]; then
                print_status "OK" "Refreshed materialized view $view"
            else
                print_status "ERROR" "Failed to refresh $view: $result"
            fi
        done
    else
        echo -e "${YELLOW}⚠️  No materialized views found${NC}"
    fi
}

# Function to show final status
show_final_status() {
    echo ""
    echo -e "${GREEN}🎉 Data cleanup completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}📊 Final table status:${NC}"
    get_table_counts
    echo ""
    echo -e "${BLUE}💡 Next steps:${NC}"
    echo -e "   • Run ingestion: cd ../ingestor && ./scripts/ingest-single.sh <filename>"
    echo -e "   • Check health: ./scripts/health-check.sh"
    echo -e "   • View logs: ./scripts/logs.sh"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --confirm)
            CONFIRM=true
            shift
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            show_usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    echo -e "${BLUE}🧹 HailMary PostgreSQL Data Cleanup${NC}"
    echo "====================================="
    
    check_postgres
    get_table_counts
    confirm_cleanup
    cleanup_tables
    reset_sequences
    refresh_materialized_views
    show_final_status
}

# Run main function
main "$@"

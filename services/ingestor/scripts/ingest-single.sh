#!/bin/bash

# Ingestor Service Single File Ingestion Script
# Simple wrapper script for processing individual CSV files
# Usage: ./scripts/ingest-single.sh <filename>

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
INGESTOR_PORT=${INGESTOR_PORT:-8080}
INGESTOR_URL="http://localhost:${INGESTOR_PORT}"

# Function to show usage
show_usage() {
    echo -e "${RED}❌ No filename provided${NC}"
    echo ""
    echo "Usage: $0 <filename> [options]"
    echo ""
    echo "Available CSV files:"
    if [ -d "data/csv" ]; then
        find data/csv -name "*.csv" -type f | sed 's/^data\/csv\///' | sed 's/^/  - /'
    else
        echo "  No data/csv folder found"
    fi
    echo ""
    echo "Options:"
    echo "  --dry-run     Run in dry-run mode (no actual data insertion)"
    echo "  --batch-size  Set batch size for processing (default: 1000)"
    echo "  --help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 'RPF April 2024.csv'"
    echo "  $0 'RPF December 2024.csv' --dry-run"
    echo "  $0 'test_customers.csv' --batch-size 500"
    exit 1
}

# Function to check if services are running
check_services() {
    echo -e "${BLUE}🔍 Checking if Ingestor service is running...${NC}"
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running!${NC}"
        exit 1
    fi
    
    # Check if ingestor service is running
    if ! docker compose ps | grep -q "hailmary-ingestor.*Up"; then
        echo -e "${RED}❌ Ingestor service is not running.${NC}"
        echo -e "${BLUE}💡 Start the service first with: ./scripts/start.sh${NC}"
        exit 1
    fi
    
    # Check if service is healthy
    echo -e "${BLUE}🏥 Checking service health...${NC}"
    if curl -s "$INGESTOR_URL/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Ingestor service is healthy${NC}"
    else
        echo -e "${YELLOW}⚠️ Ingestor service is running but health check failed${NC}"
        echo -e "${BLUE}💡 Service might still be starting up...${NC}"
    fi
}

# Function to clear cache (if Redis is available)
clear_cache() {
    echo -e "${BLUE}🧹 Clearing cache...${NC}"
    
    # Try to clear Redis cache if available
    if docker ps | grep -q "redis"; then
        echo -e "${BLUE}🔄 Clearing Redis cache...${NC}"
        docker compose exec redis redis-cli FLUSHALL 2>/dev/null || echo -e "${YELLOW}⚠️ Redis not available, skipping cache clear${NC}"
    else
        echo -e "${YELLOW}⚠️ Redis not running, skipping cache clear${NC}"
    fi
}

# Function to process file via API
process_via_api() {
    local filename="$1"
    local dry_run="$2"
    local batch_size="$3"
    
    echo -e "${BLUE}📤 Processing via API endpoint...${NC}"
    
    local payload=$(cat << EOF
{
    "file_path": "/app/data/csv/$filename",
    "options": {
        "batch_size": $batch_size,
        "dry_run": $dry_run
    }
}
EOF
)
    
    echo -e "${BLUE}📤 Sending ingestion request to $INGESTOR_URL/ingest...${NC}"
    
    local response=$(curl -s -X POST "$INGESTOR_URL/ingest" \
        -H "Content-Type: application/json" \
        -d "$payload")
    
    if [ $? -eq 0 ] && [ -n "$response" ]; then
        echo -e "${GREEN}✅ API ingestion request completed${NC}"
        echo -e "${BLUE}📊 Response:${NC}"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
        return 0
    else
        echo -e "${RED}❌ API ingestion request failed${NC}"
        return 1
    fi
}

# Function to process file via CLI
process_via_cli() {
    local filename="$1"
    local dry_run="$2"
    local batch_size="$3"
    
    echo -e "${BLUE}🖥️ Processing via CLI...${NC}"
    
    local dry_run_flag=""
    if [ "$dry_run" = "true" ]; then
        dry_run_flag="--dry-run"
    fi
    
    echo -e "${BLUE}📤 Running CLI ingestion...${NC}"
    docker compose exec ingestor python app.py ingest \
        --file "/app/data/csv/$filename" \
        --batch-size "$batch_size" \
        $dry_run_flag
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ CLI ingestion completed${NC}"
        return 0
    else
        echo -e "${RED}❌ CLI ingestion failed${NC}"
        return 1
    fi
}

# Function to show results
show_results() {
    local filename="$1"
    local method="$2"
    local success="$3"
    
    echo ""
    if [ "$success" = "true" ]; then
        echo -e "${GREEN}✅ Single file ingestion completed successfully!${NC}"
    else
        echo -e "${RED}❌ Single file ingestion failed!${NC}"
    fi
    echo -e "${BLUE}📊 File processed: $filename${NC}"
    echo -e "${BLUE}🔧 Method used: $method${NC}"
    echo ""
    echo -e "${BLUE}💡 Next Steps:${NC}"
    echo -e "   • Check logs: ./scripts/logs.sh"
    echo -e "   • Health check: ./scripts/health-check.sh"
    echo -e "   • Test ingestion: ./scripts/test-ingestion.sh"
}

# Main execution
main() {
    # Parse command line arguments
    local filename=""
    local dry_run="false"
    local batch_size="1000"
    local use_api="true"
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                dry_run="true"
                shift
                ;;
            --batch-size)
                batch_size="$2"
                shift 2
                ;;
            --cli)
                use_api="false"
                shift
                ;;
            --help|-h)
                show_usage
                ;;
            -*)
                echo -e "${RED}❌ Unknown option: $1${NC}"
                show_usage
                ;;
            *)
                if [ -z "$filename" ]; then
                    filename="$1"
                else
                    echo -e "${RED}❌ Multiple filenames provided${NC}"
                    show_usage
                fi
                shift
                ;;
        esac
    done
    
    # Check if filename is provided
    if [ -z "$filename" ]; then
        show_usage
    fi
    
    # Check if file exists
    if [ ! -f "data/csv/$filename" ]; then
        echo -e "${RED}❌ File 'data/csv/$filename' not found${NC}"
        echo ""
        echo "Available CSV files:"
        if [ -d "data/csv" ]; then
            find data/csv -name "*.csv" -type f | sed 's/^data\/csv\///' | sed 's/^/  - /'
        else
            echo "  No data/csv folder found"
        fi
        exit 1
    fi
    
    echo -e "${BLUE}🚀 Processing single CSV file: $filename${NC}"
    echo -e "${BLUE}📁 File path: data/csv/$filename${NC}"
    echo -e "${BLUE}🔍 Dry run: $dry_run${NC}"
    echo -e "${BLUE}📦 Batch size: $batch_size${NC}"
    echo -e "${BLUE}🔧 Method: $([ "$use_api" = "true" ] && echo "API" || echo "CLI")${NC}"
    echo ""
    
    # Check services
    check_services
    
    # Clear cache
    clear_cache
    
    # Process the file
    echo -e "${BLUE}🔄 Starting ingestion...${NC}"
    
    local success="false"
    local method=""
    
    if [ "$use_api" = "true" ]; then
        method="API"
        if process_via_api "$filename" "$dry_run" "$batch_size"; then
            success="true"
        fi
    else
        method="CLI"
        if process_via_cli "$filename" "$dry_run" "$batch_size"; then
            success="true"
        fi
    fi
    
    # Show results
    show_results "$filename" "$method" "$success"
    
    # Exit with appropriate code
    if [ "$success" = "true" ]; then
        exit 0
    else
        exit 1
    fi
}

# Run main function
main "$@"

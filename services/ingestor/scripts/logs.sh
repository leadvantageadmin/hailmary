#!/bin/bash

# Ingestor Service Logs Script
# View and manage Ingestor service logs
# Usage: ./logs.sh [local|vm] [OPTIONS]
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

# Check if first argument is a deployment mode
if [[ "$DEPLOYMENT_MODE" == "local" || "$DEPLOYMENT_MODE" == "vm" ]]; then
    # Valid deployment mode, shift it out of arguments
    shift
else
    # Not a deployment mode, treat as local and don't shift
    DEPLOYMENT_MODE="local"
fi

echo -e "${BLUE}📋 HailMary Ingestor Service Logs ($DEPLOYMENT_MODE mode)${NC}"

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

# Function to display usage
usage() {
    echo "Usage: $0 [local|vm] [OPTIONS]"
    echo ""
    echo "Deployment Modes:"
    echo "  local    Local development deployment (default)"
    echo "  vm       VM/production deployment"
    echo ""
    echo "Options:"
    echo "  -f, --follow     Follow log output in real-time"
    echo "  -t, --tail N     Show last N lines (default: 50)"
    echo "  -e, --errors     Show only error messages"
    echo "  -w, --warnings   Show only warning and error messages"
    echo "  -c, --container  Show container logs instead of file logs"
    echo "  -h, --help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Show last 50 lines"
    echo "  $0 -f                 # Follow logs in real-time"
    echo "  $0 -t 100             # Show last 100 lines"
    echo "  $0 -e                 # Show only errors"
    echo "  $0 -c                 # Show container logs"
}

# Function to show container logs
show_container_logs() {
    local follow=$1
    local tail_lines=$2
    
    echo -e "${BLUE}📋 Showing Ingestor container logs...${NC}"
    
    if [ "$follow" = "true" ]; then
        docker compose logs -f --tail="$tail_lines" ingestor
    else
        docker compose logs --tail="$tail_lines" ingestor
    fi
}

# Function to show file logs
show_file_logs() {
    local follow=$1
    local tail_lines=$2
    local errors_only=$3
    local warnings_only=$4
    
    local log_file="./data/logs/ingestor.log"
    
    if [ ! -f "$log_file" ]; then
        echo -e "${YELLOW}⚠️ Log file not found: $log_file${NC}"
        echo -e "${BLUE}💡 Showing container logs instead...${NC}"
        show_container_logs "$follow" "$tail_lines"
        return
    fi
    
    echo -e "${BLUE}📋 Showing Ingestor log file...${NC}"
    echo -e "${BLUE}📄 Log file: $log_file${NC}"
    
    if [ "$errors_only" = "true" ]; then
        echo -e "${BLUE}🔍 Filtering for ERROR messages only...${NC}"
        if [ "$follow" = "true" ]; then
            tail -f "$log_file" | grep --line-buffered "ERROR"
        else
            tail -"$tail_lines" "$log_file" | grep "ERROR"
        fi
    elif [ "$warnings_only" = "true" ]; then
        echo -e "${BLUE}🔍 Filtering for WARNING and ERROR messages...${NC}"
        if [ "$follow" = "true" ]; then
            tail -f "$log_file" | grep --line-buffered -E "(WARNING|ERROR)"
        else
            tail -"$tail_lines" "$log_file" | grep -E "(WARNING|ERROR)"
        fi
    else
        if [ "$follow" = "true" ]; then
            tail -f "$log_file"
        else
            tail -"$tail_lines" "$log_file"
        fi
    fi
}

# Function to show log statistics
show_log_stats() {
    local log_file="./data/logs/ingestor.log"
    
    if [ ! -f "$log_file" ]; then
        echo -e "${YELLOW}⚠️ Log file not found: $log_file${NC}"
        return
    fi
    
    echo -e "${BLUE}📊 Log Statistics:${NC}"
    echo -e "   • Total lines: $(wc -l < "$log_file")"
    echo -e "   • File size: $(du -h "$log_file" | cut -f1)"
    echo -e "   • Last modified: $(stat -c %y "$log_file")"
    echo ""
    
    echo -e "${BLUE}📊 Log Level Distribution:${NC}"
    echo -e "   • INFO: $(grep -c "INFO" "$log_file" || echo 0)"
    echo -e "   • WARNING: $(grep -c "WARNING" "$log_file" || echo 0)"
    echo -e "   • ERROR: $(grep -c "ERROR" "$log_file" || echo 0)"
    echo ""
    
    echo -e "${BLUE}📊 Recent Activity (last 10 entries):${NC}"
    tail -10 "$log_file" | sed 's/^/   /'
}

# Function to clear logs
clear_logs() {
    local log_file="./data/logs/ingestor.log"
    
    if [ -f "$log_file" ]; then
        echo -e "${BLUE}🗑️ Clearing log file...${NC}"
        > "$log_file"
        echo -e "${GREEN}✅ Log file cleared${NC}"
    else
        echo -e "${YELLOW}⚠️ Log file not found: $log_file${NC}"
    fi
}

# Parse command line arguments
follow=false
tail_lines=50
errors_only=false
warnings_only=false
container_logs=false
show_stats=false
clear_logs_flag=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--follow)
            follow=true
            shift
            ;;
        -t|--tail)
            tail_lines="$2"
            shift 2
            ;;
        -e|--errors)
            errors_only=true
            shift
            ;;
        -w|--warnings)
            warnings_only=true
            shift
            ;;
        -c|--container)
            container_logs=true
            shift
            ;;
        -s|--stats)
            show_stats=true
            shift
            ;;
        --clear)
            clear_logs_flag=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    echo -e "${BLUE}📋 HailMary Ingestor Service Logs${NC}"
    echo "=================================="
    
    if [ "$clear_logs_flag" = "true" ]; then
        clear_logs
        return
    fi
    
    if [ "$show_stats" = "true" ]; then
        show_log_stats
        return
    fi
    
    if [ "$container_logs" = "true" ]; then
        show_container_logs "$follow" "$tail_lines"
    else
        show_file_logs "$follow" "$tail_lines" "$errors_only" "$warnings_only"
    fi
}

# Run main function
main "$@"

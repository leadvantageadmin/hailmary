#!/bin/bash

# Logstash Service Logs Script
# View and manage Logstash service logs
# Usage: ./logs.sh [local|vm] [options]

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
    echo "   Usage: ./logs.sh [local|vm] [options]"
    exit 1
fi

# Parse options
FOLLOW=false
LINES=50
ERRORS_ONLY=false
CONTAINER_LOGS=false
PIPELINE_LOGS=false

# Shift to get options
shift

while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--follow)
            FOLLOW=true
            shift
            ;;
        -n|--lines)
            LINES="$2"
            shift 2
            ;;
        -e|--errors)
            ERRORS_ONLY=true
            shift
            ;;
        -c|--container)
            CONTAINER_LOGS=true
            shift
            ;;
        -p|--pipeline)
            PIPELINE_LOGS=true
            shift
            ;;
        -h|--help)
            echo "Usage: ./logs.sh [local|vm] [options]"
            echo ""
            echo "Options:"
            echo "  -f, --follow     Follow logs in real-time"
            echo "  -n, --lines N    Show last N lines (default: 50)"
            echo "  -e, --errors     Show only error messages"
            echo "  -c, --container  Show container logs instead of file logs"
            echo "  -p, --pipeline   Show pipeline-specific logs"
            echo "  -h, --help       Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./logs.sh local                    # Show last 50 lines"
            echo "  ./logs.sh local -f                 # Follow logs"
            echo "  ./logs.sh local -n 100             # Show last 100 lines"
            echo "  ./logs.sh local -e                 # Show only errors"
            echo "  ./logs.sh local -c                 # Show container logs"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}📋 HailMary Logstash Service Logs ($DEPLOYMENT_MODE mode)${NC}"
echo "============================================================="

# Function to show container logs
show_container_logs() {
    echo -e "${BLUE}🐳 Container Logs:${NC}"
    
    if [ "$FOLLOW" = true ]; then
        echo -e "${YELLOW}Following container logs (Ctrl+C to stop)...${NC}"
        docker-compose logs -f --tail="$LINES"
    else
        docker-compose logs --tail="$LINES"
    fi
}

# Function to show file logs
show_file_logs() {
    echo -e "${BLUE}📄 File Logs:${NC}"
    
    local log_file="./data/logs/logstash.log"
    
    if [ ! -f "$log_file" ]; then
        echo -e "${YELLOW}⚠️ Log file not found: $log_file${NC}"
        echo -e "${BLUE}Showing container logs instead...${NC}"
        show_container_logs
        return
    fi
    
    if [ "$ERRORS_ONLY" = true ]; then
        echo -e "${BLUE}🔍 Error Messages Only:${NC}"
        if [ "$FOLLOW" = true ]; then
            tail -f "$log_file" | grep -i "error\|exception\|failed" || echo "No errors found"
        else
            tail -n "$LINES" "$log_file" | grep -i "error\|exception\|failed" || echo "No errors found in last $LINES lines"
        fi
    elif [ "$PIPELINE_LOGS" = true ]; then
        echo -e "${BLUE}🔄 Pipeline Logs:${NC}"
        if [ "$FOLLOW" = true ]; then
            tail -f "$log_file" | grep -i "pipeline\|sync\|jdbc" || echo "No pipeline logs found"
        else
            tail -n "$LINES" "$log_file" | grep -i "pipeline\|sync\|jdbc" || echo "No pipeline logs found in last $LINES lines"
        fi
    else
        if [ "$FOLLOW" = true ]; then
            echo -e "${YELLOW}Following log file (Ctrl+C to stop)...${NC}"
            tail -f "$log_file"
        else
            tail -n "$LINES" "$log_file"
        fi
    fi
}

# Function to show log statistics
show_log_stats() {
    echo -e "${BLUE}📊 Log Statistics:${NC}"
    
    local log_file="./data/logs/logstash.log"
    
    if [ -f "$log_file" ]; then
        local total_lines=$(wc -l < "$log_file")
        local error_count=$(grep -i "error\|exception\|failed" "$log_file" | wc -l)
        local warning_count=$(grep -i "warn" "$log_file" | wc -l)
        local info_count=$(grep -i "info" "$log_file" | wc -l)
        
        echo "   • Total lines: $total_lines"
        echo "   • Errors: $error_count"
        echo "   • Warnings: $warning_count"
        echo "   • Info messages: $info_count"
        
        if [ $error_count -gt 0 ]; then
            echo -e "${RED}   • Error rate: $(( error_count * 100 / total_lines ))%${NC}"
        else
            echo -e "${GREEN}   • Error rate: 0%${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️ Log file not found${NC}"
    fi
}

# Function to show recent activity
show_recent_activity() {
    echo -e "${BLUE}🕒 Recent Activity:${NC}"
    
    local log_file="./data/logs/logstash.log"
    
    if [ -f "$log_file" ]; then
        echo -e "${BLUE}Last 10 log entries:${NC}"
        tail -10 "$log_file" | while read line; do
            echo "   $line"
        done
    else
        echo -e "${YELLOW}⚠️ Log file not found${NC}"
    fi
}

# Main execution
main() {
    if [ "$CONTAINER_LOGS" = true ]; then
        show_container_logs
    else
        show_file_logs
    fi
    
    echo ""
    show_log_stats
    echo ""
    show_recent_activity
    
    echo ""
    echo -e "${BLUE}🔧 Management Commands:${NC}"
    echo -e "   • Follow logs: ./scripts/logs.sh $DEPLOYMENT_MODE -f"
    echo -e "   • Show errors: ./scripts/logs.sh $DEPLOYMENT_MODE -e"
    echo -e "   • Container logs: ./scripts/logs.sh $DEPLOYMENT_MODE -c"
    echo -e "   • Health check: ./scripts/health-check.sh $DEPLOYMENT_MODE"
}

# Run main function
main "$@"

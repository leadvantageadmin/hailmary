#!/bin/bash

# Materialized View Refresh Service
# Listens for PostgreSQL notifications and refreshes materialized views
# Usage: ./materialized-view-refresh-service.sh [local|vm] [start|stop|status|restart]
#   local: Local development deployment (default)
#   vm: VM/production deployment

set -e

# Get deployment mode from first argument
DEPLOYMENT_MODE=${1:-local}

# Validate deployment mode
if [[ "$DEPLOYMENT_MODE" == "local" || "$DEPLOYMENT_MODE" == "vm" ]]; then
    # Valid deployment mode, shift it out of arguments
    shift
else
    # Not a deployment mode, treat as local and don't shift
    DEPLOYMENT_MODE="local"
fi

# Function to configure local development environment
configure_local() {
    # Local development configurations
    export DB_HOST="${POSTGRES_HOST:-localhost}"
    export DB_PORT="${POSTGRES_PORT:-5432}"
    export DB_NAME="${POSTGRES_DB:-app}"
    export DB_USER="${POSTGRES_USER:-app}"
    export DB_PASSWORD="${POSTGRES_PASSWORD:-app}"
    export REFRESH_CHANNEL="materialized_view_refresh"
    export LOG_FILE="./logs/postgres/materialized_view_refresh.log"
    export PID_FILE="./logs/postgres/materialized_view_refresh.pid"
}

# Function to configure VM/production environment
configure_vm() {
    # VM-specific configurations
    export DB_HOST="${POSTGRES_HOST:-localhost}"
    export DB_PORT="${POSTGRES_PORT:-5433}"
    export DB_NAME="${POSTGRES_DB:-app}"
    export DB_USER="${POSTGRES_USER:-app}"
    export DB_PASSWORD="${POSTGRES_PASSWORD:-app}"
    export REFRESH_CHANNEL="materialized_view_refresh"
    export LOG_FILE="/var/log/hailmary/postgres/materialized_view_refresh.log"
    export PID_FILE="/var/run/materialized_view_refresh.pid"
}

# Configure based on deployment mode
if [[ "$DEPLOYMENT_MODE" == "vm" ]]; then
    configure_vm
else
    configure_local
fi

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Colors for logging
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")
            echo -e "${GREEN}[INFO]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
        *)
            echo "$timestamp - $message" | tee -a "$LOG_FILE"
            ;;
    esac
}

# Function to check if service is already running
check_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            log "WARN" "Materialized view refresh service is already running (PID: $pid)"
            exit 1
        else
            log "WARN" "Stale PID file found, removing..."
            rm -f "$PID_FILE"
        fi
    fi
}

# Function to start the service
start_service() {
    log "INFO" "Starting materialized view refresh service..."
    
    # Check if already running
    check_running
    
    # Create PID file
    echo $$ > "$PID_FILE"
    
    # Set up signal handlers
    trap 'cleanup' SIGTERM SIGINT
    
    log "INFO" "Service started with PID: $$"
    log "INFO" "Listening for notifications on channel: $REFRESH_CHANNEL"
    
    # Connect to PostgreSQL and listen for notifications
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Listen for materialized view refresh notifications
LISTEN materialized_view_refresh;

-- Keep the connection alive and wait for notifications
-- This will block and wait for notifications
SELECT 1;
EOF
}

# Function to stop the service
stop_service() {
    log "INFO" "Stopping materialized view refresh service..."
    
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            kill -TERM "$pid"
            log "INFO" "Stop signal sent to PID: $pid"
            
            # Wait for graceful shutdown
            local count=0
            while ps -p "$pid" > /dev/null 2>&1 && [ $count -lt 30 ]; do
                sleep 1
                count=$((count + 1))
            done
            
            if ps -p "$pid" > /dev/null 2>&1; then
                log "WARN" "Service did not stop gracefully, forcing kill..."
                kill -KILL "$pid"
            fi
        fi
        rm -f "$PID_FILE"
        log "INFO" "Service stopped"
    else
        log "WARN" "No PID file found, service may not be running"
    fi
}

# Function to check service status
status_service() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            log "INFO" "Service is running (PID: $pid)"
            return 0
        else
            log "WARN" "Service is not running (stale PID file)"
            rm -f "$PID_FILE"
            return 1
        fi
    else
        log "INFO" "Service is not running"
        return 1
    fi
}

# Function to refresh materialized view manually
refresh_manual() {
    log "INFO" "Manually refreshing materialized view..."
    
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT refresh_materialized_views_safe();"
    
    if [ $? -eq 0 ]; then
        log "INFO" "Manual refresh completed successfully"
    else
        log "ERROR" "Manual refresh failed"
        exit 1
    fi
}

# Function to show logs
show_logs() {
    if [ -f "$LOG_FILE" ]; then
        tail -f "$LOG_FILE"
    else
        log "WARN" "Log file not found: $LOG_FILE"
    fi
}

# Function to cleanup on exit
cleanup() {
    log "INFO" "Shutting down materialized view refresh service..."
    rm -f "$PID_FILE"
    exit 0
}

# Function to show usage
show_usage() {
    echo "Usage: $0 {start|stop|restart|status|refresh|logs}"
    echo ""
    echo "Commands:"
    echo "  start    - Start the materialized view refresh service"
    echo "  stop     - Stop the materialized view refresh service"
    echo "  restart  - Restart the materialized view refresh service"
    echo "  status   - Check if the service is running"
    echo "  refresh  - Manually refresh the materialized view"
    echo "  logs     - Show and follow the log file"
    echo ""
    echo "Environment Variables:"
    echo "  POSTGRES_HOST     - PostgreSQL host (default: localhost)"
    echo "  POSTGRES_PORT     - PostgreSQL port (default: 5432)"
    echo "  POSTGRES_DB       - Database name (default: app)"
    echo "  POSTGRES_USER     - Database user (default: app)"
    echo "  POSTGRES_PASSWORD - Database password (default: app)"
}

# Main script logic
case "${1:-}" in
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    restart)
        stop_service
        sleep 2
        start_service
        ;;
    status)
        status_service
        ;;
    refresh)
        refresh_manual
        ;;
    logs)
        show_logs
        ;;
    *)
        show_usage
        exit 1
        ;;
esac

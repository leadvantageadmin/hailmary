#!/bin/bash

# Materialized View Refresh Script
# Automatically refreshes materialized views and triggers sync
# This script runs inside the materialized-refresh container

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REFRESH_INTERVAL=${REFRESH_INTERVAL:-60}
LOG_FILE="/app/logs/materialized_refresh.log"

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

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

# Function to check PostgreSQL connectivity
check_postgres_connection() {
    log "INFO" "Checking PostgreSQL connectivity..."
    
    if PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" > /dev/null 2>&1; then
        log "INFO" "PostgreSQL connection successful"
        return 0
    else
        log "ERROR" "PostgreSQL connection failed"
        return 1
    fi
}

# Function to refresh materialized view
refresh_materialized_view() {
    log "INFO" "Refreshing materialized view: company_prospect_view"
    
    local start_time=$(date +%s)
    
    if PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "REFRESH MATERIALIZED VIEW CONCURRENTLY company_prospect_view;" > /dev/null 2>&1; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        log "INFO" "Materialized view refreshed successfully in ${duration}s"
        
        # Get record count
        local record_count=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM company_prospect_view;" 2>/dev/null | tr -d ' ')
        log "INFO" "Materialized view contains $record_count records"
        
        return 0
    else
        log "ERROR" "Failed to refresh materialized view"
        return 1
    fi
}

# Function to check if refresh is needed
check_refresh_needed() {
    log "INFO" "Checking if materialized view refresh is needed..."
    
    # Get last refresh time from materialized view
    local last_refresh=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT MAX(last_updated) FROM company_prospect_view;" 2>/dev/null | tr -d ' ')
    
    # Get last update time from base tables
    local last_company_update=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT MAX(\"updatedAt\") FROM \"Company\";" 2>/dev/null | tr -d ' ')
    local last_prospect_update=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT MAX(\"updatedAt\") FROM \"Prospect\";" 2>/dev/null | tr -d ' ')
    
    log "INFO" "Last materialized view update: $last_refresh"
    log "INFO" "Last Company update: $last_company_update"
    log "INFO" "Last Prospect update: $last_prospect_update"
    
    # Check if any base table was updated after the last refresh
    if [ "$last_company_update" \> "$last_refresh" ] || [ "$last_prospect_update" \> "$last_refresh" ]; then
        log "INFO" "Changes detected, refresh needed"
        return 0
    else
        log "INFO" "No changes detected, skipping refresh"
        return 1
    fi
}

# Function to notify Logstash of refresh
notify_logstash() {
    log "INFO" "Notifying Logstash of materialized view refresh..."
    
    # Clear Logstash checkpoint to trigger sync
    if [ -f "/usr/share/logstash/data/checkpoints/materialized_last_run" ]; then
        rm -f "/usr/share/logstash/data/checkpoints/materialized_last_run"
        log "INFO" "Cleared Logstash checkpoint"
    fi
    
    # Send notification to Logstash (if HTTP API is available)
    if curl -f "http://logstash:9600/_node/stats" > /dev/null 2>&1; then
        log "INFO" "Logstash is available, sync will be triggered automatically"
    else
        log "WARN" "Logstash HTTP API not available, manual sync may be required"
    fi
}

# Function to perform refresh cycle
perform_refresh_cycle() {
    log "INFO" "Starting materialized view refresh cycle..."
    
    if ! check_postgres_connection; then
        log "ERROR" "Cannot connect to PostgreSQL, skipping refresh cycle"
        return 1
    fi
    
    if check_refresh_needed; then
        if refresh_materialized_view; then
            notify_logstash
            log "INFO" "Refresh cycle completed successfully"
        else
            log "ERROR" "Refresh cycle failed"
            return 1
        fi
    else
        log "INFO" "No refresh needed, cycle completed"
    fi
}

# Function to show status
show_status() {
    log "INFO" "Materialized View Refresh Service Status"
    log "INFO" "========================================"
    log "INFO" "Refresh Interval: ${REFRESH_INTERVAL} seconds"
    log "INFO" "PostgreSQL Host: $POSTGRES_HOST:$POSTGRES_PORT"
    log "INFO" "Database: $POSTGRES_DB"
    log "INFO" "Log File: $LOG_FILE"
}

# Main execution
main() {
    log "INFO" "Starting Materialized View Refresh Service"
    log "INFO" "=========================================="
    
    show_status
    
    # Initial refresh
    log "INFO" "Performing initial refresh..."
    perform_refresh_cycle
    
    # Main loop
    log "INFO" "Starting refresh loop (every ${REFRESH_INTERVAL} seconds)..."
    
    while true; do
        sleep "$REFRESH_INTERVAL"
        perform_refresh_cycle
    done
}

# Handle signals
trap 'log "INFO" "Received shutdown signal, stopping service..."; exit 0' SIGTERM SIGINT

# Run main function
main "$@"

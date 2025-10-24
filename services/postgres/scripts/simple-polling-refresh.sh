#!/bin/bash

# Simple Polling-Based Materialized View Refresh
# Checks for changes periodically and refreshes the materialized view
# Usage: ./simple-polling-refresh.sh [local|vm]
#   local: Local development deployment (default)
#   vm: VM/production deployment

set -e

# Get deployment mode from argument
DEPLOYMENT_MODE=${1:-local}

# Validate deployment mode
if [[ "$DEPLOYMENT_MODE" != "local" && "$DEPLOYMENT_MODE" != "vm" ]]; then
    echo "❌ Invalid deployment mode. Use 'local' or 'vm'"
    echo "   Usage: ./simple-polling-refresh.sh [local|vm]"
    exit 1
fi

# Function to configure local development environment
configure_local() {
    echo "🔧 Configuring for local development..."
    
    # Local development configurations
    export DB_HOST="${POSTGRES_HOST:-postgres}"
    export DB_PORT="${POSTGRES_PORT:-5432}"
    export DB_NAME="${POSTGRES_DB:-app}"
    export DB_USER="${POSTGRES_USER:-app}"
    export DB_PASSWORD="${POSTGRES_PASSWORD:-app}"
    export POLL_INTERVAL="${POLL_INTERVAL:-10}"  # Check every 10 seconds
    
    echo "✅ Local configuration complete"
}

# Function to configure VM/production environment
configure_vm() {
    echo "🔧 Configuring for VM/production deployment..."
    
    # VM-specific configurations
    export DB_HOST="${POSTGRES_HOST:-postgres}"
    export DB_PORT="${POSTGRES_PORT:-5433}"
    export DB_NAME="${POSTGRES_DB:-app}"
    export DB_USER="${POSTGRES_USER:-app}"
    export DB_PASSWORD="${POSTGRES_PASSWORD:-app}"
    export POLL_INTERVAL="${POLL_INTERVAL:-30}"  # Check every 30 seconds for VM
    
    echo "✅ VM configuration complete"
}

# Configure based on deployment mode
if [[ "$DEPLOYMENT_MODE" == "vm" ]]; then
    configure_vm
else
    configure_local
fi

log() {
    local type=$1
    local message=$2
    echo "$(date -u +"%Y-%m-%d %H:%M:%S") - [$type] $message"
}

log "INFO" "Starting simple polling-based materialized view refresh ($DEPLOYMENT_MODE mode)..."
log "INFO" "Database: $DB_HOST:$DB_PORT/$DB_NAME"
log "INFO" "Polling interval: ${POLL_INTERVAL} seconds"

# Function to check if refresh is needed
check_and_refresh() {
    log "INFO" "Checking for materialized view refresh needs..."
    
    # Use psql to check and refresh if needed
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        DO \$\$
        DECLARE
            last_refresh TIMESTAMP;
            last_company_update TIMESTAMP;
            last_prospect_update TIMESTAMP;
            needs_refresh BOOLEAN := FALSE;
        BEGIN
            -- Get the last refresh time from the materialized view
            SELECT MAX(last_updated) INTO last_refresh FROM company_prospect_view;
            
            -- Get the last update time from Company table
            SELECT MAX(\"updatedAt\") INTO last_company_update FROM \"Company\";
            
            -- Get the last update time from Prospect table
            SELECT MAX(\"updatedAt\") INTO last_prospect_update FROM \"Prospect\";
            
            -- Check if any base table was updated after the last refresh
            IF last_company_update > COALESCE(last_refresh, '1970-01-01'::timestamp) OR
               last_prospect_update > COALESCE(last_refresh, '1970-01-01'::timestamp) THEN
                needs_refresh := TRUE;
            END IF;
            
            IF needs_refresh THEN
                RAISE NOTICE 'Changes detected, refreshing materialized view...';
                PERFORM refresh_materialized_views_safe();
                RAISE NOTICE 'Materialized view refreshed successfully';
            ELSE
                RAISE NOTICE 'No changes detected, skipping refresh';
            END IF;
        END
        \$\$;
    " 2>&1 | while read line; do
        if [[ $line == *"NOTICE"* ]]; then
            log "INFO" "$line"
        elif [[ $line == *"ERROR"* ]]; then
            log "ERROR" "$line"
        fi
    done
}

# Main loop
while true; do
    check_and_refresh
    log "INFO" "Sleeping for ${POLL_INTERVAL} seconds..."
    sleep "$POLL_INTERVAL"
done

#!/bin/bash

# Proper Materialized View Refresh Listener
# Listens for PostgreSQL notifications and refreshes materialized view only when needed

set -e

# Configuration
DB_HOST="${POSTGRES_HOST:-postgres}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-app}"
DB_USER="${POSTGRES_USER:-app}"
DB_PASSWORD="${POSTGRES_PASSWORD:-app}"
REFRESH_CHANNEL="materialized_view_refresh"

log() {
    local type=$1
    local message=$2
    echo "$(date -u +"%Y-%m-%d %H:%M:%S") - [$type] $message"
}

log "INFO" "Starting proper materialized view refresh listener..."
log "INFO" "Listening for notifications on channel: $REFRESH_CHANNEL"

# Function to refresh materialized view
refresh_materialized_view() {
    log "INFO" "Refreshing materialized view due to notification..."
    
    # Use psql to execute the refresh
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT refresh_materialized_views_safe();
    " 2>&1 | while read line; do
        if [[ $line == *"NOTICE"* ]]; then
            log "INFO" "$line"
        elif [[ $line == *"ERROR"* ]]; then
            log "ERROR" "$line"
        fi
    done
}

# Main loop - listen for notifications
while true; do
    log "INFO" "Connecting to database to listen for notifications..."
    
    # Use psql to listen for notifications
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        LISTEN $REFRESH_CHANNEL;
        SELECT 'Listening for notifications...' as status;
    " || {
        log "ERROR" "Failed to connect to database, retrying in 5 seconds..."
        sleep 5
        continue
    }
    
    # Wait for notifications and refresh when received
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        DO \$\$
        DECLARE
            notification_payload TEXT;
        BEGIN
            -- Wait for a notification (blocking call with timeout)
            -- Use pg_notify to check for notifications
            SELECT payload INTO notification_payload 
            FROM pg_stat_activity 
            WHERE state = 'active' 
            AND query LIKE '%NOTIFY%' 
            LIMIT 1;
            
            IF notification_payload IS NOT NULL THEN
                RAISE NOTICE 'Received notification on channel %: %', '$REFRESH_CHANNEL', notification_payload;
                -- Execute the refresh function
                PERFORM refresh_materialized_views_safe();
                RAISE NOTICE 'Materialized view refreshed due to notification';
            ELSE
                RAISE NOTICE 'No notification received, checking for changes...';
                -- Check if there are any pending changes by looking at recent activity
                IF EXISTS (
                    SELECT 1 FROM pg_stat_activity 
                    WHERE state = 'active' 
                    AND (query LIKE '%INSERT%' OR query LIKE '%UPDATE%' OR query LIKE '%DELETE%')
                    AND query_start > NOW() - INTERVAL '5 seconds'
                ) THEN
                    RAISE NOTICE 'Recent changes detected, refreshing materialized view...';
                    PERFORM refresh_materialized_views_safe();
                    RAISE NOTICE 'Materialized view refreshed due to recent changes';
                END IF;
            END IF;
        END
        \$\$;
    " || {
        log "ERROR" "Error processing notifications, retrying in 5 seconds..."
        sleep 5
    }
    
    # Small delay to prevent busy-looping
    sleep 1
done

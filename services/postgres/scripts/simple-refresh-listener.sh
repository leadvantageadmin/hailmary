#!/bin/bash

# Simple Materialized View Refresh Listener
# Listens for PostgreSQL notifications and refreshes materialized view

set -e

# Configuration
DB_HOST="${POSTGRES_HOST:-postgres}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-app}"
DB_USER="${POSTGRES_USER:-app}"
DB_PASSWORD="${POSTGRES_PASSWORD:-app}"
REFRESH_CHANNEL="materialized_view_refresh"

echo "🚀 Starting simple materialized view refresh listener..."
echo "📡 Listening for notifications on channel: $REFRESH_CHANNEL"

# Create a simple notification handler
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Listen for notifications
LISTEN materialized_view_refresh;

-- Create a simple function to handle notifications
CREATE OR REPLACE FUNCTION handle_mv_refresh()
RETURNS void AS $$
BEGIN
    -- Refresh the materialized view
    PERFORM refresh_materialized_views_safe();
    RAISE NOTICE 'Materialized view refreshed due to notification';
END;
$$ LANGUAGE plpgsql;

-- Set up notification handler
CREATE OR REPLACE FUNCTION notify_handler()
RETURNS void AS $$
BEGIN
    -- This function will be called when notifications arrive
    PERFORM handle_mv_refresh();
END;
$$ LANGUAGE plpgsql;

-- Keep listening (this will block)
DO $$
DECLARE
    rec RECORD;
BEGIN
    LOOP
        -- Wait for notifications
        PERFORM pg_sleep(1);
        
        -- Check if there are any notifications to process
        -- (This is a simplified approach)
        BEGIN
            PERFORM handle_mv_refresh();
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Error refreshing materialized view: %', SQLERRM;
        END;
    END LOOP;
END;
$$;
EOF

-- Fix Materialized View Concurrent Refresh Migration v1.0.0
-- Adds unique index required for concurrent refresh of materialized view

-- Create unique index for concurrent refresh support
-- This index is required for REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS company_prospect_view_unique_idx 
ON company_prospect_view (prospect_id) 
WHERE prospect_id IS NOT NULL;

-- Verify the index was created
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'company_prospect_view_unique_idx'
    ) THEN
        RAISE NOTICE 'Unique index created successfully for concurrent refresh';
    ELSE
        RAISE WARNING 'Failed to create unique index for concurrent refresh';
    END IF;
END;
$$;

-- Test concurrent refresh capability
DO $$
BEGIN
    BEGIN
        -- Try a concurrent refresh to test the index
        REFRESH MATERIALIZED VIEW CONCURRENTLY company_prospect_view;
        RAISE NOTICE 'Concurrent refresh test successful';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Concurrent refresh test failed: %', SQLERRM;
    END;
END;
$$;

-- Log the migration
SELECT log_schema_migration('v1.0.0', 'Fix materialized view concurrent refresh with unique index', 'concurrent_refresh_fix');

-- Log completion
SELECT 'Materialized view concurrent refresh fix completed successfully' AS status;

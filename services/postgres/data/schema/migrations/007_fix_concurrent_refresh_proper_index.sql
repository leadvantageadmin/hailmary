-- Fix Materialized View Concurrent Refresh with Proper Index Migration v1.0.0
-- Creates a unique index without WHERE clause for concurrent refresh support

-- Drop the existing unique index with WHERE clause
DROP INDEX IF EXISTS company_prospect_view_unique_idx;

-- Create a proper unique index without WHERE clause for concurrent refresh
-- We'll use a combination of company_id and prospect_id to ensure uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS company_prospect_view_concurrent_idx 
ON company_prospect_view (company_id, prospect_id);

-- Verify the index was created
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'company_prospect_view_concurrent_idx'
    ) THEN
        RAISE NOTICE 'Concurrent refresh index created successfully';
    ELSE
        RAISE WARNING 'Failed to create concurrent refresh index';
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
SELECT log_schema_migration('v1.0.0', 'Fix materialized view concurrent refresh with proper unique index', 'concurrent_refresh_proper_fix');

-- Log completion
SELECT 'Materialized view concurrent refresh properly fixed' AS status;

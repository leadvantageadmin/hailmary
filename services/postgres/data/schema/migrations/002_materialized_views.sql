-- Materialized Views Migration v1.0.0
-- Creates materialized views for performance optimization

-- Create company-prospect materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS company_prospect_view AS
SELECT
    c.id AS company_id,
    c.domain,
    c.name AS company_name,
    c.industry,
    c.revenue,
    p.id AS prospect_id,
    p."firstName",
    p."lastName",
    p.email,
    p."jobTitle"
FROM "Company" c
JOIN "Prospect" p ON c.id = p."companyId";

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS company_prospect_view_prospect_id_idx 
ON company_prospect_view (prospect_id);

-- Create function for safe materialized view refresh
CREATE OR REPLACE FUNCTION refresh_materialized_views_safe()
RETURNS VOID AS $$
DECLARE
    start_time timestamptz;
    end_time timestamptz;
    duration_ms int;
    view_name text;
    error_message text;
BEGIN
    view_name := 'company_prospect_view';
    start_time := clock_timestamp();
    
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY company_prospect_view;
        end_time := clock_timestamp();
        duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
        
        INSERT INTO "MaterializedViewLog" ("viewName", "refreshType", "refreshedAt", "durationMs")
        VALUES (view_name, 'manual', NOW(), duration_ms);
        
        RAISE NOTICE 'Materialized view % refreshed successfully in % ms', view_name, duration_ms;
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
            INSERT INTO "MaterializedViewError" ("viewName", "errorMessage", "occurredAt")
            VALUES (view_name, error_message, NOW());
            RAISE WARNING 'Failed to refresh materialized view %: %', view_name, error_message;
    END;
END;
$$ LANGUAGE plpgsql;

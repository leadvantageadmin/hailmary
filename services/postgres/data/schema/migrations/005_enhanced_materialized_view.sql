-- Enhanced Materialized View Migration v2.0.0
-- Updates materialized view to include all fields required by web service

-- Drop existing materialized view and its indexes
DROP MATERIALIZED VIEW IF EXISTS company_prospect_view CASCADE;

-- Create enhanced company-prospect materialized view with all required fields
CREATE MATERIALIZED VIEW company_prospect_view AS
SELECT
    -- Company fields
    c.id AS company_id,
    c.domain,
    c.name AS company_name,
    c.industry,
    c.revenue,
    c."minEmployeeSize",
    c."maxEmployeeSize",
    c.address AS company_address,
    c.city AS company_city,
    c.state AS company_state,
    c.country AS company_country,
    c."zipCode" AS company_zipCode,
    c.phone AS company_phone,
    c."mobilePhone" AS company_mobilePhone,
    c."externalSource" AS company_externalSource,
    c."externalId" AS company_externalId,
    c."createdAt" AS company_createdAt,
    c."updatedAt" AS company_updatedAt,
    
    -- Prospect fields
    p.id AS prospect_id,
    p.salutation,
    p."firstName",
    p."lastName",
    p.email,
    p."jobTitle",
    p."jobTitleLevel",
    p.department,
    p."jobTitleLink",
    p.address AS prospect_address,
    p.city AS prospect_city,
    p.state AS prospect_state,
    p.country AS prospect_country,
    p."zipCode" AS prospect_zipCode,
    p.phone AS prospect_phone,
    p."mobilePhone" AS prospect_mobilePhone,
    p."companyId",
    p."externalSource" AS prospect_externalSource,
    p."externalId" AS prospect_externalId,
    p."createdAt" AS prospect_createdAt,
    p."updatedAt" AS prospect_updatedAt,
    
    -- Computed fields for search optimization
    CONCAT(p."firstName", ' ', p."lastName") AS fullName,
    CONCAT(c.name, ' ', COALESCE(c.industry, '')) AS companyContext,
    
    -- Timestamps for CDC
    GREATEST(c."updatedAt", p."updatedAt") AS last_updated
    
FROM "Company" c
LEFT JOIN "Prospect" p ON c.id = p."companyId";

-- Create comprehensive indexes for optimal search performance
CREATE UNIQUE INDEX company_prospect_view_prospect_id_idx 
ON company_prospect_view (prospect_id) 
WHERE prospect_id IS NOT NULL;

CREATE INDEX company_prospect_view_company_id_idx 
ON company_prospect_view (company_id);

CREATE INDEX company_prospect_view_company_name_idx 
ON company_prospect_view (company_name);

CREATE INDEX company_prospect_view_industry_idx 
ON company_prospect_view (industry);

CREATE INDEX company_prospect_view_company_country_idx 
ON company_prospect_view (company_country);

CREATE INDEX company_prospect_view_company_city_idx 
ON company_prospect_view (company_city);

CREATE INDEX company_prospect_view_company_state_idx 
ON company_prospect_view (company_state);

CREATE INDEX company_prospect_view_job_title_idx 
ON company_prospect_view (jobTitle);

CREATE INDEX company_prospect_view_job_title_level_idx 
ON company_prospect_view (jobTitleLevel);

CREATE INDEX company_prospect_view_department_idx 
ON company_prospect_view (department);

CREATE INDEX company_prospect_view_email_idx 
ON company_prospect_view (email);

CREATE INDEX company_prospect_view_full_name_idx 
ON company_prospect_view (fullName);

CREATE INDEX company_prospect_view_min_employee_size_idx 
ON company_prospect_view (minEmployeeSize);

CREATE INDEX company_prospect_view_max_employee_size_idx 
ON company_prospect_view (maxEmployeeSize);

CREATE INDEX company_prospect_view_revenue_idx 
ON company_prospect_view (revenue);

CREATE INDEX company_prospect_view_last_updated_idx 
ON company_prospect_view (last_updated);

-- Create function for incremental materialized view refresh
CREATE OR REPLACE FUNCTION refresh_materialized_views_safe()
RETURNS VOID AS $$
DECLARE
    start_time timestamptz;
    end_time timestamptz;
    duration_ms int;
    view_name text;
    error_message text;
    record_count int;
BEGIN
    view_name := 'company_prospect_view';
    start_time := clock_timestamp();
    
    BEGIN
        -- Get record count before refresh
        SELECT COUNT(*) INTO record_count FROM company_prospect_view;
        
        -- Refresh materialized view concurrently to avoid blocking
        REFRESH MATERIALIZED VIEW CONCURRENTLY company_prospect_view;
        
        end_time := clock_timestamp();
        duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
        
        -- Log successful refresh
        INSERT INTO "MaterializedViewLog" ("viewName", "refreshType", "refreshedAt", "durationMs", "recordsProcessed")
        VALUES (view_name, 'manual', NOW(), duration_ms, record_count);
        
        RAISE NOTICE 'Materialized view % refreshed successfully in % ms with % records', view_name, duration_ms, record_count;
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
            INSERT INTO "MaterializedViewError" ("viewName", "errorMessage", "occurredAt")
            VALUES (view_name, error_message, NOW());
            RAISE WARNING 'Failed to refresh materialized view %: %', view_name, error_message;
    END;
END;
$$ LANGUAGE plpgsql;

-- Create function for automatic refresh on data changes
CREATE OR REPLACE FUNCTION trigger_materialized_view_refresh()
RETURNS TRIGGER AS $$
BEGIN
    -- Schedule a refresh (non-blocking)
    PERFORM pg_notify('materialized_view_refresh', 'company_prospect_view');
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic refresh
CREATE TRIGGER company_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "Company"
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_materialized_view_refresh();

CREATE TRIGGER prospect_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "Prospect"
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_materialized_view_refresh();

-- Create function to handle refresh notifications
CREATE OR REPLACE FUNCTION handle_materialized_view_refresh()
RETURNS VOID AS $$
DECLARE
    notification record;
BEGIN
    -- Listen for refresh notifications
    FOR notification IN 
        SELECT * FROM pg_notification_queue 
        WHERE channel = 'materialized_view_refresh'
    LOOP
        -- Perform the refresh
        PERFORM refresh_materialized_views_safe();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Log the migration
SELECT log_schema_migration('v2.0.0', 'Enhanced materialized view with all required fields', 'enhanced_mv');

-- Initial refresh of the materialized view
SELECT refresh_materialized_views_safe();

-- Log completion
SELECT 'Enhanced materialized view created successfully' AS status;

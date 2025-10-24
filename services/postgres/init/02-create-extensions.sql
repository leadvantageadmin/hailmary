-- HailMary PostgreSQL Extensions Setup
-- This script creates necessary PostgreSQL extensions

-- Connect to the app database
\c app;

-- Enable PostGIS extension for geospatial data
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder;

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_stat_statements for query performance monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Enable pg_trgm for text similarity and full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable unaccent for text normalization
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Enable btree_gin and btree_gist for better indexing
CREATE EXTENSION IF NOT EXISTS btree_gin;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Enable hstore for key-value storage
CREATE EXTENSION IF NOT EXISTS hstore;

-- Enable ltree for hierarchical data
CREATE EXTENSION IF NOT EXISTS ltree;

-- Enable pgcrypto for cryptographic functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enable citext for case-insensitive text
CREATE EXTENSION IF NOT EXISTS citext;

-- Create a function to get extension information
CREATE OR REPLACE FUNCTION get_extension_info()
RETURNS TABLE (
    extname TEXT,
    extversion TEXT,
    extrelocatable BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.extname::TEXT,
        e.extversion::TEXT,
        e.extrelocatable
    FROM pg_extension e
    ORDER BY e.extname;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_extension_info TO app;

-- Log the extensions setup
SELECT log_schema_migration('v0.0.1', 'PostgreSQL extensions setup', 'extensions');

-- Display installed extensions
SELECT 'Installed Extensions:' AS info;
SELECT * FROM get_extension_info();

-- Log completion
SELECT 'Extensions setup completed successfully' AS status;

-- HailMary PostgreSQL Database Initialization
-- This script runs when the database is first created

-- Create the main application database if it doesn't exist
-- (This is handled by POSTGRES_DB environment variable, but we ensure it exists)
SELECT 'CREATE DATABASE app' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'app')\gexec

-- Connect to the app database
\c app;

-- Create application user if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app') THEN
        CREATE ROLE app WITH LOGIN PASSWORD 'app';
    END IF;
END
$$;

-- Grant necessary permissions to the app user
GRANT ALL PRIVILEGES ON DATABASE app TO app;
GRANT ALL PRIVILEGES ON SCHEMA public TO app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO app;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO app;

-- Create a schema version tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(50) NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT NOW(),
    description TEXT,
    checksum VARCHAR(64)
);

-- Grant permissions on schema_migrations table
GRANT ALL PRIVILEGES ON TABLE schema_migrations TO app;
GRANT ALL PRIVILEGES ON SEQUENCE schema_migrations_id_seq TO app;

-- Create a function to log schema migrations
CREATE OR REPLACE FUNCTION log_schema_migration(
    p_version VARCHAR(50),
    p_description TEXT DEFAULT NULL,
    p_checksum VARCHAR(64) DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO schema_migrations (version, description, checksum, applied_at)
    VALUES (p_version, p_description, p_checksum, NOW())
    ON CONFLICT (version) DO UPDATE SET
        description = EXCLUDED.description,
        checksum = EXCLUDED.checksum,
        applied_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION log_schema_migration TO app;

-- Log the initial database setup
SELECT log_schema_migration('v0.0.0', 'Initial database setup', 'initial');

-- Create a function to check if a migration has been applied
CREATE OR REPLACE FUNCTION is_migration_applied(p_version VARCHAR(50))
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM schema_migrations WHERE version = p_version);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION is_migration_applied TO app;

-- Create a view to show migration status
CREATE OR REPLACE VIEW migration_status AS
SELECT 
    version,
    description,
    applied_at,
    checksum
FROM schema_migrations
ORDER BY applied_at DESC;

-- Grant select permission on the view
GRANT SELECT ON migration_status TO app;

-- Set timezone to UTC
SET timezone = 'UTC';

-- Log completion
SELECT 'Database initialization completed successfully' AS status;

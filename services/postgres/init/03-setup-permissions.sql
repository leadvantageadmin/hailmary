-- HailMary PostgreSQL Permissions Setup
-- This script sets up proper permissions and security

-- Connect to the app database
\c app;

-- Create additional roles for different access levels
DO $$
BEGIN
    -- Create read-only role
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_readonly') THEN
        CREATE ROLE app_readonly WITH LOGIN PASSWORD 'app_readonly';
    END IF;
    
    -- Create write role
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_write') THEN
        CREATE ROLE app_write WITH LOGIN PASSWORD 'app_write';
    END IF;
    
    -- Create admin role
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_admin') THEN
        CREATE ROLE app_admin WITH LOGIN PASSWORD 'app_admin';
    END IF;
END
$$;

-- Grant basic permissions to read-only role
GRANT CONNECT ON DATABASE app TO app_readonly;
GRANT USAGE ON SCHEMA public TO app_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_readonly;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO app_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO app_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO app_readonly;

-- Grant write permissions to write role
GRANT CONNECT ON DATABASE app TO app_write;
GRANT USAGE ON SCHEMA public TO app_write;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_write;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_write;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_write;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_write;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_write;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO app_write;

-- Grant admin permissions to admin role
GRANT ALL PRIVILEGES ON DATABASE app TO app_admin;
GRANT ALL PRIVILEGES ON SCHEMA public TO app_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_admin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO app_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO app_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO app_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO app_admin;

-- Create a function to check user permissions
CREATE OR REPLACE FUNCTION check_user_permissions(p_username TEXT)
RETURNS TABLE (
    permission_type TEXT,
    granted BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'CONNECT'::TEXT,
        has_database_privilege(p_username, 'app', 'CONNECT')
    UNION ALL
    SELECT 
        'CREATE'::TEXT,
        has_schema_privilege(p_username, 'public', 'CREATE')
    UNION ALL
    SELECT 
        'USAGE'::TEXT,
        has_schema_privilege(p_username, 'public', 'USAGE')
    UNION ALL
    SELECT 
        'SELECT'::TEXT,
        has_table_privilege(p_username, 'schema_migrations', 'SELECT')
    UNION ALL
    SELECT 
        'INSERT'::TEXT,
        has_table_privilege(p_username, 'schema_migrations', 'INSERT')
    UNION ALL
    SELECT 
        'UPDATE'::TEXT,
        has_table_privilege(p_username, 'schema_migrations', 'UPDATE')
    UNION ALL
    SELECT 
        'DELETE'::TEXT,
        has_table_privilege(p_username, 'schema_migrations', 'DELETE');
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION check_user_permissions TO app;

-- Create a function to list all users and their roles
CREATE OR REPLACE FUNCTION list_users_and_roles()
RETURNS TABLE (
    username TEXT,
    is_superuser BOOLEAN,
    can_login BOOLEAN,
    member_of TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.rolname::TEXT,
        r.rolsuper,
        r.rolcanlogin,
        ARRAY(
            SELECT m.rolname 
            FROM pg_auth_members am 
            JOIN pg_roles m ON am.roleid = m.oid 
            WHERE am.member = r.oid
        )
    FROM pg_roles r
    WHERE r.rolname LIKE 'app%'
    ORDER BY r.rolname;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION list_users_and_roles TO app;

-- Create a view for user management
CREATE OR REPLACE VIEW user_management AS
SELECT 
    r.rolname AS username,
    r.rolsuper AS is_superuser,
    r.rolcanlogin AS can_login,
    r.rolcreatedb AS can_create_db,
    r.rolcreaterole AS can_create_role,
    r.rolinherit AS inherits_privileges,
    r.rolreplication AS can_replicate,
    r.rolbypassrls AS bypasses_rls,
    r.rolconnlimit AS connection_limit,
    r.rolvaliduntil AS password_expires
FROM pg_roles r
WHERE r.rolname LIKE 'app%'
ORDER BY r.rolname;

-- Grant select permission on the view
GRANT SELECT ON user_management TO app;

-- Set up row-level security for sensitive tables (if needed in the future)
-- ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;

-- Create a function to audit user connections
CREATE OR REPLACE FUNCTION audit_user_connection()
RETURNS TRIGGER AS $$
BEGIN
    -- Log connection attempts (this would be enhanced with actual logging)
    INSERT INTO schema_migrations (version, description, applied_at)
    VALUES (
        'audit_' || extract(epoch from now())::text,
        'User connection: ' || current_user || ' at ' || now()::text,
        now()
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Log the permissions setup
SELECT log_schema_migration('v0.0.2', 'PostgreSQL permissions and security setup', 'permissions');

-- Display user information
SELECT 'User Roles Created:' AS info;
SELECT * FROM list_users_and_roles();

-- Log completion
SELECT 'Permissions setup completed successfully' AS status;

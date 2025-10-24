#!/bin/bash
set -e

# PostgreSQL Migration Runner Script
# Runs database migrations from the schema service
# Usage: ./run-migrations.sh [local|vm]
#   local: Local development deployment (default)
#   vm: VM/production deployment

# Get deployment mode from argument
DEPLOYMENT_MODE=${1:-local}

# Validate deployment mode
if [[ "$DEPLOYMENT_MODE" != "local" && "$DEPLOYMENT_MODE" != "vm" ]]; then
    echo "❌ Invalid deployment mode. Use 'local' or 'vm'"
    echo "   Usage: ./run-migrations.sh [local|vm]"
    exit 1
fi

echo "🔄 Running PostgreSQL migrations ($DEPLOYMENT_MODE mode)..."

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"

# Change to service directory
cd "$SERVICE_DIR"

# Function to configure local development environment
configure_local() {
    echo "🔧 Configuring for local development..."
    
    # Local development configurations
    export SCHEMA_DIR=${SCHEMA_DIR:-"./data/schema"}
    export DATABASE_URL=${DATABASE_URL:-"postgresql://app:app@localhost:5432/app"}
    export POSTGRES_USER=${POSTGRES_USER:-app}
    export POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-app}
    export POSTGRES_DB=${POSTGRES_DB:-app}
    export POSTGRES_PORT=${POSTGRES_PORT:-5432}
    
    echo "✅ Local configuration complete"
}

# Function to configure VM/production environment
configure_vm() {
    echo "🔧 Configuring for VM/production deployment..."
    
    # VM-specific configurations
    export SCHEMA_DIR=${SCHEMA_DIR:-"/opt/hailmary/services/postgres/data/schema"}
    export DATABASE_URL=${DATABASE_URL:-"postgresql://app:app@localhost:5433/app"}
    export POSTGRES_USER=${POSTGRES_USER:-app}
    export POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-app}
    export POSTGRES_DB=${POSTGRES_DB:-app}
    export POSTGRES_PORT=${POSTGRES_PORT:-5433}
    
    echo "✅ VM configuration complete"
}

# Configure based on deployment mode
if [[ "$DEPLOYMENT_MODE" == "vm" ]]; then
    configure_vm
else
    configure_local
fi

# Load environment variables if .env file exists
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

echo "🔍 Configuration:"
echo "   • Schema Directory: $SCHEMA_DIR"
echo "   • Database: $POSTGRES_DB"
echo "   • User: $POSTGRES_USER"

# Check if PostgreSQL is running
if ! docker compose ps postgres | grep -q "Up"; then
    echo "❌ PostgreSQL service is not running"
    echo "   Start it with: ./scripts/start.sh"
    exit 1
fi

# Check if schema directory exists
if [ ! -d "$SCHEMA_DIR" ]; then
    echo "❌ Schema directory not found: $SCHEMA_DIR"
    echo "   Pull schema first with: ./scripts/pull-schema.sh"
    exit 1
fi

# Check if migrations directory exists
if [ ! -d "$SCHEMA_DIR/migrations" ]; then
    echo "❌ Migrations directory not found: $SCHEMA_DIR/migrations"
    echo "   Pull schema first with: ./scripts/pull-schema.sh"
    exit 1
fi

# Get list of migration files
MIGRATION_FILES=($(find "$SCHEMA_DIR/migrations" -name "*.sql" | sort))
MIGRATION_COUNT=${#MIGRATION_FILES[@]}

if [ $MIGRATION_COUNT -eq 0 ]; then
    echo "⚠️  No migration files found in $SCHEMA_DIR/migrations"
    exit 0
fi

echo "📋 Found $MIGRATION_COUNT migration files:"
for file in "${MIGRATION_FILES[@]}"; do
    echo "   • $(basename "$file")"
done

# Check current migration status
echo ""
echo "🔍 Checking current migration status..."
CURRENT_MIGRATIONS=$(docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM schema_migrations;" 2>/dev/null | tr -d ' \n' || echo "0")
echo "   • Current migrations applied: $CURRENT_MIGRATIONS"

# Run migrations
echo ""
echo "🔄 Running migrations..."

MIGRATIONS_APPLIED=0
MIGRATIONS_FAILED=0

for migration_file in "${MIGRATION_FILES[@]}"; do
    migration_name=$(basename "$migration_file")
    migration_version=$(echo "$migration_name" | sed 's/^[0-9]*_//' | sed 's/\.sql$//')
    
    echo "📋 Processing: $migration_name"
    
    # Check if migration has already been applied
    if docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT 1 FROM schema_migrations WHERE version = '$migration_version';" | grep -q "1"; then
        echo "   ⏭️  Migration already applied, skipping"
        continue
    fi
    
    # Run the migration
    echo "   🔄 Applying migration..."
    if docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "/app/schema/migrations/$migration_name"; then
        echo "   ✅ Migration applied successfully"
        
        # Log the migration
        docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "INSERT INTO schema_migrations (version, description, applied_at) VALUES ('$migration_version', 'Applied migration: $migration_name', NOW());"
        
        MIGRATIONS_APPLIED=$((MIGRATIONS_APPLIED + 1))
    else
        echo "   ❌ Migration failed"
        MIGRATIONS_FAILED=$((MIGRATIONS_FAILED + 1))
    fi
done

# Summary
echo ""
echo "📊 Migration Summary:"
echo "   • Migrations applied: $MIGRATIONS_APPLIED"
echo "   • Migrations failed: $MIGRATIONS_FAILED"
echo "   • Total migrations: $MIGRATION_COUNT"

if [ $MIGRATIONS_FAILED -eq 0 ]; then
    echo ""
    echo "✅ All migrations completed successfully!"
    
    # Show final migration status
    FINAL_MIGRATIONS=$(docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM schema_migrations;" | tr -d ' \n')
    echo "   • Total migrations in database: $FINAL_MIGRATIONS"
    
    echo ""
    echo "🔧 Next steps:"
    echo "   • Check database schema: ./scripts/validate-schema.sh $DEPLOYMENT_MODE"
    echo "   • View migration history: docker compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c 'SELECT * FROM schema_migrations ORDER BY applied_at DESC;'"
    echo "   • Health check: ./scripts/health-check.sh $DEPLOYMENT_MODE"
    echo "   • Start materialized view refresh: ./scripts/materialized-view-refresh-service.sh $DEPLOYMENT_MODE"
else
    echo ""
    echo "❌ Some migrations failed. Please check the errors above."
    echo ""
    echo "🔧 Troubleshooting:"
    echo "   • Check PostgreSQL logs: ./scripts/logs.sh $DEPLOYMENT_MODE"
    echo "   • Verify schema files: ls -la $SCHEMA_DIR/migrations/"
    echo "   • Check database connection: docker compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c 'SELECT 1;'"
    echo "   • Check PostgreSQL status: docker compose ps postgres"
    exit 1
fi

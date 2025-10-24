#!/bin/bash
set -e

# PostgreSQL Service Start Script
# Starts the PostgreSQL service with proper configuration
# Usage: ./start.sh [local|vm]
#   local: Local development deployment (default)
#   vm: VM/production deployment

# Get deployment mode from argument
DEPLOYMENT_MODE=${1:-local}

# Validate deployment mode
if [[ "$DEPLOYMENT_MODE" != "local" && "$DEPLOYMENT_MODE" != "vm" ]]; then
    echo "❌ Invalid deployment mode. Use 'local' or 'vm'"
    echo "   Usage: ./start.sh [local|vm]"
    exit 1
fi

echo "🚀 Starting HailMary PostgreSQL Service ($DEPLOYMENT_MODE mode)..."

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"

# Change to service directory
cd "$SERVICE_DIR"

# Function to configure local development environment
configure_local() {
    echo "🔧 Configuring for local development..."
    
    # Local development configurations
    export POSTGRES_DATA_PATH=${POSTGRES_DATA_PATH:-./data/postgres}
    export POSTGRES_LOGS_PATH=${POSTGRES_LOGS_PATH:-./logs/postgres}
    export SCHEMA_DATA_PATH=${SCHEMA_DATA_PATH:-./data/schema}
    export PGADMIN_DATA_PATH=${PGADMIN_DATA_PATH:-./data/pgadmin}
    
    # Local-specific network configuration
    export POSTGRES_HOST=${POSTGRES_HOST:-localhost}
    export POSTGRES_PORT=${POSTGRES_PORT:-5432}
    
    echo "✅ Local configuration complete"
}

# Function to configure VM/production environment
configure_vm() {
    echo "🔧 Configuring for VM/production deployment..."
    
    # VM-specific configurations
    export POSTGRES_DATA_PATH=${POSTGRES_DATA_PATH:-/opt/hailmary/services/postgres/data/postgres}
    export POSTGRES_LOGS_PATH=${POSTGRES_LOGS_PATH:-/var/log/hailmary/postgres}
    export SCHEMA_DATA_PATH=${SCHEMA_DATA_PATH:-/opt/hailmary/services/postgres/data/schema}
    export PGADMIN_DATA_PATH=${PGADMIN_DATA_PATH:-/opt/hailmary/services/postgres/data/pgadmin}
    
    # VM-specific network configuration
    export POSTGRES_HOST=${POSTGRES_HOST:-0.0.0.0}
    export POSTGRES_PORT=${POSTGRES_PORT:-5432}
    
    # Create system directories if they don't exist
    echo "📁 Creating system directories..."
    sudo mkdir -p /var/log/hailmary/postgres
    sudo chown -R $(whoami):$(whoami) /var/log/hailmary/postgres
    
    echo "✅ VM configuration complete"
}

# Function to perform common setup tasks
setup_common() {
    echo "🔧 Performing common setup tasks..."
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        echo "❌ Docker is not running. Please start Docker first."
        exit 1
    fi

    # Check if the hailmary-network exists
    if ! docker network ls | grep -q hailmary-network; then
        echo "🔧 Creating hailmary-network..."
        docker network create hailmary-network
    fi

    # Create necessary directories
    echo "📁 Creating necessary directories..."
    mkdir -p "$POSTGRES_DATA_PATH"
    mkdir -p "$POSTGRES_LOGS_PATH"
    mkdir -p "$SCHEMA_DATA_PATH"
    mkdir -p "$PGADMIN_DATA_PATH"

    # Set proper permissions
    chmod 755 "$POSTGRES_DATA_PATH"
    chmod 755 "$POSTGRES_LOGS_PATH"
    chmod 755 "$SCHEMA_DATA_PATH"
    chmod 755 "$PGADMIN_DATA_PATH"

    # Load environment variables if .env file exists
    if [ -f ".env" ]; then
        echo "📋 Loading environment variables from .env file..."
        export $(cat .env | grep -v '^#' | xargs)
    fi

    # Set default environment variables if not set
    export POSTGRES_USER=${POSTGRES_USER:-app}
    export POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-app}
    export POSTGRES_DB=${POSTGRES_DB:-app}
    
    echo "✅ Common setup complete"
}

# Function to start PostgreSQL service
start_postgres() {
    echo "🐘 Starting PostgreSQL container..."
    docker-compose up -d postgres

    # Wait for PostgreSQL to be healthy
    echo "⏳ Waiting for PostgreSQL to be healthy..."
    timeout=60
    counter=0
    while [ $counter -lt $timeout ]; do
        if docker-compose exec postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
            echo "✅ PostgreSQL is healthy and ready!"
            break
        fi
        echo "⏳ Waiting for PostgreSQL... ($counter/$timeout)"
        sleep 2
        counter=$((counter + 2))
    done

    if [ $counter -ge $timeout ]; then
        echo "❌ PostgreSQL failed to start within $timeout seconds"
        echo "📋 Checking PostgreSQL logs..."
        docker-compose logs postgres
        exit 1
    fi

    # Start materialized view refresh service
    echo "🔄 Starting materialized view refresh service..."
    docker-compose up -d materialized-view-refresh
    
    # Wait a moment for the service to start
    sleep 3
    
    # Check if materialized view refresh service is running
    if docker-compose ps materialized-view-refresh | grep -q "Up"; then
        echo "✅ Materialized view refresh service started successfully!"
    else
        echo "⚠️  Materialized view refresh service may not be running properly"
        echo "📋 Checking materialized view refresh logs..."
        docker-compose logs materialized-view-refresh
    fi
}

# Configure based on deployment mode
if [[ "$DEPLOYMENT_MODE" == "vm" ]]; then
    configure_vm
else
    configure_local
fi

# Perform common setup
setup_common

# Start PostgreSQL service
start_postgres



# Function to display local service information
display_local_info() {
    echo ""
    echo "🎉 PostgreSQL Service started successfully!"
    echo ""
    echo "📋 Service Information:"
    echo "   • Database: $POSTGRES_DB"
    echo "   • User: $POSTGRES_USER"
    echo "   • Port: $POSTGRES_PORT"
    echo "   • Host: $POSTGRES_HOST"
    echo "   • Deployment Mode: $DEPLOYMENT_MODE"
    echo "   • Data Path: $POSTGRES_DATA_PATH"
    echo "   • Logs Path: $POSTGRES_LOGS_PATH"
    echo "   • Connection String: postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB"
    echo ""
    echo "🔧 Management Commands:"
    echo "   • View logs: ./scripts/logs.sh $DEPLOYMENT_MODE"
    echo "   • Health check: ./scripts/health-check.sh $DEPLOYMENT_MODE"
    echo "   • Stop service: ./scripts/stop.sh $DEPLOYMENT_MODE"
    echo "   • Restart service: ./scripts/restart.sh $DEPLOYMENT_MODE"
    echo ""
    echo "🔄 Materialized View Refresh:"
    echo "   • Service: Running automatically"
    echo "   • Polling Interval: 10 seconds (local mode)"
    echo "   • Logs: docker-compose logs materialized-view-refresh"
    echo ""
    echo "🌐 Optional Services:"
    echo "   • Start with pgAdmin: docker-compose --profile admin up -d"
    echo "   • pgAdmin URL: http://localhost:8080"
    echo "   • pgAdmin Email: admin@hailmary.local"
    echo "   • pgAdmin Password: admin"
}

# Function to display VM service information
display_vm_info() {
    echo ""
    echo "🎉 PostgreSQL Service started successfully!"
    echo ""
    echo "📋 Service Information:"
    echo "   • Database: $POSTGRES_DB"
    echo "   • User: $POSTGRES_USER"
    echo "   • Port: $POSTGRES_PORT"
    echo "   • Host: $POSTGRES_HOST"
    echo "   • Deployment Mode: $DEPLOYMENT_MODE"
    echo "   • Data Path: $POSTGRES_DATA_PATH"
    echo "   • Logs Path: $POSTGRES_LOGS_PATH"
    echo "   • Connection String: postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB"
    echo ""
    echo "🔧 Management Commands:"
    echo "   • View logs: ./scripts/logs.sh $DEPLOYMENT_MODE"
    echo "   • Health check: ./scripts/health-check.sh $DEPLOYMENT_MODE"
    echo "   • Stop service: ./scripts/stop.sh $DEPLOYMENT_MODE"
    echo "   • Restart service: ./scripts/restart.sh $DEPLOYMENT_MODE"
    echo ""
    echo "🔄 Materialized View Refresh:"
    echo "   • Service: Running automatically"
    echo "   • Polling Interval: 30 seconds (VM mode)"
    echo "   • Logs: docker-compose logs materialized-view-refresh"
    echo ""
    echo "🌐 VM Access:"
    echo "   • External Access: postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$(hostname -I | awk '{print $1}'):$POSTGRES_PORT/$POSTGRES_DB"
    echo "   • Internal Access: postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:$POSTGRES_PORT/$POSTGRES_DB"
}

# Display service information based on deployment mode
if [[ "$DEPLOYMENT_MODE" == "vm" ]]; then
    display_vm_info
else
    display_local_info
fi

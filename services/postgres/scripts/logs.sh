#!/bin/bash
set -e

# PostgreSQL Service Logs Script
# View and manage PostgreSQL service logs
# Usage: ./logs.sh [local|vm] [OPTIONS]
#   local: Local development deployment (default)
#   vm: VM/production deployment

# Get deployment mode from first argument
DEPLOYMENT_MODE=${1:-local}

# Validate deployment mode
if [[ "$DEPLOYMENT_MODE" == "local" || "$DEPLOYMENT_MODE" == "vm" ]]; then
    # Valid deployment mode, shift it out of arguments
    shift
else
    # Not a deployment mode, treat as local and don't shift
    DEPLOYMENT_MODE="local"
fi

echo "📋 HailMary PostgreSQL Service Logs ($DEPLOYMENT_MODE mode)"

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"

# Change to service directory
cd "$SERVICE_DIR"

# Function to configure local development environment
configure_local() {
    echo "🔧 Configuring for local development..."
    # Local development doesn't need special configuration for logs
    echo "✅ Local configuration complete"
}

# Function to configure VM/production environment
configure_vm() {
    echo "🔧 Configuring for VM/production deployment..."
    # VM deployment doesn't need special configuration for logs
    echo "✅ VM configuration complete"
}

# Configure based on deployment mode
if [[ "$DEPLOYMENT_MODE" == "vm" ]]; then
    configure_vm
else
    configure_local
fi

# Default options
SERVICE="postgres"
LINES=100
FOLLOW=false
TIMESTAMPS=true

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--service)
            SERVICE="$2"
            shift 2
            ;;
        -n|--lines)
            LINES="$2"
            shift 2
            ;;
        -f|--follow)
            FOLLOW=true
            shift
            ;;
        --no-timestamps)
            TIMESTAMPS=false
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [local|vm] [OPTIONS]"
            echo ""
            echo "Deployment Modes:"
            echo "  local                   Local development deployment (default)"
            echo "  vm                      VM/production deployment"
            echo ""
            echo "Options:"
            echo "  -s, --service SERVICE    Service to show logs for (postgres, schema-migrator, postgres-admin)"
            echo "  -n, --lines LINES       Number of lines to show (default: 100)"
            echo "  -f, --follow            Follow log output"
            echo "  --no-timestamps         Don't show timestamps"
            echo "  -h, --help              Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                      # Show last 100 lines of postgres logs (local mode)"
            echo "  $0 vm                   # Show last 100 lines of postgres logs (VM mode)"
            echo "  $0 -f                   # Follow postgres logs (local mode)"
            echo "  $0 vm -f                # Follow postgres logs (VM mode)"
            echo "  $0 -s schema-migrator   # Show schema migrator logs (local mode)"
            echo "  $0 vm -n 50             # Show last 50 lines (VM mode)"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if the service is running
if ! docker compose ps "$SERVICE" | grep -q "Up"; then
    echo "⚠️  Service '$SERVICE' is not running"
    echo "Available services:"
    docker compose ps
    exit 1
fi

# Build docker compose logs command
LOG_CMD="docker compose logs"

if [ "$TIMESTAMPS" = true ]; then
    LOG_CMD="$LOG_CMD -t"
fi

if [ "$FOLLOW" = true ]; then
    LOG_CMD="$LOG_CMD -f"
else
    LOG_CMD="$LOG_CMD --tail $LINES"
fi

LOG_CMD="$LOG_CMD $SERVICE"

# Display log information
echo "📋 Showing logs for service: $SERVICE"
if [ "$FOLLOW" = true ]; then
    echo "🔄 Following log output (Press Ctrl+C to stop)..."
else
    echo "📄 Showing last $LINES lines"
fi
echo ""

# Show logs
eval $LOG_CMD

# If not following, show additional information
if [ "$FOLLOW" = false ]; then
    echo ""
    echo "🔧 Additional Commands:"
    echo "   • Follow logs: $0 $DEPLOYMENT_MODE -f"
    echo "   • Show more lines: $0 $DEPLOYMENT_MODE -n 500"
    echo "   • Show schema migrator logs: $0 $DEPLOYMENT_MODE -s schema-migrator"
    echo "   • Show pgAdmin logs: $0 $DEPLOYMENT_MODE -s postgres-admin"
    echo "   • View all services: docker compose ps"
    echo "   • Health check: ./scripts/health-check.sh $DEPLOYMENT_MODE"
fi

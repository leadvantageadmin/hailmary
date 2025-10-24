#!/bin/bash
set -e

# PostgreSQL Service Logs Script
# View and manage PostgreSQL service logs

echo "📋 HailMary PostgreSQL Service Logs"

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"

# Change to service directory
cd "$SERVICE_DIR"

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
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -s, --service SERVICE    Service to show logs for (postgres, schema-migrator, postgres-admin)"
            echo "  -n, --lines LINES       Number of lines to show (default: 100)"
            echo "  -f, --follow            Follow log output"
            echo "  --no-timestamps         Don't show timestamps"
            echo "  -h, --help              Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                      # Show last 100 lines of postgres logs"
            echo "  $0 -f                   # Follow postgres logs"
            echo "  $0 -s schema-migrator   # Show schema migrator logs"
            echo "  $0 -n 50                # Show last 50 lines"
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
    echo "   • Follow logs: $0 -f"
    echo "   • Show more lines: $0 -n 500"
    echo "   • Show schema migrator logs: $0 -s schema-migrator"
    echo "   • Show pgAdmin logs: $0 -s postgres-admin"
    echo "   • View all services: docker compose ps"
fi

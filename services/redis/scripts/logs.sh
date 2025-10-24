#!/bin/bash
set -e

# Redis Service Logs Script
# View Redis service logs with various options

echo "📋 HailMary Redis Logs"
echo "====================="

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"

# Change to service directory
cd "$SERVICE_DIR"

# Default options
FOLLOW=false
LINES=50
SERVICE="redis"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--follow)
            FOLLOW=true
            shift
            ;;
        -n|--lines)
            LINES="$2"
            shift 2
            ;;
        -s|--service)
            SERVICE="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -f, --follow     Follow log output"
            echo "  -n, --lines N    Number of lines to show (default: 50)"
            echo "  -s, --service S  Service to show logs for (default: redis)"
            echo "  -h, --help       Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                    # Show last 50 lines"
            echo "  $0 -f                 # Follow logs"
            echo "  $0 -n 100             # Show last 100 lines"
            echo "  $0 -s redis-cli       # Show logs for redis-cli service"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

# Check if service is running
if ! docker compose ps $SERVICE | grep -q "Up"; then
    echo "❌ Service '$SERVICE' is not running"
    echo "   Available services:"
    docker compose ps --services
    exit 1
fi

echo "📋 Showing logs for service: $SERVICE"
echo "📊 Lines: $LINES"
echo "🔄 Follow: $FOLLOW"
echo ""

# Show logs
if [ "$FOLLOW" = true ]; then
    echo "🔄 Following logs (Press Ctrl+C to stop)..."
    docker compose logs -f --tail $LINES $SERVICE
else
    docker compose logs --tail $LINES $SERVICE
fi

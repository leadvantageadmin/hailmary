#!/bin/bash
set -e

# Web Service Logs Script
# Views logs from the Next.js web application

echo "📋 Viewing HailMary Web Service Logs..."

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"

# Change to service directory
cd "$SERVICE_DIR"

# Parse command line arguments
FOLLOW=${1:-""}
LINES=${2:-"100"}

# Check if container is running
if ! docker ps | grep -q hailmary-web; then
    echo "❌ Web service container is not running"
    echo "   Start the service first: ./scripts/start.sh"
    exit 1
fi

# Display logs
echo "📋 Web Service Logs (last $LINES lines):"
echo "=========================================="

if [ "$FOLLOW" = "-f" ] || [ "$FOLLOW" = "--follow" ]; then
    echo "🔄 Following logs (Ctrl+C to stop)..."
    docker compose logs -f --tail=$LINES web
else
    docker compose logs --tail=$LINES web
fi

echo ""
echo "🔧 Log Management Commands:"
echo "   • Follow logs: ./scripts/logs.sh -f"
echo "   • More lines: ./scripts/logs.sh '' 500"
echo "   • Follow with more lines: ./scripts/logs.sh -f 500"

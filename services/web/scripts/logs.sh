#!/bin/bash
set -e

# Web Service Logs Script
# Views logs from the Next.js web application

# Show usage if no arguments provided
show_usage() {
    echo "Usage: $0 [local|vm] [OPTIONS]"
    echo ""
    echo "Modes:"
    echo "  local    - Local development mode (default)"
    echo "  vm       - VM/production mode"
    echo ""
    echo "Options:"
    echo "  -f, --follow     Follow log output"
    echo "  -n, --lines N    Number of lines to show (default: 100)"
    echo "  -h, --help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 local                    # Show last 100 lines (local mode)"
    echo "  $0 vm -f                   # Follow logs (VM mode)"
    echo "  $0 local -n 500            # Show last 500 lines (local mode)"
    echo "  $0 vm --follow --lines 200 # Follow logs with 200 lines (VM mode)"
    exit 1
}

# Parse deployment mode
DEPLOYMENT_MODE=${1:-local}

if [[ "$DEPLOYMENT_MODE" != "local" && "$DEPLOYMENT_MODE" != "vm" ]]; then
    echo "❌ Invalid deployment mode: $DEPLOYMENT_MODE"
    show_usage
fi

# Shift to remove deployment mode from arguments
shift

echo "📋 Viewing HailMary Web Service Logs ($DEPLOYMENT_MODE mode)"
echo "========================================================="

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"

# Change to service directory
cd "$SERVICE_DIR"

# Default options
FOLLOW=false
LINES=100

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
        -h|--help)
            show_usage
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

# Check if container is running
if ! docker ps | grep -q hailmary-web; then
    echo "❌ Web service container is not running"
    echo "   Start the service first: ./scripts/start.sh $DEPLOYMENT_MODE"
    exit 1
fi

if [ "$DEPLOYMENT_MODE" = "vm" ]; then
    if ! docker ps | grep -q hailmary-nginx; then
        echo "❌ Nginx container is not running"
        echo "   Start the service first: ./scripts/start.sh $DEPLOYMENT_MODE"
        exit 1
    fi
fi

# Display logs
echo "📋 Web Service Logs (last $LINES lines):"
echo "=========================================="

if [ "$FOLLOW" = true ]; then
    echo "🔄 Following logs (Ctrl+C to stop)..."
    if [ "$DEPLOYMENT_MODE" = "vm" ]; then
        docker compose -f docker-compose.vm.yml logs -f --tail=$LINES
    else
        docker compose logs -f --tail=$LINES web
    fi
else
    if [ "$DEPLOYMENT_MODE" = "vm" ]; then
        docker compose -f docker-compose.vm.yml logs --tail=$LINES
    else
        docker compose logs --tail=$LINES web
    fi
fi

echo ""
echo "🔧 Log Management Commands:"
echo "   • Follow logs: ./scripts/logs.sh $DEPLOYMENT_MODE -f"
echo "   • More lines: ./scripts/logs.sh $DEPLOYMENT_MODE -n 500"
echo "   • Follow with more lines: ./scripts/logs.sh $DEPLOYMENT_MODE -f -n 500"

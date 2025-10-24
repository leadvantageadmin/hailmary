#!/bin/bash
set -e

# Redis Service Health Check Script
# Comprehensive health check for Redis service

echo "🔍 HailMary Redis Health Check"
echo "=============================="

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"

# Change to service directory
cd "$SERVICE_DIR"

# Load environment variables if .env file exists
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Configuration
REDIS_PORT=${REDIS_PORT:-6379}
REDIS_PASSWORD=${REDIS_PASSWORD:-}

echo "🔍 Configuration:"
echo "   • Redis Port: $REDIS_PORT"
echo "   • Redis DB: 0"
echo "   • Password: ${REDIS_PASSWORD:+[SET]}${REDIS_PASSWORD:-[NOT SET]}"

# Check if Redis container is running
echo ""
echo "📋 Container Status:"
if docker compose ps redis | grep -q "Up"; then
    echo "✅ Redis container is running"
else
    echo "❌ Redis container is not running"
    echo "   Start it with: ./scripts/start.sh"
    exit 1
fi

# Check Redis connectivity
echo ""
echo "🔗 Connectivity Test:"
if docker compose exec redis redis-cli ping >/dev/null 2>&1; then
    echo "✅ Redis is responding to ping"
else
    echo "❌ Redis is not responding to ping"
    exit 1
fi

# Check Redis info
echo ""
echo "📊 Redis Information:"
echo "   • Version: $(docker compose exec redis redis-cli info server | grep redis_version | cut -d: -f2 | tr -d '\r')"
echo "   • Uptime: $(docker compose exec redis redis-cli info server | grep uptime_in_seconds | cut -d: -f2 | tr -d '\r') seconds"
echo "   • Connected Clients: $(docker compose exec redis redis-cli info clients | grep connected_clients | cut -d: -f2 | tr -d '\r')"
echo "   • Used Memory: $(docker compose exec redis redis-cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')"

# Check Redis databases
echo ""
echo "🗄️  Database Status:"
for db in {0..15}; do
    key_count=$(docker compose exec redis redis-cli -n $db dbsize 2>/dev/null || echo "0")
    if [ "$key_count" -gt 0 ]; then
        echo "   • Database $db: $key_count keys"
    fi
done

# Test basic operations
echo ""
echo "🧪 Basic Operations Test:"
test_key="health_check_$(date +%s)"
test_value="test_value_$(date +%s)"

# Set a test key
if docker compose exec redis redis-cli set "$test_key" "$test_value" >/dev/null 2>&1; then
    echo "✅ SET operation successful"
else
    echo "❌ SET operation failed"
    exit 1
fi

# Get the test key
if docker compose exec redis redis-cli get "$test_key" | grep -q "$test_value"; then
    echo "✅ GET operation successful"
else
    echo "❌ GET operation failed"
    exit 1
fi

# Delete the test key
if docker compose exec redis redis-cli del "$test_key" >/dev/null 2>&1; then
    echo "✅ DEL operation successful"
else
    echo "❌ DEL operation failed"
    exit 1
fi

# Check memory usage
echo ""
echo "💾 Memory Usage:"
memory_info=$(docker compose exec redis redis-cli info memory)
echo "   • Used Memory: $(echo "$memory_info" | grep used_memory_human | cut -d: -f2 | tr -d '\r')"
echo "   • Max Memory: $(echo "$memory_info" | grep maxmemory_human | cut -d: -f2 | tr -d '\r')"
echo "   • Memory Fragmentation: $(echo "$memory_info" | grep mem_fragmentation_ratio | cut -d: -f2 | tr -d '\r')"

# Check persistence
echo ""
echo "💾 Persistence Status:"
persistence_info=$(docker compose exec redis redis-cli info persistence)
echo "   • RDB Last Save: $(echo "$persistence_info" | grep rdb_last_save_time | cut -d: -f2 | tr -d '\r')"
echo "   • AOF Enabled: $(echo "$persistence_info" | grep aof_enabled | cut -d: -f2 | tr -d '\r')"

echo ""
echo "✅ Redis health check completed successfully!"
echo "🔧 Redis is ready for use"

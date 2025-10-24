#!/bin/bash

# =============================================================================
# CDC Service Health Check Script
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CDC_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}🏥 CDC Service Health Check${NC}"
echo "=================================="

# Change to CDC directory
cd "$CDC_DIR"

# Check if services are running
echo -e "${BLUE}📊 Service Status:${NC}"
docker-compose ps

echo ""

# Check Elasticsearch
echo -e "${BLUE}🔍 Elasticsearch Health:${NC}"
if docker-compose exec -T elasticsearch curl -f http://localhost:9200/_cluster/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Elasticsearch is healthy${NC}"
    
    # Get cluster health details
    echo -e "${BLUE}   Cluster Status:${NC}"
    curl -s http://localhost:9200/_cluster/health | jq -r '.status' 2>/dev/null || echo "   Status: $(curl -s http://localhost:9200/_cluster/health | grep -o '"status":"[^"]*"' | cut -d'"' -f4)"
    
    # Show indices
    echo -e "${BLUE}   Indices:${NC}"
    curl -s http://localhost:9200/_cat/indices?v | head -10
    
else
    echo -e "${RED}❌ Elasticsearch is not healthy${NC}"
fi

echo ""

# Check Redis
echo -e "${BLUE}🔍 Redis Health:${NC}"
if docker-compose exec -T redis redis-cli ping >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis is healthy${NC}"
    
    # Get Redis info
    echo -e "${BLUE}   Redis Info:${NC}"
    docker-compose exec -T redis redis-cli info memory | grep used_memory_human || echo "   Memory info not available"
    docker-compose exec -T redis redis-cli info keyspace | grep db0 || echo "   No keyspace info"
    
else
    echo -e "${RED}❌ Redis is not healthy${NC}"
fi

echo ""

# Check PGSync
echo -e "${BLUE}🔍 PGSync Health:${NC}"
if docker-compose ps pgsync | grep -q "Up"; then
    echo -e "${GREEN}✅ PGSync is running${NC}"
    
    # Show recent sync activity
    echo -e "${BLUE}   Recent Sync Activity:${NC}"
    docker-compose logs --tail=5 pgsync | grep "Sync" | tail -3 || echo "   No recent sync activity"
    
else
    echo -e "${RED}❌ PGSync is not running${NC}"
fi

echo ""

# Check data volumes
echo -e "${BLUE}💾 Data Volume Status:${NC}"
if [ -d "data/elasticsearch" ]; then
    echo -e "${GREEN}✅ Elasticsearch data directory exists${NC}"
    echo "   Size: $(du -sh data/elasticsearch 2>/dev/null | cut -f1 || echo 'Unknown')"
else
    echo -e "${YELLOW}⚠️  Elasticsearch data directory missing${NC}"
fi

if [ -d "data/redis" ]; then
    echo -e "${GREEN}✅ Redis data directory exists${NC}"
    echo "   Size: $(du -sh data/redis 2>/dev/null | cut -f1 || echo 'Unknown')"
else
    echo -e "${YELLOW}⚠️  Redis data directory missing${NC}"
fi

echo ""

# Check logs
echo -e "${BLUE}📝 Recent Log Activity:${NC}"
echo -e "${BLUE}   PGSync (last 3 lines):${NC}"
docker-compose logs --tail=3 pgsync | sed 's/^/   /'

echo ""

# Summary
echo -e "${BLUE}📋 Health Check Summary:${NC}"
if docker-compose exec -T elasticsearch curl -f http://localhost:9200/_cluster/health >/dev/null 2>&1 && \
   docker-compose exec -T redis redis-cli ping >/dev/null 2>&1 && \
   docker-compose ps pgsync | grep -q "Up"; then
    echo -e "${GREEN}🎉 All services are healthy!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some services are not healthy${NC}"
    exit 1
fi

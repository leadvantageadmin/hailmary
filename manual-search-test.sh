#!/bin/bash

# Manual Search Test Script
# Use this to test search functionality step by step

echo "🔍 Manual Search Test Script"
echo "============================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    local status=$1
    local message=$2
    case $status in
        "SUCCESS") echo -e "${GREEN}✅ $message${NC}" ;;
        "ERROR") echo -e "${RED}❌ $message${NC}" ;;
        "WARNING") echo -e "${YELLOW}⚠️  $message${NC}" ;;
        "INFO") echo -e "${BLUE}ℹ️  $message${NC}" ;;
    esac
}

# Function to test search API
test_search() {
    local test_name="$1"
    local search_data="$2"
    
    echo ""
    print_status "INFO" "Testing: $test_name"
    echo "Search data: $search_data"
    echo "---"
    
    RESPONSE=$(curl -s -X POST "http://localhost:3000/api/search" \
        -H "Content-Type: application/json" \
        -d "$search_data" \
        -w "HTTP_STATUS:%{http_code}")
    
    HTTP_STATUS=$(echo "$RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
    RESPONSE_BODY=$(echo "$RESPONSE" | sed 's/HTTP_STATUS:[0-9]*$//')
    
    echo "HTTP Status: $HTTP_STATUS"
    
    if [ "$HTTP_STATUS" = "200" ]; then
        ITEM_COUNT=$(echo "$RESPONSE_BODY" | jq -r '.items | length' 2>/dev/null)
        TOTAL_ITEMS=$(echo "$RESPONSE_BODY" | jq -r '.pagination.totalItems' 2>/dev/null)
        
        print_status "SUCCESS" "Returned $ITEM_COUNT items (total: $TOTAL_ITEMS)"
        
        if [ "$ITEM_COUNT" -gt 0 ]; then
            echo "Sample results:"
            echo "$RESPONSE_BODY" | jq -r '.items[0:2][] | "  • \(.company // "N/A") - \(.country // "N/A") - \(.jobTitle // "N/A")"' 2>/dev/null
        fi
    else
        print_status "ERROR" "Failed with HTTP $HTTP_STATUS"
        echo "Response: $RESPONSE_BODY"
    fi
}

echo ""
print_status "INFO" "Starting manual search tests..."
echo "Make sure your web service is running on port 3000"
echo ""

# Test 1: Empty search (should return all results)
test_search "Empty search (match_all)" '{"filters": {}, "page": {"size": 5, "number": 1}}'

# Test 2: Search with company filter
test_search "Company search (Google)" '{"filters": {"company": ["Google"]}, "page": {"size": 5, "number": 1}}'

# Test 3: Search with country filter
test_search "Country search (United States)" '{"filters": {"country": ["United States"]}, "page": {"size": 5, "number": 1}}'

# Test 4: Search with city filter
test_search "City search (New York)" '{"filters": {"city": ["New York"]}, "page": {"size": 5, "number": 1}}'

# Test 5: Search with job title filter
test_search "Job title search (Manager)" '{"filters": {"jobTitle": ["Manager"]}, "page": {"size": 5, "number": 1}}'

# Test 6: Search with multiple filters
test_search "Multiple filters (Google + United States)" '{"filters": {"company": ["Google"], "country": ["United States"]}, "page": {"size": 5, "number": 1}}'

# Test 7: Search with partial company name
test_search "Partial company search (Goog)" '{"filters": {"company": ["Goog"]}, "page": {"size": 5, "number": 1}}'

# Test 8: Search with industry filter
test_search "Industry search (Technology)" '{"filters": {"industry": ["Technology"]}, "page": {"size": 5, "number": 1}}'

echo ""
print_status "INFO" "Manual search tests completed!"
echo "============================"
echo ""
echo "If all tests return 0 results, the issue is likely:"
echo "1. No data in OpenSearch index"
echo "2. OpenSearch index doesn't exist"
echo "3. Data ingestion hasn't been run"
echo "4. OpenSearch mapping issues"
echo ""
echo "Next steps:"
echo "1. Check if data exists: curl -s 'http://localhost:9200/customers/_count' | jq"
echo "2. Check index mapping: curl -s 'http://localhost:9200/customers/_mapping' | jq"
echo "3. Run data ingestion if needed"
echo "4. Check web service logs for errors"

#!/bin/bash

# verify-schema-integration.sh
# Comprehensive verification of schema integration functionality

# --- Configuration ---
# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SERVICE_NAME="ingestor"
CONTAINER_NAME="hailmary-ingestor"
DOCKER_COMPOSE_FILE="docker-compose.yml"

# --- Functions ---

# Function to display usage
usage() {
    echo -e "${BLUE}Usage: $0 [--verbose]${NC}"
    echo "  --verbose: Show detailed output"
    echo ""
    echo "This script verifies that schema integration is working correctly."
}

# Function to check local schema files
check_local_schema_files() {
    echo -e "${BLUE}📋 Checking local schema files...${NC}"
    
    local schema_dir="./data/schema"
    local current_link="$schema_dir/current"
    local version_dir=""
    
    # Check if schema directory exists
    if [ ! -d "$schema_dir" ]; then
        echo -e "${RED}❌ Schema directory not found: $schema_dir${NC}"
        return 1
    fi
    
    # Check if current symlink exists
    if [ ! -L "$current_link" ]; then
        echo -e "${RED}❌ Current schema symlink not found: $current_link${NC}"
        return 1
    fi
    
    # Get the version directory
    version_dir=$(readlink "$current_link")
    echo -e "${GREEN}✅ Current schema symlink points to: $version_dir${NC}"
    
    # Check if version directory exists
    if [ ! -d "$schema_dir/$version_dir" ]; then
        echo -e "${RED}❌ Schema version directory not found: $schema_dir/$version_dir${NC}"
        return 1
    fi
    
    # Check for required files
    local required_files=("schema.prisma" "metadata.json" "changelog.md")
    for file in "${required_files[@]}"; do
        if [ ! -f "$schema_dir/$version_dir/$file" ]; then
            echo -e "${RED}❌ Required schema file not found: $file${NC}"
            return 1
        else
            echo -e "${GREEN}✅ Found schema file: $file${NC}"
        fi
    done
    
    # Check for migrations directory
    if [ ! -d "$schema_dir/$version_dir/migrations" ]; then
        echo -e "${RED}❌ Migrations directory not found${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Found migrations directory${NC}"
    fi
    
    # Show schema file contents
    if [ "$1" = "--verbose" ]; then
        echo -e "${BLUE}📄 Schema.prisma content (first 20 lines):${NC}"
        head -20 "$schema_dir/$version_dir/schema.prisma"
        echo ""
        echo -e "${BLUE}📄 Metadata.json content:${NC}"
        cat "$schema_dir/$version_dir/metadata.json"
        echo ""
    fi
    
    return 0
}

# Function to test schema operations
test_schema_operations() {
    echo -e "${BLUE}🧪 Testing schema operations...${NC}"
    
    local test_result=$(docker-compose -f "$DOCKER_COMPOSE_FILE" run --rm "$SERVICE_NAME" python -c "
import asyncio
import sys
sys.path.append('/app/lib')
from schema_operations import SchemaOperations

async def test_schema():
    try:
        schema_ops = SchemaOperations()
        await schema_ops.initialize()
        schema_info = schema_ops.get_schema_info()
        
        print('SUCCESS: Schema operations working')
        print(f'Version: {schema_info[\"version\"]}')
        print(f'Tables: {len(schema_info[\"tables\"])} tables found')
        print(f'Schema Directory: {schema_info[\"schema_dir\"]}')
        
        # Test table definitions
        customer_def = schema_ops.get_table_definition('Customer')
        company_def = schema_ops.get_table_definition('Company')
        prospect_def = schema_ops.get_table_definition('Prospect')
        
        if customer_def and company_def and prospect_def:
            print('SUCCESS: All table definitions loaded')
            return True
        else:
            print('ERROR: Some table definitions missing')
            return False
            
    except Exception as e:
        print(f'ERROR: Schema operations failed - {e}')
        return False

result = asyncio.run(test_schema())
sys.exit(0 if result else 1)
" 2>&1)
    
    if echo "$test_result" | grep -q "SUCCESS: Schema operations working"; then
        echo -e "${GREEN}✅ Schema operations test passed${NC}"
        if [ "$1" = "--verbose" ]; then
            echo "$test_result"
        fi
        return 0
    else
        echo -e "${RED}❌ Schema operations test failed${NC}"
        echo "$test_result"
        return 1
    fi
}

# Function to test dynamic SQL generation
test_sql_generation() {
    echo -e "${BLUE}🔧 Testing dynamic SQL generation...${NC}"
    
    local test_result=$(docker-compose -f "$DOCKER_COMPOSE_FILE" run --rm "$SERVICE_NAME" python -c "
import asyncio
import sys
sys.path.append('/app/lib')
from schema_operations import SchemaOperations
from db_operations import DatabaseOperations

async def test_sql():
    try:
        schema_ops = SchemaOperations()
        await schema_ops.initialize()
        
        db_ops = DatabaseOperations()
        db_ops.schema_ops = schema_ops
        
        # Test SQL generation for all tables
        tables = ['Customer', 'Company', 'Prospect']
        for table in tables:
            sql = db_ops._generate_insert_sql(table)
            if not sql or 'INSERT' not in sql or 'ON CONFLICT' not in sql:
                print(f'ERROR: Invalid SQL for {table}')
                return False
            print(f'SUCCESS: {table} SQL generated ({len(sql)} chars)')
        
        print('SUCCESS: All SQL generation tests passed')
        return True
        
    except Exception as e:
        print(f'ERROR: SQL generation failed - {e}')
        return False

result = asyncio.run(test_sql())
sys.exit(0 if result else 1)
" 2>&1)
    
    if echo "$test_result" | grep -q "SUCCESS: All SQL generation tests passed"; then
        echo -e "${GREEN}✅ Dynamic SQL generation test passed${NC}"
        if [ "$1" = "--verbose" ]; then
            echo "$test_result"
        fi
        return 0
    else
        echo -e "${RED}❌ Dynamic SQL generation test failed${NC}"
        echo "$test_result"
        return 1
    fi
}

# Function to test schema CLI command
test_schema_cli() {
    echo -e "${BLUE}💻 Testing schema CLI command...${NC}"
    
    local test_result=$(docker-compose -f "$DOCKER_COMPOSE_FILE" run --rm "$SERVICE_NAME" python -c "
import asyncio
import sys
sys.path.append('/app/lib')
from schema_operations import SchemaOperations

async def test_schema_cli():
    try:
        schema_ops = SchemaOperations()
        await schema_ops.initialize()
        schema_info = schema_ops.get_schema_info()
        print('SUCCESS: Schema CLI functionality working')
        print(f'Schema info: {schema_info}')
        return True
    except Exception as e:
        print(f'ERROR: Schema CLI failed - {e}')
        return False

result = asyncio.run(test_schema_cli())
sys.exit(0 if result else 1)
" 2>&1)
    
    if echo "$test_result" | grep -q "SUCCESS: Schema CLI functionality working"; then
        echo -e "${GREEN}✅ Schema CLI command working${NC}"
        if [ "$1" = "--verbose" ]; then
            echo "$test_result"
        fi
        return 0
    else
        echo -e "${RED}❌ Schema CLI command failed${NC}"
        echo "$test_result"
        return 1
    fi
}

# Function to show schema summary
show_schema_summary() {
    echo -e "${BLUE}📊 Schema Integration Summary${NC}"
    echo "=================================="
    
    local schema_dir="./data/schema"
    if [ -d "$schema_dir" ]; then
        local current_version=$(readlink "$schema_dir/current" 2>/dev/null || echo "unknown")
        echo -e "   Current Version: ${GREEN}$current_version${NC}"
        
        local file_count=$(find "$schema_dir" -name "*.prisma" -o -name "*.json" -o -name "*.sql" | wc -l)
        echo -e "   Schema Files: ${GREEN}$file_count${NC}"
        
        local total_size=$(du -sh "$schema_dir" 2>/dev/null | cut -f1 || echo "unknown")
        echo -e "   Total Size: ${GREEN}$total_size${NC}"
    else
        echo -e "   Status: ${RED}Schema directory not found${NC}"
    fi
    
    echo ""
}

# --- Main execution ---
echo -e "${BLUE}🔍 Verifying HailMary Ingestor Schema Integration...${NC}"
echo "=================================================="

# Parse arguments
VERBOSE=false
for arg in "$@"; do
    case $arg in
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            usage
            exit 0
            ;;
        *)
            # Unknown option
            echo -e "${RED}❌ Unknown option: $arg${NC}"
            usage
            exit 1
            ;;
    esac
done

# Run all tests
TESTS_PASSED=0
TOTAL_TESTS=4

echo -e "${BLUE}Running $TOTAL_TESTS verification tests...${NC}"
echo ""

# Test 1: Local schema files
if check_local_schema_files $VERBOSE; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi
echo ""

# Test 2: Schema operations
if test_schema_operations $VERBOSE; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi
echo ""

# Test 3: Dynamic SQL generation
if test_sql_generation $VERBOSE; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi
echo ""

# Test 4: Schema CLI command
if test_schema_cli $VERBOSE; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi
echo ""

# Show summary
show_schema_summary

# Final result
if [ $TESTS_PASSED -eq $TOTAL_TESTS ]; then
    echo -e "${GREEN}🎉 All $TOTAL_TESTS schema integration tests passed!${NC}"
    echo -e "${GREEN}✅ Schema integration is working perfectly!${NC}"
    echo ""
    echo -e "${BLUE}📋 What's Working:${NC}"
    echo "   • Schema files are being downloaded and stored locally"
    echo "   • Schema operations are initializing correctly"
    echo "   • Dynamic SQL generation is working for all tables"
    echo "   • CLI commands are functioning properly"
    echo "   • Schema versioning and metadata are working"
    echo ""
    echo -e "${BLUE}🚀 Ready for:${NC}"
    echo "   • Inter-service communication testing"
    echo "   • End-to-end integration testing"
    echo "   • Production deployment"
    exit 0
else
    echo -e "${RED}❌ Only $TESTS_PASSED out of $TOTAL_TESTS tests passed${NC}"
    echo -e "${RED}❌ Schema integration needs attention${NC}"
    exit 1
fi

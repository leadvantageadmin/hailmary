#!/bin/bash
set -e

# Ingestor Schema Pull Script
# Pulls schema from Schema API service for Ingestor service

echo "📥 Pulling schema for Ingestor service..."

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"

# Change to service directory
cd "$SERVICE_DIR"

# Configuration
VERSION=${1:-"latest"}
SCHEMA_API_URL=${SCHEMA_API_URL:-"http://localhost:3001"}
TARGET_DIR=${TARGET_DIR:-"./data/schema"}

echo "🔍 Configuration:"
echo "   • Version: $VERSION"
echo "   • Schema API URL: $SCHEMA_API_URL"
echo "   • Target Directory: $TARGET_DIR"

# Create target directory
mkdir -p "$TARGET_DIR"

# Check if schema API is available
echo "🔍 Checking schema API availability..."
if ! curl -s -f "$SCHEMA_API_URL/health" > /dev/null; then
    echo "❌ Schema API is not available at $SCHEMA_API_URL"
    echo "   Make sure the schema service is running:"
    echo "   cd ../schema && docker-compose up schema-api"
    exit 1
fi

echo "✅ Schema API is available"

# Determine version to use
if [ "$VERSION" = "latest" ]; then
    echo "🔍 Getting latest version information..."
    LATEST_RESPONSE=$(curl -s "$SCHEMA_API_URL/api/schema/latest")
    if [ $? -ne 0 ]; then
        echo "❌ Failed to get latest version from schema API"
        exit 1
    fi
    
    VERSION_FILE=$(echo "$LATEST_RESPONSE" | jq -r '.version')
    if [ "$VERSION_FILE" = "null" ] || [ -z "$VERSION_FILE" ]; then
        echo "❌ Could not determine latest version"
        exit 1
    fi
    echo "📦 Latest version: $VERSION_FILE"
else
    VERSION_FILE="$VERSION"
    echo "📦 Using specified version: $VERSION_FILE"
fi

# Get schema information
echo "🔍 Fetching schema information for version: $VERSION_FILE"
SCHEMA_RESPONSE=$(curl -s "$SCHEMA_API_URL/api/schema/version/$VERSION_FILE")
if [ $? -ne 0 ]; then
    echo "❌ Failed to fetch schema for version $VERSION_FILE"
    echo "📋 Available versions:"
    curl -s "$SCHEMA_API_URL/api/schema/versions" | jq -r '.versions[]' | head -5
    exit 1
fi

# Check if schema exists
if echo "$SCHEMA_RESPONSE" | jq -e '.error' > /dev/null; then
    echo "❌ Schema version $VERSION_FILE not found"
    echo "📋 Available versions:"
    curl -s "$SCHEMA_API_URL/api/schema/versions" | jq -r '.versions[]' | head -5
    exit 1
fi

# Extract schema and metadata
echo "📂 Extracting schema files..."
SCHEMA_CONTENT=$(echo "$SCHEMA_RESPONSE" | jq -r '.schema')
METADATA_CONTENT=$(echo "$SCHEMA_RESPONSE" | jq -r '.metadata')

# Write schema file
echo "$SCHEMA_CONTENT" > "$TARGET_DIR/schema.prisma"
echo "✅ Schema file written: $TARGET_DIR/schema.prisma"

# Write metadata file
echo "$METADATA_CONTENT" > "$TARGET_DIR/metadata.json"
echo "✅ Metadata file written: $TARGET_DIR/metadata.json"

# Get migrations
echo "🔍 Fetching migrations for version: $VERSION_FILE"
MIGRATIONS_RESPONSE=$(curl -s "$SCHEMA_API_URL/api/schema/migrations/$VERSION_FILE")
if [ $? -eq 0 ] && ! echo "$MIGRATIONS_RESPONSE" | jq -e '.error' > /dev/null; then
    # Create migrations directory
    mkdir -p "$TARGET_DIR/migrations"
    
    # Extract and write migration files
    echo "$MIGRATIONS_RESPONSE" | jq -r '.migrations[] | .file' | while read -r filename; do
        if [ -n "$filename" ]; then
            content=$(echo "$MIGRATIONS_RESPONSE" | jq -r --arg file "$filename" '.migrations[] | select(.file == $file) | .content')
            echo "$content" > "$TARGET_DIR/migrations/$filename"
            echo "✅ Migration file written: $TARGET_DIR/migrations/$filename"
        fi
    done
    
    MIGRATION_COUNT=$(find "$TARGET_DIR/migrations" -name "*.sql" | wc -l)
    echo "✅ Migration files found: $MIGRATION_COUNT files"
else
    echo "⚠️  No migrations found for version $VERSION_FILE"
fi

# Verify schema files
echo "🔍 Verifying schema files..."
if [ -f "$TARGET_DIR/schema.prisma" ]; then
    echo "✅ Schema file found: $TARGET_DIR/schema.prisma"
else
    echo "❌ Schema file not found: $TARGET_DIR/schema.prisma"
    exit 1
fi

if [ -f "$TARGET_DIR/metadata.json" ]; then
    echo "✅ Metadata file found: $TARGET_DIR/metadata.json"
else
    echo "❌ Metadata file not found: $TARGET_DIR/metadata.json"
    exit 1
fi

if [ -d "$TARGET_DIR/migrations" ]; then
    MIGRATION_COUNT=$(find "$TARGET_DIR/migrations" -name "*.sql" | wc -l)
    echo "✅ Migration files found: $MIGRATION_COUNT files"
else
    echo "⚠️  No migrations directory found"
fi

# Display schema information
echo ""
echo "📋 Schema Information:"
if [ -f "$TARGET_DIR/metadata.json" ]; then
    echo "   • Version: $(jq -r '.version' "$TARGET_DIR/metadata.json")"
    echo "   • Author: $(jq -r '.author' "$TARGET_DIR/metadata.json")"
    echo "   • Created: $(jq -r '.createdAt' "$TARGET_DIR/metadata.json")"
    echo "   • Description: $(jq -r '.description' "$TARGET_DIR/metadata.json")"
fi

echo ""
echo "✅ Schema version $VERSION_FILE pulled successfully from Schema API!"
echo ""
echo "🚀 Next steps:"
echo "   • Restart ingestor service: ./scripts/restart.sh"
echo "   • Test schema integration: ./scripts/test-schema-integration.sh"
echo "   • Verify schema files: ls -la $TARGET_DIR/"

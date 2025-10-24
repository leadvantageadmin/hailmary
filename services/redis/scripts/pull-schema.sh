#!/bin/bash
set -e

# Redis Schema Pull Script
# Pulls schema from GitHub repository for Redis service

echo "📥 Pulling schema for Redis service..."

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"

# Change to service directory
cd "$SERVICE_DIR"

# Configuration
VERSION=${1:-"latest"}
GITHUB_REPO=${GITHUB_REPO:-"leadvantageadmin/hailmary-schema"}
GITHUB_TOKEN=${GITHUB_TOKEN:-""}
TARGET_DIR=${TARGET_DIR:-"./data/schema"}

# GitHub token is optional for public repositories
if [ -z "$GITHUB_TOKEN" ]; then
    echo "⚠️  GITHUB_TOKEN not set - using public access (may have rate limits)"
fi

if [ -z "$GITHUB_REPO" ]; then
    echo "❌ GITHUB_REPO environment variable is required"
    echo "   Set it in your .env file or environment"
    exit 1
fi

echo "🔍 Configuration:"
echo "   • Version: $VERSION"
echo "   • Repository: $GITHUB_REPO"
echo "   • Target Directory: $TARGET_DIR"

# Create target directory
mkdir -p "$TARGET_DIR"

# Determine download URL
if [ "$VERSION" = "latest" ]; then
    echo "🔍 Getting latest release information..."
    DOWNLOAD_URL="https://api.github.com/repos/$GITHUB_REPO/releases/latest"
    if [ -n "$GITHUB_TOKEN" ]; then
        VERSION_FILE=$(curl -s -H "Authorization: token $GITHUB_TOKEN" "$DOWNLOAD_URL" | jq -r '.tag_name' | sed 's/schema-v//')
    else
        VERSION_FILE=$(curl -s "$DOWNLOAD_URL" | jq -r '.tag_name' | sed 's/schema-v//')
    fi
    DOWNLOAD_URL="https://github.com/$GITHUB_REPO/releases/download/schema-$VERSION_FILE/schema-$VERSION_FILE.tar.gz"
else
    VERSION_FILE="$VERSION"
    DOWNLOAD_URL="https://github.com/$GITHUB_REPO/releases/download/schema-$VERSION/schema-$VERSION.tar.gz"
fi

echo "📦 Downloading schema version: $VERSION_FILE"
echo "🔗 Download URL: $DOWNLOAD_URL"

# Download schema archive
TEMP_DIR=$(mktemp -d)
TARGET_DIR_ABS="$(cd "$SERVICE_DIR" && pwd)/data/schema"
cd "$TEMP_DIR"

if [ -n "$GITHUB_TOKEN" ]; then
    CURL_CMD="curl -L -H \"Authorization: token $GITHUB_TOKEN\" -o schema.tar.gz \"$DOWNLOAD_URL\""
else
    CURL_CMD="curl -L -o schema.tar.gz \"$DOWNLOAD_URL\""
fi

if eval $CURL_CMD; then
    echo "✅ Schema downloaded successfully"
    
    # Extract schema
    echo "📂 Extracting schema files..."
    tar -xzf schema.tar.gz
    
    # Copy to target directory
    if [ -d "$VERSION_FILE" ]; then
        echo "📋 Copying schema files to $TARGET_DIR_ABS..."
        cp -r "$VERSION_FILE"/* "$TARGET_DIR_ABS/"
        echo "✅ Schema extracted to $TARGET_DIR_ABS"
    else
        echo "❌ Schema version $VERSION_FILE not found in download"
        exit 1
    fi
else
    echo "❌ Failed to download schema from GitHub"
    echo "📋 Available versions:"
    if [ -n "$GITHUB_TOKEN" ]; then
        curl -s -H "Authorization: token $GITHUB_TOKEN" "https://api.github.com/repos/$GITHUB_REPO/releases" | jq -r '.[] | .tag_name' | head -5
    else
        curl -s "https://api.github.com/repos/$GITHUB_REPO/releases" | jq -r '.[] | .tag_name' | head -5
    fi
    exit 1
fi

# Clean up
cd "$SERVICE_DIR"
rm -rf "$TEMP_DIR"

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

# Display schema information
echo ""
echo "📋 Schema Information:"
if [ -f "$TARGET_DIR/metadata.json" ]; then
    VERSION_INFO=$(jq -r '.version // "unknown"' "$TARGET_DIR/metadata.json")
    AUTHOR_INFO=$(jq -r '.author // "unknown"' "$TARGET_DIR/metadata.json")
    CREATED_INFO=$(jq -r '.createdAt // "unknown"' "$TARGET_DIR/metadata.json")
    DESCRIPTION_INFO=$(jq -r '.description // "No description"' "$TARGET_DIR/metadata.json")
    
    echo "   • Version: $VERSION_INFO"
    echo "   • Author: $AUTHOR_INFO"
    echo "   • Created: $CREATED_INFO"
    echo "   • Description: $DESCRIPTION_INFO"
fi

echo ""
echo "✅ Schema version $VERSION_FILE pulled successfully!"
echo ""
echo "🚀 Next steps:"
echo "   • Restart Redis service: ./scripts/restart.sh"
echo "   • Test Redis functionality: ./scripts/health-check.sh"
echo "   • Verify schema files: ls -la $TARGET_DIR/"

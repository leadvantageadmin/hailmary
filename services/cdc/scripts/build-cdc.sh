#!/bin/bash
set -e

# CDC Build Script
# Validates CDC service configuration

echo "🏗️ Building CDC Service..."

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"

# Change to service directory
cd "$SERVICE_DIR"

echo "🔍 Build Configuration:"
echo "   • Service Directory: $SERVICE_DIR"

# Step 1: Validate configuration files
echo ""
echo "🔍 Step 1: Validating configuration files..."

# Check if schema.json exists (should be manually maintained)
if [ ! -f "./config/schema.json" ]; then
    echo "❌ PGSync schema.json not found"
    echo "   Please ensure config/schema.json exists and is properly configured"
    exit 1
fi

# Validate JSON syntax
if command -v jq >/dev/null 2>&1; then
    echo "🔍 Validating schema.json syntax..."
    if jq empty "./config/schema.json" 2>/dev/null; then
        echo "✅ schema.json is valid JSON"
    else
        echo "❌ schema.json contains invalid JSON"
        exit 1
    fi
else
    echo "⚠️ jq not found, skipping JSON validation"
fi

echo "✅ All files validated successfully"

# Step 2: Display build summary
echo ""
echo "🎉 CDC Build Complete!"
echo "====================="
echo ""
echo "📋 Configuration Files:"
echo "   • PGSync Schema: ./config/schema.json (manually maintained)"
echo "   • Redis Config: ./config/redis.conf"

echo ""
echo "🚀 Next steps:"
echo "   1. Setup CDC: ./scripts/setup-cdc.sh"
echo "   2. Start CDC: ./scripts/manage-cdc.sh start"
echo "   3. Check Status: ./scripts/manage-cdc.sh status"
echo ""
echo "📁 File Structure:"
echo "   services/cdc/"
echo "   ├── config/"
echo "   │   ├── schema.json          ← Manually maintained PGSync configuration"
echo "   │   └── redis.conf           ← Redis configuration"
echo "   └── scripts/"
echo "       ├── build-cdc.sh         ← This build script"
echo "       ├── setup-cdc.sh         ← One-time setup"
echo "       └── manage-cdc.sh        ← Daily operations"

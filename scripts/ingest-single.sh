#!/bin/bash

# Simple wrapper script for processing individual CSV files
# Usage: ./scripts/ingest-single.sh <filename>

set -e

# Check if filename is provided
if [ $# -eq 0 ]; then
    echo "❌ No filename provided"
    echo ""
    echo "Usage: $0 <filename>"
    echo ""
    echo "Available CSV files:"
    if [ -d "data" ]; then
        find data -name "*.csv" -type f | sed 's/^data\///' | sed 's/^/  - /'
    else
        echo "  No data folder found"
    fi
    echo ""
    echo "Examples:"
    echo "  $0 'RPF April 2024.csv'"
    echo "  $0 'RPF December 2024.csv'"
    exit 1
fi

FILENAME="$1"

# Check if file exists
if [ ! -f "data/$FILENAME" ]; then
    echo "❌ File 'data/$FILENAME' not found"
    echo ""
    echo "Available CSV files:"
    if [ -d "data" ]; then
        find data -name "*.csv" -type f | sed 's/^data\///' | sed 's/^/  - /'
    else
        echo "  No data folder found"
    fi
    exit 1
fi

# Check if services are running
if ! docker-compose ps | grep -q "Up"; then
    echo "❌ Services are not running. Please start them first with: ./scripts/dev.sh"
    exit 1
fi

echo "🚀 Processing single CSV file: $FILENAME"
echo "📁 File path: data/$FILENAME"
echo ""

# Clear Redis cache
echo "🧹 Clearing Redis cache..."
docker-compose exec redis redis-cli FLUSHALL

# Process the file
echo "🔄 Starting ingestion..."
docker-compose run --rm ingestor python app.py "/data/$FILENAME"

echo ""
echo "✅ Single file ingestion completed successfully!"
echo "📊 File processed: $FILENAME"

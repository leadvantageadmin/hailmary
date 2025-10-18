#!/bin/bash

# Ingest script for both local and VM environments

set -e

# Configuration
VM_NAME="hail-mary"
ZONE="asia-south1-c"
SSH_USER="pmomale2024"

# Function to run ingestion locally
ingest_local() {
    echo "📥 Running local data ingestion..."

    # Check if services are running
    if ! docker-compose ps | grep -q "Up"; then
        echo "❌ Services are not running. Please start them first with: ./scripts/hailmary.sh local deploy"
        exit 1
    fi

    # Check if data folder exists and has CSV files
    if [ ! -d "data" ]; then
        echo "❌ No data folder found"
        exit 1
    fi
    
    # Check if specific filename is provided
    if [ -n "$2" ] && [ "$2" != "--separator" ] && [ "$2" != "--one-by-one" ]; then
        # Specific filename provided
        SPECIFIC_FILE="$2"
        if [ ! -f "data/$SPECIFIC_FILE" ]; then
            echo "❌ File 'data/$SPECIFIC_FILE' not found"
            echo "💡 Available CSV files in data folder:"
            find data -name "*.csv" -type f | sed 's/^data\///' | sed 's/^/  - /'
            exit 1
        fi
        CSV_FILES="data/$SPECIFIC_FILE"
        echo "📁 Processing specific file: $SPECIFIC_FILE"
    else
        # Find all CSV files in data folder
        CSV_FILES=$(find data -name "*.csv" -type f)
        if [ -z "$CSV_FILES" ]; then
            echo "❌ No CSV files found in data folder"
            echo "💡 Please add CSV files to the data folder"
            exit 1
        fi
        
        echo "📁 Found CSV files:"
        echo "$CSV_FILES" | sed 's/^/  - /'
    fi

    # Clear Redis cache
    echo "🧹 Clearing Redis cache..."
    docker-compose exec redis redis-cli FLUSHALL

    # Process each CSV file
    echo "$CSV_FILES" > /tmp/csv_files.txt
    while IFS= read -r csv_file; do
        echo "🔄 Processing: $csv_file"
        # Check if separator parameter is provided
        if [ "$1" = "--separator" ] && [ -n "$2" ]; then
            docker-compose run --rm ingestor python app.py "/data/$(basename "$csv_file")" --separator "$2"
        else
            docker-compose run --rm ingestor python app.py "/data/$(basename "$csv_file")"
        fi
    done < /tmp/csv_files.txt
    rm -f /tmp/csv_files.txt

    echo "✅ Local data ingestion complete."
}

# Function to run ingestion on VM
ingest_vm() {
    echo "📥 Running data ingestion on VM..."

    gcloud compute ssh $SSH_USER@$VM_NAME --zone=$ZONE --command="
        cd hailmary
        
        # Check if services are running
        if ! docker-compose -f deployment/docker-compose.production.yml ps | grep -q 'Up'; then
            echo '❌ Services are not running. Please start them first.'
            exit 1
        fi
        
        # Check if data folder exists and has CSV files
        if [ ! -d 'data' ]; then
            echo '❌ No data folder found'
            exit 1
        fi
        
        # Find all CSV files in data folder
        CSV_FILES=\$(find data -name '*.csv' -type f)
        if [ -z \"\$CSV_FILES\" ]; then
            echo '❌ No CSV files found in data folder'
            echo '💡 Please add CSV files to the data folder'
            exit 1
        fi
        
        echo '📁 Found CSV files:'
        echo \"\$CSV_FILES\" | sed 's/^/  - /'
        
        # Clear Redis cache
        echo '🧹 Clearing Redis cache...'
        docker-compose -f deployment/docker-compose.production.yml exec redis redis-cli FLUSHALL
        
        # Process each CSV file
        echo \"\$CSV_FILES\" > /tmp/csv_files.txt
        while IFS= read -r csv_file; do
            echo \"🔄 Processing: \$csv_file\"
            # Check if separator parameter is provided
            if [ \"$1\" = \"--separator\" ] && [ -n \"$2\" ]; then
                docker-compose -f deployment/docker-compose.production.yml run --rm ingestor python app.py \"/data/\$(basename \"\$csv_file\")\" --separator \"$2\"
            else
                docker-compose -f deployment/docker-compose.production.yml run --rm ingestor python app.py \"/data/\$(basename \"\$csv_file\")\"
            fi
        done < /tmp/csv_files.txt
        rm -f /tmp/csv_files.txt
    "

    echo "✅ VM data ingestion complete."
}

# Main script logic
ENVIRONMENT=${1:-"local"}

case $ENVIRONMENT in
    "local")
        ingest_local
        ;;
    "vm")
        ingest_vm
        ;;
    *)
        echo "Usage: $0 [local|vm] [FILENAME|--separator SEPARATOR|--one-by-one]"
        echo "  local - Run data ingestion locally"
        echo "  vm    - Run data ingestion on VM"
        echo "  FILENAME - Process specific CSV file (e.g., 'RPF April 2024.csv')"
        echo "  --separator SEPARATOR - Specify CSV separator (e.g., ';' for semicolon)"
        echo "  --one-by-one - Process files one at a time with user confirmation"
        echo ""
        echo "Examples:"
        echo "  $0 local                    # Run locally with all CSV files"
        echo "  $0 vm                       # Run on VM with all CSV files"
        echo "  $0 local 'RPF April 2024.csv'  # Process specific file locally"
        echo "  $0 vm 'RPF April 2024.csv'     # Process specific file on VM"
        echo "  $0 local --separator ';'    # Run locally with semicolon separator"
        echo "  $0 vm --separator ';'       # Run on VM with semicolon separator"
        echo "  $0 local --one-by-one       # Process files one by one with confirmation"
        exit 1
        ;;
esac

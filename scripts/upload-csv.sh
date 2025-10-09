#!/bin/bash

# CSV Upload Script for both local and VM environments

set -e

# Configuration
VM_NAME="hail-mary"
ZONE="asia-south1-c"
SSH_USER="pmomale2024"

# Function to upload CSV locally (copy to data directory)
upload_csv_local() {
    local csv_file=$1
    
    if [ -z "$csv_file" ]; then
        echo "❌ Please provide a CSV file path"
        echo "Usage: $0 local <csv-file>"
        exit 1
    fi
    
    if [ ! -f "$csv_file" ]; then
        echo "❌ CSV file not found: $csv_file"
        exit 1
    fi
    
    echo "📤 Copying CSV file to local data directory..."
    cp "$csv_file" data/customers.csv
    echo "✅ CSV file copied to data/customers.csv"
    echo "💡 You can now run data ingestion with: ./scripts/hailmary.sh local ingest"
}

# Function to upload CSV to VM
upload_csv_vm() {
    local csv_file=$1
    
    if [ -z "$csv_file" ]; then
        echo "❌ Please provide a CSV file path"
        echo "Usage: $0 vm <csv-file>"
        exit 1
    fi
    
    if [ ! -f "$csv_file" ]; then
        echo "❌ CSV file not found: $csv_file"
        exit 1
    fi
    
    echo "📤 Uploading CSV file to VM..."
    gcloud compute scp "$csv_file" $SSH_USER@$VM_NAME:/home/$SSH_USER/hailmary/data/customers.csv --zone=$ZONE
    echo "✅ CSV file uploaded to VM"
    echo "💡 You can now run data ingestion with: ./scripts/hailmary.sh vm ingest"
}

# Function to show help
show_help() {
    echo "CSV Upload Script for HailMary Customer Search Platform"
    echo ""
    echo "Usage: $0 [ENVIRONMENT] [CSV_FILE]"
    echo ""
    echo "Environments:"
    echo "  local    - Copy CSV to local data directory"
    echo "  vm       - Upload CSV to VM"
    echo ""
    echo "Examples:"
    echo "  $0 local data/customers.csv     # Copy CSV locally"
    echo "  $0 vm data/customers.csv        # Upload CSV to VM"
    echo ""
    echo "After uploading, run data ingestion:"
    echo "  ./scripts/hailmary.sh local ingest    # For local"
    echo "  ./scripts/hailmary.sh vm ingest       # For VM"
}

# Main script logic
if [ $# -eq 0 ] || [ "$1" = "help" ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

ENVIRONMENT=$1
CSV_FILE=$2

case $ENVIRONMENT in
    "local")
        upload_csv_local "$CSV_FILE"
        ;;
    "vm")
        upload_csv_vm "$CSV_FILE"
        ;;
    *)
        echo "❌ Unknown environment: $ENVIRONMENT"
        echo "Available environments: local, vm"
        echo "Use '$0 help' for more information"
        exit 1
        ;;
esac

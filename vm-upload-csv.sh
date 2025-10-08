#!/bin/bash

# CSV Upload Script for HailMary Customer Search Platform
# This script uploads CSV files to your GCP VM instance

set -e

# Configuration
VM_NAME="hail-mary"
ZONE="asia-south1-c"
SSH_USER="pmomale2024"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to show help
show_help() {
    echo -e "${BLUE}HailMary CSV Upload Script${NC}"
    echo ""
    echo "Usage: $0 [CSV_FILE]"
    echo ""
    echo "Examples:"
    echo "  $0 customers.csv"
    echo "  $0 data/customers.csv"
    echo "  $0 /path/to/your/customers.csv"
    echo ""
    echo "This script will:"
    echo "1. Upload the CSV file to your VM"
    echo "2. Place it in the data/ directory"
    echo "3. Make it ready for ingestion"
    echo ""
}

# Check if file is provided
if [ $# -eq 0 ]; then
    echo -e "${RED}❌ No CSV file provided${NC}"
    echo ""
    show_help
    exit 1
fi

CSV_FILE="$1"

# Check if file exists
if [ ! -f "$CSV_FILE" ]; then
    echo -e "${RED}❌ File not found: $CSV_FILE${NC}"
    exit 1
fi

# Get VM external IP
echo -e "${BLUE}🔍 Getting VM external IP...${NC}"
VM_IP=$(gcloud compute instances describe $VM_NAME --zone=$ZONE --format="value(networkInterfaces[0].accessConfigs[0].natIP)")

if [ -z "$VM_IP" ]; then
    echo -e "${RED}❌ Could not find VM IP. Please check VM name and zone.${NC}"
    exit 1
fi

echo -e "${BLUE}📍 VM IP: $VM_IP${NC}"

# Upload CSV file to VM
echo -e "${YELLOW}📤 Uploading CSV file to VM...${NC}"
gcloud compute scp "$CSV_FILE" $SSH_USER@$VM_NAME:/home/$SSH_USER/hailmary/data/customers.csv --zone=$ZONE

echo -e "${GREEN}✅ CSV file uploaded successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. Run data ingestion: ./vm-manage.sh ingest"
echo "2. Check service status: ./vm-manage.sh status"
echo "3. Access your app: http://$VM_IP:3000"
echo ""
echo -e "${BLUE}💡 Tips:${NC}"
echo "- The file has been placed in /home/$SSH_USER/hailmary/data/customers.csv"
echo "- You can upload multiple CSV files with different names"
echo "- Use './vm-manage.sh ingest' to process the data"

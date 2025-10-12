#!/bin/bash

# VM Deployment Script
# Downloads and deploys specific versions of the application to VM

set -e

# Configuration
VM_NAME="hail-mary"
ZONE="asia-south1-c"
PROJECT_ID="leadvantage-global"
SSH_USER="pmomale2024"
REPO_OWNER="leadvantageadmin"
REPO_NAME="hailmary"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"  # Set this if you need to access private repos

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to get VM IP
get_vm_ip() {
    gcloud compute instances describe $VM_NAME --zone=$ZONE --format="value(networkInterfaces[0].accessConfigs[0].natIP)"
}

# Function to list available releases
list_releases() {
    print_status "Fetching available releases from GitHub..."
    
    if [ -n "$GITHUB_TOKEN" ]; then
        curl -s -H "Authorization: token $GITHUB_TOKEN" \
             "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases" | \
             jq -r '.[] | "\(.tag_name) - \(.created_at) - \(.body // "No description")"'
    else
        curl -s "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases" | \
             jq -r '.[] | "\(.tag_name) - \(.created_at) - \(.body // "No description")"'
    fi
}

# Function to download release
download_release() {
    local version=$1
    local download_url=""
    
    print_status "Downloading release: $version"
    
    if [ -n "$GITHUB_TOKEN" ]; then
        download_url=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
                           "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases/tags/$version" | \
                           jq -r '.assets[] | select(.name | endswith(".tar.gz")) | .browser_download_url')
    else
        download_url=$(curl -s "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases/tags/$version" | \
                           jq -r '.assets[] | select(.name | endswith(".tar.gz")) | .browser_download_url')
    fi
    
    if [ -z "$download_url" ] || [ "$download_url" = "null" ]; then
        print_error "Release not found or no package available for version: $version"
        exit 1
    fi
    
    print_status "Download URL: $download_url"
    echo "$download_url"
}

# Function to deploy specific version
deploy_version() {
    local version=$1
    local vm_ip=$(get_vm_ip)
    
    if [ -z "$vm_ip" ]; then
        print_error "Could not find VM IP. Please check VM name and zone."
        exit 1
    fi
    
    print_status "Deploying version $version to VM ($vm_ip)..."
    
    # Download release URL
    local download_url=$(download_release "$version")
    
    # Execute deployment on VM
    gcloud compute ssh $SSH_USER@$VM_NAME --zone=$ZONE --command="
        set -e
        
        # Create deployment directory
        mkdir -p /tmp/hailmary-deploy
        cd /tmp/hailmary-deploy
        
        # Download the release package
        echo 'Downloading release package...'
        wget -O package.tar.gz '$download_url'
        
        # Verify download
        if [ ! -f package.tar.gz ]; then
            echo 'ERROR: Failed to download package'
            exit 1
        fi
        
        # Extract package
        echo 'Extracting package...'
        tar -xzf package.tar.gz
        
        # Find the extracted directory
        PACKAGE_DIR=\$(ls -d hailmary-* | head -1)
        
        if [ -z \"\$PACKAGE_DIR\" ]; then
            echo 'ERROR: Could not find extracted package directory'
            exit 1
        fi
        
        echo \"Deploying from package: \$PACKAGE_DIR\"
        
        # Run deployment script
        cd \"\$PACKAGE_DIR\"
        chmod +x deploy.sh
        sudo ./deploy.sh deploy
        
        # Clean up
        cd /tmp
        rm -rf /tmp/hailmary-deploy
        
        echo 'Deployment completed successfully!'
    "
    
    print_success "Deployment completed!"
    print_status "Application should be available at: http://hailmary.leadvantageglobal.com"
}

# Function to deploy from local package
deploy_local_package() {
    local package_path=$1
    local vm_ip=$(get_vm_ip)
    
    if [ -z "$vm_ip" ]; then
        print_error "Could not find VM IP. Please check VM name and zone."
        exit 1
    fi
    
    if [ ! -f "$package_path" ]; then
        print_error "Package file not found: $package_path"
        exit 1
    fi
    
    print_status "Deploying local package to VM ($vm_ip)..."
    
    # Upload package to VM
    gcloud compute scp "$package_path" $SSH_USER@$VM_NAME:/tmp/ --zone=$ZONE
    
    # Execute deployment on VM
    gcloud compute ssh $SSH_USER@$VM_NAME --zone=$ZONE --command="
        set -e
        
        # Create deployment directory
        mkdir -p /tmp/hailmary-deploy
        cd /tmp/hailmary-deploy
        
        # Extract package
        echo 'Extracting package...'
        tar -xzf /tmp/$(basename "$package_path")
        
        # Find the extracted directory
        PACKAGE_DIR=\$(ls -d hailmary-* | head -1)
        
        if [ -z \"\$PACKAGE_DIR\" ]; then
            echo 'ERROR: Could not find extracted package directory'
            exit 1
        fi
        
        echo \"Deploying from package: \$PACKAGE_DIR\"
        
        # Run deployment script
        cd \"\$PACKAGE_DIR\"
        chmod +x deploy.sh
        sudo ./deploy.sh deploy
        
        # Clean up
        cd /tmp
        rm -rf /tmp/hailmary-deploy
        rm -f /tmp/$(basename "$package_path")
        
        echo 'Deployment completed successfully!'
    "
    
    print_success "Deployment completed!"
    print_status "Application should be available at: http://hailmary.leadvantageglobal.com"
}

# Function to show VM status
show_vm_status() {
    local vm_ip=$(get_vm_ip)
    
    if [ -z "$vm_ip" ]; then
        print_error "Could not find VM IP. Please check VM name and zone."
        exit 1
    fi
    
    print_status "VM Status ($vm_ip):"
    
    gcloud compute ssh $SSH_USER@$VM_NAME --zone=$ZONE --command="
        echo '=== System Status ==='
        uptime
        echo
        echo '=== Docker Status ==='
        docker ps
        echo
        echo '=== HailMary Services ==='
        if [ -d /opt/hailmary ]; then
            cd /opt/hailmary
            if [ -f version.json ]; then
                echo 'Current Version:'
                cat version.json | python3 -m json.tool 2>/dev/null || cat version.json
            fi
            echo
            echo 'Service Status:'
            docker-compose -f deployment/docker-compose.production.yml ps 2>/dev/null || echo 'Services not running'
        else
            echo 'HailMary not deployed'
        fi
        echo
        echo '=== Available Backups ==='
        ls -la /opt/hailmary-backups 2>/dev/null || echo 'No backups found'
    "
}

# Function to rollback on VM
rollback_vm() {
    local backup_name=$1
    local vm_ip=$(get_vm_ip)
    
    if [ -z "$vm_ip" ]; then
        print_error "Could not find VM IP. Please check VM name and zone."
        exit 1
    fi
    
    print_status "Rolling back VM to backup: $backup_name"
    
    gcloud compute ssh $SSH_USER@$VM_NAME --zone=$ZONE --command="
        if [ -d /opt/hailmary ]; then
            cd /opt/hailmary
            sudo ./deploy.sh rollback '$backup_name'
        else
            echo 'ERROR: HailMary not deployed'
            exit 1
        fi
    "
    
    print_success "Rollback completed!"
}

# Function to create and upload release
create_and_upload_release() {
    local version=$1
    local description=$2
    
    if [ -z "$version" ]; then
        print_error "Version is required"
        exit 1
    fi
    
    if [ -z "$GITHUB_TOKEN" ]; then
        print_error "GitHub token is required for creating releases"
        exit 1
    fi
    
    print_status "Creating release: $version"
    
    # Build the package locally
    ./scripts/build-deployment.sh build
    
    # Find the latest package
    local package_file=$(ls -t releases/hailmary-*.tar.gz | head -1)
    local package_name=$(basename "$package_file")
    
    if [ -z "$package_file" ]; then
        print_error "No package found. Build failed?"
        exit 1
    fi
    
    print_status "Uploading package: $package_name"
    
    # Create release on GitHub
    local release_data=$(cat << EOF
{
    "tag_name": "$version",
    "target_commitish": "main",
    "name": "HailMary $version",
    "body": "$description",
    "draft": false,
    "prerelease": false
}
EOF
)
    
    local release_response=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
                                  -H "Content-Type: application/json" \
                                  -d "$release_data" \
                                  "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases")
    
    local upload_url=$(echo "$release_response" | jq -r '.upload_url' | sed 's/{?name,label}//')
    
    if [ "$upload_url" = "null" ]; then
        print_error "Failed to create release"
        echo "$release_response" | jq -r '.message // .'
        exit 1
    fi
    
    # Upload the package
    local upload_response=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
                                 -H "Content-Type: application/gzip" \
                                 --data-binary @"$package_file" \
                                 "$upload_url?name=$package_name")
    
    # Upload checksum
    local checksum_file="${package_file}.sha256"
    if [ -f "$checksum_file" ]; then
        curl -s -H "Authorization: token $GITHUB_TOKEN" \
             -H "Content-Type: text/plain" \
             --data-binary @"$checksum_file" \
             "$upload_url?name=${package_name}.sha256"
    fi
    
    print_success "Release created and uploaded: $version"
    print_status "Release URL: $(echo "$release_response" | jq -r '.html_url')"
}

# Main script logic
case "${1:-help}" in
    "deploy")
        if [ -z "$2" ]; then
            print_error "Version is required"
            echo "Usage: $0 deploy <version>"
            echo "Example: $0 deploy v1.0.0"
            exit 1
        fi
        deploy_version "$2"
        ;;
    "deploy-local")
        if [ -z "$2" ]; then
            print_error "Package path is required"
            echo "Usage: $0 deploy-local <package_path>"
            echo "Example: $0 deploy-local releases/hailmary-v1.0.0.tar.gz"
            exit 1
        fi
        deploy_local_package "$2"
        ;;
    "status")
        show_vm_status
        ;;
    "rollback")
        if [ -z "$2" ]; then
            print_error "Backup name is required"
            echo "Usage: $0 rollback <backup_name>"
            exit 1
        fi
        rollback_vm "$2"
        ;;
    "list")
        list_releases
        ;;
    "create-release")
        create_and_upload_release "$2" "$3"
        ;;
    "help"|*)
        echo "HailMary VM Deployment Script"
        echo ""
        echo "Usage: $0 <command> [options]"
        echo ""
        echo "Commands:"
        echo "  deploy <version>              Deploy specific version from GitHub release"
        echo "  deploy-local <package_path>   Deploy local package file"
        echo "  status                        Show VM and application status"
        echo "  rollback <backup_name>        Rollback to previous backup"
        echo "  list                          List available releases"
        echo "  create-release <version> [description]  Create and upload new release"
        echo "  help                          Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 deploy v1.0.0"
        echo "  $0 deploy-local releases/hailmary-v1.0.0.tar.gz"
        echo "  $0 status"
        echo "  $0 rollback backup_20241201_143022"
        echo "  $0 create-release v1.0.0 \"Initial release\""
        echo ""
        echo "Configuration:"
        echo "  VM_NAME: $VM_NAME"
        echo "  ZONE: $ZONE"
        echo "  PROJECT_ID: $PROJECT_ID"
        echo "  SSH_USER: $SSH_USER"
        echo "  REPO: $REPO_OWNER/$REPO_NAME"
        ;;
esac

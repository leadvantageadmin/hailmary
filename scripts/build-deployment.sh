#!/bin/bash

# Build Deployment Package Script
# Creates versioned, executable deployment packages for VM deployment

set -e

# Configuration
REPO_NAME="hailmary"
BUILD_DIR="build"
RELEASES_DIR="releases"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

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

# Function to get version from git
get_version() {
    local commit_hash=$(git rev-parse --short HEAD)
    local branch=$(git rev-parse --abbrev-ref HEAD)
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    
    if [ "$branch" = "main" ]; then
        echo "v${timestamp}_${commit_hash}"
    else
        echo "v${timestamp}_${branch}_${commit_hash}"
    fi
}

# Function to get commit info
get_commit_info() {
    local commit_hash=$(git rev-parse HEAD)
    local commit_message=$(git log -1 --pretty=format:"%s")
    local commit_author=$(git log -1 --pretty=format:"%an")
    local commit_date=$(git log -1 --pretty=format:"%ad" --date=iso)
    
    cat << EOF
{
    "commit_hash": "$commit_hash",
    "commit_short": "$(git rev-parse --short HEAD)",
    "commit_message": "$commit_message",
    "commit_author": "$commit_author",
    "commit_date": "$commit_date",
    "branch": "$(git rev-parse --abbrev-ref HEAD)",
    "build_date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "build_user": "$(whoami)"
}
EOF
}

# Function to create deployment package
create_deployment_package() {
    local version=$1
    local package_name="${REPO_NAME}-${version}"
    local package_dir="${BUILD_DIR}/${package_name}"
    
    print_status "Creating deployment package: $package_name"
    
    # Create package directory
    mkdir -p "$package_dir"
    
    # Copy essential files
    print_status "Copying application files..."
    
    # Copy web app (built)
    mkdir -p "$package_dir/apps/web"
    cp -r apps/web/.next "$package_dir/apps/web/" 2>/dev/null || print_warning "No built web app found, will build on deployment"
    cp -r apps/web/public "$package_dir/apps/web/" 2>/dev/null || true
    cp -r apps/web/prisma "$package_dir/apps/web/" 2>/dev/null || true
    cp apps/web/package.json "$package_dir/apps/web/" 2>/dev/null || true
    cp apps/web/next.config.js "$package_dir/apps/web/" 2>/dev/null || true
    cp apps/web/tsconfig.json "$package_dir/apps/web/" 2>/dev/null || true
    
    # Copy ingestor
    mkdir -p "$package_dir/apps/ingestor"
    cp -r apps/ingestor/* "$package_dir/apps/ingestor/" 2>/dev/null || true
    
    # Copy deployment configuration
    mkdir -p "$package_dir/deployment"
    cp -r deployment/* "$package_dir/deployment/" 2>/dev/null || true
    
    # Copy shared packages
    mkdir -p "$package_dir/packages"
    cp -r packages/* "$package_dir/packages/" 2>/dev/null || true
    
    # Copy root configuration files
    cp package.json "$package_dir/" 2>/dev/null || true
    cp pnpm-workspace.yaml "$package_dir/" 2>/dev/null || true
    cp pnpm-lock.yaml "$package_dir/" 2>/dev/null || true
    
    # Create version info
    print_status "Creating version information..."
    get_commit_info > "$package_dir/version.json"
    
    # Create deployment script
    print_status "Creating deployment script..."
    cat > "$package_dir/deploy.sh" << 'EOF'
#!/bin/bash

# HailMary Deployment Script
# Self-contained deployment script for VM environments

set -e

# Configuration
DEPLOYMENT_DIR="/opt/hailmary"
SERVICE_NAME="hailmary"
BACKUP_DIR="/opt/hailmary-backups"
LOG_FILE="/var/log/hailmary-deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root"
        exit 1
    fi
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing system dependencies..."
    
    # Update package list
    apt-get update
    
    # Install Docker if not present
    if ! command -v docker &> /dev/null; then
        print_status "Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        systemctl enable docker
        systemctl start docker
        rm get-docker.sh
    fi
    
    # Install Docker Compose if not present
    if ! command -v docker-compose &> /dev/null; then
        print_status "Installing Docker Compose..."
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
    fi
    
    # Install Node.js and pnpm if not present
    if ! command -v node &> /dev/null; then
        print_status "Installing Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt-get install -y nodejs
    fi
    
    if ! command -v pnpm &> /dev/null; then
        print_status "Installing pnpm..."
        npm install -g pnpm
    fi
    
    print_success "Dependencies installed successfully"
}

# Function to backup current deployment
backup_current() {
    if [ -d "$DEPLOYMENT_DIR" ]; then
        local backup_name="backup_$(date +%Y%m%d_%H%M%S)"
        print_status "Creating backup: $backup_name"
        
        mkdir -p "$BACKUP_DIR"
        cp -r "$DEPLOYMENT_DIR" "$BACKUP_DIR/$backup_name"
        
        # Keep only last 5 backups
        cd "$BACKUP_DIR"
        ls -t | tail -n +6 | xargs -r rm -rf
        
        print_success "Backup created: $backup_name"
    fi
}

# Function to deploy application
deploy_application() {
    print_status "Deploying application..."
    
    # Create deployment directory
    mkdir -p "$DEPLOYMENT_DIR"
    
    # Copy application files
    cp -r . "$DEPLOYMENT_DIR/"
    cd "$DEPLOYMENT_DIR"
    
    # Set proper permissions
    chown -R root:root "$DEPLOYMENT_DIR"
    chmod +x "$DEPLOYMENT_DIR/deploy.sh"
    
    # Create environment file if it doesn't exist
    if [ ! -f "deployment/.env" ]; then
        print_warning "No environment file found. Please create deployment/.env"
        print_warning "You can copy from deployment/env.production and modify as needed"
    fi
    
    # Build web application if needed
    if [ ! -d "apps/web/.next" ]; then
        print_status "Building web application..."
        cd apps/web
        pnpm install
        pnpm prisma:generate
        pnpm build
        cd ../..
    fi
    
    # Stop existing services
    print_status "Stopping existing services..."
    docker-compose -f deployment/docker-compose.production.yml down || true
    
    # Start services
    print_status "Starting services..."
    docker-compose -f deployment/docker-compose.production.yml up -d --build
    
    # Wait for services to be ready
    print_status "Waiting for services to start..."
    sleep 30
    
    # Setup database schema
    print_status "Setting up database schema..."
    docker-compose -f deployment/docker-compose.production.yml exec -T web sh -c 'cd apps/web && npx prisma db push' || print_warning "Database schema setup failed"
    
    # Check service status
    print_status "Checking service status..."
    docker-compose -f deployment/docker-compose.production.yml ps
    
    print_success "Deployment completed successfully!"
}

# Function to show deployment info
show_info() {
    if [ -f "version.json" ]; then
        print_status "Deployment Information:"
        cat version.json | python3 -m json.tool 2>/dev/null || cat version.json
    fi
    
    print_status "Service Status:"
    docker-compose -f deployment/docker-compose.production.yml ps 2>/dev/null || print_warning "Services not running"
    
    print_status "Available Backups:"
    ls -la "$BACKUP_DIR" 2>/dev/null || print_warning "No backups found"
}

# Function to rollback
rollback() {
    local backup_name=$1
    
    if [ -z "$backup_name" ]; then
        print_error "Please specify backup name"
        print_status "Available backups:"
        ls -la "$BACKUP_DIR" 2>/dev/null || print_warning "No backups found"
        exit 1
    fi
    
    if [ ! -d "$BACKUP_DIR/$backup_name" ]; then
        print_error "Backup not found: $backup_name"
        exit 1
    fi
    
    print_status "Rolling back to: $backup_name"
    
    # Stop current services
    docker-compose -f deployment/docker-compose.production.yml down || true
    
    # Restore backup
    rm -rf "$DEPLOYMENT_DIR"
    cp -r "$BACKUP_DIR/$backup_name" "$DEPLOYMENT_DIR"
    
    # Start services
    cd "$DEPLOYMENT_DIR"
    docker-compose -f deployment/docker-compose.production.yml up -d
    
    print_success "Rollback completed successfully!"
}

# Main script logic
case "${1:-deploy}" in
    "deploy")
        check_root
        log "Starting deployment"
        install_dependencies
        backup_current
        deploy_application
        show_info
        ;;
    "info")
        show_info
        ;;
    "rollback")
        check_root
        rollback "$2"
        ;;
    "backup")
        check_root
        backup_current
        ;;
    *)
        echo "Usage: $0 [deploy|info|rollback|backup]"
        echo "  deploy   - Deploy the application (default)"
        echo "  info     - Show deployment information"
        echo "  rollback - Rollback to a previous version"
        echo "  backup   - Create a backup of current deployment"
        exit 1
        ;;
esac
EOF
    
    chmod +x "$package_dir/deploy.sh"
    
    # Create package archive
    print_status "Creating package archive..."
    cd "$BUILD_DIR"
    tar -czf "${package_name}.tar.gz" "$package_name"
    
    # Move to releases directory
    mkdir -p "$RELEASES_DIR"
    mv "${package_name}.tar.gz" "$RELEASES_DIR/"
    
    # Create checksum
    cd "$RELEASES_DIR"
    sha256sum "${package_name}.tar.gz" > "${package_name}.tar.gz.sha256"
    
    # Clean up build directory
    rm -rf "$package_name"
    
    print_success "Package created: $RELEASES_DIR/${package_name}.tar.gz"
    print_success "Checksum: $RELEASES_DIR/${package_name}.tar.gz.sha256"
    
    # Show package info
    print_status "Package Information:"
    echo "  Version: $version"
    echo "  Size: $(du -h "${package_name}.tar.gz" | cut -f1)"
    echo "  Created: $(date)"
    
    if [ -f "$package_dir/version.json" ]; then
        print_status "Version Details:"
        cat "$package_dir/version.json" | python3 -m json.tool 2>/dev/null || cat "$package_dir/version.json"
    fi
}

# Function to list available packages
list_packages() {
    if [ -d "$RELEASES_DIR" ]; then
        print_status "Available deployment packages:"
        ls -la "$RELEASES_DIR"/*.tar.gz 2>/dev/null || print_warning "No packages found"
    else
        print_warning "No releases directory found"
    fi
}

# Function to clean old packages
clean_packages() {
    local keep_count=${1:-5}
    
    if [ -d "$RELEASES_DIR" ]; then
        print_status "Cleaning old packages (keeping last $keep_count)..."
        cd "$RELEASES_DIR"
        ls -t *.tar.gz 2>/dev/null | tail -n +$((keep_count + 1)) | xargs -r rm -f
        ls -t *.tar.gz.sha256 2>/dev/null | tail -n +$((keep_count + 1)) | xargs -r rm -f
        print_success "Cleanup completed"
    fi
}

# Main script logic
cd "$PROJECT_ROOT"

case "${1:-build}" in
    "build")
        # Check if we're in a git repository
        if ! git rev-parse --git-dir > /dev/null 2>&1; then
            print_error "Not in a git repository"
            exit 1
        fi
        
        # Check if there are uncommitted changes
        if ! git diff-index --quiet HEAD --; then
            print_warning "You have uncommitted changes. Consider committing them first."
            read -p "Continue anyway? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
        
        version=$(get_version)
        create_deployment_package "$version"
        ;;
    "list")
        list_packages
        ;;
    "clean")
        clean_packages "$2"
        ;;
    *)
        echo "Usage: $0 [build|list|clean]"
        echo "  build [keep_count] - Build deployment package (default)"
        echo "  list              - List available packages"
        echo "  clean [count]     - Clean old packages (default: keep 5)"
        exit 1
        ;;
esac

#!/bin/bash

# Example Workflow Script
# Demonstrates the complete deployment workflow

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Function to demonstrate complete workflow
demo_workflow() {
    print_status "=== HailMary Deployment Workflow Demo ==="
    echo
    
    print_status "1. Check current version"
    current_version=$(./scripts/version-manager.sh current)
    echo "Current version: $current_version"
    echo
    
    print_status "2. List available packages"
    ./scripts/build-deployment.sh list
    echo
    
    print_status "3. Build a new package (patch version)"
    print_warning "This will create a new version and build a package"
    read -p "Continue? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./scripts/version-manager.sh release patch "Demo patch release"
        echo
        
        print_status "4. List new packages"
        ./scripts/build-deployment.sh list
        echo
        
        print_status "5. Show version history"
        ./scripts/version-manager.sh history
        echo
        
        print_success "Demo completed! You can now:"
        echo "  - Deploy to VM: ./scripts/deploy.sh executable v$(./scripts/version-manager.sh current)"
        echo "  - Check status: ./scripts/deploy.sh status"
        echo "  - Rollback if needed: ./scripts/deploy.sh rollback <backup_name>"
    else
        print_status "Demo cancelled"
    fi
}

# Function to show quick commands
show_quick_commands() {
    print_status "=== Quick Commands Reference ==="
    echo
    
    echo "Version Management:"
    echo "  ./scripts/version-manager.sh current          # Show current version"
    echo "  ./scripts/version-manager.sh list             # List versions"
    echo "  ./scripts/version-manager.sh release patch    # Create patch release"
    echo "  ./scripts/version-manager.sh history          # Show version history"
    echo
    
    echo "Building Packages:"
    echo "  ./scripts/build-deployment.sh build           # Build package"
    echo "  ./scripts/build-deployment.sh list            # List packages"
    echo "  ./scripts/build-deployment.sh clean 5         # Clean old packages"
    echo
    
    echo "Deployment:"
    echo "  ./scripts/deploy.sh local                     # Deploy locally"
    echo "  ./scripts/deploy.sh executable v1.0.0        # Deploy specific version"
    echo "  ./scripts/deploy.sh build-deploy patch        # Build and deploy"
    echo "  ./scripts/deploy.sh status                    # Check VM status"
    echo "  ./scripts/deploy.sh rollback <backup>         # Rollback"
    echo
    
    echo "VM Management:"
    echo "  ./scripts/deploy-to-vm.sh deploy v1.0.0      # Deploy from GitHub"
    echo "  ./scripts/deploy-to-vm.sh status              # VM status"
    echo "  ./scripts/deploy-to-vm.sh list                # List releases"
    echo
}

# Function to show typical scenarios
show_scenarios() {
    print_status "=== Typical Deployment Scenarios ==="
    echo
    
    echo "Scenario 1: Bug Fix Deployment"
    echo "  1. Fix bug locally"
    echo "  2. git add . && git commit -m 'fix: resolve search issue'"
    echo "  3. ./scripts/deploy.sh build-deploy patch 'Bug fix for search'"
    echo "  4. ./scripts/deploy.sh status"
    echo
    
    echo "Scenario 2: New Feature Deployment"
    echo "  1. Add new feature locally"
    echo "  2. git add . && git commit -m 'feat: add customer filters'"
    echo "  3. ./scripts/deploy.sh build-deploy minor 'Added customer filters'"
    echo "  4. ./scripts/deploy.sh status"
    echo
    
    echo "Scenario 3: Emergency Rollback"
    echo "  1. ./scripts/deploy.sh status"
    echo "  2. ./scripts/deploy.sh rollback backup_20241201_143022"
    echo "  3. ./scripts/deploy.sh status"
    echo
    
    echo "Scenario 4: Deploy Specific Version"
    echo "  1. ./scripts/deploy-to-vm.sh list"
    echo "  2. ./scripts/deploy.sh executable v1.0.0"
    echo "  3. ./scripts/deploy.sh status"
    echo
}

# Main script logic
case "${1:-demo}" in
    "demo")
        demo_workflow
        ;;
    "commands")
        show_quick_commands
        ;;
    "scenarios")
        show_scenarios
        ;;
    "help"|*)
        echo "HailMary Deployment Workflow Examples"
        echo ""
        echo "Usage: $0 [demo|commands|scenarios|help]"
        echo ""
        echo "Commands:"
        echo "  demo       - Run interactive demo workflow"
        echo "  commands   - Show quick commands reference"
        echo "  scenarios  - Show typical deployment scenarios"
        echo "  help       - Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 demo        # Interactive demo"
        echo "  $0 commands    # Quick reference"
        echo "  $0 scenarios   # Common scenarios"
        ;;
esac

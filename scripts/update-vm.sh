#!/bin/bash
set -e

# HailMary VM Update Script
# Pulls latest code from GitHub and updates services on VM
# Usage: ./scripts/update-vm.sh [branch]
#   branch: Git branch to pull (default: main)

echo "🔄 Starting HailMary VM Update..."

# Get script arguments
BRANCH=${1:-main}

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Change to project directory
cd "$PROJECT_DIR"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Not in a git repository. Please run this script from the project root."
    exit 1
fi

# Check if we're on the correct branch
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "$BRANCH" ]]; then
    echo "🔄 Switching to branch: $BRANCH"
    git checkout "$BRANCH"
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  Warning: You have uncommitted changes."
    echo "   These changes will be stashed before pulling."
    read -p "   Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Update cancelled."
        exit 1
    fi
    
    echo "📦 Stashing uncommitted changes..."
    git stash push -m "Auto-stash before VM update $(date)"
fi

# Get current commit hash
OLD_COMMIT=$(git rev-parse HEAD)
echo "📋 Current commit: $OLD_COMMIT"

# Pull latest changes
echo "📥 Pulling latest changes from origin/$BRANCH..."
git fetch origin
git pull origin "$BRANCH"

# Get new commit hash
NEW_COMMIT=$(git rev-parse HEAD)
echo "📋 New commit: $NEW_COMMIT"

# Check if there were any changes
if [[ "$OLD_COMMIT" == "$NEW_COMMIT" ]]; then
    echo "✅ No changes detected. Repository is up to date."
    exit 0
fi

echo "🔄 Changes detected. Updating services..."

# Check if we're on a VM (check for /opt/hailmary directory)
if [[ -d "/opt/hailmary" ]]; then
    echo "🖥️  Detected VM environment. Updating VM deployment..."
    
    # Update VM deployment
    echo "📁 Copying updated files to VM deployment directory..."
    sudo cp -r services /opt/hailmary/
    sudo cp -r scripts /opt/hailmary/
    sudo cp .gitignore /opt/hailmary/
    sudo cp README.md /opt/hailmary/
    sudo cp RUNBOOK.md /opt/hailmary/
    
    # Set proper permissions
    sudo chown -R hailmary:hailmary /opt/hailmary
    sudo chmod +x /opt/hailmary/services/*/scripts/*.sh
    sudo chmod +x /opt/hailmary/scripts/*.sh
    
    # Update environment files if they don't exist
    echo "📋 Updating environment files..."
    for service in postgres redis schema cdc ingestor web; do
        if [[ ! -f "/opt/hailmary/services/$service/.env" ]]; then
            if [[ -f "/opt/hailmary/services/$service/env.example" ]]; then
                sudo cp "/opt/hailmary/services/$service/env.example" "/opt/hailmary/services/$service/.env"
                sudo chown hailmary:hailmary "/opt/hailmary/services/$service/.env"
            fi
        fi
    done
    
    echo "✅ VM deployment updated successfully!"
    echo "   Services are not automatically restarted."
    echo "   To restart services, run: /opt/hailmary/start-all.sh"
    
else
    echo "💻 Local environment detected. No VM deployment update needed."
fi

# Show what changed
echo ""
echo "📋 Changes Summary:"
echo "   • Old commit: $OLD_COMMIT"
echo "   • New commit: $NEW_COMMIT"
echo "   • Branch: $BRANCH"

# Show recent commits
echo ""
echo "📝 Recent commits:"
git log --oneline -5

echo ""
echo "🎉 VM update completed successfully!"
echo ""
echo "🔧 Next Steps:"
if [[ -d "/opt/hailmary" ]]; then
    echo "   • Restart services: /opt/hailmary/start-all.sh"
    echo "   • Check service status: /opt/hailmary/status.sh"
    echo "   • Check service health: /opt/hailmary/health-check.sh"
    echo "   • View logs: /opt/hailmary/services/*/scripts/logs.sh vm"
    echo "   • Access application: http://$(hostname -I | awk '{print $1}'):3000"
else
    echo "   • Start services locally: cd services/* && ./scripts/start.sh local"
    echo "   • Access application: http://localhost:3000"
fi

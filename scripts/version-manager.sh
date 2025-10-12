#!/bin/bash

# Version Management Script
# Manages versions, releases, and deployment tracking

set -e

# Configuration
REPO_OWNER="leadvantageadmin"
REPO_NAME="hailmary"
GITHUB_TOKEN=""  # Set this for GitHub API access
VERSION_FILE="VERSION"
CHANGELOG_FILE="CHANGELOG.md"

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

# Function to get current version
get_current_version() {
    if [ -f "$VERSION_FILE" ]; then
        cat "$VERSION_FILE"
    else
        echo "0.0.0"
    fi
}

# Function to set version
set_version() {
    local version=$1
    echo "$version" > "$VERSION_FILE"
    print_success "Version set to: $version"
}

# Function to increment version
increment_version() {
    local type=${1:-patch}
    local current_version=$(get_current_version)
    local major minor patch
    
    IFS='.' read -r major minor patch <<< "$current_version"
    
    case $type in
        "major")
            major=$((major + 1))
            minor=0
            patch=0
            ;;
        "minor")
            minor=$((minor + 1))
            patch=0
            ;;
        "patch")
            patch=$((patch + 1))
            ;;
        *)
            print_error "Invalid version type: $type. Use major, minor, or patch"
            exit 1
            ;;
    esac
    
    local new_version="$major.$minor.$patch"
    set_version "$new_version"
    echo "$new_version"
}

# Function to get git commit info
get_commit_info() {
    local commit_hash=$(git rev-parse HEAD)
    local commit_short=$(git rev-parse --short HEAD)
    local commit_message=$(git log -1 --pretty=format:"%s")
    local commit_author=$(git log -1 --pretty=format:"%an")
    local commit_date=$(git log -1 --pretty=format:"%ad" --date=iso)
    local branch=$(git rev-parse --abbrev-ref HEAD)
    
    cat << EOF
{
    "commit_hash": "$commit_hash",
    "commit_short": "$commit_short",
    "commit_message": "$commit_message",
    "commit_author": "$commit_author",
    "commit_date": "$commit_date",
    "branch": "$branch",
    "version": "$(get_current_version)"
}
EOF
}

# Function to create changelog entry
create_changelog_entry() {
    local version=$1
    local description=$2
    local date=$(date +"%Y-%m-%d")
    
    if [ ! -f "$CHANGELOG_FILE" ]; then
        cat > "$CHANGELOG_FILE" << EOF
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

EOF
    fi
    
    # Create temporary file with new entry
    local temp_file=$(mktemp)
    
    # Add new version entry
    cat >> "$temp_file" << EOF
## [${version}] - ${date}

### Added
- ${description}

### Changed
- Version bump to ${version}

### Technical Details
- Commit: $(git rev-parse --short HEAD)
- Branch: $(git rev-parse --abbrev-ref HEAD)
- Build Date: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

EOF
    
    # Add existing changelog content
    if [ -f "$CHANGELOG_FILE" ]; then
        # Skip the first line if it's just the title
        tail -n +2 "$CHANGELOG_FILE" >> "$temp_file"
    fi
    
    # Replace original file
    mv "$temp_file" "$CHANGELOG_FILE"
    
    print_success "Changelog updated for version $version"
}

# Function to create git tag
create_git_tag() {
    local version=$1
    local message=$2
    
    if [ -z "$message" ]; then
        message="Release version $version"
    fi
    
    # Check if tag already exists
    if git tag -l | grep -q "^v$version$"; then
        print_warning "Tag v$version already exists"
        return 0
    fi
    
    # Create and push tag
    git tag -a "v$version" -m "$message"
    git push origin "v$version"
    
    print_success "Git tag created: v$version"
}

# Function to create GitHub release
create_github_release() {
    local version=$1
    local description=$2
    
    if [ -z "$GITHUB_TOKEN" ]; then
        print_error "GitHub token is required for creating releases"
        exit 1
    fi
    
    local release_data=$(cat << EOF
{
    "tag_name": "v$version",
    "target_commitish": "main",
    "name": "HailMary v$version",
    "body": "$description",
    "draft": false,
    "prerelease": false
}
EOF
)
    
    local response=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
                          -H "Content-Type: application/json" \
                          -d "$release_data" \
                          "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases")
    
    local release_url=$(echo "$response" | jq -r '.html_url')
    
    if [ "$release_url" = "null" ]; then
        print_error "Failed to create GitHub release"
        echo "$response" | jq -r '.message // .'
        exit 1
    fi
    
    print_success "GitHub release created: $release_url"
    echo "$release_url"
}

# Function to build and release
build_and_release() {
    local version_type=${1:-patch}
    local description=$2
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "Not in a git repository"
        exit 1
    fi
    
    # Check if there are uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        print_error "You have uncommitted changes. Please commit them first."
        exit 1
    fi
    
    # Increment version
    local new_version=$(increment_version "$version_type")
    print_status "New version: $new_version"
    
    # Update changelog
    if [ -n "$description" ]; then
        create_changelog_entry "$new_version" "$description"
    else
        create_changelog_entry "$new_version" "Version $new_version release"
    fi
    
    # Commit version changes
    git add "$VERSION_FILE" "$CHANGELOG_FILE"
    git commit -m "chore: bump version to $new_version"
    
    # Create git tag
    create_git_tag "$new_version" "$description"
    
    # Build deployment package
    print_status "Building deployment package..."
    ./scripts/build-deployment.sh build
    
    # Create GitHub release
    if [ -n "$GITHUB_TOKEN" ]; then
        create_github_release "$new_version" "$description"
    else
        print_warning "GitHub token not set. Skipping GitHub release creation."
        print_status "You can create the release manually at: https://github.com/$REPO_OWNER/$REPO_NAME/releases"
    fi
    
    print_success "Release $new_version created successfully!"
    print_status "Next steps:"
    echo "  1. Deploy to VM: ./scripts/deploy-to-vm.sh deploy v$new_version"
    echo "  2. Or deploy local package: ./scripts/deploy-to-vm.sh deploy-local releases/hailmary-v${new_version}_*.tar.gz"
}

# Function to list versions
list_versions() {
    print_status "Current version: $(get_current_version)"
    echo
    
    print_status "Git tags:"
    git tag -l | sort -V | tail -10
    echo
    
    if [ -d "releases" ]; then
        print_status "Available packages:"
        ls -la releases/*.tar.gz 2>/dev/null | tail -10 || print_warning "No packages found"
    fi
}

# Function to show version history
show_version_history() {
    print_status "Version History:"
    echo
    
    if [ -f "$CHANGELOG_FILE" ]; then
        cat "$CHANGELOG_FILE"
    else
        print_warning "No changelog found"
    fi
}

# Function to rollback version
rollback_version() {
    local target_version=$1
    
    if [ -z "$target_version" ]; then
        print_error "Target version is required"
        echo "Usage: $0 rollback <version>"
        echo "Example: $0 rollback 1.0.0"
        exit 1
    fi
    
    # Check if tag exists
    if ! git tag -l | grep -q "^v$target_version$"; then
        print_error "Version tag v$target_version not found"
        exit 1
    fi
    
    print_warning "Rolling back to version $target_version"
    print_warning "This will reset your current branch to the specified version"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Rollback cancelled"
        exit 0
    fi
    
    # Reset to target version
    git reset --hard "v$target_version"
    set_version "$target_version"
    
    print_success "Rolled back to version $target_version"
}

# Main script logic
case "${1:-help}" in
    "current")
        echo "$(get_current_version)"
        ;;
    "set")
        if [ -z "$2" ]; then
            print_error "Version is required"
            echo "Usage: $0 set <version>"
            echo "Example: $0 set 1.0.0"
            exit 1
        fi
        set_version "$2"
        ;;
    "increment")
        increment_version "$2"
        ;;
    "release")
        build_and_release "$2" "$3"
        ;;
    "tag")
        if [ -z "$2" ]; then
            print_error "Version is required"
            echo "Usage: $0 tag <version> [message]"
            exit 1
        fi
        create_git_tag "$2" "$3"
        ;;
    "list")
        list_versions
        ;;
    "history")
        show_version_history
        ;;
    "rollback")
        rollback_version "$2"
        ;;
    "info")
        get_commit_info | python3 -m json.tool 2>/dev/null || get_commit_info
        ;;
    "help"|*)
        echo "HailMary Version Manager"
        echo ""
        echo "Usage: $0 <command> [options]"
        echo ""
        echo "Commands:"
        echo "  current                     Show current version"
        echo "  set <version>               Set version number"
        echo "  increment [major|minor|patch]  Increment version (default: patch)"
        echo "  release [type] [description]   Create new release (build, tag, upload)"
        echo "  tag <version> [message]     Create git tag"
        echo "  list                        List versions and packages"
        echo "  history                     Show version history"
        echo "  rollback <version>          Rollback to specific version"
        echo "  info                        Show current commit info"
        echo "  help                        Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 current"
        echo "  $0 set 1.0.0"
        echo "  $0 increment minor"
        echo "  $0 release patch \"Bug fixes and improvements\""
        echo "  $0 tag 1.0.0 \"Initial release\""
        echo "  $0 rollback 0.9.0"
        echo ""
        echo "Configuration:"
        echo "  REPO: $REPO_OWNER/$REPO_NAME"
        echo "  VERSION_FILE: $VERSION_FILE"
        echo "  CHANGELOG_FILE: $CHANGELOG_FILE"
        ;;
esac

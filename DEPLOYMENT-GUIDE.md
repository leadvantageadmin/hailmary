# HailMary Deployment Guide

This guide explains how to use the executable deployment system for managing versions and deploying to your VM production environment.

## Overview

The deployment system consists of three main components:

1. **Database & Search Index** - Can be maintained manually on local and VM
2. **Server Code** - Managed through versioned executable packages
3. **Version Management** - GitHub commit-based versioning with easy rollbacks

## Quick Start

### 1. Build and Deploy a New Version

```bash
# Create a new patch version and deploy
./scripts/deploy.sh build-deploy patch "Bug fixes and improvements"

# Or create a minor version
./scripts/deploy.sh build-deploy minor "New features added"

# Or create a major version
./scripts/deploy.sh build-deploy major "Major release with breaking changes"
```

### 2. Deploy a Specific Version

```bash
# Deploy from GitHub release
./scripts/deploy.sh executable v1.0.0

# Deploy from local package
./scripts/deploy-to-vm.sh deploy-local releases/hailmary-v1.0.0_abc123.tar.gz
```

### 3. Check Status and Rollback

```bash
# Check VM status
./scripts/deploy.sh status

# Rollback to previous version
./scripts/deploy.sh rollback backup_20241201_143022
```

## Detailed Usage

### Version Management

#### Check Current Version
```bash
./scripts/version-manager.sh current
```

#### Create New Release
```bash
# Patch version (1.0.0 -> 1.0.1)
./scripts/version-manager.sh release patch "Bug fixes"

# Minor version (1.0.0 -> 1.1.0)
./scripts/version-manager.sh release minor "New features"

# Major version (1.0.0 -> 2.0.0)
./scripts/version-manager.sh release major "Breaking changes"
```

#### List Available Versions
```bash
./scripts/version-manager.sh list
```

#### View Version History
```bash
./scripts/version-manager.sh history
```

### Building Deployment Packages

#### Build Package Locally
```bash
./scripts/build-deployment.sh build
```

#### List Available Packages
```bash
./scripts/build-deployment.sh list
```

#### Clean Old Packages
```bash
# Keep last 5 packages
./scripts/build-deployment.sh clean 5
```

### VM Deployment

#### Deploy from GitHub Release
```bash
./scripts/deploy-to-vm.sh deploy v1.0.0
```

#### Deploy Local Package
```bash
./scripts/deploy-to-vm.sh deploy-local releases/hailmary-v1.0.0_abc123.tar.gz
```

#### Check VM Status
```bash
./scripts/deploy-to-vm.sh status
```

#### Rollback on VM
```bash
./scripts/deploy-to-vm.sh rollback backup_20241201_143022
```

#### List Available Releases
```bash
./scripts/deploy-to-vm.sh list
```

## Workflow Examples

### Development to Production Workflow

1. **Make changes locally**
   ```bash
   # Make your code changes
   git add .
   git commit -m "feat: add new search functionality"
   ```

2. **Create and deploy new version**
   ```bash
   # Create minor version and deploy
   ./scripts/deploy.sh build-deploy minor "Added advanced search functionality"
   ```

3. **Verify deployment**
   ```bash
   # Check status
   ./scripts/deploy.sh status
   ```

### Emergency Rollback Workflow

1. **Check available backups**
   ```bash
   ./scripts/deploy.sh status
   ```

2. **Rollback to previous version**
   ```bash
   ./scripts/deploy.sh rollback backup_20241201_143022
   ```

3. **Verify rollback**
   ```bash
   ./scripts/deploy.sh status
   ```

### Manual Version Management

1. **Set specific version**
   ```bash
   ./scripts/version-manager.sh set 1.2.0
   ```

2. **Create git tag**
   ```bash
   ./scripts/version-manager.sh tag 1.2.0 "Release 1.2.0"
   ```

3. **Build and upload to GitHub**
   ```bash
   ./scripts/deploy-to-vm.sh create-release 1.2.0 "Release 1.2.0 with new features"
   ```

## Configuration

### Environment Variables

Set these environment variables for GitHub integration:

```bash
export GITHUB_TOKEN="your_github_token_here"
```

### VM Configuration

The following VM settings are configured in the scripts:

- **VM Name**: `hail-mary`
- **Zone**: `asia-south1-c`
- **Project**: `leadvantage-global`
- **SSH User**: `pmomale2024`

To modify these, edit the configuration section in:
- `scripts/deploy.sh`
- `scripts/deploy-to-vm.sh`

## File Structure

```
scripts/
├── build-deployment.sh    # Build executable packages
├── deploy.sh              # Main deployment script
├── deploy-to-vm.sh        # VM deployment operations
├── version-manager.sh     # Version management
└── deploy.sh              # Legacy deployment (enhanced)

releases/                  # Built packages (created automatically)
├── hailmary-v1.0.0_abc123.tar.gz
├── hailmary-v1.0.0_abc123.tar.gz.sha256
└── ...

VERSION                    # Current version file
CHANGELOG.md              # Version history
```

## Package Contents

Each deployment package contains:

- **Web Application** (Next.js) - Built and ready to run
- **Ingestor Service** (Python) - Data processing component
- **Deployment Scripts** - Self-contained deployment logic
- **Configuration Files** - Docker compose, environment templates
- **Version Information** - Commit details, build metadata
- **Dependencies** - All required files for deployment

## Security Features

- **Checksum Verification** - SHA256 checksums for all packages
- **Backup System** - Automatic backups before deployment
- **Rollback Capability** - Easy rollback to previous versions
- **Version Tracking** - Complete audit trail of deployments

## Troubleshooting

### Common Issues

1. **Build Fails**
   ```bash
   # Check for uncommitted changes
   git status
   
   # Commit changes first
   git add .
   git commit -m "fix: resolve build issues"
   ```

2. **Deployment Fails**
   ```bash
   # Check VM status
   ./scripts/deploy.sh status
   
   # Check logs on VM
   gcloud compute ssh pmomale2024@hail-mary --zone=asia-south1-c --command="docker-compose -f /opt/hailmary/deployment/docker-compose.production.yml logs"
   ```

3. **Version Conflicts**
   ```bash
   # Check current version
   ./scripts/version-manager.sh current
   
   # List available versions
   ./scripts/version-manager.sh list
   ```

### Logs and Monitoring

- **Deployment Logs**: `/var/log/hailmary-deploy.log` on VM
- **Application Logs**: Use `docker-compose logs` on VM
- **Build Logs**: Check terminal output during build process

## Best Practices

1. **Always test locally first**
   ```bash
   ./scripts/deploy.sh local
   ```

2. **Use semantic versioning**
   - Patch: Bug fixes
   - Minor: New features
   - Major: Breaking changes

3. **Keep meaningful commit messages**
   ```bash
   git commit -m "feat: add customer search filters"
   git commit -m "fix: resolve authentication issue"
   git commit -m "docs: update API documentation"
   ```

4. **Regular backups**
   - The system automatically creates backups
   - Keep at least 5 recent backups
   - Test rollback procedures regularly

5. **Monitor deployments**
   - Check status after each deployment
   - Verify application functionality
   - Monitor logs for errors

## Support

For issues or questions:

1. Check the logs first
2. Verify VM connectivity
3. Ensure all dependencies are installed
4. Check GitHub token permissions (if using releases)

The deployment system is designed to be robust and self-healing, with comprehensive error handling and rollback capabilities.

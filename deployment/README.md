# Deployment Files

This directory contains deployment files for the HailMary Customer Search Platform.

## Files Overview

### Production Deployment
- `docker-compose.production.yml` - Production Docker Compose configuration
- `env.production.example` - Environment variables template for production
- `vm-deploy.sh` - Script to deploy to a VM instance
- `vm-manage.sh` - Script to manage the application on VM
- `vm-upload-csv.sh` - Script to upload CSV data to VM
- `VM-DEPLOYMENT.md` - VM deployment documentation

### Database & Authentication
- `run-migration.sh` - Script to run database migrations
- `init-admin.sh` - Script to create initial admin user
- `setup-auth.sh` - Script to set up authentication system

### Web Server (Optional)
- `nginx.conf` - Nginx configuration for reverse proxy

## Usage

### Pre-Deployment Verification
1. **Verify Environment Consistency**: Run `./verify-environment.sh` to ensure Docker environment is consistent between platforms
2. **Review Checklist**: Check `DEPLOYMENT-CHECKLIST.md` for complete deployment steps

### Deployment Steps
1. Copy `env.production.example` to your deployment location and rename to `.env`
2. Update the environment variables as needed
3. Run `vm-deploy.sh` to deploy to your VM
4. Use `vm-manage.sh` for ongoing management

## Deployment Scenarios

- **Local Development**: Use the main `docker-compose.yml` in the root directory
- **Production (VM/GCP)**: Use `docker-compose.production.yml` with production environment variables

The production setup works for both VM and GCP deployments - the only difference is the environment variables pointing to external services vs. Docker containers.

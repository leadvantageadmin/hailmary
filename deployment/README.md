# Deployment Files

This directory contains deployment files for the HailMary Customer Search Platform.

## Files Overview

### Production Deployment
- `docker-compose.production.yml` - Production Docker Compose configuration
- `env.production.example` - Environment variables template for production
- `nginx.conf` - Nginx configuration for reverse proxy
- `VM-DEPLOYMENT.md` - VM deployment documentation
- `DEPLOYMENT-CHECKLIST.md` - Deployment checklist

### Database & Authentication
- Use `./scripts/hailmary.sh [local|vm] migrate` - Run database migrations
- Use `./scripts/hailmary.sh [local|vm] init-admin` - Create initial admin user
- Use `./scripts/hailmary.sh [local|vm] setup-auth` - Set up authentication system


## Usage

### Pre-Deployment Verification
1. **Verify Environment Consistency**: Run `./scripts/hailmary.sh [local|vm] verify` to ensure Docker environment is consistent between platforms
2. **Review Checklist**: Check `DEPLOYMENT-CHECKLIST.md` for complete deployment steps

### Deployment Steps
1. Copy `env.production.example` to your deployment location and rename to `.env`
2. Update the environment variables as needed
3. Run `./scripts/hailmary.sh vm deploy` to deploy to your VM
4. Use `./scripts/hailmary.sh vm manage` for ongoing management

## Docker Compose Organization

- **Local Development**: Use `docker-compose.yml` in the root directory
- **Production (VM/GCP)**: Use `docker-compose.production.yml` in the deployment directory

See `DOCKER-COMPOSE.md` in the root directory for detailed information about the organization and differences between local and production configurations.

## Deployment Scenarios

- **Local Development**: Use the main `docker-compose.yml` in the root directory
- **Production (VM/GCP)**: Use `docker-compose.production.yml` with production environment variables

The production setup works for both VM and GCP deployments - the only difference is the environment variables pointing to external services vs. Docker containers.

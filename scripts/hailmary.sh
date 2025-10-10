#!/bin/bash

# HailMary Customer Search Platform - Unified Management Script
# This script provides a unified interface for managing both local and VM deployments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to show help
show_help() {
    echo -e "${BLUE}HailMary Customer Search Platform - Management Script${NC}"
    echo ""
    echo "Usage: $0 [ENVIRONMENT] [COMMAND]"
    echo ""
    echo -e "${YELLOW}Environments:${NC}"
    echo "  local    - Local development environment (Mac)"
    echo "  vm       - Production environment (GCP VM)"
    echo ""
    echo -e "${YELLOW}Commands:${NC}"
    echo "  deploy   - Deploy/start the application"
    echo "  stop     - Stop the application"
    echo "  restart  - Restart the application"
    echo "  status   - Show application status"
    echo "  logs     - Show application logs"
    echo "  ingest   - Run data ingestion"
    echo "  cleanup  - Clean up environment (local only)"
    echo "  update   - Update and restart (vm only)"
    echo "  verify   - Verify environment consistency"
    echo "  setup-auth - Setup authentication system"
    echo "  init-admin - Initialize admin user"
    echo "  migrate  - Run database migrations"
    echo "  upload-csv - Upload CSV file"
    echo "  rebuild-schema - Rebuild database schema and re-ingest data"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  $0 local deploy     # Start local development environment"
    echo "  $0 local status     # Check local environment status"
    echo "  $0 vm deploy        # Deploy to VM"
    echo "  $0 vm logs web      # Show web service logs on VM"
    echo "  $0 local ingest     # Run data ingestion locally"
    echo ""
    echo -e "${YELLOW}Quick Commands:${NC}"
    echo "  $0 local            # Start local development (same as 'local deploy')"
    echo "  $0 vm               # Deploy to VM (same as 'vm deploy')"
}

# Function to execute local commands
execute_local() {
    local command=$1
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    
    case $command in
        "deploy"|"")
            echo -e "${GREEN}🚀 Starting local development environment...${NC}"
            "$script_dir/deploy.sh" local
            ;;
        "stop")
            echo -e "${YELLOW}🛑 Stopping local development environment...${NC}"
            "$script_dir/stop.sh" local
            ;;
        "restart")
            echo -e "${BLUE}🔄 Restarting local development environment...${NC}"
            "$script_dir/restart.sh" local
            ;;
        "status")
            echo -e "${CYAN}📊 Checking local environment status...${NC}"
            "$script_dir/status.sh" local
            ;;
        "logs")
            echo -e "${PURPLE}📋 Showing local logs...${NC}"
            "$script_dir/logs.sh" local "${@:2}"
            ;;
        "ingest")
            echo -e "${GREEN}📊 Running local data ingestion...${NC}"
            "$script_dir/ingest.sh" local
            ;;
        "cleanup")
            echo -e "${RED}🧹 Cleaning up local environment...${NC}"
            "$script_dir/local-cleanup.sh"
            ;;
        "verify")
            echo -e "${CYAN}🔍 Verifying local environment...${NC}"
            "$script_dir/verify-environment.sh" local
            ;;
        "setup-auth")
            echo -e "${GREEN}🔐 Setting up authentication locally...${NC}"
            "$script_dir/setup-auth.sh" local
            ;;
        "init-admin")
            echo -e "${GREEN}👤 Initializing admin user locally...${NC}"
            "$script_dir/init-admin.sh" local
            ;;
        "migrate")
            echo -e "${BLUE}🗄️ Running database migration locally...${NC}"
            "$script_dir/run-migration.sh" local
            ;;
        "upload-csv")
            echo -e "${PURPLE}📤 Uploading CSV locally...${NC}"
            "$script_dir/upload-csv.sh" local "${@:2}"
            ;;
        "rebuild-schema")
            echo -e "${RED}🗑️ Rebuilding database schema locally...${NC}"
            "$script_dir/rebuild-schema.sh" local
            ;;
        *)
            echo -e "${RED}❌ Unknown local command: $command${NC}"
            echo "Available local commands: deploy, stop, restart, status, logs, ingest, cleanup, verify, setup-auth, init-admin, migrate, upload-csv, rebuild-schema"
            exit 1
            ;;
    esac
}

# Function to execute VM commands
execute_vm() {
    local command=$1
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    
    case $command in
        "deploy"|"")
            echo -e "${GREEN}🚀 Deploying to VM...${NC}"
            "$script_dir/deploy.sh" vm
            ;;
        "stop")
            echo -e "${YELLOW}🛑 Stopping VM environment...${NC}"
            "$script_dir/stop.sh" vm
            ;;
        "restart")
            echo -e "${BLUE}🔄 Restarting VM environment...${NC}"
            "$script_dir/restart.sh" vm
            ;;
        "status")
            echo -e "${CYAN}📊 Checking VM status...${NC}"
            "$script_dir/status.sh" vm
            ;;
        "logs")
            echo -e "${PURPLE}📋 Showing VM logs...${NC}"
            "$script_dir/logs.sh" vm "${@:2}"
            ;;
        "ingest")
            echo -e "${GREEN}📊 Running VM data ingestion...${NC}"
            "$script_dir/ingest.sh" vm
            ;;
        "update")
            echo -e "${BLUE}🔄 Updating VM deployment...${NC}"
            "$script_dir/deploy.sh" vm
            ;;
        "manage")
            echo -e "${YELLOW}🔧 VM management commands available:${NC}"
            echo "  - status: Check VM status"
            echo "  - logs: View VM logs"
            echo "  - restart: Restart VM services"
            echo "  - stop: Stop VM services"
            echo "  - update: Update VM deployment"
            echo "  - ingest: Run data ingestion on VM"
            echo ""
            echo "💡 Use: ./scripts/hailmary.sh vm <command>"
            ;;
        "verify")
            echo -e "${CYAN}🔍 Verifying VM environment...${NC}"
            "$script_dir/verify-environment.sh" vm
            ;;
        "setup-auth")
            echo -e "${GREEN}🔐 Setting up authentication on VM...${NC}"
            "$script_dir/setup-auth.sh" vm
            ;;
        "init-admin")
            echo -e "${GREEN}👤 Initializing admin user on VM...${NC}"
            "$script_dir/init-admin.sh" vm
            ;;
        "migrate")
            echo -e "${BLUE}🗄️ Running database migration on VM...${NC}"
            "$script_dir/run-migration.sh" vm
            ;;
        "upload-csv")
            echo -e "${PURPLE}📤 Uploading CSV to VM...${NC}"
            "$script_dir/upload-csv.sh" vm "${@:2}"
            ;;
        "rebuild-schema")
            echo -e "${RED}🗑️ Rebuilding database schema on VM...${NC}"
            "$script_dir/rebuild-schema.sh" vm
            ;;
        *)
            echo -e "${RED}❌ Unknown VM command: $command${NC}"
            echo "Available VM commands: deploy, status, logs, ingest, update, manage, verify, setup-auth, init-admin, migrate, upload-csv, rebuild-schema"
            exit 1
            ;;
    esac
}

# Main script logic
if [ $# -eq 0 ]; then
    show_help
    exit 0
fi

ENVIRONMENT=$1
COMMAND=$2

case $ENVIRONMENT in
    "local")
        execute_local "$COMMAND" "${@:3}"
        ;;
    "vm")
        execute_vm "$COMMAND" "${@:3}"
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        echo -e "${RED}❌ Unknown environment: $ENVIRONMENT${NC}"
        echo "Available environments: local, vm"
        echo "Use '$0 help' for more information"
        exit 1
        ;;
esac

# Development Setup

This document explains how to set up and run the HailMary application in development mode with hot reloading.

## Quick Start

### Development Mode (with Hot Reloading)
```bash
./scripts/dev.sh
```

### Production Mode
```bash
./hailmary.sh
```

## Development Features

### Hot Reloading
- ✅ Frontend changes automatically reload without rebuilding
- ✅ Source code is mounted as volumes for instant updates
- ✅ No need to rebuild Docker containers for code changes

### What's Included
- **Web Application**: Next.js with hot reloading
- **Database**: PostgreSQL with PostGIS
- **Search Engine**: OpenSearch
- **Cache**: Redis
- **Data Ingestor**: Python service for data processing

## File Structure

```
├── docker-compose.yml          # Production configuration
├── docker-compose.dev.yml      # Development configuration
├── apps/web/Dockerfile         # Production web container
├── apps/web/Dockerfile.dev     # Development web container
├── scripts/
│   └── dev.sh                  # Start development environment
├── hailmary.sh                 # Production deployment script
```

## Development Workflow

1. **Start Development Environment**:
   ```bash
   ./scripts/dev.sh
   ```

2. **Make Changes**: Edit any file in `apps/web/src/`

3. **See Changes Instantly**: The browser will automatically reload

4. **View Logs**:
   ```bash
   docker-compose -f docker-compose.dev.yml logs -f web
   ```

5. **Stop Development Environment**:
   ```bash
   docker-compose -f docker-compose.dev.yml down
   ```

## Key Differences: Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| Hot Reloading | ✅ Enabled | ❌ Disabled |
| Source Code | Volume Mounted | Built into Image |
| Build Time | Fast (no build) | Slower (full build) |
| File Watching | ✅ Enabled | ❌ Disabled |
| Debug Mode | ✅ Enabled | ❌ Disabled |

## Troubleshooting

### Hot Reloading Not Working
1. Check that you're using the development compose file:
   ```bash
   docker-compose -f docker-compose.dev.yml ps
   ```

2. Verify volumes are mounted:
   ```bash
   docker-compose -f docker-compose.dev.yml exec web ls -la /app/apps/web/src
   ```

### Port Conflicts
If port 3000 is already in use:
```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process or change the port in docker-compose.dev.yml
```

### Database Issues
If you need to reset the database:
```bash
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
```

## Environment Variables

Development environment uses the same environment variables as production, but with `NODE_ENV=development`.

## Performance Tips

1. **Use Development Mode**: Always use `./scripts/dev.sh` for development
2. **Monitor Logs**: Keep an eye on logs for any issues
3. **Clean Up**: Regularly clean up unused Docker images:
   ```bash
   docker system prune -f
   ```

## Next Steps

- Make changes to the search page layout
- Test the new 30/70 split design
- Verify responsive behavior
- Test search functionality

#!/usr/bin/env python3
"""
HailMary Ingestor Service
Data ingestion service for CSV files to PostgreSQL
"""

import os
import sys
import logging
import asyncio
from pathlib import Path
from typing import Optional, Dict, Any
import click
from dotenv import load_dotenv

# Add lib directory to path
sys.path.append(str(Path(__file__).parent / "lib"))

from lib.schema_operations import SchemaOperations
from lib.db_operations import DatabaseOperations
from lib.csv_processor import CSVProcessor
from lib.ingestion_manager import IngestionManager

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('/app/data/logs/ingestor.log')
    ]
)

logger = logging.getLogger(__name__)

class IngestorService:
    """Main Ingestor Service class"""
    
    def __init__(self):
        self.schema_ops = None
        self.db_ops = None
        self.csv_processor = None
        self.ingestion_manager = None
        
    async def initialize(self):
        """Initialize all service components"""
        try:
            logger.info("Initializing Ingestor Service...")
            
            # Initialize schema operations (optional - not needed for hardcoded SQL)
            try:
                self.schema_ops = SchemaOperations()
                await self.schema_ops.initialize()
                logger.info("Schema operations initialized")
            except Exception as e:
                logger.warning(f"Schema operations initialization failed (using hardcoded SQL): {e}")
                self.schema_ops = None
            
            # Initialize database operations (schema ops are optional now)
            self.db_ops = DatabaseOperations()
            await self.db_ops.initialize(self.schema_ops)
            
            # Initialize CSV processor
            self.csv_processor = CSVProcessor()
            
            # Initialize ingestion manager
            self.ingestion_manager = IngestionManager(
                db_ops=self.db_ops,
                csv_processor=self.csv_processor
            )
            
            logger.info("Ingestor Service initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Ingestor Service: {e}")
            raise
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on all components"""
        health_status = {
            "status": "healthy",
            "components": {},
            "timestamp": None
        }
        
        try:
            # Check database connectivity
            db_health = await self.db_ops.health_check()
            health_status["components"]["database"] = db_health
            
            # Overall health status
            if not all(comp.get("status") == "healthy" for comp in health_status["components"].values()):
                health_status["status"] = "degraded"
                
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            health_status["status"] = "unhealthy"
            health_status["error"] = str(e)
        
        return health_status
    
    async def ingest_file(self, file_path: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Ingest a single CSV file"""
        try:
            logger.info(f"Starting ingestion of file: {file_path}")
            
            result = await self.ingestion_manager.ingest_file(file_path, options or {})
            
            logger.info(f"Ingestion completed for file: {file_path}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to ingest file {file_path}: {e}")
            raise
    
    async def ingest_directory(self, directory_path: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Ingest all CSV files in a directory"""
        try:
            logger.info(f"Starting ingestion of directory: {directory_path}")
            
            result = await self.ingestion_manager.ingest_directory(directory_path, options or {})
            
            logger.info(f"Ingestion completed for directory: {directory_path}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to ingest directory {directory_path}: {e}")
            raise
    
    async def cleanup(self):
        """Cleanup resources"""
        try:
            if self.db_ops:
                await self.db_ops.cleanup()
            logger.info("Ingestor Service cleanup completed")
        except Exception as e:
            logger.error(f"Cleanup failed: {e}")

# CLI Commands
@click.group()
def cli():
    """HailMary Ingestor Service CLI"""
    pass

@cli.command()
@click.option('--file', '-f', help='CSV file to ingest')
@click.option('--directory', '-d', help='Directory containing CSV files to ingest')
@click.option('--batch-size', default=1000, help='Batch size for processing')
@click.option('--dry-run', is_flag=True, help='Perform a dry run without actually ingesting')
def ingest(file: Optional[str], directory: Optional[str], batch_size: int, dry_run: bool):
    """Ingest CSV files into PostgreSQL"""
    
    async def run_ingestion():
        service = IngestorService()
        try:
            await service.initialize()
            
            options = {
                "batch_size": batch_size,
                "dry_run": dry_run
            }
            
            if file:
                result = await service.ingest_file(file, options)
                click.echo(f"Ingestion result: {result}")
            elif directory:
                result = await service.ingest_directory(directory, options)
                click.echo(f"Ingestion result: {result}")
            else:
                click.echo("Please specify either --file or --directory")
                return
            
        except Exception as e:
            click.echo(f"Error: {e}")
            sys.exit(1)
        finally:
            await service.cleanup()
    
    asyncio.run(run_ingestion())

@cli.command()
def health():
    """Check service health"""
    
    async def run_health_check():
        service = IngestorService()
        try:
            await service.initialize()
            health_status = await service.health_check()
            click.echo(f"Health status: {health_status}")
        except Exception as e:
            click.echo(f"Health check failed: {e}")
            sys.exit(1)
        finally:
            await service.cleanup()
    
    asyncio.run(run_health_check())

@cli.command()
def schema():
    """Get schema information"""
    
    async def run_schema_info():
        service = IngestorService()
        try:
            await service.initialize()
            if service.schema_ops:
                schema_info = service.schema_ops.get_schema_info()
                click.echo(f"Schema info: {schema_info}")
            else:
                click.echo("Schema operations not available - using hardcoded SQL queries")
                click.echo("Schema version: v3.0.1 (Company and Prospect models only)")
        except Exception as e:
            click.echo(f"Schema info failed: {e}")
            sys.exit(1)
        finally:
            await service.cleanup()
    
    asyncio.run(run_schema_info())

@cli.command()
@click.option('--port', default=8080, help='Port to run the service on')
def serve(port: int):
    """Run the ingestor service as a web service"""
    
    async def run_service():
        service = IngestorService()
        try:
            await service.initialize()
            
            # Simple HTTP server for health checks
            from aiohttp import web
            
            async def health_handler(request):
                health_status = await service.health_check()
                return web.json_response(health_status)
            
            async def ingest_handler(request):
                data = await request.json()
                file_path = data.get('file_path')
                options = data.get('options', {})
                
                if not file_path:
                    return web.json_response({'error': 'file_path is required'}, status=400)
                
                try:
                    result = await service.ingest_file(file_path, options)
                    return web.json_response(result)
                except Exception as e:
                    return web.json_response({'error': str(e)}, status=500)
            
            app = web.Application()
            app.router.add_get('/health', health_handler)
            app.router.add_post('/ingest', ingest_handler)
            
            runner = web.AppRunner(app)
            await runner.setup()
            site = web.TCPSite(runner, '0.0.0.0', port)
            await site.start()
            
            logger.info(f"Ingestor service running on port {port}")
            logger.info("Press Ctrl+C to stop")
            
            # Keep the service running
            try:
                await asyncio.Future()  # Run forever
            except KeyboardInterrupt:
                logger.info("Shutting down service...")
            finally:
                await runner.cleanup()
                await service.cleanup()
                
        except Exception as e:
            logger.error(f"Service failed to start: {e}")
            sys.exit(1)
    
    asyncio.run(run_service())

if __name__ == "__main__":
    cli()

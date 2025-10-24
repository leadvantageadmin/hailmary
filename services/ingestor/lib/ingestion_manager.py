"""
Ingestion Manager Module
Orchestrates the data ingestion process
"""

import os
import logging
import asyncio
from typing import Dict, Any, List, Optional
from pathlib import Path
from datetime import datetime
import json

from .db_operations import DatabaseOperations
from .csv_processor import CSVProcessor

logger = logging.getLogger(__name__)

class IngestionManager:
    """Manages the complete data ingestion process"""
    
    def __init__(self, db_ops: DatabaseOperations, csv_processor: CSVProcessor):
        self.db_ops = db_ops
        self.csv_processor = csv_processor
        self.batch_size = int(os.getenv('INGESTION_BATCH_SIZE', '1000'))
        
    async def ingest_file(self, file_path: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Ingest a single CSV file"""
        try:
            start_time = datetime.utcnow()
            logger.info(f"Starting ingestion of file: {file_path}")
            
            # Parse options
            options = options or {}
            batch_size = options.get('batch_size', self.batch_size)
            dry_run = options.get('dry_run', False)
            
            # Process CSV file
            logger.info("Processing CSV file...")
            processed_data = self.csv_processor.process_csv_file(file_path, batch_size)
            
            if not processed_data:
                return {
                    "status": "success",
                    "message": "No data to process",
                    "records_processed": 0,
                    "processing_time": 0
                }
            
            # Separate data by type
            companies, prospects = self._separate_data_by_type(processed_data)
            
            logger.info(f"Separated data: {len(companies)} companies, {len(prospects)} prospects")
            
            if dry_run:
                return {
                    "status": "success",
                    "message": "Dry run completed",
                    "records_processed": len(processed_data),
                    "companies": len(companies),
                    "prospects": len(prospects),
                    "processing_time": (datetime.utcnow() - start_time).total_seconds()
                }
            
            # Ingest to database
            db_results = await self._ingest_to_database(companies, prospects, batch_size)
            
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            
            result = {
                "status": "success",
                "file_path": file_path,
                "records_processed": len(processed_data),
                "companies": len(companies),
                "prospects": len(prospects),
                "database_results": db_results,
                "processing_time": processing_time,
                "timestamp": start_time.isoformat()
            }
            
            logger.info(f"Ingestion completed for file: {file_path}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to ingest file {file_path}: {e}")
            return {
                "status": "error",
                "file_path": file_path,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def ingest_directory(self, directory_path: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Ingest all CSV files in a directory"""
        try:
            start_time = datetime.utcnow()
            logger.info(f"Starting ingestion of directory: {directory_path}")
            
            directory = Path(directory_path)
            if not directory.exists():
                raise Exception(f"Directory does not exist: {directory_path}")
            
            # Find all CSV files
            csv_files = []
            for pattern in ['*.csv', '*.tsv', '*.txt']:
                csv_files.extend(directory.glob(pattern))
            
            if not csv_files:
                return {
                    "status": "success",
                    "message": "No CSV files found in directory",
                    "files_processed": 0,
                    "total_records": 0,
                    "processing_time": 0
                }
            
            logger.info(f"Found {len(csv_files)} CSV files to process")
            
            # Process each file
            results = []
            total_records = 0
            
            for csv_file in csv_files:
                try:
                    file_result = await self.ingest_file(str(csv_file), options)
                    results.append(file_result)
                    
                    if file_result.get("status") == "success":
                        total_records += file_result.get("records_processed", 0)
                    
                except Exception as e:
                    logger.error(f"Failed to process file {csv_file}: {e}")
                    results.append({
                        "status": "error",
                        "file_path": str(csv_file),
                        "error": str(e)
                    })
            
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            
            return {
                "status": "success",
                "directory_path": directory_path,
                "files_processed": len(csv_files),
                "total_records": total_records,
                "file_results": results,
                "processing_time": processing_time,
                "timestamp": start_time.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to ingest directory {directory_path}: {e}")
            return {
                "status": "error",
                "directory_path": directory_path,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def _separate_data_by_type(self, processed_data: List[Dict[str, Any]]) -> tuple:
        """Separate processed data by type (Company, Prospect)"""
        companies = []
        prospects = []
        
        for record in processed_data:
            # Determine record type based on fields
            if 'companyId' in record and 'email' in record:
                prospects.append(record)
            elif 'domain' in record and 'name' in record:
                companies.append(record)
        
        return companies, prospects
    
    async def _ingest_to_database(self, companies: List[Dict[str, Any]], prospects: List[Dict[str, Any]], batch_size: int) -> Dict[str, Any]:
        """Ingest data to PostgreSQL database"""
        try:
            logger.info("Starting database ingestion...")
            
            db_results = {}
            
            # Ingest companies
            if companies:
                logger.info(f"Ingesting {len(companies)} companies to database...")
                for i in range(0, len(companies), batch_size):
                    batch = companies[i:i + batch_size]
                    result = await self.db_ops.bulk_insert_companies(batch)
                    logger.info(f"Inserted batch of {len(batch)} companies")
                db_results["companies"] = {"status": "success", "count": len(companies)}
            
            # Ingest prospects
            if prospects:
                logger.info(f"Ingesting {len(prospects)} prospects to database...")
                for i in range(0, len(prospects), batch_size):
                    batch = prospects[i:i + batch_size]
                    result = await self.db_ops.bulk_insert_prospects(batch)
                    logger.info(f"Inserted batch of {len(batch)} prospects")
                db_results["prospects"] = {"status": "success", "count": len(prospects)}
            
            logger.info("Database ingestion completed")
            return db_results
            
        except Exception as e:
            logger.error(f"Database ingestion failed: {e}")
            return {"status": "error", "error": str(e)}
    
    
    async def get_ingestion_stats(self) -> Dict[str, Any]:
        """Get ingestion statistics"""
        try:
            # Get database stats
            db_health = await self.db_ops.health_check()
            
            return {
                "database": {
                    "status": db_health.get("status"),
                    "tables": db_health.get("tables", [])
                },
                "batch_size": self.batch_size,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get ingestion stats: {e}")
            return {"error": str(e)}

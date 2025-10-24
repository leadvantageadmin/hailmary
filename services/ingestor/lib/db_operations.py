"""
Database Operations Module
Handles PostgreSQL database operations for the Ingestor service
"""

import os
import logging
import asyncio
from typing import Dict, Any, List, Optional
import asyncpg
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import pandas as pd
from datetime import datetime
try:
    from .schema_operations import SchemaOperations
except ImportError:
    from schema_operations import SchemaOperations

logger = logging.getLogger(__name__)

class DatabaseOperations:
    """Handles all database operations"""
    
    def __init__(self):
        self.engine = None
        self.async_engine = None
        self.session_factory = None
        self.connection_pool = None
        self.schema_ops = None
        
    async def initialize(self, schema_ops: SchemaOperations = None):
        """Initialize database connections"""
        try:
            # Initialize schema operations
            if schema_ops:
                self.schema_ops = schema_ops
            else:
                self.schema_ops = SchemaOperations()
                await self.schema_ops.initialize()
            
            # Get database configuration from environment
            db_host = os.getenv('POSTGRES_HOST', 'localhost')
            db_port = os.getenv('POSTGRES_PORT', '5433')
            db_name = os.getenv('POSTGRES_DB', 'hailmary')
            db_user = os.getenv('POSTGRES_USER', 'app')
            db_password = os.getenv('POSTGRES_PASSWORD', 'app_password')
            
            # Create database URL
            db_url = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
            async_db_url = f"postgresql+asyncpg://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
            
            # Create SQLAlchemy engines
            self.engine = create_engine(db_url, pool_pre_ping=True)
            self.async_engine = create_async_engine(async_db_url, pool_pre_ping=True)
            
            # Create session factory
            self.session_factory = sessionmaker(
                bind=self.async_engine,
                class_=AsyncSession,
                expire_on_commit=False
            )
            
            # Create connection pool for bulk operations
            self.connection_pool = await asyncpg.create_pool(
                host=db_host,
                port=db_port,
                database=db_name,
                user=db_user,
                password=db_password,
                min_size=1,
                max_size=10
            )
            
            logger.info("Database operations initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize database operations: {e}")
            raise
    
    def _convert_datetime(self, dt_str: str) -> datetime:
        """Convert datetime string to datetime object"""
        if not dt_str:
            return datetime.now()
        try:
            # Try parsing ISO format first
            if 'T' in dt_str:
                return datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
            else:
                # Fallback to current time
                return datetime.now()
        except (ValueError, TypeError):
            return datetime.now()
    
    def _get_insert_sql(self, table_name: str) -> str:
        """Get hardcoded INSERT SQL statement for table"""
        return self._get_hardcoded_insert_sql(table_name)
    
    
    def _get_hardcoded_insert_sql(self, table_name: str) -> str:
        """Hardcoded SQL statements matching the schema exactly"""
        if table_name == "Company":
            return """
                INSERT INTO "Company" (
                    id, domain, name, industry, "minEmployeeSize", "maxEmployeeSize", 
                    "employeeSizeLink", revenue, address, city, state, country, "zipCode", 
                    phone, "mobilePhone", "externalSource", "externalId", "createdAt", "updatedAt"
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
                )
                ON CONFLICT (domain) DO UPDATE SET
                    name = COALESCE(EXCLUDED.name, "Company".name),
                    industry = COALESCE(EXCLUDED.industry, "Company".industry),
                    "minEmployeeSize" = COALESCE(EXCLUDED."minEmployeeSize", "Company"."minEmployeeSize"),
                    "maxEmployeeSize" = COALESCE(EXCLUDED."maxEmployeeSize", "Company"."maxEmployeeSize"),
                    "employeeSizeLink" = COALESCE(EXCLUDED."employeeSizeLink", "Company"."employeeSizeLink"),
                    revenue = COALESCE(EXCLUDED.revenue, "Company".revenue),
                    address = COALESCE(EXCLUDED.address, "Company".address),
                    city = COALESCE(EXCLUDED.city, "Company".city),
                    state = COALESCE(EXCLUDED.state, "Company".state),
                    country = COALESCE(EXCLUDED.country, "Company".country),
                    "zipCode" = COALESCE(EXCLUDED."zipCode", "Company"."zipCode"),
                    phone = COALESCE(EXCLUDED.phone, "Company".phone),
                    "mobilePhone" = COALESCE(EXCLUDED."mobilePhone", "Company"."mobilePhone"),
                    "externalSource" = COALESCE(EXCLUDED."externalSource", "Company"."externalSource"),
                    "externalId" = COALESCE(EXCLUDED."externalId", "Company"."externalId"),
                    "updatedAt" = EXCLUDED."updatedAt"
            """
        elif table_name == "Prospect":
            return """
                INSERT INTO "Prospect" (
                    id, salutation, "firstName", "lastName", email, "jobTitle", "jobTitleLevel", 
                    department, "jobTitleLink", address, city, state, country, "zipCode", 
                    phone, "mobilePhone", "companyId", "externalSource", "externalId", "createdAt", "updatedAt"
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
                )
                ON CONFLICT (id) DO UPDATE SET
                    salutation = COALESCE(EXCLUDED.salutation, "Prospect".salutation),
                    "firstName" = COALESCE(EXCLUDED."firstName", "Prospect"."firstName"),
                    "lastName" = COALESCE(EXCLUDED."lastName", "Prospect"."lastName"),
                    email = COALESCE(EXCLUDED.email, "Prospect".email),
                    "jobTitle" = COALESCE(EXCLUDED."jobTitle", "Prospect"."jobTitle"),
                    "jobTitleLevel" = COALESCE(EXCLUDED."jobTitleLevel", "Prospect"."jobTitleLevel"),
                    department = COALESCE(EXCLUDED.department, "Prospect".department),
                    "jobTitleLink" = COALESCE(EXCLUDED."jobTitleLink", "Prospect"."jobTitleLink"),
                    address = COALESCE(EXCLUDED.address, "Prospect".address),
                    city = COALESCE(EXCLUDED.city, "Prospect".city),
                    state = COALESCE(EXCLUDED.state, "Prospect".state),
                    country = COALESCE(EXCLUDED.country, "Prospect".country),
                    "zipCode" = COALESCE(EXCLUDED."zipCode", "Prospect"."zipCode"),
                    phone = COALESCE(EXCLUDED.phone, "Prospect".phone),
                    "mobilePhone" = COALESCE(EXCLUDED."mobilePhone", "Prospect"."mobilePhone"),
                    "companyId" = COALESCE(EXCLUDED."companyId", "Prospect"."companyId"),
                    "externalSource" = COALESCE(EXCLUDED."externalSource", "Prospect"."externalSource"),
                    "externalId" = COALESCE(EXCLUDED."externalId", "Prospect"."externalId"),
                    "updatedAt" = EXCLUDED."updatedAt"
            """
        else:
            raise Exception(f"Unknown table: {table_name}")
    
    async def health_check(self) -> Dict[str, Any]:
        """Check database health"""
        try:
            async with self.connection_pool.acquire() as conn:
                # Test basic connectivity
                result = await conn.fetchval("SELECT 1")
                
                # Check database info
                db_info = await conn.fetchrow("""
                    SELECT 
                        current_database() as database_name,
                        current_user as user_name,
                        version() as version
                """)
                
                # Check table existence
                tables = await conn.fetch("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public'
                    ORDER BY table_name
                """)
                
                return {
                    "status": "healthy",
                    "database_name": db_info['database_name'],
                    "user_name": db_info['user_name'],
                    "version": db_info['version'],
                    "tables": [table['table_name'] for table in tables],
                    "connection_test": result == 1
                }
                
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e)
            }
    
    
    async def bulk_insert_companies(self, companies: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Bulk insert companies into the database"""
        try:
            async with self.connection_pool.acquire() as conn:
                # Get hardcoded SQL query
                insert_query = self._get_insert_sql("Company")
                
                # Prepare data for insertion (19 parameters)
                records = []
                for company in companies:
                    record = (
                        company.get('id'),
                        company.get('domain'),
                        company.get('name'),
                        company.get('industry'),
                        company.get('minEmployeeSize'),
                        company.get('maxEmployeeSize'),
                        company.get('employeeSizeLink'),
                        company.get('revenue'),
                        company.get('address'),
                        company.get('city'),
                        company.get('state'),
                        company.get('country'),
                        company.get('zipCode'),
                        company.get('phone'),
                        company.get('mobilePhone'),
                        company.get('externalSource'),
                        company.get('externalId'),
                        self._convert_datetime(company.get('createdAt')),
                        self._convert_datetime(company.get('updatedAt'))
                    )
                    records.append(record)
                
                # Execute bulk insert
                result = await conn.executemany(insert_query, records)
                
                return {
                    "status": "success",
                    "records_processed": len(records),
                    "result": result
                }
                
        except Exception as e:
            logger.error(f"Bulk insert companies failed: {e}")
            raise
    
    async def bulk_insert_prospects(self, prospects: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Bulk insert prospects into the database"""
        try:
            async with self.connection_pool.acquire() as conn:
                # Get hardcoded SQL query
                insert_query = self._get_insert_sql("Prospect")
                
                # Prepare data for insertion (21 parameters)
                records = []
                for prospect in prospects:
                    record = (
                        prospect.get('id'),
                        prospect.get('salutation'),
                        prospect.get('firstName'),
                        prospect.get('lastName'),
                        prospect.get('email'),
                        prospect.get('jobTitle'),
                        prospect.get('jobTitleLevel'),
                        prospect.get('department'),
                        prospect.get('jobTitleLink'),
                        prospect.get('address'),
                        prospect.get('city'),
                        prospect.get('state'),
                        prospect.get('country'),
                        prospect.get('zipCode'),
                        prospect.get('phone'),
                        prospect.get('mobilePhone'),
                        prospect.get('companyId'),
                        prospect.get('externalSource'),
                        prospect.get('externalId'),
                        self._convert_datetime(prospect.get('createdAt')),
                        self._convert_datetime(prospect.get('updatedAt'))
                    )
                    records.append(record)
                
                # Execute bulk insert
                result = await conn.executemany(insert_query, records)
                
                return {
                    "status": "success",
                    "records_processed": len(records),
                    "result": result
                }
                
        except Exception as e:
            logger.error(f"Bulk insert prospects failed: {e}")
            raise
    
    async def get_company_by_domain(self, domain: str) -> Optional[Dict[str, Any]]:
        """Get company by domain"""
        try:
            async with self.connection_pool.acquire() as conn:
                result = await conn.fetchrow(
                    "SELECT * FROM \"Company\" WHERE domain = $1",
                    domain
                )
                
                if result:
                    return dict(result)
                return None
                
        except Exception as e:
            logger.error(f"Failed to get company by domain {domain}: {e}")
            return None
    
    async def get_company_id_by_domain(self, domain: str) -> Optional[str]:
        """Get company ID by domain"""
        try:
            async with self.connection_pool.acquire() as conn:
                result = await conn.fetchval(
                    'SELECT id FROM "Company" WHERE domain = $1',
                    domain
                )
                return result
        except Exception as e:
            logger.error(f"Failed to get company ID by domain {domain}: {e}")
            return None
    
    async def get_company_prospect_view_count(self) -> int:
        """Get the current count of records in company_prospect_view"""
        try:
            async with self.connection_pool.acquire() as conn:
                result = await conn.fetchval(
                    'SELECT COUNT(*) FROM company_prospect_view'
                )
                return result or 0
        except Exception as e:
            logger.error(f"Failed to get company_prospect_view count: {e}")
            return 0
    
    async def get_database_counts(self) -> Dict[str, int]:
        """Get current counts for all main tables and views"""
        try:
            async with self.connection_pool.acquire() as conn:
                # Get Company count
                company_count = await conn.fetchval('SELECT COUNT(*) FROM "Company"')
                
                # Get Prospect count
                prospect_count = await conn.fetchval('SELECT COUNT(*) FROM "Prospect"')
                
                # Get Company Prospect View count
                view_count = await conn.fetchval('SELECT COUNT(*) FROM company_prospect_view')
                
                return {
                    "companies": company_count or 0,
                    "prospects": prospect_count or 0,
                    "company_prospect_view": view_count or 0
                }
        except Exception as e:
            logger.error(f"Failed to get database counts: {e}")
            return {
                "companies": 0,
                "prospects": 0,
                "company_prospect_view": 0
            }
    
    async def cleanup(self):
        """Cleanup database connections"""
        try:
            if self.connection_pool:
                await self.connection_pool.close()
            if self.async_engine:
                await self.async_engine.dispose()
            if self.engine:
                self.engine.dispose()
            logger.info("Database operations cleanup completed")
        except Exception as e:
            logger.error(f"Database cleanup failed: {e}")

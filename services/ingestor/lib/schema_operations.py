"""
Schema Operations Module
Handles schema integration for the Ingestor service
"""

import os
import logging
import asyncio
import json
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

class SchemaOperations:
    """Handles schema operations and integration"""
    
    def __init__(self):
        self.schema_dir = Path("/app/data/schema")
        self.current_schema_dir = None
        self.schema_metadata = None
        self.table_definitions = {}
        self.executor = ThreadPoolExecutor(max_workers=2)
        
    async def initialize(self):
        """Initialize schema operations"""
        try:
            logger.info("Initializing schema operations...")
            
            # Create schema directory
            self.schema_dir.mkdir(parents=True, exist_ok=True)
            
            # Ensure schema exists (script should have pulled it already)
            if not self._find_existing_schema():
                raise Exception(
                    "Schema files not found. Please run services/ingestor/scripts/pull-schema.sh first."
                )
            
            # Load schema definitions
            await self.load_schema_definitions()
            
            logger.info("Schema operations initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize schema operations: {e}")
            raise
    
    # Note: schema pull logic has been removed; scripts/pull-schema.sh is the single source of truth.
    
    
    def _find_existing_schema(self) -> bool:
        """Find existing schema if available"""
        try:
            # Check if schema files are directly in the schema directory
            schema_file = self.schema_dir / "schema.prisma"
            metadata_file = self.schema_dir / "metadata.json"
            if schema_file.exists() and metadata_file.exists():
                self.current_schema_dir = self.schema_dir
                logger.info(f"Found existing schema files in: {self.schema_dir}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to find existing schema: {e}")
            return False
    
    async def load_schema_definitions(self):
        """Load schema definitions from files"""
        try:
            if not self.current_schema_dir:
                raise Exception("No schema directory available")
            
            # Load metadata
            metadata_file = self.current_schema_dir / "metadata.json"
            if metadata_file.exists():
                with open(metadata_file, 'r') as f:
                    self.schema_metadata = json.load(f)
                logger.info(f"Loaded schema metadata: {self.schema_metadata.get('version', 'unknown')}")
            
            # Load Prisma schema
            prisma_file = self.current_schema_dir / "schema.prisma"
            if prisma_file.exists():
                await self._parse_prisma_schema(prisma_file)
            
            # Note: Elasticsearch mappings are handled by CDC service
            logger.info("Schema definitions loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load schema definitions: {e}")
            raise
    
    async def _parse_prisma_schema(self, prisma_file: Path):
        """Parse Prisma schema file to extract table definitions"""
        try:
            loop = asyncio.get_event_loop()
            
            def parse():
                with open(prisma_file, 'r') as f:
                    content = f.read()
                
                # Simple parsing of Prisma schema
                # This is a basic implementation - could be enhanced with proper Prisma parsing
                tables = {}
                
                # Find model definitions
                import re
                model_pattern = r'model\s+(\w+)\s*\{([^}]+)\}'
                matches = re.findall(model_pattern, content, re.MULTILINE | re.DOTALL)
                
                for model_name, model_content in matches:
                    # Extract fields
                    field_pattern = r'(\w+)\s+(\w+)(?:\s+@\w+.*?)?'
                    fields = re.findall(field_pattern, model_content)
                    
                    table_def = {
                        'name': model_name,
                        'fields': {}
                    }
                    
                    for field_name, field_type in fields:
                        if field_name not in ['id', 'createdAt', 'updatedAt']:  # Skip common fields
                            table_def['fields'][field_name] = field_type
                    
                    tables[model_name] = table_def
                
                return tables
            
            self.table_definitions = await loop.run_in_executor(self.executor, parse)
            logger.info(f"Parsed {len(self.table_definitions)} table definitions")
            
        except Exception as e:
            logger.error(f"Failed to parse Prisma schema: {e}")
            # Fallback to hardcoded definitions
            self.table_definitions = self._get_fallback_table_definitions()
    
    
    def _get_fallback_table_definitions(self) -> Dict[str, Any]:
        """Fallback table definitions if schema parsing fails"""
        return {
            'Customer': {
                'name': 'Customer',
                'fields': {
                    'email': 'String',
                    'firstName': 'String',
                    'lastName': 'String',
                    'company': 'String',
                    'title': 'String',
                    'phone': 'String',
                    'address': 'String',
                    'city': 'String',
                    'state': 'String',
                    'country': 'String',
                    'zipCode': 'String',
                    'revenue': 'Int',
                    'industry': 'String'
                }
            },
            'Company': {
                'name': 'Company',
                'fields': {
                    'domain': 'String',
                    'name': 'String',
                    'industry': 'String',
                    'size': 'String',
                    'revenue': 'Int',
                    'address': 'String',
                    'city': 'String',
                    'state': 'String',
                    'country': 'String',
                    'zipCode': 'String',
                    'phone': 'String',
                    'website': 'String',
                    'description': 'String'
                }
            },
            'Prospect': {
                'name': 'Prospect',
                'fields': {
                    'email': 'String',
                    'firstName': 'String',
                    'lastName': 'String',
                    'title': 'String',
                    'phone': 'String',
                    'companyId': 'String',
                    'companyDomain': 'String',
                    'companyName': 'String',
                    'address': 'String',
                    'city': 'String',
                    'state': 'String',
                    'country': 'String',
                    'zipCode': 'String'
                }
            }
        }
    
    
    def get_table_definition(self, table_name: str) -> Optional[Dict[str, Any]]:
        """Get table definition by name"""
        return self.table_definitions.get(table_name)
    
    def get_table_columns(self, table_name: str) -> List[str]:
        """Get column names for a table"""
        table_def = self.get_table_definition(table_name)
        if table_def:
            return list(table_def['fields'].keys())
        return []
    
    def get_schema_info(self) -> Dict[str, Any]:
        """Get schema information"""
        return {
            'version': self.schema_metadata.get('version', 'unknown') if self.schema_metadata else 'unknown',
            'tables': list(self.table_definitions.keys()),
            'schema_dir': str(self.current_schema_dir) if self.current_schema_dir else None
        }
    
    async def validate_schema_compatibility(self, data: Dict[str, Any], table_name: str) -> Tuple[bool, List[str]]:
        """Validate data compatibility with schema"""
        try:
            table_def = self.get_table_definition(table_name)
            if not table_def:
                return False, [f"Table {table_name} not found in schema"]
            
            errors = []
            required_fields = table_def['fields']
            
            # Check for required fields
            for field_name in required_fields:
                if field_name not in data:
                    errors.append(f"Missing required field: {field_name}")
            
            # Check for unknown fields
            for field_name in data.keys():
                if field_name not in required_fields and field_name not in ['id', 'createdAt', 'updatedAt']:
                    errors.append(f"Unknown field: {field_name}")
            
            return len(errors) == 0, errors
            
        except Exception as e:
            logger.error(f"Schema validation failed: {e}")
            return False, [str(e)]
    
    async def cleanup(self):
        """Cleanup schema operations"""
        try:
            if self.executor:
                self.executor.shutdown(wait=True)
            logger.info("Schema operations cleanup completed")
        except Exception as e:
            logger.error(f"Schema cleanup failed: {e}")

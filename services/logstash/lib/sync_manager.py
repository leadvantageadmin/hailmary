#!/usr/bin/env python3
"""
Logstash Sync Manager
Manages data synchronization between PostgreSQL and Elasticsearch
"""

import os
import sys
import time
import json
import logging
import psycopg2
from elasticsearch import Elasticsearch
from datetime import datetime, timedelta
import argparse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/usr/share/logstash/data/logs/sync_manager.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class SyncManager:
    """Manages data synchronization between PostgreSQL and Elasticsearch"""
    
    def __init__(self):
        """Initialize the sync manager with database and Elasticsearch connections"""
        self.postgres_config = {
            'host': os.getenv('POSTGRES_HOST', 'hailmary-postgres'),
            'port': os.getenv('POSTGRES_PORT', '5432'),
            'database': os.getenv('POSTGRES_DB', 'app'),
            'user': os.getenv('POSTGRES_USER', 'app'),
            'password': os.getenv('POSTGRES_PASSWORD', 'app')
        }
        
        self.elasticsearch_config = {
            'hosts': [f"{os.getenv('ELASTICSEARCH_HOST', 'elasticsearch')}:{os.getenv('ELASTICSEARCH_PORT', '9200')}"],
            'use_ssl': os.getenv('ELASTICSEARCH_USE_SSL', 'false').lower() == 'true',
            'verify_certs': os.getenv('ELASTICSEARCH_VERIFY_CERTS', 'false').lower() == 'true'
        }
        
        # Add authentication if provided
        if os.getenv('ELASTICSEARCH_USERNAME'):
            self.elasticsearch_config['http_auth'] = (
                os.getenv('ELASTICSEARCH_USERNAME'),
                os.getenv('ELASTICSEARCH_PASSWORD', '')
            )
        
        self.checkpoint_dir = '/usr/share/logstash/data/checkpoints'
        self.ensure_checkpoint_dir()
        
    def ensure_checkpoint_dir(self):
        """Ensure checkpoint directory exists"""
        os.makedirs(self.checkpoint_dir, exist_ok=True)
    
    def get_postgres_connection(self):
        """Get PostgreSQL connection"""
        try:
            conn = psycopg2.connect(**self.postgres_config)
            return conn
        except Exception as e:
            logger.error(f"Failed to connect to PostgreSQL: {e}")
            raise
    
    def get_elasticsearch_client(self):
        """Get Elasticsearch client"""
        try:
            es = Elasticsearch(**self.elasticsearch_config)
            # Test connection
            if not es.ping():
                raise Exception("Elasticsearch ping failed")
            return es
        except Exception as e:
            logger.error(f"Failed to connect to Elasticsearch: {e}")
            raise
    
    def get_last_sync_time(self, table_name):
        """Get last sync time for a table"""
        checkpoint_file = os.path.join(self.checkpoint_dir, f"{table_name}_last_run")
        
        if os.path.exists(checkpoint_file):
            try:
                with open(checkpoint_file, 'r') as f:
                    data = json.load(f)
                    return datetime.fromisoformat(data['last_sync'])
            except Exception as e:
                logger.warning(f"Failed to read checkpoint for {table_name}: {e}")
        
        # Return epoch time if no checkpoint
        return datetime.fromtimestamp(0)
    
    def save_sync_time(self, table_name, sync_time):
        """Save sync time for a table"""
        checkpoint_file = os.path.join(self.checkpoint_dir, f"{table_name}_last_run")
        
        try:
            data = {
                'last_sync': sync_time.isoformat(),
                'timestamp': datetime.now().isoformat()
            }
            with open(checkpoint_file, 'w') as f:
                json.dump(data, f)
        except Exception as e:
            logger.error(f"Failed to save checkpoint for {table_name}: {e}")
    
    def check_table_changes(self, table_name):
        """Check if table has changes since last sync"""
        last_sync = self.get_last_sync_time(table_name)
        
        with self.get_postgres_connection() as conn:
            with conn.cursor() as cur:
                # Check for changes in the table
                cur.execute(f'SELECT MAX("updatedAt") FROM "{table_name}"')
                result = cur.fetchone()
                
                if result and result[0]:
                    last_update = result[0]
                    if last_update > last_sync:
                        logger.info(f"Changes detected in {table_name} since {last_sync}")
                        return True
                    else:
                        logger.info(f"No changes in {table_name} since {last_sync}")
                        return False
                else:
                    logger.warning(f"No data found in {table_name}")
                    return False
    
    def check_materialized_view_changes(self):
        """Check if materialized view has changes since last sync"""
        last_sync = self.get_last_sync_time('materialized_view')
        
        with self.get_postgres_connection() as conn:
            with conn.cursor() as cur:
                # Check for changes in the materialized view
                cur.execute('SELECT MAX(last_updated) FROM company_prospect_view')
                result = cur.fetchone()
                
                if result and result[0]:
                    last_update = result[0]
                    if last_update > last_sync:
                        logger.info(f"Changes detected in materialized view since {last_sync}")
                        return True
                    else:
                        logger.info(f"No changes in materialized view since {last_sync}")
                        return False
                else:
                    logger.warning("No data found in materialized view")
                    return False
    
    def refresh_materialized_view(self):
        """Refresh the materialized view"""
        logger.info("Refreshing materialized view...")
        
        with self.get_postgres_connection() as conn:
            with conn.cursor() as cur:
                try:
                    cur.execute('REFRESH MATERIALIZED VIEW CONCURRENTLY company_prospect_view')
                    conn.commit()
                    logger.info("Materialized view refreshed successfully")
                    return True
                except Exception as e:
                    logger.error(f"Failed to refresh materialized view: {e}")
                    return False
    
    def trigger_logstash_sync(self, table_name=None):
        """Trigger Logstash sync by clearing checkpoints"""
        if table_name:
            checkpoint_file = os.path.join(self.checkpoint_dir, f"{table_name}_last_run")
            if os.path.exists(checkpoint_file):
                os.remove(checkpoint_file)
                logger.info(f"Cleared checkpoint for {table_name}")
        else:
            # Clear all checkpoints
            for file in os.listdir(self.checkpoint_dir):
                if file.endswith('_last_run'):
                    os.remove(os.path.join(self.checkpoint_dir, file))
            logger.info("Cleared all checkpoints")
    
    def get_sync_stats(self):
        """Get synchronization statistics"""
        stats = {}
        
        # Check Elasticsearch indices
        try:
            es = self.get_elasticsearch_client()
            indices = ['company', 'prospect', 'company_prospect_view']
            
            for index in indices:
                try:
                    result = es.count(index=index)
                    stats[index] = {
                        'document_count': result['count'],
                        'status': 'healthy'
                    }
                except Exception as e:
                    stats[index] = {
                        'document_count': 0,
                        'status': f'error: {str(e)}'
                    }
        except Exception as e:
            logger.error(f"Failed to get Elasticsearch stats: {e}")
            stats['elasticsearch'] = f'error: {str(e)}'
        
        return stats
    
    def full_sync(self):
        """Perform full synchronization"""
        logger.info("Starting full synchronization...")
        
        # Clear all checkpoints
        self.trigger_logstash_sync()
        
        # Refresh materialized view
        if self.refresh_materialized_view():
            logger.info("Full sync triggered successfully")
            return True
        else:
            logger.error("Full sync failed")
            return False
    
    def table_sync(self, table_name):
        """Perform table-specific synchronization"""
        logger.info(f"Starting sync for table: {table_name}")
        
        if table_name not in ['Company', 'Prospect']:
            logger.error(f"Invalid table name: {table_name}")
            return False
        
        # Check for changes
        if self.check_table_changes(table_name):
            # Clear checkpoint to trigger sync
            self.trigger_logstash_sync(table_name.lower())
            logger.info(f"Sync triggered for {table_name}")
            return True
        else:
            logger.info(f"No changes detected in {table_name}")
            return False
    
    def materialized_view_sync(self):
        """Perform materialized view synchronization"""
        logger.info("Starting materialized view synchronization...")
        
        # Refresh materialized view
        if self.refresh_materialized_view():
            # Clear checkpoint to trigger sync
            self.trigger_logstash_sync('materialized_view')
            logger.info("Materialized view sync triggered successfully")
            return True
        else:
            logger.error("Materialized view sync failed")
            return False

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Logstash Sync Manager')
    parser.add_argument('--full-sync', action='store_true', help='Perform full sync')
    parser.add_argument('--table', help='Sync specific table (Company|Prospect)')
    parser.add_argument('--materialized-view', action='store_true', help='Sync materialized view')
    parser.add_argument('--stats', action='store_true', help='Show sync statistics')
    
    args = parser.parse_args()
    
    sync_manager = SyncManager()
    
    try:
        if args.full_sync:
            success = sync_manager.full_sync()
            sys.exit(0 if success else 1)
        elif args.table:
            success = sync_manager.table_sync(args.table)
            sys.exit(0 if success else 1)
        elif args.materialized_view:
            success = sync_manager.materialized_view_sync()
            sys.exit(0 if success else 1)
        elif args.stats:
            stats = sync_manager.get_sync_stats()
            print(json.dumps(stats, indent=2))
        else:
            parser.print_help()
            sys.exit(1)
    except Exception as e:
        logger.error(f"Sync manager error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()

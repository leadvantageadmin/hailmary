#!/usr/bin/env python3
"""
Logstash Health Monitor
Monitors the health of the Logstash service and its components
"""

import os
import sys
import json
import logging
import requests
import psycopg2
from elasticsearch import Elasticsearch
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/usr/share/logstash/data/logs/health_monitor.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class HealthMonitor:
    """Monitors the health of the Logstash service and its components"""
    
    def __init__(self):
        """Initialize the health monitor"""
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
        
        self.logstash_http_port = os.getenv('LOGSTASH_HTTP_PORT', '9600')
        self.overall_health = True
    
    def check_logstash_http_api(self):
        """Check Logstash HTTP API health"""
        try:
            url = f"http://localhost:{self.logstash_http_port}/_node/stats"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'status': 'healthy',
                    'uptime': data.get('jvm', {}).get('uptime_in_millis', 0),
                    'memory_used': data.get('jvm', {}).get('mem', {}).get('heap_used_in_bytes', 0),
                    'memory_max': data.get('jvm', {}).get('mem', {}).get('heap_max_in_bytes', 0)
                }
            else:
                return {
                    'status': 'unhealthy',
                    'error': f'HTTP {response.status_code}'
                }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e)
            }
    
    def check_logstash_pipelines(self):
        """Check Logstash pipeline health"""
        try:
            url = f"http://localhost:{self.logstash_http_port}/_node/stats"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                pipelines = data.get('pipelines', {})
                
                pipeline_status = {}
                for pipeline_name, pipeline_data in pipelines.items():
                    events_in = pipeline_data.get('events', {}).get('in', 0)
                    events_out = pipeline_data.get('events', {}).get('out', 0)
                    events_filtered = pipeline_data.get('events', {}).get('filtered', 0)
                    
                    pipeline_status[pipeline_name] = {
                        'status': 'healthy',
                        'events_in': events_in,
                        'events_out': events_out,
                        'events_filtered': events_filtered,
                        'throughput': events_out - events_filtered if events_out > events_filtered else 0
                    }
                
                return {
                    'status': 'healthy',
                    'pipelines': pipeline_status
                }
            else:
                return {
                    'status': 'unhealthy',
                    'error': f'HTTP {response.status_code}'
                }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e)
            }
    
    def check_postgres_connection(self):
        """Check PostgreSQL connection health"""
        try:
            conn = psycopg2.connect(**self.postgres_config)
            with conn.cursor() as cur:
                cur.execute('SELECT 1')
                result = cur.fetchone()
                
                if result and result[0] == 1:
                    return {
                        'status': 'healthy',
                        'host': self.postgres_config['host'],
                        'port': self.postgres_config['port'],
                        'database': self.postgres_config['database']
                    }
                else:
                    return {
                        'status': 'unhealthy',
                        'error': 'Connection test failed'
                    }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e)
            }
    
    def check_elasticsearch_connection(self):
        """Check Elasticsearch connection health"""
        try:
            es = Elasticsearch(**self.elasticsearch_config)
            
            if es.ping():
                cluster_health = es.cluster.health()
                return {
                    'status': 'healthy',
                    'cluster_status': cluster_health['status'],
                    'number_of_nodes': cluster_health['number_of_nodes'],
                    'active_shards': cluster_health['active_shards']
                }
            else:
                return {
                    'status': 'unhealthy',
                    'error': 'Ping failed'
                }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e)
            }
    
    def check_elasticsearch_indices(self):
        """Check Elasticsearch indices health"""
        try:
            es = Elasticsearch(**self.elasticsearch_config)
            indices = ['company', 'prospect', 'company_prospect_view']
            
            index_status = {}
            for index in indices:
                try:
                    stats = es.indices.stats(index=index)
                    index_data = stats['indices'][index]
                    
                    index_status[index] = {
                        'status': 'healthy',
                        'document_count': index_data['total']['docs']['count'],
                        'size_in_bytes': index_data['total']['store']['size_in_bytes'],
                        'shards': index_data['total']['shards']
                    }
                except Exception as e:
                    index_status[index] = {
                        'status': 'unhealthy',
                        'error': str(e)
                    }
            
            return {
                'status': 'healthy',
                'indices': index_status
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e)
            }
    
    def check_data_directories(self):
        """Check data directories health"""
        directories = [
            '/usr/share/logstash/data/logs',
            '/usr/share/logstash/data/schema',
            '/usr/share/logstash/data/checkpoints'
        ]
        
        dir_status = {}
        for directory in directories:
            if os.path.exists(directory) and os.path.isdir(directory):
                try:
                    # Check if directory is writable
                    test_file = os.path.join(directory, '.health_check')
                    with open(test_file, 'w') as f:
                        f.write('health_check')
                    os.remove(test_file)
                    
                    dir_status[directory] = {
                        'status': 'healthy',
                        'writable': True
                    }
                except Exception as e:
                    dir_status[directory] = {
                        'status': 'unhealthy',
                        'writable': False,
                        'error': str(e)
                    }
            else:
                dir_status[directory] = {
                    'status': 'unhealthy',
                    'exists': False,
                    'error': 'Directory does not exist'
                }
        
        return {
            'status': 'healthy' if all(d['status'] == 'healthy' for d in dir_status.values()) else 'unhealthy',
            'directories': dir_status
        }
    
    def check_checkpoint_files(self):
        """Check checkpoint files health"""
        checkpoint_dir = '/usr/share/logstash/data/checkpoints'
        
        if not os.path.exists(checkpoint_dir):
            return {
                'status': 'unhealthy',
                'error': 'Checkpoint directory does not exist'
            }
        
        checkpoint_files = []
        for file in os.listdir(checkpoint_dir):
            if file.endswith('_last_run'):
                file_path = os.path.join(checkpoint_dir, file)
                try:
                    with open(file_path, 'r') as f:
                        data = json.load(f)
                        checkpoint_files.append({
                            'file': file,
                            'last_sync': data.get('last_sync'),
                            'timestamp': data.get('timestamp'),
                            'status': 'healthy'
                        })
                except Exception as e:
                    checkpoint_files.append({
                        'file': file,
                        'status': 'unhealthy',
                        'error': str(e)
                    })
        
        return {
            'status': 'healthy' if all(f['status'] == 'healthy' for f in checkpoint_files) else 'unhealthy',
            'checkpoints': checkpoint_files
        }
    
    def get_overall_health(self):
        """Get overall health status"""
        health_report = {
            'timestamp': datetime.now().isoformat(),
            'overall_status': 'healthy',
            'components': {}
        }
        
        # Check Logstash HTTP API
        health_report['components']['logstash_http'] = self.check_logstash_http_api()
        
        # Check Logstash pipelines
        health_report['components']['logstash_pipelines'] = self.check_logstash_pipelines()
        
        # Check PostgreSQL
        health_report['components']['postgresql'] = self.check_postgres_connection()
        
        # Check Elasticsearch
        health_report['components']['elasticsearch'] = self.check_elasticsearch_connection()
        
        # Check Elasticsearch indices
        health_report['components']['elasticsearch_indices'] = self.check_elasticsearch_indices()
        
        # Check data directories
        health_report['components']['data_directories'] = self.check_data_directories()
        
        # Check checkpoint files
        health_report['components']['checkpoint_files'] = self.check_checkpoint_files()
        
        # Determine overall status
        component_statuses = [comp['status'] for comp in health_report['components'].values()]
        if 'unhealthy' in component_statuses:
            health_report['overall_status'] = 'unhealthy'
        
        return health_report
    
    def print_health_report(self, health_report):
        """Print formatted health report"""
        print(f"Logstash Service Health Report - {health_report['timestamp']}")
        print("=" * 60)
        print(f"Overall Status: {health_report['overall_status'].upper()}")
        print()
        
        for component, status in health_report['components'].items():
            print(f"{component.replace('_', ' ').title()}: {status['status'].upper()}")
            
            if status['status'] == 'unhealthy' and 'error' in status:
                print(f"  Error: {status['error']}")
            
            # Print additional details for specific components
            if component == 'logstash_http' and status['status'] == 'healthy':
                uptime_hours = status.get('uptime', 0) / (1000 * 60 * 60)
                memory_used_mb = status.get('memory_used', 0) / (1024 * 1024)
                memory_max_mb = status.get('memory_max', 0) / (1024 * 1024)
                print(f"  Uptime: {uptime_hours:.1f} hours")
                print(f"  Memory: {memory_used_mb:.1f}MB / {memory_max_mb:.1f}MB")
            
            elif component == 'logstash_pipelines' and status['status'] == 'healthy':
                for pipeline, details in status.get('pipelines', {}).items():
                    print(f"  {pipeline}: {details['events_out']} events processed")
            
            elif component == 'elasticsearch_indices' and status['status'] == 'healthy':
                for index, details in status.get('indices', {}).items():
                    if details['status'] == 'healthy':
                        doc_count = details.get('document_count', 0)
                        size_mb = details.get('size_in_bytes', 0) / (1024 * 1024)
                        print(f"  {index}: {doc_count} documents, {size_mb:.1f}MB")
            
            print()

def main():
    """Main function"""
    monitor = HealthMonitor()
    
    try:
        health_report = monitor.get_overall_health()
        monitor.print_health_report(health_report)
        
        # Exit with error code if unhealthy
        if health_report['overall_status'] == 'unhealthy':
            sys.exit(1)
        else:
            sys.exit(0)
    except Exception as e:
        logger.error(f"Health monitor error: {e}")
        print(f"Health monitor error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()

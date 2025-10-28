#!/usr/bin/env python3
"""
Fixed Batch Data Migration Script for Prospect Job Title Level Standardization
Uses ID-based pagination to avoid race conditions
"""

import psycopg2
import time
import sys
from typing import Dict, Tuple, Optional
from dataclasses import dataclass

@dataclass
class MigrationConfig:
    batch_size: int = 2000
    sleep_between_batches: float = 0.05
    max_retries: int = 3
    retry_delay: float = 1.0

@dataclass
class MigrationStats:
    total_records: int = 0
    processed_records: int = 0
    failed_records: int = 0
    start_time: float = 0
    end_time: float = 0

class JobTitleMigrationFixed:
    def __init__(self, config: MigrationConfig):
        self.config = config
        self.stats = MigrationStats()
        self.job_title_map: Dict[str, int] = {}
        self.job_title_definitions: Dict[int, str] = {}
        self.conn = None
        self.cursor = None

    def connect(self):
        """Connect to database"""
        self.conn = psycopg2.connect(
            host="localhost",
            port="5433",  # PostgreSQL is running on port 5433
            database="app",
            user="app",
            password="app"
        )
        self.cursor = self.conn.cursor()

    def load_mapping_data(self):
        """Load job title mapping data into memory"""
        print("📊 Loading job title mapping data into memory...")
        
        # Load JobTitleLevelMap
        self.cursor.execute("""
            SELECT "originalJobTitleLevel", "level"
            FROM "JobTitleLevelMap"
        """)
        for original_title, level in self.cursor.fetchall():
            self.job_title_map[original_title] = level
        
        # Load JobTitleLevelDefinition
        self.cursor.execute("""
            SELECT "level", "jobTitleLevel"
            FROM "JobTitleLevelDefinition"
        """)
        for level, standardized_name in self.cursor.fetchall():
            self.job_title_definitions[level] = standardized_name
        
        print(f"✅ Mapping data loaded: {len(self.job_title_map)} mappings, {len(self.job_title_definitions)} definitions")

    def get_total_records(self) -> int:
        """Get total number of records to migrate"""
        self.cursor.execute("""
            SELECT COUNT(*) 
            FROM "Prospect" 
            WHERE "jobTitleLevel" IS NOT NULL 
            AND "jobTitleLevelId" IS NULL
        """)
        return self.cursor.fetchone()[0]

    def get_batch_records_by_id(self, last_id: str = None) -> list:
        """Get a batch of records using ID-based pagination to avoid race conditions"""
        if last_id is None:
            # First batch - get records with smallest IDs
            self.cursor.execute("""
                SELECT "id", "jobTitleLevel"
                FROM "Prospect" 
                WHERE "jobTitleLevel" IS NOT NULL 
                AND "jobTitleLevelId" IS NULL
                ORDER BY "id"
                LIMIT %s
            """, (self.config.batch_size,))
        else:
            # Subsequent batches - get records with IDs greater than last_id
            self.cursor.execute("""
                SELECT "id", "jobTitleLevel"
                FROM "Prospect" 
                WHERE "jobTitleLevel" IS NOT NULL 
                AND "jobTitleLevelId" IS NULL
                AND "id" > %s
                ORDER BY "id"
                LIMIT %s
            """, (last_id, self.config.batch_size))
        
        return self.cursor.fetchall()

    def update_batch(self, records: list) -> int:
        """Update a batch of records"""
        if not records:
            return 0
        
        # Prepare update data
        update_data = []
        for record_id, job_title in records:
            if job_title in self.job_title_map:
                level = self.job_title_map[job_title]
                standardized_name = self.job_title_definitions[level]
                update_data.append((standardized_name, level, record_id))
        
        if not update_data:
            return 0
        
        # Execute batch update
        self.cursor.executemany("""
            UPDATE "Prospect" 
            SET "jobTitleLevel" = %s, "jobTitleLevelId" = %s, "updatedAt" = CURRENT_TIMESTAMP
            WHERE "id" = %s
        """, update_data)
        
        self.conn.commit()
        return self.cursor.rowcount

    def run_migration(self):
        """Run the complete migration process"""
        print("🔄 Starting Fixed Prospect Job Title Level Data Migration")
        print("=" * 60)
        
        self.stats.start_time = time.time()
        
        # Connect to database
        self.connect()
        
        # Load mapping data
        self.load_mapping_data()
        
        # Get total records
        self.stats.total_records = self.get_total_records()
        
        if self.stats.total_records == 0:
            print("✅ No records need migration. All prospects already have standardized job title levels.")
            return
        
        print(f"📋 Found {self.stats.total_records} records to migrate")
        print(f"📦 Batch size: {self.config.batch_size} records")
        print(f"⏱️  Sleep between batches: {self.config.sleep_between_batches}s")
        print()
        
        # Process records using ID-based pagination
        last_id = None
        batch_num = 1
        
        while True:
            try:
                # Get batch of records using ID-based pagination
                records = self.get_batch_records_by_id(last_id)
                
                if not records:
                    break
                
                # Update batch
                start_time = time.time()
                updated_count = self.update_batch(records)
                end_time = time.time()
                
                if updated_count > 0:
                    self.stats.processed_records += updated_count
                    duration = end_time - start_time
                    print(f"✅ Batch {batch_num}: {updated_count} records updated in {duration:.2f}s")
                    
                    # Progress update
                    progress = (self.stats.processed_records / self.stats.total_records) * 100
                    remaining = self.stats.total_records - self.stats.processed_records
                    print(f"📊 Progress: {self.stats.processed_records}/{self.stats.total_records} ({progress:.1f}%), {remaining} remaining")
                    
                else:
                    print(f"⚠️  Batch {batch_num}: No records updated (unmapped job titles)")
                
                # Update last_id for next batch
                last_id = records[-1][0]  # Get the last record's ID
                
                # Sleep between batches
                if self.config.sleep_between_batches > 0:
                    time.sleep(self.config.sleep_between_batches)
                
                batch_num += 1
                
            except Exception as e:
                print(f"❌ Batch {batch_num} failed: {e}")
                self.stats.failed_records += self.config.batch_size
                
                # Retry logic
                for retry in range(self.config.max_retries):
                    print(f"🔄 Retrying batch {batch_num} (attempt {retry + 1}/{self.config.max_retries})")
                    time.sleep(self.config.retry_delay)
                    
                    try:
                        updated_count = self.update_batch(records)
                        if updated_count > 0:
                            self.stats.processed_records += updated_count
                            print(f"✅ Batch {batch_num} retry successful: {updated_count} records updated")
                            break
                    except Exception as retry_error:
                        print(f"❌ Batch {batch_num} retry {retry + 1} failed: {retry_error}")
                        if retry == self.config.max_retries - 1:
                            print(f"❌ Batch {batch_num} failed after {self.config.max_retries} retries. Stopping.")
                            return
        
        self.stats.end_time = time.time()
        self.print_summary()

    def print_summary(self):
        """Print migration summary"""
        duration = self.stats.end_time - self.stats.start_time
        
        print()
        print("📊 Migration Summary")
        print("=" * 60)
        print(f"✅ Successfully processed: {self.stats.processed_records} records")
        print(f"📋 Total records with job title levels: {self.stats.total_records}")
        print(f"❌ Failed records: {self.stats.failed_records} records")
        print(f"⏱️  Total time: {duration:.2f} seconds")
        print(f"📈 Average speed: {self.stats.processed_records / duration:.0f} records/second")
        
        if self.stats.failed_records == 0:
            print()
            print("🎉 Migration completed successfully! All prospects now have standardized job title levels.")
        else:
            print()
            print("⚠️  Migration completed with some issues. Check the summary above.")

    def close(self):
        """Close database connection"""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()

def main():
    """Main function"""
    config = MigrationConfig(
        batch_size=2000,  # Optimal batch size for 170K records
        sleep_between_batches=0.05,  # Reduced sleep for better performance
        max_retries=3,
        retry_delay=1.0
    )
    
    migration = JobTitleMigrationFixed(config)
    
    try:
        migration.run_migration()
    except KeyboardInterrupt:
        print("\n⚠️  Migration interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)
    finally:
        migration.close()

if __name__ == "__main__":
    main()

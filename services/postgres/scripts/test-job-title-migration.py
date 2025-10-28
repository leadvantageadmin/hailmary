#!/usr/bin/env python3
"""
Test Script for Job Title Migration
Tests the migration logic with a small subset of records first
"""

import psycopg2
import time
from typing import Dict, Tuple, List
from dataclasses import dataclass

@dataclass
class TestConfig:
    test_limit: int = 10  # Test with only 10 records
    batch_size: int = 5   # Small batch size for testing

class JobTitleMigrationTest:
    def __init__(self, config: TestConfig):
        self.config = config
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

    def get_test_records(self) -> List[Tuple]:
        """Get test records for testing"""
        self.cursor.execute("""
            SELECT "id", "jobTitleLevel"
            FROM "Prospect" 
            WHERE "jobTitleLevel" IS NOT NULL 
            AND "jobTitleLevelId" IS NULL
            LIMIT %s
        """, (self.config.test_limit,))
        return self.cursor.fetchall()

    def show_test_data(self, records: List[Tuple]):
        """Show what data we're going to test with"""
        print(f"\n🧪 Test Data Preview ({len(records)} records):")
        print("=" * 60)
        print(f"{'ID':<12} {'Original Job Title':<40} {'Mapped Level':<12} {'Standardized Name':<30}")
        print("-" * 60)
        
        for record_id, job_title in records:
            if job_title in self.job_title_map:
                level = self.job_title_map[job_title]
                standardized_name = self.job_title_definitions[level]
                print(f"{record_id:<12} {job_title[:40]:<40} {level:<12} {standardized_name[:30]:<30}")
            else:
                print(f"{record_id:<12} {job_title[:40]:<40} {'UNMAPPED':<12} {'N/A':<30}")

    def test_mapping(self, records: List[Tuple]) -> Dict[str, int]:
        """Test the mapping logic"""
        print(f"\n🔍 Testing Mapping Logic:")
        print("=" * 40)
        
        mapping_results = {
            'total_records': len(records),
            'mapped_records': 0,
            'unmapped_records': 0,
            'unmapped_titles': set()
        }
        
        for record_id, job_title in records:
            if job_title in self.job_title_map:
                mapping_results['mapped_records'] += 1
                level = self.job_title_map[job_title]
                standardized_name = self.job_title_definitions[level]
                print(f"✅ {job_title} → Level {level} ({standardized_name})")
            else:
                mapping_results['unmapped_records'] += 1
                mapping_results['unmapped_titles'].add(job_title)
                print(f"❌ {job_title} → UNMAPPED")
        
        print(f"\n📊 Mapping Results:")
        print(f"  Total Records: {mapping_results['total_records']}")
        print(f"  Mapped: {mapping_results['mapped_records']}")
        print(f"  Unmapped: {mapping_results['unmapped_records']}")
        
        if mapping_results['unmapped_titles']:
            print(f"  Unmapped Job Titles: {list(mapping_results['unmapped_titles'])}")
        
        return mapping_results

    def test_update_logic(self, records: List[Tuple]) -> int:
        """Test the update logic without actually updating"""
        print(f"\n🔄 Testing Update Logic:")
        print("=" * 40)
        
        update_data = []
        for record_id, job_title in records:
            if job_title in self.job_title_map:
                level = self.job_title_map[job_title]
                standardized_name = self.job_title_definitions[level]
                update_data.append((standardized_name, level, record_id))
        
        print(f"📋 Would update {len(update_data)} records:")
        for standardized_name, level, record_id in update_data:
            print(f"  ID {record_id}: jobTitleLevel='{standardized_name}', jobTitleLevelId={level}")
        
        return len(update_data)

    def run_dry_run_test(self):
        """Run a dry run test without making actual changes"""
        print("🧪 Starting Job Title Migration Test (DRY RUN)")
        print("=" * 60)
        
        self.connect()
        self.load_mapping_data()
        
        # Get test records
        test_records = self.get_test_records()
        
        if not test_records:
            print("✅ No records need migration. All prospects already have standardized job title levels.")
            return
        
        print(f"📋 Found {len(test_records)} test records")
        
        # Show test data
        self.show_test_data(test_records)
        
        # Test mapping logic
        mapping_results = self.test_mapping(test_records)
        
        # Test update logic
        update_count = self.test_update_logic(test_records)
        
        # Summary
        print(f"\n📊 Test Summary:")
        print("=" * 40)
        print(f"✅ Test Records: {len(test_records)}")
        print(f"✅ Mapped Records: {mapping_results['mapped_records']}")
        print(f"✅ Would Update: {update_count}")
        print(f"❌ Unmapped Records: {mapping_results['unmapped_records']}")
        
        if mapping_results['unmapped_records'] > 0:
            print(f"\n⚠️  Warning: {mapping_results['unmapped_records']} records have unmapped job titles")
            print("   These records will not be updated during migration")
        
        print(f"\n🎯 Ready for full migration!")
        print(f"   Estimated time for 170K records: ~8-12 minutes")
        print(f"   Estimated batches: ~85 batches (2000 records each)")

    def close(self):
        """Close database connection"""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()

def main():
    """Main function"""
    config = TestConfig(
        test_limit=10,  # Test with 10 records
        batch_size=5    # Small batch size
    )
    
    test = JobTitleMigrationTest(config)
    
    try:
        test.run_dry_run_test()
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        test.close()

if __name__ == "__main__":
    main()

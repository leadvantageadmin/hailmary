#!/usr/bin/env python3
"""
Batch Size Performance Test for Job Title Migration
Tests different batch sizes to find the optimal one
"""

import psycopg2
import time
import statistics
from typing import List, Tuple
from dataclasses import dataclass

@dataclass
class BatchTestResult:
    batch_size: int
    total_time: float
    records_per_second: float
    memory_usage: float
    success_rate: float

class BatchSizeTester:
    def __init__(self):
        self.conn = None
        self.cursor = None
        self.job_title_map = {}
        self.job_title_definitions = {}

    def connect(self):
        """Connect to database"""
        self.conn = psycopg2.connect(
            host="localhost",
            port="5432",
            database="app",
            user="app",
            password="app"
        )
        self.cursor = self.conn.cursor()

    def load_mapping_data(self):
        """Load mapping data"""
        self.cursor.execute("""
            SELECT "originalJobTitleLevel", "level"
            FROM "JobTitleLevelMap"
        """)
        for original_title, level in self.cursor.fetchall():
            self.job_title_map[original_title] = level

        self.cursor.execute("""
            SELECT "level", "jobTitleLevel"
            FROM "JobTitleLevelDefinition"
        """)
        for level, standardized_name in self.cursor.fetchall():
            self.job_title_definitions[level] = standardized_name

    def get_test_records(self, limit: int) -> List[Tuple]:
        """Get test records for performance testing"""
        self.cursor.execute("""
            SELECT "id", "jobTitleLevel"
            FROM "Prospect" 
            WHERE "jobTitleLevel" IS NOT NULL 
            AND "jobTitleLevelId" IS NULL
            LIMIT %s
        """, (limit,))
        return self.cursor.fetchall()

    def test_batch_size(self, batch_size: int, test_records: List[Tuple]) -> BatchTestResult:
        """Test performance for a specific batch size"""
        print(f"🧪 Testing batch size: {batch_size}")
        
        start_time = time.time()
        start_memory = self.get_memory_usage()
        
        total_updated = 0
        successful_batches = 0
        total_batches = 0
        
        # Process records in batches
        for i in range(0, len(test_records), batch_size):
            batch = test_records[i:i + batch_size]
            total_batches += 1
            
            try:
                # Prepare update data
                update_data = []
                for record_id, job_title in batch:
                    if job_title in self.job_title_map:
                        level = self.job_title_map[job_title]
                        standardized_name = self.job_title_definitions[level]
                        update_data.append((standardized_name, level, record_id))
                
                if update_data:
                    # Execute batch update
                    self.cursor.executemany("""
                        UPDATE "Prospect" 
                        SET "jobTitleLevel" = %s, "jobTitleLevelId" = %s
                        WHERE "id" = %s
                    """, update_data)
                    
                    self.conn.commit()
                    total_updated += len(update_data)
                    successful_batches += 1
                
            except Exception as e:
                print(f"❌ Batch failed: {e}")
                self.conn.rollback()
        
        end_time = time.time()
        end_memory = self.get_memory_usage()
        
        total_time = end_time - start_time
        records_per_second = total_updated / total_time if total_time > 0 else 0
        memory_usage = end_memory - start_memory
        success_rate = successful_batches / total_batches if total_batches > 0 else 0
        
        return BatchTestResult(
            batch_size=batch_size,
            total_time=total_time,
            records_per_second=records_per_second,
            memory_usage=memory_usage,
            success_rate=success_rate
        )

    def get_memory_usage(self) -> float:
        """Get current memory usage (simplified)"""
        import psutil
        process = psutil.Process()
        return process.memory_info().rss / 1024 / 1024  # MB

    def run_performance_test(self):
        """Run performance test for different batch sizes"""
        print("🧪 Starting Batch Size Performance Test")
        print("=" * 50)
        
        self.connect()
        self.load_mapping_data()
        
        # Get test records (use first 10,000 for testing)
        test_records = self.get_test_records(10000)
        print(f"📊 Using {len(test_records)} test records")
        
        # Test different batch sizes
        batch_sizes = [100, 250, 500, 1000, 2000, 5000, 10000]
        results = []
        
        for batch_size in batch_sizes:
            # Reset test data
            self.cursor.execute("""
                UPDATE "Prospect" 
                SET "jobTitleLevel" = original."jobTitleLevel", "jobTitleLevelId" = NULL
                FROM (SELECT "id", "jobTitleLevel" FROM "Prospect" WHERE "id" IN %s) original
                WHERE "Prospect"."id" = original."id"
            """, (tuple([r[0] for r in test_records]),))
            self.conn.commit()
            
            # Test batch size
            result = self.test_batch_size(batch_size, test_records)
            results.append(result)
            
            print(f"✅ Batch {batch_size}: {result.records_per_second:.0f} records/sec, {result.total_time:.2f}s, {result.memory_usage:.1f}MB")
        
        # Find optimal batch size
        optimal_result = max(results, key=lambda r: r.records_per_second)
        
        print()
        print("📊 Performance Test Results")
        print("=" * 50)
        print(f"{'Batch Size':<12} {'Records/sec':<12} {'Time (s)':<10} {'Memory (MB)':<12} {'Success Rate':<12}")
        print("-" * 60)
        
        for result in results:
            print(f"{result.batch_size:<12} {result.records_per_second:<12.0f} {result.total_time:<10.2f} {result.memory_usage:<12.1f} {result.success_rate:<12.2f}")
        
        print()
        print(f"🏆 Optimal batch size: {optimal_result.batch_size}")
        print(f"📈 Best performance: {optimal_result.records_per_second:.0f} records/second")
        print(f"⏱️  Time for 170K records: {(170000 / optimal_result.records_per_second) / 60:.1f} minutes")

    def close(self):
        """Close database connection"""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()

def main():
    """Main function"""
    tester = BatchSizeTester()
    
    try:
        tester.run_performance_test()
    except Exception as e:
        print(f"❌ Performance test failed: {e}")
    finally:
        tester.close()

if __name__ == "__main__":
    main()

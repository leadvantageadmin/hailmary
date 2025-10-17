#!/usr/bin/env python3
"""
Comprehensive Standardization Test
Tests the full standardized location dataset integration
"""

import sys
import os
import time
import random

# Add the ingestor path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'apps', 'ingestor'))

from comprehensive_standardizer import comprehensive_standardizer

def test_comprehensive_standardization():
    """Test comprehensive standardization with real-world data"""
    
    print("🌍 Comprehensive Location Standardization Test")
    print("=" * 60)
    
    # Test data based on your CSV analysis and common variations
    test_countries = [
        "United States", "USA", "US", "United States of America", "America",
        "United Kingdom", "UK", "Great Britain", "Britain", "England",
        "Australia", "Germany", "Singapore", "Canada", "France", "Japan",
        "India", "China", "Brazil", "Mexico", "Philippines", "Thailand",
        "Vietnam", "Indonesia", "Malaysia", "Serbia", "Non US", "N/A", "NA"
    ]
    
    test_states = [
        "California", "CA", "Cali", "New York", "NY", "Texas", "TX",
        "Massachusetts", "MA", "Mass", "Illinois", "IL", "Florida", "FL",
        "Virginia", "VA", "Pennsylvania", "PA", "Washington", "WA",
        "Minnesota", "MN", "Ohio", "OH", "Colorado", "CO",
        "North Carolina", "NC", "Wisconsin", "WI", "Connecticut", "CT",
        "Michigan", "MI", "Missouri", "MO", "Georgia", "GA",
        "Indiana", "IN", "New Jersey", "NJ", "NSW", "VIC", "Victoria"
    ]
    
    test_cities = [
        "New York City", "Los Angeles", "Chicago", "Houston", "Phoenix",
        "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose",
        "Austin", "Jacksonville", "Fort Worth", "Columbus", "Charlotte",
        "San Francisco", "Indianapolis", "Seattle", "Denver", "Washington",
        "Boston", "El Paso", "Nashville", "Detroit", "Oklahoma City",
        "Portland", "Las Vegas", "Memphis", "Louisville", "Baltimore",
        "Milwaukee", "Albuquerque", "Tucson", "Fresno", "Sacramento",
        "Mesa", "Kansas City", "Atlanta", "Long Beach", "Colorado Springs",
        "Raleigh", "Miami", "Virginia Beach", "Omaha", "Oakland",
        "Minneapolis", "Tulsa", "Arlington", "Tampa", "New Orleans"
    ]
    
    # Generate test dataset
    test_records = []
    for i in range(5000):  # 5K records for comprehensive test
        record = {
            'id': f'customer_{i}',
            'country': random.choice(test_countries),
            'state': random.choice(test_states),
            'city': random.choice(test_cities),
            'company': f'Company_{i}',
            'email': f'user{i}@example.com',
            'firstName': f'User{i}',
            'lastName': f'Test{i}'
        }
        test_records.append(record)
    
    print(f"📊 Testing with {len(test_records)} records...")
    print(f"🔍 Using comprehensive standardized location dataset")
    
    # Performance test
    start_time = time.time()
    
    standardized_records = []
    for record in test_records:
        standardized = comprehensive_standardizer.standardize_customer_location(record)
        standardized_records.append(standardized)
    
    end_time = time.time()
    total_time = end_time - start_time
    
    # Calculate performance metrics
    records_per_second = len(test_records) / total_time
    avg_time_per_record = (total_time * 1000) / len(test_records)  # in milliseconds
    
    print(f"\n⏱️  Performance Results:")
    print(f"   Total time: {total_time:.3f} seconds")
    print(f"   Records per second: {records_per_second:,.0f}")
    print(f"   Average time per record: {avg_time_per_record:.3f} ms")
    
    # Show sample results
    print(f"\n📋 Sample Standardization Results:")
    for i in range(10):
        original = test_records[i]
        standardized = standardized_records[i]
        
        print(f"\n   Record {i+1}:")
        print(f"     Original Country: '{original['country']}'")
        print(f"     Standardized: '{standardized.get('country_code')}' ({standardized.get('country_display')})")
        print(f"     Original State: '{original['state']}'")
        print(f"     Standardized: '{standardized.get('state_code')}' ({standardized.get('state_display')})")
        print(f"     Original City: '{original['city']}'")
        print(f"     Standardized: '{standardized.get('city_code')}' ({standardized.get('city_display')})")
    
    # Show comprehensive performance report
    comprehensive_standardizer.print_performance_report()
    
    # Test specific edge cases
    print(f"\n🧪 Edge Case Testing:")
    edge_cases = [
        {"country": "United States of America", "state": "California", "city": "Los Angeles"},
        {"country": "USA", "state": "CA", "city": "LA"},
        {"country": "US", "state": "Cali", "city": "Los Angeles"},
        {"country": "United Kingdom", "state": "England", "city": "London"},
        {"country": "UK", "state": "England", "city": "London"},
        {"country": "Non US", "state": "NSW", "city": "Sydney"},
        {"country": "N/A", "state": "VIC", "city": "Melbourne"},
        {"country": "Unknown Country", "state": "Unknown State", "city": "Unknown City"}
    ]
    
    for i, case in enumerate(edge_cases):
        result = comprehensive_standardizer.standardize_customer_location(case)
        print(f"\n   Edge Case {i+1}:")
        print(f"     Input: {case}")
        print(f"     Output: Country={result.get('country_code')}, State={result.get('state_code')}, City={result.get('city_code')}")
    
    print(f"\n✅ Comprehensive standardization test completed!")

if __name__ == "__main__":
    test_comprehensive_standardization()

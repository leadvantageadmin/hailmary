#!/usr/bin/env python3
"""
Test Zipcode Data Loading
Test the zipcode binary file loading and lookup functionality
"""

import pickle
import os

def test_zipcode_data():
    """Test zipcode data loading and lookup"""
    print("🧪 TESTING ZIPCODE DATA")
    print("="*50)
    
    # Load zipcode data
    zipcode_file = "/app/standardization/optimized/zipcodes.bin"
    if not os.path.exists(zipcode_file):
        print(f"❌ Zipcode file not found: {zipcode_file}")
        return
    
    print("📁 Loading zipcode data...")
    start_time = time.time()
    with open(zipcode_file, 'rb') as file:
        zipcode_data = pickle.load(file)
    load_time = time.time() - start_time
    
    print(f"✅ Loaded {len(zipcode_data):,} zipcode records in {load_time:.3f} seconds")
    
    # Test some lookups
    test_cases = [
        ("us", "10001"),  # New York
        ("us", "90210"),  # Beverly Hills
        ("ca", "M5H 2N2"),  # Toronto
        ("gb", "SW1A 1AA"),  # London
        ("de", "10115"),  # Berlin
        ("fr", "75001"),  # Paris
        ("au", "2000"),  # Sydney
        ("za", "2000"),  # Cape Town
    ]
    
    print(f"\n🔍 Testing zipcode lookups:")
    for country, postal_code in test_cases:
        key = f"{country.lower()}_{postal_code.lower()}"
        if key in zipcode_data:
            data = zipcode_data[key]
            print(f"   ✅ {country.upper()} {postal_code}: {data['city']}, {data['state']}")
        else:
            print(f"   ❌ {country.upper()} {postal_code}: Not found")
    
    # Show some statistics
    print(f"\n📊 Zipcode Data Statistics:")
    countries = set()
    for key, data in zipcode_data.items():
        countries.add(data['country'])
    
    print(f"   Total records: {len(zipcode_data):,}")
    print(f"   Countries covered: {len(countries)}")
    print(f"   Sample countries: {sorted(list(countries))[:10]}")
    
    # Test file size
    file_size = os.path.getsize(zipcode_file) / (1024 * 1024)
    print(f"   File size: {file_size:.2f} MB")

if __name__ == "__main__":
    import time
    test_zipcode_data()

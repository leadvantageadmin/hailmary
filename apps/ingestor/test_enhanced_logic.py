#!/usr/bin/env python3
"""
Test Enhanced Standardization Logic
Test the improved logic with the Gauteng example
"""

from fuzzy_standardizer import fuzzy_standardizer

def test_gauteng_example():
    """Test the Gauteng example with enhanced logic"""
    print("🧪 TESTING ENHANCED STANDARDIZATION LOGIC")
    print("="*60)
    
    # Test case: Gauteng as city (should be treated as state)
    test_data = {
        'city': 'Gauteng',
        'state': 'NON US', 
        'country': 'South Africa',
        'address': '123 Main Street, Johannesburg, Gauteng, South Africa'
    }
    
    print(f"📋 Test Data:")
    print(f"   City: {test_data['city']}")
    print(f"   State: {test_data['state']}")
    print(f"   Country: {test_data['country']}")
    print(f"   Address: {test_data['address']}")
    
    print(f"\n🔍 Testing enhanced logic...")
    
    # Apply standardization
    result = fuzzy_standardizer.standardize_customer_data(test_data.copy())
    
    print(f"\n✅ Results:")
    print(f"   City Code: {result.get('cityCode', 'None')}")
    print(f"   City Display: {result.get('cityDisplay', 'None')}")
    print(f"   State Code: {result.get('stateCode', 'None')}")
    print(f"   State Display: {result.get('stateDisplay', 'None')}")
    print(f"   Country Code: {result.get('countryCode', 'None')}")
    print(f"   Country Display: {result.get('countryDisplay', 'None')}")
    
    # Test address parsing
    print(f"\n🔍 Testing address parsing...")
    extracted_city = fuzzy_standardizer.loader.parse_city_from_address(test_data['address'])
    print(f"   Extracted from address: {extracted_city}")
    
    # Test state lookup
    print(f"\n🔍 Testing state lookup...")
    state_info = fuzzy_standardizer.loader.get_state_by_name('Gauteng')
    if state_info:
        print(f"   Found state: {state_info}")
    else:
        print(f"   ❌ Gauteng not found as state")
        
        # Check if it exists in states
        print(f"\n🔍 Searching for Gauteng in states...")
        states = fuzzy_standardizer.loader.search_states('gauteng')
        if states:
            print(f"   Found {len(states)} matches:")
            for state in states:
                print(f"     - {state}")
        else:
            print(f"   ❌ No state matches found")

if __name__ == "__main__":
    test_gauteng_example()

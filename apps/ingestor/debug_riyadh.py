#!/usr/bin/env python3
"""
Debug Riyadh City Lookup
Test the specific Riyadh city lookup to understand why fallback isn't working
"""

from standardization_loader import get_full_cities_loader

def debug_riyadh_lookup():
    """Debug the Riyadh city lookup"""
    print("🔍 DEBUGGING RIYADH CITY LOOKUP")
    print("="*50)
    
    # Get the loader
    loader = get_full_cities_loader()
    
    # Test city lookup
    city_name = "riyadh"
    print(f"🔍 Looking up city: '{city_name}'")
    
    city_info = loader.get_city_info(city_name)
    if city_info:
        print(f"✅ City found!")
        print(f"   Code: {city_info.code}")
        print(f"   Display: {city_info.display}")
        print(f"   Country: {city_info.country}")
        print(f"   State: {city_info.state}")
        print(f"   Country ID: {city_info.country_id}")
        print(f"   State ID: {city_info.state_id}")
        print(f"   Country Name: {city_info.country_name}")
        print(f"   State Name: {city_info.state_name}")
        
        # Test state lookup by ID
        if city_info.state_id:
            print(f"\n🔍 Testing state lookup by ID: {city_info.state_id}")
            state_iso3166_2 = loader.get_state_iso3166_2_by_id(city_info.state_id)
            state_display = loader.get_state_display_by_id(city_info.state_id)
            print(f"   State ISO3166-2: {state_iso3166_2}")
            print(f"   State Display: {state_display}")
        
        # Test country lookup by ID
        if city_info.country_id:
            print(f"\n🔍 Testing country lookup by ID: {city_info.country_id}")
            country_code = loader.get_country_code_by_id(city_info.country_id)
            country_display = loader.get_country_display_by_id(city_info.country_id)
            print(f"   Country Code: {country_code}")
            print(f"   Country Display: {country_display}")
    else:
        print(f"❌ City not found!")
        
        # Try some variations
        variations = ["Riyadh", "RIYADH", "riyadh", "Riyadh ", " Riyadh"]
        for variation in variations:
            city_info = loader.get_city_info(variation)
            if city_info:
                print(f"✅ Found with variation: '{variation}'")
                break

if __name__ == "__main__":
    debug_riyadh_lookup()

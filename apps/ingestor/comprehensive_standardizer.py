"""
Comprehensive Data Standardizer
Uses optimized binary format with all 133,673 cities for complete coverage
Provides fast standardization with comprehensive geographic data
"""

import time
from typing import Dict, Optional
from standardization_loader import get_full_cities_loader

class ComprehensiveStandardizer:
    """
    Comprehensive data standardizer using all cities and optimized binary format
    Provides complete geographic coverage with excellent performance
    """
    
    def __init__(self):
        self.loader = get_full_cities_loader()
        self.stats = {
            'countries_standardized': 0,
            'states_standardized': 0,
            'cities_standardized': 0,
            'countries_from_city_fallback': 0,
            'states_from_city_fallback': 0,
            'unknown_countries': set(),
            'unknown_states': set(),
            'unknown_cities': set()
        }
    
    def standardize_customer_data(self, customer_data: Dict) -> Dict:
        """
        Standardize customer location data using comprehensive data with city-first fallback
        """
        # Step 1: Try to standardize city first (this gives us the most information)
        city_info = None
        if customer_data.get('city'):
            city_info = self._get_city_info(customer_data['city'])
            if city_info:
                customer_data['cityCode'] = city_info.code
                customer_data['cityDisplay'] = city_info.display
                self.stats['cities_standardized'] += 1
            else:
                self.stats['unknown_cities'].add(customer_data['city'])
        
        # Step 2: Standardize country (direct lookup first, then city fallback)
        country_code, country_display = self._standardize_country_with_fallback(
            customer_data.get('country'), city_info
        )
        if country_code and country_display:
            customer_data['countryCode'] = country_code
            customer_data['countryDisplay'] = country_display
        
        # Step 3: Standardize state (direct lookup first, then city fallback)
        state_code, state_display = self._standardize_state_with_fallback(
            customer_data.get('state'), city_info
        )
        if state_code and state_display:
            customer_data['stateCode'] = state_code
            customer_data['stateDisplay'] = state_display
        
        return customer_data
    
    def _get_city_info(self, city_name: str):
        """Get city information from the loader"""
        if not city_name:
            return None
        return self.loader.get_city_info(city_name)
    
    def _standardize_country_with_fallback(self, country_name: str, city_info) -> tuple[Optional[str], Optional[str]]:
        """Standardize country with city fallback mechanism"""
        # First try direct country lookup
        if country_name:
            country_code = self.loader.get_country_code(country_name)
            country_display = self.loader.get_country_display(country_name)
            
            if country_code and country_display:
                self.stats['countries_standardized'] += 1
                return country_code, country_display
            else:
                self.stats['unknown_countries'].add(country_name)
        
        # Fallback: Use city information to infer country
        if city_info and city_info.country:
            # Get country display name from the country code
            country_display = self.loader.get_country_display_by_code(city_info.country)
            if country_display:
                self.stats['countries_from_city_fallback'] += 1
                return city_info.country, country_display
        
        return None, None
    
    def _standardize_state_with_fallback(self, state_name: str, city_info) -> tuple[Optional[str], Optional[str]]:
        """Standardize state with city fallback mechanism"""
        # First try direct state lookup
        if state_name:
            state_code = self.loader.get_state_code(state_name)
            state_display = self.loader.get_state_display(state_name)
            
            if state_code and state_display:
                self.stats['states_standardized'] += 1
                return state_code, state_display
            else:
                self.stats['unknown_states'].add(state_name)
        
        # Fallback: Use city information to infer state
        if city_info and city_info.state:
            # Get state display name from the state code
            state_display = self.loader.get_state_display_by_code(city_info.state)
            if state_display:
                self.stats['states_from_city_fallback'] += 1
                return city_info.state, state_display
        
        return None, None
    
    def _standardize_state(self, state_name: str) -> tuple[Optional[str], Optional[str]]:
        """Standardize state name to code and display name"""
        if not state_name:
            return None, None
        
        # Get standardized values
        state_code = self.loader.get_state_code(state_name)
        state_display = self.loader.get_state_display(state_name)
        
        if state_code and state_display:
            self.stats['states_standardized'] += 1
            return state_code, state_display
        else:
            self.stats['unknown_states'].add(state_name)
            return None, None
    
    def _standardize_city(self, city_name: str) -> tuple[Optional[str], Optional[str]]:
        """Standardize city name to code and display name"""
        if not city_name:
            return None, None
        
        # Get standardized values
        city_code = self.loader.get_city_code(city_name)
        city_display = self.loader.get_city_display(city_name)
        
        if city_code and city_display:
            self.stats['cities_standardized'] += 1
            return city_code, city_display
        else:
            self.stats['unknown_cities'].add(city_name)
            return None, None
    
    def print_performance_report(self):
        """Print standardization performance report"""
        print("\n" + "="*60)
        print("📊 COMPREHENSIVE STANDARDIZATION REPORT")
        print("="*60)
        print(f"Countries standardized: {self.stats['countries_standardized']}")
        print(f"States standardized: {self.stats['states_standardized']}")
        print(f"Cities standardized: {self.stats['cities_standardized']}")
        print(f"Countries from city fallback: {self.stats['countries_from_city_fallback']}")
        print(f"States from city fallback: {self.stats['states_from_city_fallback']}")
        print(f"Unknown countries: {len(self.stats['unknown_countries'])}")
        print(f"Unknown states: {len(self.stats['unknown_states'])}")
        print(f"Unknown cities: {len(self.stats['unknown_cities'])}")
        
        # Calculate total coverage
        total_countries = self.stats['countries_standardized'] + self.stats['countries_from_city_fallback']
        total_states = self.stats['states_standardized'] + self.stats['states_from_city_fallback']
        total_cities = self.stats['cities_standardized']
        
        print(f"\n📈 Coverage Summary:")
        print(f"   Total countries resolved: {total_countries}")
        print(f"   Total states resolved: {total_states}")
        print(f"   Total cities resolved: {total_cities}")
        
        if self.stats['unknown_countries']:
            print(f"\n❓ Unknown countries (first 10): {list(self.stats['unknown_countries'])[:10]}")
        if self.stats['unknown_states']:
            print(f"❓ Unknown states (first 10): {list(self.stats['unknown_states'])[:10]}")
        if self.stats['unknown_cities']:
            print(f"❓ Unknown cities (first 10): {list(self.stats['unknown_cities'])[:10]}")
        
        # Show loader stats
        loader_stats = self.loader.get_stats()
        print(f"\n🗺️  Data Coverage:")
        print(f"   Countries loaded: {loader_stats['countries_loaded']}")
        print(f"   States loaded: {loader_stats['states_loaded']}")
        print(f"   Cities loaded: {loader_stats['cities_loaded']:,}")
        print(f"   Coverage: {loader_stats['coverage']}")
        print("="*60)

# Global instance
comprehensive_standardizer = ComprehensiveStandardizer()

def standardize_customer_data_comprehensive(customer_data: Dict) -> Dict:
    """
    Standardize customer data using comprehensive standardizer
    """
    return comprehensive_standardizer.standardize_customer_data(customer_data)

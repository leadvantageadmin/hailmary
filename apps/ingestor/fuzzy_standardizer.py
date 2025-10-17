"""
Fuzzy Matching Enhanced Standardizer
Adds fuzzy matching capabilities to improve standardization accuracy
Handles typos, variations, and partial matches for cities, states, and countries
"""

import time
from typing import Dict, Optional, List, Tuple
from thefuzz import fuzz, process
from standardization_loader import get_full_cities_loader

class FuzzyStandardizer:
    """
    Enhanced standardizer with fuzzy matching capabilities
    Provides intelligent matching for typos, variations, and partial matches
    """
    
    def __init__(self, 
                 country_threshold: int = 85,
                 state_threshold: int = 80, 
                 city_threshold: int = 75):
        """
        Initialize fuzzy standardizer with configurable thresholds
        
        Args:
            country_threshold: Minimum fuzzy match score for countries (0-100)
            state_threshold: Minimum fuzzy match score for states (0-100)
            city_threshold: Minimum fuzzy match score for cities (0-100)
        """
        self.loader = get_full_cities_loader()
        self.country_threshold = country_threshold
        self.state_threshold = state_threshold
        self.city_threshold = city_threshold
        
        self.stats = {
            'countries_standardized': 0,
            'states_standardized': 0,
            'cities_standardized': 0,
            'countries_from_city_fallback': 0,
            'states_from_city_fallback': 0,
            'countries_fuzzy_matched': 0,
            'states_fuzzy_matched': 0,
            'cities_fuzzy_matched': 0,
            'unknown_countries': set(),
            'unknown_states': set(),
            'unknown_cities': set()
        }
        
        # Pre-build lookup lists for fuzzy matching
        self._build_fuzzy_lookup_lists()
    
    def _build_fuzzy_lookup_lists(self):
        """Build optimized lookup lists for fuzzy matching"""
        print("🔧 Building fuzzy matching lookup lists...")
        start_time = time.time()
        
        # Build country lookup list
        self.country_names = []
        self.country_mapping = {}
        for name, data in self.loader.country_mappings.items():
            self.country_names.append(name)
            self.country_mapping[name] = data
        
        # Build state lookup list
        self.state_names = []
        self.state_mapping = {}
        for name, data in self.loader.state_mappings.items():
            self.state_names.append(name)
            self.state_mapping[name] = data
        
        # Build city lookup list (sample for performance - use top cities by population)
        self.city_names = []
        self.city_mapping = {}
        city_count = 0
        max_cities = 50000  # Limit for performance
        
        for name, data in self.loader.city_mappings.items():
            if city_count >= max_cities:
                break
            self.city_names.append(name)
            self.city_mapping[name] = data
            city_count += 1
        
        build_time = time.time() - start_time
        print(f"✅ Built fuzzy lookup lists: {len(self.country_names)} countries, {len(self.state_names)} states, {len(self.city_names)} cities in {build_time:.3f}s")
    
    def standardize_customer_data(self, customer_data: Dict) -> Dict:
        """
        Standardize customer location data using enhanced fuzzy matching and fallbacks
        """
        # Step 1: Try to standardize city first (this gives us the most information)
        city_info = None
        city_name = customer_data.get('city')
        country_hint = customer_data.get('country')
        
        if city_name:
            # Try direct city lookup with country awareness
            city_info = self._get_city_info_fuzzy(city_name, country_hint)
            
            if city_info:
                customer_data['cityCode'] = city_info.code
                customer_data['cityDisplay'] = city_info.display
                self.stats['cities_standardized'] += 1
            else:
                # Fallback: Check if city_name is actually a state/province
                state_info = self.loader.get_state_by_name(city_name)
                if state_info:
                    # Treat this as a state, not a city
                    customer_data['stateCode'] = state_info.get('iso3166_2', '')
                    customer_data['stateDisplay'] = state_info.get('display', '')
                    self.stats['states_standardized'] += 1
                else:
                    # Fallback: Try to extract city from address field
                    address = customer_data.get('address', '')
                    if address:
                        extracted_city = self.loader.parse_city_from_address(address)
                        if extracted_city:
                            city_info = self._get_city_info_fuzzy(extracted_city, country_hint)
                            if city_info:
                                customer_data['cityCode'] = city_info.code
                                customer_data['cityDisplay'] = city_info.display
                                self.stats['cities_standardized'] += 1
                            else:
                                self.stats['unknown_cities'].add(city_name)
                        else:
                            self.stats['unknown_cities'].add(city_name)
                    else:
                        self.stats['unknown_cities'].add(city_name)
        
        # Step 2: Standardize country (direct lookup first, then fuzzy, then city fallback)
        country_code, country_display = self._standardize_country_with_fuzzy_fallback(
            customer_data.get('country'), city_info
        )
        if country_code and country_display:
            customer_data['countryCode'] = country_code
            customer_data['countryDisplay'] = country_display
        
        # Step 3: Standardize state (direct lookup first, then fuzzy, then city fallback)
        state_code, state_display = self._standardize_state_with_fuzzy_fallback(
            customer_data.get('state'), city_info
        )
        if state_code and state_display:
            customer_data['stateCode'] = state_code
            customer_data['stateDisplay'] = state_display
        
        return customer_data
    
    def _get_city_info_fuzzy(self, city_name: str, country_hint: str = None):
        """Get city information using enhanced fuzzy matching with fallbacks"""
        if not city_name:
            return None
        
        # First try exact match
        city_info = self.loader.get_city_info(city_name)
        if city_info:
            return city_info
        
        # Try fuzzy matching with country awareness
        normalized_input = city_name.lower().strip()
        best_match = process.extractOne(
            normalized_input, 
            self.city_names, 
            scorer=fuzz.ratio,
            score_cutoff=self.city_threshold
        )
        
        if best_match:
            matched_name, score = best_match
            city_info = self.loader.get_city_info(matched_name)
            if city_info:
                # If we have a country hint, prefer matches from that country
                if country_hint and city_info.country_name:
                    country_hint_lower = country_hint.lower()
                    city_country_lower = city_info.country_name.lower()
                    if country_hint_lower in city_country_lower or city_country_lower in country_hint_lower:
                        self.stats['cities_fuzzy_matched'] += 1
                        return city_info
                    # If country doesn't match, continue to other fallbacks
                else:
                    self.stats['cities_fuzzy_matched'] += 1
                    return city_info
        
        # Fallback 1: Check if city_name is actually a state/province
        state_info = self.loader.get_state_by_name(city_name)
        if state_info:
            # If it's a state, we can't return city info, but we can use this for state fallback
            return None
        
        return None
    
    def _standardize_country_with_fuzzy_fallback(self, country_name: str, city_info) -> Tuple[Optional[str], Optional[str]]:
        """Standardize country with fuzzy matching and city fallback"""
        # First try direct country lookup
        if country_name:
            country_code = self.loader.get_country_code(country_name)
            country_display = self.loader.get_country_display(country_name)
            
            if country_code and country_display:
                self.stats['countries_standardized'] += 1
                return country_code, country_display
            
            # Try fuzzy matching for countries
            normalized_input = country_name.lower().strip()
            best_match = process.extractOne(
                normalized_input,
                self.country_names,
                scorer=fuzz.ratio,
                score_cutoff=self.country_threshold
            )
            
            if best_match:
                matched_name, score = best_match
                country_data = self.country_mapping[matched_name]
                self.stats['countries_fuzzy_matched'] += 1
                return country_data['iso3'], country_data['display']
            else:
                self.stats['unknown_countries'].add(country_name)
        
        # Fallback: Use city information to infer country
        if city_info:
            # Use city.country_code (ISO2) and city.country_name directly
            country_code = city_info.country  # This is ISO2 from city record
            country_display = city_info.country_name  # This is country name from city record
            if country_code and country_display:
                self.stats['countries_from_city_fallback'] += 1
                return country_code, country_display
        
        return None, None
    
    def _standardize_state_with_fuzzy_fallback(self, state_name: str, city_info) -> Tuple[Optional[str], Optional[str]]:
        """Standardize state with fuzzy matching and city fallback"""
        # First try direct state lookup
        if state_name:
            state_code = self.loader.get_state_code(state_name)
            state_display = self.loader.get_state_display(state_name)
            
            if state_code and state_display:
                self.stats['states_standardized'] += 1
                return state_code, state_display
            
            # Try fuzzy matching for states
            normalized_input = state_name.lower().strip()
            best_match = process.extractOne(
                normalized_input,
                self.state_names,
                scorer=fuzz.ratio,
                score_cutoff=self.state_threshold
            )
            
            if best_match:
                matched_name, score = best_match
                state_data = self.state_mapping[matched_name]
                self.stats['states_fuzzy_matched'] += 1
                return state_data['code'], state_data['display']
            else:
                self.stats['unknown_states'].add(state_name)
        
        # Fallback: Use city information to infer state
        if city_info and city_info.state_id:
            # Get ISO3166-2 code from state record using state_id
            state_code = self.loader.get_state_iso3166_2_by_id(city_info.state_id)
            # Use state_name directly from city record
            state_display = city_info.state_name
            if state_code and state_display:
                self.stats['states_from_city_fallback'] += 1
                return state_code, state_display
        
        return None, None
    
    def print_performance_report(self):
        """Print comprehensive standardization performance report"""
        print("\n" + "="*70)
        print("📊 FUZZY MATCHING STANDARDIZATION REPORT")
        print("="*70)
        print(f"Countries standardized (direct): {self.stats['countries_standardized']}")
        print(f"Countries fuzzy matched: {self.stats['countries_fuzzy_matched']}")
        print(f"Countries from city fallback: {self.stats['countries_from_city_fallback']}")
        print(f"States standardized (direct): {self.stats['states_standardized']}")
        print(f"States fuzzy matched: {self.stats['states_fuzzy_matched']}")
        print(f"States from city fallback: {self.stats['states_from_city_fallback']}")
        print(f"Cities standardized (direct): {self.stats['cities_standardized']}")
        print(f"Cities fuzzy matched: {self.stats['cities_fuzzy_matched']}")
        print(f"Unknown countries: {len(self.stats['unknown_countries'])}")
        print(f"Unknown states: {len(self.stats['unknown_states'])}")
        print(f"Unknown cities: {len(self.stats['unknown_cities'])}")
        
        # Calculate total coverage
        total_countries = (self.stats['countries_standardized'] + 
                          self.stats['countries_fuzzy_matched'] + 
                          self.stats['countries_from_city_fallback'])
        total_states = (self.stats['states_standardized'] + 
                       self.stats['states_fuzzy_matched'] + 
                       self.stats['states_from_city_fallback'])
        total_cities = (self.stats['cities_standardized'] + 
                       self.stats['cities_fuzzy_matched'])
        
        print(f"\n📈 Coverage Summary:")
        print(f"   Total countries resolved: {total_countries}")
        print(f"   Total states resolved: {total_states}")
        print(f"   Total cities resolved: {total_cities}")
        
        # Show fuzzy matching effectiveness
        total_fuzzy = (self.stats['countries_fuzzy_matched'] + 
                      self.stats['states_fuzzy_matched'] + 
                      self.stats['cities_fuzzy_matched'])
        print(f"   Fuzzy matches: {total_fuzzy}")
        
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
        print(f"\n🎯 Fuzzy Matching Thresholds:")
        print(f"   Country threshold: {self.country_threshold}%")
        print(f"   State threshold: {self.state_threshold}%")
        print(f"   City threshold: {self.city_threshold}%")
        print("="*70)

# Global instance
fuzzy_standardizer = FuzzyStandardizer()

def standardize_customer_data_fuzzy(customer_data: Dict) -> Dict:
    """
    Standardize customer data using fuzzy matching standardizer
    """
    return fuzzy_standardizer.standardize_customer_data(customer_data)

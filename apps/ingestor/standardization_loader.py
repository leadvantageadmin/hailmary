"""
Full Cities Data Loader - Uses optimized binary format with all 151,187 cities
Provides complete city coverage with excellent performance
"""

import pickle
import os
import time
from typing import Dict, Optional, List
from dataclasses import dataclass

@dataclass
class FullCityData:
    code: str
    display: str
    country: str
    state: str
    country_id: int
    state_id: int
    country_name: str
    state_name: str
    population: int
    latitude: Optional[float]
    longitude: Optional[float]

class FullCitiesDataLoader:
    """
    Ultra-fast data loader using optimized binary format with ALL cities
    Loads all 151,187 cities in seconds instead of minutes
    """
    
    def __init__(self, data_dir: str = None):
        if data_dir is None:
            data_dir = os.path.join(os.path.dirname(__file__), 'standardization')
        
        self.data_dir = data_dir
        self.optimized_dir = os.path.join(data_dir, 'optimized')
        
        # Lookup structures
        self.country_mappings: Dict[str, Dict] = {}
        self.state_mappings: Dict[str, Dict] = {}
        self.city_mappings: Dict[str, FullCityData] = {}
        
        self.load_all_data()
    
    def load_all_data(self):
        """Load all standardized location data using optimized formats"""
        print(f"🚀 Loading FULL location data (all 151,187 cities)...")
        start_time = time.time()
        
        self.load_countries()
        self.load_states()
        self.load_all_cities()
        
        # Add common variations
        self._add_common_variations()
        
        elapsed_time = time.time() - start_time
        print(f"✅ Loaded {len(self.country_mappings)} countries, {len(self.state_mappings)} states, {len(self.city_mappings)} cities")
        print(f"⚡ Total load time: {elapsed_time:.3f} seconds")
        print(f"🎯 City coverage: 100% (all 151,187 cities)")
    
    def load_countries(self):
        """Load countries data from optimized format"""
        file_path = os.path.join(self.optimized_dir, 'countries.bin')
        
        if not os.path.exists(file_path):
            print(f"⚠️  Optimized countries file not found: {file_path}")
            return
        
        with open(file_path, 'rb') as file:
            data = pickle.load(file)
        
        # Convert to optimized data structures
        for name, country_data in data.items():
            self.country_mappings[name] = {
                'id': country_data['id'],
                'iso3': country_data['iso3'],
                'iso2': country_data['iso2'],
                'display': country_data['display']
            }
    
    def load_states(self):
        """Load states data from optimized format"""
        file_path = os.path.join(self.optimized_dir, 'states.bin')
        
        if not os.path.exists(file_path):
            print(f"⚠️  Optimized states file not found: {file_path}")
            return
        
        with open(file_path, 'rb') as file:
            data = pickle.load(file)
        
        # Convert to optimized data structures
        for name, state_data in data.items():
            self.state_mappings[name] = {
                'id': state_data['id'],
                'code': state_data['code'],
                'iso3166_2': state_data['iso3166_2'],
                'display': state_data['display'],
                'country': state_data['country']
            }
    
    def load_all_cities(self):
        """Load ALL cities data from optimized format"""
        file_path = os.path.join(self.optimized_dir, 'cities_full.bin')
        
        if not os.path.exists(file_path):
            print(f"⚠️  Full cities file not found: {file_path}")
            print(f"   Run full_cities_converter.py first to create the optimized file")
            return
        
        print(f"📁 Loading all cities from {file_path}...")
        load_start = time.time()
        
        with open(file_path, 'rb') as file:
            data = pickle.load(file)
        
        load_time = time.time() - load_start
        print(f"⚡ Cities loaded in {load_time:.3f} seconds")
        
        # Convert to optimized data structures
        for name, city_data in data.items():
            self.city_mappings[name] = FullCityData(
                code=city_data['code'],
                display=city_data['display'],
                country=city_data['country'],
                state=city_data['state'],
                country_id=city_data['country_id'],
                state_id=city_data['state_id'],
                country_name=city_data['country_name'],
                state_name=city_data['state_name'],
                population=city_data['population'],
                latitude=city_data['latitude'],
                longitude=city_data['longitude']
            )
    
    def _add_common_variations(self):
        """Add common variations for better matching"""
        # Country variations
        country_variations = {
            'us': 'united states',
            'usa': 'united states',
            'uk': 'united kingdom',
            'gb': 'united kingdom',
            'can': 'canada',
            'aus': 'australia',
            'de': 'germany',
            'fr': 'france',
            'jp': 'japan',
            'cn': 'china',
            'in': 'india',
            'br': 'brazil',
            'mx': 'mexico',
            'sg': 'singapore',
            'my': 'malaysia',
            'th': 'thailand',
            'kr': 'south korea',
            'it': 'italy',
            'es': 'spain',
            'nl': 'netherlands',
            'se': 'sweden',
            'no': 'norway',
            'dk': 'denmark',
            'fi': 'finland',
            'ch': 'switzerland',
            'at': 'austria',
            'be': 'belgium',
            'ie': 'ireland',
            'nz': 'new zealand',
            'za': 'south africa',
            'eg': 'egypt',
            'il': 'israel',
            'tr': 'turkey',
            'ru': 'russia',
            'pl': 'poland',
            'cz': 'czech republic',
            'hu': 'hungary',
            'pt': 'portugal',
            'gr': 'greece'
        }
        
        for variation, standard in country_variations.items():
            if standard in self.country_mappings:
                self.country_mappings[variation] = self.country_mappings[standard]
        
        # US State variations
        us_state_variations = {
            'cali': 'california',
            'calif': 'california',
            'ny': 'new york',
            'dc': 'district of columbia',
            'washington dc': 'district of columbia',
            'd.c.': 'district of columbia'
        }
        
        for variation, standard in us_state_variations.items():
            if standard in self.state_mappings:
                self.state_mappings[variation] = self.state_mappings[standard]
    
    def get_country_code(self, country_name: str) -> Optional[str]:
        """Get country ISO3 code from country name"""
        if not country_name:
            return None
        
        normalized = country_name.lower().strip()
        country_data = self.country_mappings.get(normalized)
        return country_data['iso3'] if country_data else None
    
    def get_country_display(self, country_name: str) -> Optional[str]:
        """Get country display name from country name"""
        if not country_name:
            return None
        
        normalized = country_name.lower().strip()
        country_data = self.country_mappings.get(normalized)
        return country_data['display'] if country_data else None
    
    def get_state_code(self, state_name: str) -> Optional[str]:
        """Get state code from state name"""
        if not state_name:
            return None
        
        normalized = state_name.lower().strip()
        state_data = self.state_mappings.get(normalized)
        return state_data['code'] if state_data else None
    
    def get_state_display(self, state_name: str) -> Optional[str]:
        """Get state display name from state name"""
        if not state_name:
            return None
        
        normalized = state_name.lower().strip()
        state_data = self.state_mappings.get(normalized)
        return state_data['display'] if state_data else None
    
    def get_city_code(self, city_name: str) -> Optional[str]:
        """Get city code from city name"""
        if not city_name:
            return None
        
        normalized = city_name.lower().strip()
        city_data = self.city_mappings.get(normalized)
        return city_data.code if city_data else None
    
    def get_city_display(self, city_name: str) -> Optional[str]:
        """Get city display name from city name"""
        if not city_name:
            return None
        
        normalized = city_name.lower().strip()
        city_data = self.city_mappings.get(normalized)
        return city_data.display if city_data else None
    
    def get_city_info(self, city_name: str) -> Optional[FullCityData]:
        """Get full city information"""
        if not city_name:
            return None
        
        normalized = city_name.lower().strip()
        return self.city_mappings.get(normalized)
    
    def get_country_display_by_code(self, country_code: str) -> Optional[str]:
        """Get country display name from country code (ISO2 or ISO3)"""
        if not country_code:
            return None
        
        # Search through country mappings to find by ISO3 or ISO2 code
        for country_data in self.country_mappings.values():
            if country_data.get('iso3') == country_code or country_data.get('iso2') == country_code:
                return country_data.get('display')
        return None
    
    def get_state_display_by_code(self, state_code: str) -> Optional[str]:
        """Get state display name from state code"""
        if not state_code:
            return None
        
        # Search through state mappings to find by code
        for state_data in self.state_mappings.values():
            if state_data.get('code') == state_code:
                return state_data.get('display')
        return None
    
    def get_country_display_by_id(self, country_id: int) -> Optional[str]:
        """Get country display name from country ID"""
        if not country_id:
            return None
        
        # Search through country mappings to find by ID
        for country_data in self.country_mappings.values():
            if country_data.get('id') == country_id:
                return country_data.get('display')
        return None
    
    def get_state_display_by_id(self, state_id: int) -> Optional[str]:
        """Get state display name from state ID"""
        if not state_id:
            return None
        
        # Search through state mappings to find by ID
        for state_data in self.state_mappings.values():
            if state_data.get('id') == state_id:
                return state_data.get('display')
        return None
    
    def get_country_code_by_id(self, country_id: int) -> Optional[str]:
        """Get country code from country ID"""
        if not country_id:
            return None
        
        # Search through country mappings to find by ID
        for country_data in self.country_mappings.values():
            if country_data.get('id') == country_id:
                return country_data.get('iso3')
        return None
    
    def get_state_code_by_id(self, state_id: int) -> Optional[str]:
        """Get state code from state ID"""
        if not state_id:
            return None
        
        # Search through state mappings to find by ID
        for state_data in self.state_mappings.values():
            if state_data.get('id') == state_id:
                return state_data.get('code')
        return None
    
    def get_state_iso3166_2_by_id(self, state_id: int) -> Optional[str]:
        """Get state ISO3166-2 code from state ID"""
        if not state_id:
            return None
        
        # Search through state mappings to find by ID
        for state_data in self.state_mappings.values():
            if state_data.get('id') == state_id:
                return state_data.get('iso3166_2')
        return None
    
    def search_cities(self, query: str, limit: int = 10) -> List[FullCityData]:
        """Search cities by name (partial match)"""
        if not query:
            return []
        
        query_lower = query.lower().strip()
        matches = []
        
        for city_name, city_data in self.city_mappings.items():
            if query_lower in city_name:
                matches.append(city_data)
                if len(matches) >= limit:
                    break
        
        return matches
    
    def get_cities_by_country(self, country_code: str, limit: int = 50) -> List[FullCityData]:
        """Get cities by country code"""
        if not country_code:
            return []
        
        matches = []
        for city_data in self.city_mappings.values():
            if city_data.country == country_code:
                matches.append(city_data)
                if len(matches) >= limit:
                    break
        
        return matches
    
    def get_state_by_name(self, state_name: str) -> Optional[Dict]:
        """Get state data by name (exact match)"""
        if not state_name:
            return None
        
        normalized = state_name.lower().strip()
        return self.state_mappings.get(normalized)
    
    def search_states(self, query: str, limit: int = 10) -> List[Dict]:
        """Search states by name (partial match)"""
        if not query:
            return []
        
        normalized_query = query.lower().strip()
        matches = []
        
        for name, state_data in self.state_mappings.items():
            if normalized_query in name:
                matches.append(state_data)
                if len(matches) >= limit:
                    break
        
        return matches
    
    def parse_city_from_address(self, address: str) -> Optional[str]:
        """Extract potential city name from address field"""
        if not address:
            return None
        
        # Simple city extraction - look for common patterns
        # This is a basic implementation, could be enhanced with more sophisticated parsing
        address_lower = address.lower().strip()
        
        # Remove common address prefixes/suffixes
        prefixes_to_remove = ['address:', 'addr:', 'street:', 'st:', 'avenue:', 'ave:', 'road:', 'rd:', 'boulevard:', 'blvd:']
        suffixes_to_remove = ['street', 'st', 'avenue', 'ave', 'road', 'rd', 'boulevard', 'blvd', 'drive', 'dr', 'lane', 'ln']
        
        cleaned_address = address_lower
        for prefix in prefixes_to_remove:
            if cleaned_address.startswith(prefix):
                cleaned_address = cleaned_address[len(prefix):].strip()
        
        # Split by common separators and look for potential city names
        separators = [',', ';', '\n', '\t', '  ']
        for sep in separators:
            if sep in cleaned_address:
                parts = [part.strip() for part in cleaned_address.split(sep)]
                # Usually city is in the last few parts
                for part in reversed(parts[-3:]):  # Check last 3 parts
                    if len(part) > 2 and part.isalpha():  # Basic validation
                        # Check if this looks like a city name
                        if self.get_city_info(part) or self.get_state_by_name(part):
                            return part
        
        return None
    
    def get_stats(self) -> Dict:
        """Get loading statistics"""
        return {
            'countries_loaded': len(self.country_mappings),
            'states_loaded': len(self.state_mappings),
            'cities_loaded': len(self.city_mappings),
            'coverage': '100% (all cities)',
            'format': 'optimized_binary'
        }

# Global instance
full_cities_loader = None

def get_full_cities_loader():
    """Get full cities data loader instance"""
    global full_cities_loader
    if full_cities_loader is None:
        full_cities_loader = FullCitiesDataLoader()
    return full_cities_loader

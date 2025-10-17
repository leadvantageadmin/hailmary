#!/usr/bin/env python3
"""
Analyze Unknown Records
Analyzes the unknown countries, states, and cities to understand gaps in coverage
"""

import pandas as pd
from collections import Counter
from fuzzy_standardizer import fuzzy_standardizer

def analyze_unknowns():
    """Analyze unknown records to understand coverage gaps"""
    
    print("🔍 ANALYZING UNKNOWN RECORDS")
    print("="*50)
    
    # Get the unknown sets from the fuzzy standardizer
    unknown_countries = fuzzy_standardizer.stats['unknown_countries']
    unknown_states = fuzzy_standardizer.stats['unknown_states']
    unknown_cities = fuzzy_standardizer.stats['unknown_cities']
    
    print(f"📊 Total Unknown Records: {len(unknown_countries) + len(unknown_states) + len(unknown_cities)}")
    print(f"   - Unknown countries: {len(unknown_countries)}")
    print(f"   - Unknown states: {len(unknown_states)}")
    print(f"   - Unknown cities: {len(unknown_cities)}")
    
    # Analyze unknown countries
    if unknown_countries:
        print(f"\n🌍 UNKNOWN COUNTRIES ({len(unknown_countries)}):")
        print("-" * 30)
        for country in sorted(unknown_countries):
            print(f"  - '{country}'")
        
        # Categorize unknown countries
        print(f"\n📋 Country Categories:")
        country_categories = categorize_countries(unknown_countries)
        for category, countries in country_categories.items():
            if countries:
                print(f"  {category}: {len(countries)} - {list(countries)[:5]}")
    
    # Analyze unknown states
    if unknown_states:
        print(f"\n🏛️  UNKNOWN STATES ({len(unknown_states)}):")
        print("-" * 30)
        for state in sorted(unknown_states):
            print(f"  - '{state}'")
        
        # Categorize unknown states
        print(f"\n📋 State Categories:")
        state_categories = categorize_states(unknown_states)
        for category, states in state_categories.items():
            if states:
                print(f"  {category}: {len(states)} - {list(states)[:5]}")
    
    # Analyze unknown cities
    if unknown_cities:
        print(f"\n🏙️  UNKNOWN CITIES ({len(unknown_cities)}):")
        print("-" * 30)
        for city in sorted(unknown_cities):
            print(f"  - '{city}'")
        
        # Categorize unknown cities
        print(f"\n📋 City Categories:")
        city_categories = categorize_cities(unknown_cities)
        for category, cities in city_categories.items():
            if cities:
                print(f"  {category}: {len(cities)} - {list(cities)[:5]}")
    
    # Suggest improvements
    print(f"\n💡 SUGGESTIONS FOR IMPROVEMENT:")
    print("-" * 40)
    suggest_improvements(unknown_countries, unknown_states, unknown_cities)

def categorize_countries(countries):
    """Categorize unknown countries by type"""
    categories = {
        'Abbreviations': set(),
        'Non-standard names': set(),
        'Regions/Territories': set(),
        'Typos/Variations': set(),
        'Other': set()
    }
    
    for country in countries:
        country_lower = country.lower().strip()
        
        if len(country) <= 3 and country.isupper():
            categories['Abbreviations'].add(country)
        elif any(region in country_lower for region in ['hong kong', 'uae', 'maharashtra']):
            categories['Regions/Territories'].add(country)
        elif any(non_std in country_lower for non_std in ['non us', 'non-us']):
            categories['Non-standard names'].add(country)
        else:
            categories['Other'].add(country)
    
    return categories

def categorize_states(states):
    """Categorize unknown states by type"""
    categories = {
        'Abbreviations': set(),
        'Postal codes': set(),
        'Non-standard names': set(),
        'Typos/Variations': set(),
        'Other': set()
    }
    
    for state in states:
        state_lower = state.lower().strip()
        
        if len(state) <= 3 and state.isupper():
            categories['Abbreviations'].add(state)
        elif any(non_std in state_lower for non_std in ['non usa', 'non-us', 'non  usa']):
            categories['Non-standard names'].add(state)
        elif any(char.isdigit() for char in state):
            categories['Postal codes'].add(state)
        elif ',' in state:
            categories['Typos/Variations'].add(state)
        else:
            categories['Other'].add(state)
    
    return categories

def categorize_cities(cities):
    """Categorize unknown cities by type"""
    categories = {
        'Abbreviations': set(),
        'Non-standard names': set(),
        'Typos/Variations': set(),
        'Other': set()
    }
    
    for city in cities:
        city_lower = city.lower().strip()
        
        if len(city) <= 3 and city.isupper():
            categories['Abbreviations'].add(city)
        elif any(non_std in city_lower for non_std in ['hong kong', 'san po kong']):
            categories['Non-standard names'].add(city)
        elif ',' in city or any(char.isdigit() for char in city):
            categories['Typos/Variations'].add(city)
        else:
            categories['Other'].add(city)
    
    return categories

def suggest_improvements(unknown_countries, unknown_states, unknown_cities):
    """Suggest improvements based on unknown records"""
    
    suggestions = []
    
    # Country suggestions
    if unknown_countries:
        suggestions.append("🌍 Countries:")
        suggestions.append("  - Add common abbreviations (WA, UAE)")
        suggestions.append("  - Add region/territory mappings (Hong Kong, Maharashtra)")
        suggestions.append("  - Handle 'Non US' as a special case")
    
    # State suggestions
    if unknown_states:
        suggestions.append("🏛️  States:")
        suggestions.append("  - Add common abbreviations (BC, NC, SC, MN, OK, ND, TN)")
        suggestions.append("  - Handle postal codes mixed with states")
        suggestions.append("  - Add 'Non USA' as a special case")
    
    # City suggestions
    if unknown_cities:
        suggestions.append("🏙️  Cities:")
        suggestions.append("  - Add more international cities (Hong Kong, Lyngby)")
        suggestions.append("  - Handle city variations with commas")
        suggestions.append("  - Add major business districts")
    
    # General suggestions
    suggestions.append("🔧 General:")
    suggestions.append("  - Lower fuzzy matching thresholds (75% → 70%)")
    suggestions.append("  - Add more aliases to standardization data")
    suggestions.append("  - Handle special cases in preprocessing")
    
    for suggestion in suggestions:
        print(f"  {suggestion}")

if __name__ == "__main__":
    analyze_unknowns()

'use client';

import { useState, useEffect, useRef } from 'react';

interface TypeAheadInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  field: 'company' | 'country' | 'city' | 'state' | 'jobTitle' | 'department' | 'industry';
  className?: string;
  style?: React.CSSProperties;
}

export default function TypeAheadInput({ 
  value, 
  onChange, 
  placeholder, 
  field, 
  className = '', 
  style = {} 
}: TypeAheadInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Debounced function to fetch suggestions
  const fetchSuggestions = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          field,
          query,
          limit: 10
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
        if (data.suggestions && data.suggestions.length > 0) {
          setShowSuggestions(true);
        } else {
          setShowSuggestions(false);
        }
        setSelectedIndex(-1);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setLoading(false);
    }
  };

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new timeout for debounced search
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion: string) => {
    console.log('Suggestion clicked:', suggestion);
    console.log('Current value before change:', value);
    onChange(suggestion);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
    console.log('Suggestion selection completed');
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isClickOnInput = inputRef.current && inputRef.current.contains(target);
      const isClickOnDropdown = suggestionsRef.current && suggestionsRef.current.contains(target);
      
      console.log('Click outside check:', { isClickOnInput, isClickOnDropdown, target });
      
      if (!isClickOnInput && !isClickOnDropdown) {
        console.log('Closing suggestions due to click outside');
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    const handleScroll = () => {
      if (showSuggestions) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    const handleResize = () => {
      if (showSuggestions) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [showSuggestions]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  console.log('Dropdown state:', { showSuggestions, suggestionsLength: suggestions.length });

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        className={`input ${className}`}
        style={{
          ...style,
          borderColor: showSuggestions ? '#3b82f6' : undefined,
          boxShadow: showSuggestions ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : undefined
        }}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) {
            setShowSuggestions(true);
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
      />
      
      {loading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="spinner h-3 w-3"></div>
        </div>
      )}

      {/* Render dropdown directly - simpler approach */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50"
          style={{
            marginTop: '4px',
            backgroundColor: 'white',
            minWidth: '200px',
            zIndex: 999999,
            position: 'absolute'
          }}
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion}
              className={`px-4 py-3 cursor-pointer text-sm transition-colors duration-150 ${
                index === selectedIndex 
                  ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              style={{
                fontFamily: 'var(--font-primary)',
                fontSize: '12px',
                borderBottom: index < suggestions.length - 1 ? '1px solid #f3f4f6' : 'none'
              }}
              onClick={() => handleSuggestionClick(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="flex items-center">
                <i className="fas fa-search text-gray-400 mr-2" style={{ fontSize: '10px' }}></i>
                {suggestion}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

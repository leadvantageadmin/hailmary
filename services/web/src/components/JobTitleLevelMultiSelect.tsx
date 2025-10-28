'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface JobTitleLevelDefinition {
  level: number;
  jobTitleLevel: string;
  examples: string;
  description: string;
}

interface JobTitleLevelMultiSelectProps {
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function JobTitleLevelMultiSelect({
  value = [],
  onChange,
  placeholder = '',
  className = '',
  style = {}
}: JobTitleLevelMultiSelectProps) {
  const [inputValue, setInputValue] = useState('');
  const [allDefinitions, setAllDefinitions] = useState<JobTitleLevelDefinition[]>([]);
  const [suggestions, setSuggestions] = useState<JobTitleLevelDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load job title level definitions on component mount
  useEffect(() => {
    const loadDefinitions = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/job-title-levels', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setAllDefinitions(data.definitions);
        } else {
          console.error('Failed to load job title level definitions');
        }
      } catch (error) {
        console.error('Error loading job title level definitions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDefinitions();
  }, []);

  // Filter suggestions based on input - show all when empty, filter when typing
  // Always exclude already selected values from suggestions
  const filterSuggestions = useCallback((query: string) => {
    let filtered = allDefinitions
      .filter(def => !value.includes(def.jobTitleLevel)); // Always filter out already selected

    // If there's a query, filter by it
    if (query.trim().length > 0) {
      filtered = filtered.filter(def => 
        def.jobTitleLevel.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Show all available suggestions (up to 15)
    setSuggestions(filtered.slice(0, 15));
  }, [allDefinitions, value]);

  // Handle input change - show all suggestions immediately, filter as user types
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSelectedIndex(-1);

    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new debounce (very short delay for immediate filtering)
    debounceRef.current = setTimeout(() => {
      filterSuggestions(newValue);
    }, 50);

    // Always show suggestions when typing
    setShowSuggestions(true);
  };

  // Handle suggestion click (matching original behavior)
  const handleSuggestionClick = (suggestion: JobTitleLevelDefinition) => {
    if (!value.includes(suggestion.jobTitleLevel)) {
      const newValues = [...value, suggestion.jobTitleLevel];
      onChange(newValues);
      
      // Clear input immediately
      setInputValue('');
      setSelectedIndex(-1);
      
      // Refresh suggestions immediately to remove the selected item
      filterSuggestions('');
      setShowSuggestions(true);
      
      inputRef.current?.focus();
    } else {
      setInputValue('');
      setShowSuggestions(false);
      setSelectedIndex(-1);
      inputRef.current?.focus();
    }
  };

  // Handle remove tag (matching original behavior)
  const handleRemoveTag = (tagToRemove: string) => {
    const newValues = value.filter(tag => tag !== tagToRemove);
    onChange(newValues);
    inputRef.current?.focus();
    
    // Refresh suggestions to show the removed item again
    setTimeout(() => {
      filterSuggestions(inputValue);
      if (showSuggestions) {
        setShowSuggestions(true);
      }
    }, 100);
  };

  // Handle keyboard navigation (matching original behavior)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle backspace to remove last selected item (works regardless of suggestions state)
    if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      e.preventDefault();
      // Remove last tag on backspace when input is empty
      const newValues = value.slice(0, -1);
      onChange(newValues);
      
      // Refresh suggestions to show the removed item again
      setTimeout(() => {
        filterSuggestions(inputValue);
        if (showSuggestions) {
          setShowSuggestions(true);
        }
      }, 100);
      return;
    }

    if (!showSuggestions || suggestions.length === 0) {
      return;
    }

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
        inputRef.current?.blur();
        break;
    }
  };

  // Handle click outside (matching original behavior)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Cleanup debounce on unmount (matching original behavior)
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="position-relative w-100">
      {/* Multi-select container - EXACT same styling as original */}
      <div 
        className={`${className} d-flex flex-wrap align-items-center form-control`}
        style={{ 
          ...style, 
          minHeight: '48px',
          maxHeight: '120px',
          padding: '8px 12px',
          border: '1px solid #dee2e6',
          borderRadius: '24px',
          backgroundColor: '#ffffff',
          cursor: 'text',
          overflowY: 'auto',
          overflowX: 'hidden',
          transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out'
        }}
        onClick={() => {
          inputRef.current?.focus();
          // Show all suggestions when clicking on input
          if (allDefinitions.length > 0) {
            filterSuggestions(inputValue);
            setShowSuggestions(true);
          }
        }}
        onFocus={() => {
          // Add focus styling
          const container = document.querySelector(`.${className}`) as HTMLElement;
          if (container) {
            container.style.borderColor = '#0d6efd';
            container.style.boxShadow = '0 0 0 0.2rem rgba(13, 110, 253, 0.25)';
          }
          // Show all suggestions when focusing on input
          if (allDefinitions.length > 0) {
            filterSuggestions(inputValue);
            setShowSuggestions(true);
          }
        }}
        onBlur={() => {
          // Remove focus styling
          const container = document.querySelector(`.${className}`) as HTMLElement;
          if (container) {
            container.style.borderColor = '#dee2e6';
            container.style.boxShadow = 'none';
          }
        }}
      >
        {/* Selected tags - EXACT same styling as original */}
        {value.map((tag, index) => (
          <div
            key={index}
            className="badge text-white me-2 mb-1 d-flex align-items-center flex-shrink-0"
            style={{
              fontSize: '12px',
              padding: '6px 8px 6px 10px',
              borderRadius: '16px',
              backgroundColor: '#000000',
              border: 'none',
              maxWidth: '240px',
              minWidth: '60px'
            }}
          >
            <span 
              className="me-2 flex-grow-1"
              style={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minWidth: '0',
                fontWeight: 'normal'
              }}
            >
              {tag}
            </span>
            <button
              type="button"
              className="btn-close btn-close-white flex-shrink-0"
              style={{
                width: '16px',
                height: '16px',
                fontSize: '10px'
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveTag(tag);
              }}
              aria-label={`Remove ${tag}`}
            >
            </button>
          </div>
        ))}
        
        {/* Input field - EXACT same styling as original */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          autoComplete="off"
          className="border-0 bg-transparent flex-grow-1"
          style={{
            outline: 'none',
            minWidth: '120px',
            fontSize: '11px',
            maxWidth: '100%',
            color: '#495057',
            paddingLeft: '0',
            paddingRight: '0'
          }}
        />
        
        {/* Loading spinner - EXACT same styling as original */}
        {loading && (
          <div className="position-absolute top-50 end-0 translate-middle-y me-3">
            <div className="spinner-border spinner-border-sm text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Bootstrap Dropdown - EXACT same styling as original */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="dropdown-menu show shadow-lg border-0"
          style={{
            position: 'relative',
            top: '100%',
            left: '0',
            right: '0',
            zIndex: 1050,
            maxHeight: '200px',
            overflowY: 'auto',
            marginTop: '6px',
            width: '100%',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1), 0 4px 20px rgba(0, 0, 0, 0.05)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            padding: '8px 0'
          }}
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.jobTitleLevel}
              type="button"
              className={`dropdown-item d-flex align-items-center position-relative ${
                index === selectedIndex ? 'active' : ''
              }`}
              onClick={() => handleSuggestionClick(suggestion)}
              onMouseEnter={(e) => {
                setSelectedIndex(index);
                e.currentTarget.style.backgroundColor = '#0d6efd';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                if (index !== selectedIndex) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#495057';
                }
              }}
              style={{
                fontSize: '11px',
                padding: '12px 20px',
                border: 'none',
                background: index === selectedIndex ? '#0d6efd' : 'transparent',
                width: '100%',
                textAlign: 'left',
                borderRadius: '0',
                transition: 'all 0.2s ease',
                color: index === selectedIndex ? '#ffffff' : '#495057',
                fontWeight: index === selectedIndex ? '500' : '400'
              }}
            >
              <div className="d-flex align-items-center w-100">
                <div 
                  className="rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0"
                  style={{
                    width: '24px',
                    height: '24px',
                    backgroundColor: index === selectedIndex ? '#ffffff' : '#f8f9fa',
                    color: index === selectedIndex ? '#0d6efd' : '#6c757d',
                    fontSize: '10px',
                    fontWeight: '600'
                  }}
                >
                  {suggestion.level}
                </div>
                <div className="flex-grow-1">
                  <div 
                    className="fw-medium"
                    style={{
                      fontSize: '12px',
                      lineHeight: '1.2',
                      marginBottom: '2px'
                    }}
                  >
                    {suggestion.jobTitleLevel}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

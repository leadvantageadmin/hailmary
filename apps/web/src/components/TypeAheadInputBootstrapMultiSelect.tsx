'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface TypeAheadInputBootstrapMultiSelectProps {
  value: string[];
  onChange: (values: string[]) => void;
  field: string;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function TypeAheadInputBootstrapMultiSelect({
  value = [],
  onChange,
  field,
  placeholder = '',
  className = '',
  style = {}
}: TypeAheadInputBootstrapMultiSelectProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search function
  const searchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
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
        // Filter out already selected options
        const filteredSuggestions = data.suggestions.filter((suggestion: string) => 
          !value.includes(suggestion)
        );
        setSuggestions(filteredSuggestions);
      } else {
        console.error('Error fetching suggestions:', response.statusText);
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [field, value]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSelectedIndex(-1);

    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new debounce
    debounceRef.current = setTimeout(() => {
      searchSuggestions(newValue);
    }, 300);

    // Show suggestions if there are any
    if (newValue.length >= 2) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    if (!value.includes(suggestion)) {
      const newValues = [...value, suggestion];
      onChange(newValues);
    }
    setInputValue('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Handle remove tag
  const handleRemoveTag = (tagToRemove: string) => {
    const newValues = value.filter(tag => tag !== tagToRemove);
    onChange(newValues);
    inputRef.current?.focus();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
        // Remove last tag on backspace when input is empty
        const newValues = value.slice(0, -1);
        onChange(newValues);
      }
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

  // Handle click outside
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

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="position-relative w-100">
      {/* Multi-select container */}
      <div 
        className={`${className} d-flex flex-wrap align-items-center`}
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
          overflowX: 'hidden'
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Selected tags */}
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
              className="flex-shrink-0"
              style={{
                width: '16px',
                height: '16px',
                padding: '0',
                margin: '0',
                border: 'none',
                background: '#ffffff',
                borderRadius: '50%',
                cursor: 'pointer',
                flexShrink: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                color: '#000000',
                fontWeight: 'bold'
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveTag(tag);
              }}
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </div>
        ))}
        
        {/* Input field */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          autoComplete="off"
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            flex: 1,
            minWidth: '120px',
            fontSize: '14px',
            maxWidth: '100%'
          }}
        />
        
        {/* Loading spinner */}
        {loading && (
          <div className="position-absolute top-50 end-0 translate-middle-y me-3">
            <div className="spinner-border spinner-border-sm text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Bootstrap Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="dropdown-menu show shadow-lg border-0"
          style={{
            position: 'absolute',
            top: '100%',
            left: '0',
            right: '0',
            zIndex: 1050,
            maxHeight: '320px',
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
              key={suggestion}
              type="button"
              className={`dropdown-item d-flex align-items-center position-relative ${
                index === selectedIndex ? 'active' : ''
              }`}
              onClick={() => handleSuggestionClick(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
              style={{
                fontSize: '14px',
                padding: '12px 20px',
                border: 'none',
                background: 'transparent',
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
                  className="rounded-circle d-flex align-items-center justify-content-center me-3"
                  style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: index === selectedIndex ? 'rgba(255, 255, 255, 0.2)' : '#f8f9fa',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <i 
                    className={`fas fa-search ${index === selectedIndex ? 'text-white' : 'text-muted'}`} 
                    style={{ fontSize: '12px' }}
                  ></i>
                </div>
                <div className="flex-grow-1">
                  <div 
                    className="fw-medium"
                    style={{ 
                      fontSize: '14px',
                      lineHeight: '1.4'
                    }}
                  >
                    {suggestion}
                  </div>
                </div>
                {index === selectedIndex && (
                  <div className="ms-2">
                    <i className="fas fa-check text-white" style={{ fontSize: '12px' }}></i>
                  </div>
                )}
              </div>
            </button>
          ))}
          
          {/* Dropdown Footer */}
          <div 
            className="border-top mt-2 pt-2 px-3"
            style={{ 
              borderColor: 'rgba(0, 0, 0, 0.08) !important',
              backgroundColor: '#f8f9fa'
            }}
          >
            <small className="text-muted d-flex align-items-center">
              <i className="fas fa-keyboard me-2" style={{ fontSize: '10px' }}></i>
              Use ↑↓ to navigate, Enter to select, Esc to close
            </small>
          </div>
        </div>
      )}
    </div>
  );
}
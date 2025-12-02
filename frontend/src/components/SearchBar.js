import { useState, useEffect, useRef } from 'react';
import useMenuSearch from '../hooks/useMenuSearch';
import SearchSuggestions from './SearchSuggestions';

function SearchBar() {
    const [searchTerm, setSearchTerm] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const searchContainerRef = useRef(null);
    const { searchMenuItems, loading } = useMenuSearch();

    // Debounce search input to avoid too many searches
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);

        return () => {
            clearTimeout(timer);
        };
    }, [searchTerm]);

    // Handle clicks outside search container to close suggestions
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Get search results based on debounced search term
    const searchResults = searchMenuItems(debouncedSearchTerm);

    // Handle input change
    const handleInputChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        if (value.length >= 2) {
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    };

    // Handle input focus
    const handleInputFocus = () => {
        if (searchTerm.length >= 2) {
            setShowSuggestions(true);
        }
    };

    // Handle suggestion selection
    const handleSuggestionSelect = () => {
        setShowSuggestions(false);
        setSearchTerm('');
        setDebouncedSearchTerm('');
    };

    return (
        <div className="search-container" ref={searchContainerRef}>
            <input
                type="text"
                placeholder="Search menu items..."
                value={searchTerm}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                className="search-input"
                style={{ fontFamily: 'monospace' }}
            />
            {showSuggestions && (
                <SearchSuggestions
                    suggestions={searchResults}
                    searchTerm={debouncedSearchTerm}
                    onSelect={handleSuggestionSelect}
                    isVisible={showSuggestions}
                />
            )}
        </div>
    );
}

export default SearchBar;
import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/SearchSuggestions.css';

// Search suggestions dropdown component
const SearchSuggestions = ({ suggestions, searchTerm, onSelect, isVisible }) => {
  const navigate = useNavigate();

  if (!isVisible || !suggestions || suggestions.length === 0) {
    return null;
  }

  // Handle suggestion click - navigate to dining hall menu
  const handleSuggestionClick = (suggestion) => {
    onSelect();
    const encodedHallName = encodeURIComponent(suggestion.diningHall);
    navigate(`/menu/${encodedHallName}`);
  };

  // Word boundary highlighting - only highlight matching whole words
  const highlightMatch = (text, searchTerm) => {
    if (!searchTerm) return text;
    
    const searchLower = searchTerm.toLowerCase();
    const words = text.split(/([\s\-\(\)\/]+)/); // Split while keeping delimiters
    
    return words.map((word, index) => {
      // Check if this word matches the search term (case-insensitive)
      const wordLower = word.toLowerCase();
      const isMatch = wordLower === searchLower || wordLower.startsWith(searchLower);
      
      return isMatch ? (
        <span key={index} className="highlight-text">
          {word}
        </span>
      ) : (
        word
      );
    });
  };

  return (
    <div className="search-suggestions-container">
      <div className="search-suggestions-header">
        {suggestions.length} result{suggestions.length !== 1 ? 's' : ''} found
      </div>
      <div className="search-suggestions-list">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="search-suggestion-item"
            onClick={() => handleSuggestionClick(suggestion)}
          >
            <div className="suggestion-item-name">
              {highlightMatch(suggestion.itemName, searchTerm)}
            </div>
            <div className="suggestion-item-details">
              <span className="suggestion-dining-hall">{suggestion.diningHall}</span>
              <span className="suggestion-meal-type">{suggestion.mealType}</span>
              {suggestion.category && suggestion.category !== '-' && (
                <span className="suggestion-category">{suggestion.category}</span>
              )}
            </div>
            {suggestion.dietaryRestrictions && suggestion.dietaryRestrictions.length > 0 && (
              <div className="suggestion-dietary-tags">
                {suggestion.dietaryRestrictions.map((tag, index) => (
                  <span key={index} className="dietary-tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchSuggestions;
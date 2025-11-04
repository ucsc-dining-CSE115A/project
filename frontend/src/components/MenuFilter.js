import React from 'react';
// Updated import path: moved CSS file from components to styles folder for better organization
import '../styles/MenuFilter.css';

// Complete list of dietary restriction filters
const DIETARY_FILTERS = [
  'VG',        // Vegan
  'V',         // Vegetarian
  'GF',        // Gluten-Free
  'EGG',       // Contains Eggs
  'SOY',       // Contains Soy
  'DAIRY',     // Contains Dairy
  'WHEAT',     // Contains Wheat
  'ALC',       // Contains Alcohol
  'PORK',      // Contains Pork
  'SHELLFISH', // Contains Shellfish
  'SESAME',    // Contains Sesame
  'BEEF',      // Contains Beef
  'FISH',      // Contains Fish
  'HALAL',     // Halal
  'PEANUT',    // Contains Peanuts
  'TREENUT'    // Contains Tree Nuts
];

// MenuFilter component for filtering menu items by dietary restrictions
function MenuFilter({ selectedFilters, onFilterChange }) {
  
  // Handle individual filter toggle
  const handleFilterToggle = (filter) => {
    const updatedFilters = selectedFilters.includes(filter)
      ? selectedFilters.filter(f => f !== filter) // Remove if already selected
      : [...selectedFilters, filter]; // Add if not selected
    
    onFilterChange(updatedFilters);
  };

  // Clear all selected filters
  const clearAllFilters = () => {
    onFilterChange([]);
  };

  return (
    <div className="menu-filter">
      <div className="filter-header">
        <h3>Filter by Dietary Restrictions</h3>
        {selectedFilters.length > 0 && (
          <button 
            className="clear-filters-btn" 
            onClick={clearAllFilters}
            aria-label="Clear all filters"
          >
            Clear All ({selectedFilters.length})
          </button>
        )}
      </div>
      
      <div className="filter-options">
        {DIETARY_FILTERS.map((filter) => (
          <label 
            key={filter} 
            className={`filter-checkbox ${selectedFilters.includes(filter) ? 'selected' : ''}`}
            title={`Filter by ${filter}`}
          >
            <input
              type="checkbox"
              checked={selectedFilters.includes(filter)}
              onChange={() => handleFilterToggle(filter)}
              aria-label={`Filter by ${filter}`}
            />
            <span className="filter-label">{filter}</span>
          </label>
        ))}
      </div>
      
      {/* Show active filters count */}
      {selectedFilters.length > 0 && (
        <div className="active-filters-info">
          {selectedFilters.length} filter{selectedFilters.length !== 1 ? 's' : ''} active
        </div>
      )}
    </div>
  );
}

export default MenuFilter;
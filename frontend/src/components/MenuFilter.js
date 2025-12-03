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

// Map dietary codes to user-friendly labels
const FILTER_LABELS = {
  VG: "Vegan",
  V: "Vegetarian",
  GF: "Gluten-Free",
  EGG: "Egg",
  SOY: "Soy",
  DAIRY: "Dairy",
  WHEAT: "Wheat",
  ALC: "Alcohol",
  PORK: "Pork",
  SHELLFISH: "Shellfish",
  SESAME: "Sesame",
  BEEF: "Beef",
  FISH: "Fish",
  HALAL: "Halal",
  PEANUT: "Peanut",
  TREENUT: "Tree Nut"
};

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
        {/* Simplify header to keep module narrow */}
        <h3>Filter</h3>
        {/* Place Clear button below title for vertical header layout */}
        {/* Disable when no filters are selected; show count when active */}
        <button
          className="clear-filters-btn"
          onClick={clearAllFilters}
          aria-label="Clear all filters"
          disabled={selectedFilters.length === 0}
          title={selectedFilters.length === 0 ? 'No filters selected' : 'Clear all selected filters'}
        >
          {selectedFilters.length > 0 ? `Clear All (${selectedFilters.length})` : 'Clear All'}
        </button>
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
            <span className="filter-label">{FILTER_LABELS[filter] || filter}</span>
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
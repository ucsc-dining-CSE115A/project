import React from 'react';

function MenuFilter({ selectedFilters, onFilterChange }) {
  const dietaryOptions = [
    'V',
    'VG',
    'SOY',
    'Dairy-Free',
    'Nut-Free',
    'Halal',
    'Kosher'
  ];

  const handleCheckboxChange = (option) => {
    if (selectedFilters.includes(option)) {
      // Remove filter
      onFilterChange(selectedFilters.filter(f => f !== option));
    } else {
      // Add filter
      onFilterChange([...selectedFilters, option]);
    }
  };

  const clearAllFilters = () => {
    onFilterChange([]);
  };

  return (
    <div className="menu-filter">
      <h3>Filter by Dietary Restrictions</h3>
      <div className="filter-options">
        {dietaryOptions.map((option) => (
          <label key={option} className="filter-checkbox">
            <input
              type="checkbox"
              checked={selectedFilters.includes(option)}
              onChange={() => handleCheckboxChange(option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
      {selectedFilters.length > 0 && (
        <button onClick={clearAllFilters} className="clear-filters-btn">
          Clear All Filters
        </button>
      )}
    </div>
  );
}

export default MenuFilter;
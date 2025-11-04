import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import MenuCard from '../components/MenuCard';
import MenuFilter from '../components/MenuFilter';

function MenuDetail() {
  const { diningHallName } = useParams();
  const [menuData, setMenuData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFilters, setSelectedFilters] = useState([]); // State for selected allergen filters

  const decodedName = decodeURIComponent(diningHallName);

  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://ucsc-dining-cse115a.github.io/project/menu_data.json');
        if (!response.ok) {
          throw new Error('Failed to fetch menu data');
        }
        const data = await response.json();
        setMenuData(data.halls || data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuData();
  }, []);

  const organizeMenuByMealType = (menuData) => {
    if (menuData && typeof menuData === 'object' && !Array.isArray(menuData)) {
      return menuData;
    }
    
    const standardMealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Late Night'];
    const organizedMenu = {};

    const isMealType = (item) => {
      return standardMealTypes.includes(item) || item.startsWith('Late Night @');
    };

    let currentMealType = null;
    menuData.forEach(item => {
      if (isMealType(item)) {
        currentMealType = item;
        organizedMenu[currentMealType] = [];
      } else if (currentMealType) {
        organizedMenu[currentMealType].push(item);
      }
    });

    return organizedMenu;
  };

  // Filter items based on selected allergen filters
  // Only show items that contain ALL selected allergen tags
  // Fixed: Use exact matching to prevent V/VG confusion
  const filterItems = (items) => {
    if (selectedFilters.length === 0) {
      return items; // No filters selected, show all items
    }

    return items.filter(item => {
      // Handle both string and object formats
      const dietaryRestrictions = typeof item === 'object' ? item.dietary_restrictions : null;
      
      if (!dietaryRestrictions) {
        return false; // No dietary info, don't show when filtering
      }

      // Convert dietary restrictions to array for exact matching
      // This prevents V/VG confusion by using exact tag matching instead of string includes
      let restrictionsArray = [];
      if (Array.isArray(dietaryRestrictions)) {
        restrictionsArray = dietaryRestrictions;
      } else if (typeof dietaryRestrictions === 'string') {
        // Split by common separators and clean up whitespace
        restrictionsArray = dietaryRestrictions
          .split(/[,\s]+/)
          .map(tag => tag.trim().toUpperCase())
          .filter(tag => tag.length > 0);
      }

      // Check if item contains ALL selected filters using exact matching
      // This ensures V and VG are treated as separate, distinct tags
      return selectedFilters.every(filter => 
        restrictionsArray.includes(filter.toUpperCase())
      );
    });
  };

  if (loading) {
    return (
      <div className="menu-detail-container">
        <div className="loading">Loading menu...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="menu-detail-container">
        <div className="error">Error: {error}</div>
        <Link to="/" className="back-button">Back to Dining Halls</Link>
      </div>
    );
  }

  const diningHallMenu = menuData[decodedName];
  if (!diningHallMenu) {
    return (
      <div className="menu-detail-container">
        <div className="error">Menu not found for {decodedName}</div>
        <Link to="/" className="back-button">Back to Dining Halls</Link>
      </div>
    );
  }

  const organizedMenu = organizeMenuByMealType(diningHallMenu);

  return (
    <div className="menu-detail-container">
      <Link to="/" className="back-button">← Back to Dining Halls</Link>
      <h1>{decodedName}</h1>
      
      {/* Main content with filter on left and menu on right */}
      <div className="menu-detail-content">
        {/* Filter component on the left */}
        <MenuFilter 
          selectedFilters={selectedFilters}
          onFilterChange={setSelectedFilters}
        />

        {/* Menu content on the right */}
        <div className="menu-content">
          {Object.entries(organizedMenu).map(([mealType, items]) => {
            const filteredItems = filterItems(items);
            
            // Don't show meal section if no items pass the filter
            if (filteredItems.length === 0) {
              return null;
            }

            return (
              <div key={mealType} className="menu-section">
                <h2>{mealType}</h2>
                <div className="menu-cards-grid">
                  {filteredItems.map((item, index) => {
                    const itemName = typeof item === 'string' ? item : item.name;
                    const dietaryRestrictions = typeof item === 'object' ? item.dietary_restrictions : null;
                    const price = typeof item === 'object' ? item.price : null;
                    
                    return (
                      <MenuCard 
                        key={index} 
                        itemName={itemName}
                        dietaryRestrictions={dietaryRestrictions}
                        price={price}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Show message if no items match filters */}
          {selectedFilters.length > 0 && 
           Object.values(organizedMenu).every(items => filterItems(items).length === 0) && (
            <div className="no-results">
              No items match the selected filters. Try adjusting your selections.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MenuDetail;
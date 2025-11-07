import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import MenuCard from '../components/MenuCard';
import MenuFilter from '../components/MenuFilter';
import TodayHours from '../components/TodayHours';

function MenuDetail() {
  const { diningHallName } = useParams();
  const [menuData, setMenuData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFilters, setSelectedFilters] = useState([]);

  const decodedName = decodeURIComponent(diningHallName);
  
  // Alias mapping to handle variations in data source keys (e.g., Crown/Merrill)
  // This maps route keys to actual keys present in menu_data.json when names differ
  const aliasMap = {
    "Crown & Merrill Dining Hall": "Crown & Merrill Dining Hall and Banana Joe's", // Map old key to current data key
  };

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

  const filterItems = (items) => {
    if (selectedFilters.length === 0) {
      return items;
    }
    return items.filter(item => {
      const dietaryRestrictions = typeof item === 'object' ? item.dietary_restrictions : null;
      if (!dietaryRestrictions) {
        return false;
      }
      let restrictionsArray = [];
      if (Array.isArray(dietaryRestrictions)) {
        restrictionsArray = dietaryRestrictions;
      } else if (typeof dietaryRestrictions === 'string') {
        restrictionsArray = dietaryRestrictions
          .split(/[\,\s]+/)
          .map(tag => tag.trim().toUpperCase())
          .filter(tag => tag.length > 0);
      }
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

  // Resolve source key using alias map when direct key not found
  const sourceKey = menuData[decodedName] ? decodedName : (aliasMap[decodedName] || decodedName); // Pick actual key if name changed
  const diningHallMenu = menuData[sourceKey];
  if (!diningHallMenu) {
    return (
      <div className="menu-detail-container">
        <div className="error">Menu not found for {decodedName}</div>
        <Link to="/" className="back-button">Back to Dining Halls</Link>
      </div>
    );
  }

  const organizedMenu = organizeMenuByMealType(diningHallMenu);

  // Determine if no items match filters across all meal types and subcategories
  const noResults = selectedFilters.length > 0 && Object.values(organizedMenu).every((value) => {
    if (Array.isArray(value)) {
      return filterItems(value).length === 0;
    }
    if (value && typeof value === 'object') {
      return Object.values(value).every((items) => filterItems(items).length === 0);
    }
    return true;
  });

  return (
    <div className="menu-detail-container">
      <Link to="/" className="back-button">← Back to Dining Halls</Link>
      <h1>{decodedName}</h1>
      <div className="menu-detail-content">
        <MenuFilter 
          selectedFilters={selectedFilters}
          onFilterChange={setSelectedFilters}
        />
        <div className="menu-main-content">
          <div className="menu-content">
          {Object.entries(organizedMenu).map(([mealType, value]) => {
            const isSubcategoryObject = value && typeof value === 'object' && !Array.isArray(value);

            if (!isSubcategoryObject) {
              const filteredItems = filterItems(Array.isArray(value) ? value : []);
              if (filteredItems.length === 0) return null;
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
            }

            const subcategories = Object.entries(value);
            const anySubHasItems = subcategories.some(([sub, items]) => filterItems(items).length > 0);
            if (!anySubHasItems) return null;

            return (
              <div key={mealType} className="menu-section">
                <h2>{mealType}</h2>
                {subcategories.map(([subCategory, items]) => {
                  const filteredSubItems = filterItems(items);
                  if (filteredSubItems.length === 0) return null;
                  return (
                    <div key={subCategory}>
                      <h3 style={{ color: '#003C6C', margin: '8px 0' }}>{subCategory}</h3>
                      <div className="menu-cards-grid">
                        {filteredSubItems.map((item, index) => {
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
              </div>
            );
          })}

          {noResults && (
            <div className="no-results">
              No items match the selected filters. Try adjusting your selections.
            </div>
          )}
          </div>
          <TodayHours diningHallName={decodedName} />
        </div>
      </div>
    </div>
  );
}

export default MenuDetail;
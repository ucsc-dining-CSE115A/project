import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

function MenuDetail() {
  const { diningHallName } = useParams();
  const [menuData, setMenuData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        setMenuData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuData();
  }, []);

  const organizeMenuByMealType = (menuItems) => {
    const standardMealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Late Night'];
    const organizedMenu = {};

    // Helper function to check if an item is a meal type
    // Recognizes standard meal types and "Late Night @" patterns
    const isMealType = (item) => {
      return standardMealTypes.includes(item) || item.startsWith('Late Night @');
    };

    let currentMealType = null;
    menuItems.forEach(item => {
      if (isMealType(item)) {
        // This item is a meal type (either standard or "Late Night @" pattern)
        currentMealType = item;
        organizedMenu[currentMealType] = [];
      } else if (currentMealType) {
        // This item is a food item under the current meal type
        organizedMenu[currentMealType].push(item);
      }
    });

    return organizedMenu;
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
        <Link to="/dining-halls" className="back-button">Back to Dining Halls</Link>
      </div>
    );
  }

  const diningHallMenu = menuData[decodedName];
  if (!diningHallMenu) {
    return (
      <div className="menu-detail-container">
        <div className="error">Menu not found for {decodedName}</div>
        <Link to="/dining-halls" className="back-button">Back to Dining Halls</Link>
      </div>
    );
  }

  const organizedMenu = organizeMenuByMealType(diningHallMenu);

  return (
    <div className="menu-detail-container">
      <Link to="/dining-halls" className="back-button">← Back to Dining Halls</Link>
      <h1>{decodedName}</h1>
      <div className="menu-content">
        {Object.entries(organizedMenu).map(([mealType, items]) => (
          <div key={mealType} className="menu-section">
            <h2>{mealType}</h2>
            <div className="menu-items">
              {items.map((item, index) => (
                <div key={index} className="menu-item">
                  {item}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MenuDetail;
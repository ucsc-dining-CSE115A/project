import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import '../styles/menu.css';
import '../styles/Favorite.css';

function Favorite() {
  const [favorites, setFavorites] = useState([]);
  const [menuData, setMenuData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedFavorites = localStorage.getItem("favorites");
    setFavorites(storedFavorites ? JSON.parse(storedFavorites) : []);

    // Fetch current menu data to check availability
    const fetchMenuData = async () => {
      try {
        const response = await fetch('https://ucsc-dining-cse115a.github.io/project/menu_data.json');
        if (response.ok) {
          const data = await response.json();
          setMenuData(data.halls || data);
        }
      } catch (err) {
        console.error('Failed to fetch menu data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuData();
  }, []);

  const checkAvailability = (favorite) => {
    if (!menuData || !favorite.diningHall) return null;

    const hallData = menuData[favorite.diningHall];
    if (!hallData) return null;

    // Check each meal type for the item
    for (const [mealType, value] of Object.entries(hallData)) {
      // Case 1: items is a flat array
      if (Array.isArray(value)) {
        const found = value.find(item => {
          const itemName = typeof item === 'string' ? item : item.name;
          return itemName === favorite.itemName;
        });
        if (found) {
          return { mealType, diningHall: favorite.diningHall, available: true };
        }
      } 
      // Case 2: items has subcategories (nested object)
      else if (typeof value === 'object' && value !== null) {
        for (const [subCategory, items] of Object.entries(value)) {
          if (Array.isArray(items)) {
            const found = items.find(item => {
              const itemName = typeof item === 'string' ? item : item.name;
              return itemName === favorite.itemName;
            });
            if (found) {
              return { mealType, diningHall: favorite.diningHall, available: true };
            }
          }
        }
      }
    }

    return { available: false };
  };

  const removeFavorite = (itemName) => {
    const updated = favorites.filter((fav) => fav.itemName !== itemName);
    setFavorites(updated);
    localStorage.setItem("favorites", JSON.stringify(updated));
  };

  if (loading) {
    return (
      <div className="menu-detail-container">
        <div className="loading">Loading favorites...</div>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="menu-detail-container">
        <h1>Your Favorites</h1>
        <div className="empty-favorites">
          <p>No favorites saved yet!</p>
          <p>Click the heart icon on any menu item to add it to your favorites.</p>
          <Link to="/" className="browse-link">Browse Dining Halls</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="menu-detail-container">
      <h1>Your Favorites</h1>

      <div className="favorites-grid">
        {favorites.map((favorite, index) => {
          const availability = checkAvailability(favorite);
          const isAvailable = availability?.available;

          return (
            <div key={index} className={`favorite-card ${!isAvailable ? 'unavailable' : ''}`}>
              <button
                className="remove-favorite"
                onClick={() => removeFavorite(favorite.itemName)}
                aria-label="Remove from favorites"
              >
                ×
              </button>
              
              <h3 className="favorite-item-name">{favorite.itemName}</h3>
              
              {favorite.dietaryRestrictions && favorite.dietaryRestrictions.length > 0 && (
                <p className="favorite-dietary">
                  {favorite.dietaryRestrictions.join(', ')}
                </p>
              )}
              
              {favorite.price && (
                <p className="favorite-price">{favorite.price}</p>
              )}

              {isAvailable ? (
                <div className="favorite-availability available">
                  <span className="availability-label">Available Now</span>
                  <p className="availability-details">
                    <strong>{availability.diningHall}</strong>
                    <br />
                    {availability.mealType}
                  </p>
                </div>
              ) : (
                <div className="favorite-availability unavailable">
                  <span className="availability-label">Not Served Today</span>
                  <p className="availability-details grayed-out">
                    Check back another day
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Favorite;

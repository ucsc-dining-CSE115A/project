import React, { useState, useEffect } from 'react';
import Rating from './Rating';
import MacroModal from './MacroModal';
import '../styles/MenuCard.css';

// Map dietary restriction codes to more readable labels
const filterLabelMap = {
  VG: "Vegan",
  V: "Vegetarian",
  GF: "Gluten-Free",
  EGG: "Egg",
  SOY: "Soy",
  DAIRY: "Milk",
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

const MenuCard = ({ itemName, dietaryRestrictions, price, diningHall, averageRating, isSelected, onToggleSelect, mealType }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Check if item is in favorites
  useEffect(() => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    setIsFavorite(favorites.some(fav => fav.itemName === itemName));
  }, [itemName]);

  const toggleFavorite = (e) => {
    e.stopPropagation();
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    
    if (isFavorite) {
      // Remove from favorites
      const updated = favorites.filter(fav => fav.itemName !== itemName);
      localStorage.setItem('favorites', JSON.stringify(updated));
      setIsFavorite(false);
    } else {
      // Add to favorites
      const newFavorite = {
        itemName,
        dietaryRestrictions,
        price,
        diningHall,
        averageRating,
        mealType,
        savedAt: new Date().toISOString()
      };
      favorites.push(newFavorite);
      localStorage.setItem('favorites', JSON.stringify(favorites));
      setIsFavorite(true);
    }
  };

  // Add background blur
  useEffect(() => {
    if (showPopup) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    
    // Cleanup function
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showPopup]);

  return (
    <>
      <div className="menu-card">
        <button
          className={`favorite-heart ${isFavorite ? 'favorited' : ''}`}
          onClick={toggleFavorite}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          {isFavorite ? '❤️' : '🤍'}
        </button>
        <div className="menu-card-checkbox">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(itemName)}
            className="menu-card-checkbox-input"
          />
        </div>
        <div className="menu-card-text">
          {/* Display the menu item name */}
          <button onClick={() => setShowPopup(true)} className="menu-card-title-button">
            <p className="menu-card-title">{itemName}</p>
          </button>
          
          {/* Display price if available */}
          {price && <p className="menu-card-price">{price}</p>}

          {/* Display dietary restrictions at bottom, just above ratings */}
          {dietaryRestrictions && dietaryRestrictions.length > 0 && (
            <p className="menu-card-body">
              {dietaryRestrictions
                .map((r) => filterLabelMap[r] || r)  // convert to readable label
                .join(', ')
              }
            </p>
          )}

          {/* Display average rating only if it's greater than 0 */}
          {averageRating > 0 && <p className="menu-card-rating">Average Rating: {averageRating}</p>}
          
          {/* Rating component - manages its own state internally */}
          <Rating itemName={itemName} diningHall={diningHall} />
        </div>
      </div>

      {/* Popup */}
      {showPopup && (
        <div className="popup-overlay" onClick={() => setShowPopup(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <button className="popup-close" onClick={() => setShowPopup(false)}>
              ×
            </button>
            <MacroModal itemName={itemName} macroData={{}} onClose={() => setShowPopup(false)} />
          </div>
        </div>
      )}
    </>
  );
};

export default MenuCard;
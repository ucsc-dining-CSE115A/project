import React, { useState, useEffect } from 'react';
import Rating from './Rating';
import MacroModal from './MacroModal';
import '../styles/MenuCard.css';

const MenuCard = ({ itemName, dietaryRestrictions, price, diningHall, averageRating, isSelected, onToggleSelect }) => {
  const [showPopup, setShowPopup] = useState(false);

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
              {dietaryRestrictions.join(', ')}
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
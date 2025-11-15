import React, { useState } from 'react';
import Rating from './Rating';
import MacroModal from './MacroModal';
import '../styles/MenuCard.css';

const MenuCard = ({ itemName, dietaryRestrictions, price, diningHall, averageRating }) => {
  const [showPopup, setShowPopup] = useState(false);

  return (
    <>
      <div className="menu-card">
        <div className="menu-card-text">
          {/* Display the menu item name */}
          <button onClick={() => setShowPopup(true)} className="menu-card-title-button">
            <p className="menu-card-title">{itemName}</p>
          </button>
          {/* Display dietary restrictions if available */}
          <p className="menu-card-body">
            {dietaryRestrictions && dietaryRestrictions.length > 0 
              ? dietaryRestrictions.join(', ') 
              : 'XXX'
            }
          </p>
          
          {/* Display price if available */}
          {price && <p className="menu-card-price">{price}</p>}

          {<p className="menu-card-rating">Average Rating: {averageRating}</p>}
          
          {/* Rating component - manages its own state internally */}
          <Rating itemName={itemName} diningHall={diningHall} />
        </div>
      </div>

      {/* Popup */}
      {showPopup && (
        <div className="popup-overlay" onClick={() => setShowPopup(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <button className="popup-close" onClick={() => setShowPopup(false)}>
                &times;
            </button>
            {/* Blank popup content - add your content here later */}
            <MacroModal itemName={itemName} macroData={{}} />
          </div>
        </div>
      )}
    </>
  );
};

export default MenuCard;
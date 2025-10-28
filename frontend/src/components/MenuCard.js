import React from 'react';
import './MenuCard.css';

// MenuCard component for displaying individual menu items in card format
// Updated to support new data format with dietary restrictions and price
const MenuCard = ({ itemName, dietaryRestrictions, price }) => {
  return (
    <div className="menu-card">
      <div className="menu-card-text">
        {/* Display the menu item name */}
        <p className="menu-card-title">{itemName}</p>
        {/* Display dietary restrictions if available, otherwise show placeholder */}
        <p className="menu-card-body">
          {dietaryRestrictions && dietaryRestrictions.length > 0 
            ? dietaryRestrictions.join(', ') 
            : 'XXX'
          }
        </p>
        {/* Display price if available */}
        {price && <p className="menu-card-price">${price}</p>}
      </div>
    </div>
  );
};

export default MenuCard;
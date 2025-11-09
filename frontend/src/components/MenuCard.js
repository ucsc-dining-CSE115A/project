import React from 'react';
import Rating from './Rating';
import '../styles/MenuCard.css';

const MenuCard = ({ itemName, dietaryRestrictions, price, diningHall }) => {
  return (
    <div className="menu-card">
      <div className="menu-card-text">
        {/* Display the menu item name */}
        <p className="menu-card-title">{itemName}</p>
        
        {/* Display dietary restrictions if available */}
        <p className="menu-card-body">
          {dietaryRestrictions && dietaryRestrictions.length > 0 
            ? dietaryRestrictions.join(', ') 
            : 'XXX'
          }
        </p>
        
        {/* Display price if available */}
        {price && <p className="menu-card-price">{price}</p>}
        
        {/* Rating component - manages its own state internally */}
        <Rating itemName={itemName} diningHall={diningHall} />
      </div>
    </div>
  );
};

export default MenuCard;
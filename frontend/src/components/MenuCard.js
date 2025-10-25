import React from 'react';
import './MenuCard.css';

// MenuCard component for displaying individual menu items in card format
// Based on Figma design with placeholder image and XXX body text
const MenuCard = ({ itemName }) => {
  return (
    <div className="menu-card">
      {/* Placeholder image area - will be empty for now */}
      <div className="menu-card-image"></div>
      
      <div className="menu-card-text">
        {/* Dynamic title showing the actual menu item name */}
        <p className="menu-card-title">{itemName}</p>
        {/* Placeholder body text as requested */}
        <p className="menu-card-body">XXX</p>
      </div>
    </div>
  );
};

export default MenuCard;
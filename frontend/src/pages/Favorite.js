import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import MenuCard from "../components/MenuCard";

function Favorite() {
  const [favorites, setFavorites] = useState(() => {
    const storedFavorites = localStorage.getItem("favorites");
    return storedFavorites ? JSON.parse(storedFavorites) : [];
  });

  useEffect(() => {
    localStorage.setItem("favorites", JSON.stringify(favorites));
  }, [favorites]);

  const removeFavorite = (itemName) => {
    setFavorites(favorites.filter((name) => name !== itemName));
  };

  if (favorites.length() === 0) {
    return (
      <div className="menu-detail-container">
        <div className="error">No favorites saved</div>
      </div>
    );
  }

  return (
    <div className="menu-detail-container">
      <h1>Favorites</h1>

      <div className="menu-content">
        {Object.entries(favorites).map(([mealType, items]) => (
          <div key={mealType} className="menu-section">
            <h2>{mealType}</h2>
            <div className="menu-cards-grid">
              {items.map((item, index) => {
                const itemName = typeof item === "string" ? item : item.name;
                const dietaryRestrictions =
                  typeof item === "object" ? item.dietary_restrictions : null;
                const price = typeof item === "object" ? item.price : null;

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
        ))}
      </div>
    </div>
  );
}

export default Favorite;

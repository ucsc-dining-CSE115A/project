import React, { useState, useEffect } from "react";

function FavoriteButton({
  itemName,
  dietaryRestrictions,
  price,
  diningHall,
  averageRating,
}) {
  const handleFavoriteChange = () => {
    if (!localStorage.includes(itemName)) {
      let newItem = {
        name: itemName,
        dietary_restrictions: dietaryRestrictions,
        price: price,
        diningHall: diningHall,
        averageRating: averageRating,
      };

      let newFavoriteList = [...localStorage.getItem("favorites"), newItem];
      localStorage.setItem("favorites", JSON.stringify(newFavoriteList));
    } else {
      localStorage.removeItem(itemName);
    }
  };
}

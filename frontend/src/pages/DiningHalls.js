import React from 'react';
import { Link } from 'react-router-dom';

function DiningHalls() {
  const diningHalls = [
    "John R. Lewis & College Nine Dining Hall",
    "Cowell & Stevenson Dining Hall", 
    "Crown & Merrill Dining Hall and Banana Joe's",
    "Porter & Kresge Dining Hall",
    "Rachel Carson & Oakes Dining Hall"
  ];

  return (
    <div className="dining-halls-container">
      <h1 className="dining-halls-title">Choose a Dining Hall</h1>
      {diningHalls.map((hall, index) => (
        <Link key={index} to={`/menu/${encodeURIComponent(hall)}`}>
          <button className="choose-dining-hall-button">{hall}</button>
        </Link>
      ))}
    </div>
  );
}

export default DiningHalls;
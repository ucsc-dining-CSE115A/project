import React, { useState, useEffect } from 'react';

function Rating({ itemName, diningHall }) {
  const [rating, setRating] = useState(0);

  // Load saved rating from localStorage when component mounts
  useEffect(() => {
    const storageKey = `rating_${diningHall}_${itemName}`;
    const savedRating = localStorage.getItem(storageKey);
    
    if (savedRating) {
      setRating(parseInt(savedRating));
    }
  }, [diningHall, itemName]); // Re-run if these props change

  return (
    <div>
      {[1, 2, 3, 4, 5].map((star) => {
        return (  
          <span
            key={star}
            className='star'
            style={{
              cursor: 'pointer',
              color: rating >= star ? 'gold' : 'gray',
              fontSize: `35px`,
            }}
            onClick={() => {
              // Save to localStorage when user clicks
              const storageKey = `rating_${diningHall}_${itemName}`;
              localStorage.setItem(storageKey, star.toString());
              
              setRating(star);
              console.log(`Rated ${itemName} at ${diningHall}: ${star} stars`);
            }}
          >
            {' '}
            ★{' '}
          </span>
        )
      })}
    </div>
  )
}

export default Rating;
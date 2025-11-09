import React, { useState } from 'react';

function Rating({ itemName, diningHall }) {
  const [rating, setRating] = useState(0);

  return (
    <div>
      {[1, 2, 3, 4, 5].map((star) => {
        return (  
          <span
            key={star}
            className='start'
            style={{
              cursor: 'pointer',
              color: rating >= star ? 'gold' : 'gray',
              fontSize: `35px`,
            }}
            onClick={() => {
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
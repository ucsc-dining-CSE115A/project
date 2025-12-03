import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function Rating({ itemName, diningHall }) {
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  // Safety check - don't crash if props are missing
  if (!itemName || !diningHall) {
    console.error('Rating component missing props:', { itemName, diningHall });
    return null;
  }

  // Load saved rating from localStorage when component mounts
  useEffect(() => {
    const storageKey = `rating_${diningHall}_${itemName}`;
    const savedRating = localStorage.getItem(storageKey);
    
    if (savedRating) {
      setRating(parseInt(savedRating));
      console.log(`Loaded saved rating for ${itemName}: ${savedRating}`);
    }
  }, [diningHall, itemName]);

  const submitRating = async (newRating) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 submitRating called with:', newRating);
    setLoading(true);
    const storageKey = `rating_${diningHall}_${itemName}`;

    try {
      // Step 1: Get old rating from localStorage (if exists)
      const oldRatingStr = localStorage.getItem(storageKey);
      const oldRating = oldRatingStr ? parseInt(oldRatingStr) : null;
      console.log('📦 Old rating from localStorage:', oldRating);
      console.log('📦 Old rating is truthy?', !!oldRating);

      // Step 2: Fetch current counts from Supabase
      console.log('📡 Fetching from Supabase for item:', itemName);
      const { data: currentData, error: fetchError } = await supabase
        .from('ratings')
        .select('*')
        .eq('name', itemName)
        .single();

      if (fetchError) {
        console.error('❌ Supabase fetch error:', fetchError);
        throw fetchError;
      }

      console.log('📊 Current data from Supabase:', currentData);

      // Step 3: Calculate new counts
      let newCounts = {
        stars_5: currentData.stars_5 || 0,
        stars_4: currentData.stars_4 || 0,
        stars_3: currentData.stars_3 || 0,
        stars_2: currentData.stars_2 || 0,
        stars_1: currentData.stars_1 || 0
      };

      console.log('📊 Initial counts:', JSON.stringify(newCounts));

      // If user already rated, remove old rating
      if (oldRating) {
        console.log(`➖ Removing old rating: ${oldRating}`);
        console.log(`   Before: stars_${oldRating} = ${newCounts[`stars_${oldRating}`]}`);
        newCounts[`stars_${oldRating}`]--;
        console.log(`   After: stars_${oldRating} = ${newCounts[`stars_${oldRating}`]}`);
      } else {
        console.log('✨ First time rating - no old rating to remove');
      }

      // Add new rating
      console.log(`➕ Adding new rating: ${newRating}`);
      console.log(`   Before: stars_${newRating} = ${newCounts[`stars_${newRating}`]}`);
      newCounts[`stars_${newRating}`]++;
      console.log(`   After: stars_${newRating} = ${newCounts[`stars_${newRating}`]}`);

      console.log('📊 Final counts to update:', JSON.stringify(newCounts));

      // Step 4: Update Supabase (only star counts)
      console.log('📤 Updating Supabase...');
      const { data: updateData, error: updateError } = await supabase
        .from('ratings')
        .update(newCounts)
        .eq('name', itemName)
        .select();

      if (updateError) {
        console.error('❌ Supabase update error:', updateError);
        throw updateError;
      }

      console.log('✅ Supabase update successful:', updateData);

      // Step 5: Save to localStorage
      localStorage.setItem(storageKey, newRating.toString());
      setRating(newRating);

      console.log(`✅ Successfully rated ${itemName}: ${newRating} stars`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } catch (err) {
      console.error('❌ Error submitting rating:', err);
      alert(`Failed to submit rating: ${err.message}`);
      
      // Still save to localStorage even if Supabase fails
      localStorage.setItem(storageKey, newRating.toString());
      setRating(newRating);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="rating-container"
      onMouseLeave={() => setHoverRating(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        return (  
          <span
            key={star}
            className='star'
            style={{
              cursor: loading ? 'not-allowed' : 'pointer',
              color: (hoverRating >= star || (!hoverRating && rating >= star)) ? 'gold' : 'gray',
              fontSize: `28px`,
              opacity: loading ? 0.5 : 1,
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={() => setHoverRating(star)}
            onClick={() => {
              if (!loading) {
                submitRating(star);
              }
            }}
          >
            {' '}
            ★{' '}
          </span>
        )
      })}
      {loading && (
        <span style={{ fontSize: '12px', color: '#666', marginLeft: '4px' }}>
          Saving...
        </span>
      )}
    </div>
  )
}

export default Rating;
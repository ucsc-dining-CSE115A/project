import React, { useState, useEffect } from 'react';
import diningHoursData from '../data/diningHours.json';
import '../styles/todayHours.css';

// TodayHours component - displays current day's operating hours for dining halls
function TodayHours({ diningHallName }) {
  const [currentDay, setCurrentDay] = useState('');
  const [todayHours, setTodayHours] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getCurrentDayAndHours = () => {
      try {
        // Get current date and format day name in Pacific timezone
        const now = new Date();
        const options = { 
          weekday: 'long',
          timeZone: 'America/Los_Angeles'
        };
        const dayName = new Intl.DateTimeFormat('en-US', options).format(now);
        
        // Get hours for the dining hall
        const diningHallData = diningHoursData[diningHallName];
        if (!diningHallData) {
          throw new Error('Dining hall not found');
        }
        
        const hours = diningHallData.hours[dayName] || 'Closed';
        
        setCurrentDay(dayName);
        setTodayHours(hours);
        setLoading(false);
      } catch (error) {
        console.error('Error loading dining hours:', error);
        setCurrentDay('Today');
        setTodayHours('Hours not available');
        setLoading(false);
      }
    };

    getCurrentDayAndHours();
    
    // Update every minute to handle day changes
    const interval = setInterval(getCurrentDayAndHours, 60000);
    
    return () => clearInterval(interval);
  }, [diningHallName]);

  if (loading) {
    return (
      <div className="today-hours-card">
        <div className="today-hours-title">Today's Hours</div>
        <div className="today-hours-time">Loading...</div>
      </div>
    );
  }

  return (
    <div className="today-hours-card">
      <div className="today-hours-title">Today's Hours</div>
      <div className="today-hours-subtitle">{currentDay}</div>
      <div className={`today-hours-time ${todayHours === 'Closed' ? 'today-hours-closed' : ''}`}>
        {todayHours}
      </div>
    </div>
  );
}

export default TodayHours;
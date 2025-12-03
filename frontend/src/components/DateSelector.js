import React, { useState } from 'react';
import '../styles/DateSelector.css';

const DateSelector = ({ onDateChange }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Format date for display (e.g., "Monday, November 25, 2025")
  const formatDate = (date) => {
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  // Check if selected date is today
  const isToday = () => {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  };

  // Handle previous day
  const handlePreviousDay = () => {
    if (isToday()) {
      // Cannot go back in time from today
      return;
    }
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
    if (onDateChange) {
      onDateChange(newDate);
    }
  };

  // Handle next day
  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
    if (onDateChange) {
      onDateChange(newDate);
    }
  };

  return (
    <div className="date-selector">
      <button 
        className={`date-arrow ${isToday() ? 'disabled' : ''}`}
        onClick={handlePreviousDay}
        disabled={isToday()}
        aria-label="Previous day"
      >
        ←
      </button>
      
      <div className="date-display">
        <span className="date-text">{formatDate(selectedDate)}</span>
        {isToday() && <span className="today-badge">Today</span>}
      </div>
      
      <button 
        className="date-arrow"
        onClick={handleNextDay}
        aria-label="Next day"
      >
        →
      </button>
    </div>
  );
};

export default DateSelector;

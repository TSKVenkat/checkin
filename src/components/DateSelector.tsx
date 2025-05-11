'use client';

import { useState, useEffect } from 'react';

interface DateSelectorProps {
  startDate: Date;
  endDate: Date;
  onDateSelect: (date: Date) => void;
  selectedDate?: Date;
}

export default function DateSelector({ 
  startDate, 
  endDate, 
  onDateSelect, 
  selectedDate 
}: DateSelectorProps) {
  const [dates, setDates] = useState<Date[]>([]);
  const [selected, setSelected] = useState<Date>(selectedDate || new Date());

  useEffect(() => {
    // Generate array of dates between start and end dates
    const dateArray: Date[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      dateArray.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    setDates(dateArray);
    
    // Set default selected date if not provided
    if (!selectedDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Find if today is within the event range
      const isWithinRange = dateArray.some(d => {
        const date = new Date(d);
        date.setHours(0, 0, 0, 0);
        return date.getTime() === today.getTime();
      });
      
      // If today is within range, set it as selected, otherwise use start date
      if (isWithinRange) {
        setSelected(today);
        onDateSelect(today);
      } else {
        setSelected(new Date(startDate));
        onDateSelect(new Date(startDate));
      }
    } else {
      setSelected(selectedDate);
    }
  }, [startDate, endDate, selectedDate, onDateSelect]);

  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    setSelected(date);
    onDateSelect(date);
  };

  // Check if date is selected
  const isSelected = (date: Date): boolean => {
    return date.toDateString() === selected.toDateString();
  };

  return (
    <div className="date-selector mb-4">
      <h3 className="text-md font-medium mb-2">Select Date:</h3>
      <div className="flex flex-wrap gap-2">
        {dates.map((date, index) => (
          <button
            key={index}
            onClick={() => handleDateSelect(date)}
            className={`px-4 py-2 rounded-md text-sm transition-colors ${
              isSelected(date)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
            }`}
          >
            {formatDate(date)}
          </button>
        ))}
      </div>
    </div>
  );
} 
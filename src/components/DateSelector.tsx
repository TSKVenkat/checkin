'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface DateSelectorProps {
  initialDate?: Date;
  onDateChange: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  label?: string;
  required?: boolean;
  helperText?: string;
  error?: string;
  disabled?: boolean;
}

const DateSelector: React.FC<DateSelectorProps> = ({
  initialDate = new Date(),
  onDateChange,
  minDate,
  maxDate,
  className = '',
  label = 'Select Date',
  required = false,
  helperText,
  error,
  disabled = false
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    setSelectedDate(newDate);
    onDateChange(newDate);
  };

  // Format date to YYYY-MM-DD for input value
  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      {label && (
        <label htmlFor="date-select" className="block text-sm font-medium text-gray-200 mb-1">
          {label}
          {required && <span className="ml-1 text-error">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          id="date-select"
          type="date"
          className={cn(
            "w-full rounded-lg border border-dark-border bg-dark-bg-tertiary text-white",
            "px-4 py-2.5 shadow-sm transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/70",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-error focus:border-error focus:ring-error/30" : ""
          )}
          value={formatDateForInput(selectedDate)}
          onChange={handleDateChange}
          min={minDate ? formatDateForInput(minDate) : undefined}
          max={maxDate ? formatDateForInput(maxDate) : undefined}
          disabled={disabled}
        />
      </div>
      {(helperText || error) && (
        <p className={cn('mt-1 text-xs', error ? 'text-error' : 'text-gray-400')}>
          {error || helperText}
        </p>
      )}
    </div>
  );
};

export default DateSelector; 
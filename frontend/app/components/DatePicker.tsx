"use client"

import type React from "react"
import { Calendar } from "lucide-react"
import { useRef, useEffect, useState } from "react"

interface DatePickerProps {
  value: string | undefined
  onChange: (date: string) => void
  placeholder?: string
  disabled?: boolean
  name: string
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value = "",  // Default to empty string if undefined
  onChange,
  placeholder = "Select date",
  disabled = false,
  name,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Add a ref to prevent processing the same value multiple times
  const lastValueRef = useRef(value);
  
  // Update input ref current value when prop changes
  useEffect(() => {
    if (inputRef.current && value !== lastValueRef.current) {
      inputRef.current.value = value;
      lastValueRef.current = value;
    }
  }, [value]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    // Only trigger onChange if the value actually changed
    if (newValue !== lastValueRef.current) {
      lastValueRef.current = newValue;
      onChange(newValue);
    }
  };

  const handleWrapperClick = () => {
    if (inputRef.current && !disabled) {
      inputRef.current.focus();
      inputRef.current.click();
    }
  };

  // Format the value to ensure it's valid
  const formattedValue = value && value.match(/^\d{4}-\d{2}-\d{2}$/) ? value : "";

  return (
    <div 
      className="relative flex items-center w-full cursor-pointer" 
      onClick={handleWrapperClick}
    >
      <input
        ref={inputRef}
        type="date"
        defaultValue={formattedValue}
        onChange={handleChange}
        name={name}
        className="w-full px-3 py-2 pr-10 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 cursor-pointer"
        placeholder={placeholder}
        disabled={disabled}
        // Add these to improve UX
        autoComplete="off"
        style={{ colorScheme: "light" }}
      />
      <Calendar
        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
        size={18}
      />
    </div>
  );
}; 
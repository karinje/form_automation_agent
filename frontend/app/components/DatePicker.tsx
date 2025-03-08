"use client"

import type React from "react"
import { Calendar } from "lucide-react"
import { useRef, useEffect } from "react"

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

  // Format value to ensure it's in YYYY-MM-DD format expected by input[type=date]
  const formattedValue = value && value.match(/^\d{4}-\d{2}-\d{2}$/) ? value : "";

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value)
  }

  const handleWrapperClick = () => {
    if (inputRef.current && !disabled) {
      inputRef.current.focus();
      inputRef.current.click();
    }
  }

  return (
    <div 
      className="relative flex items-center w-full cursor-pointer" 
      onClick={handleWrapperClick}
    >
      <input
        ref={inputRef}
        type="date"
        value={formattedValue}
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
  )
} 
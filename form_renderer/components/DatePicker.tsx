"use client"

import type React from "react"
import { Calendar } from "lucide-react"

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
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value)
  }

  return (
    <div className="relative">
      <input
        type="date"
        value={value || ""} // Ensure we always pass a string value
        onChange={handleChange}
        name={name}
        className="w-full px-3 py-2 pr-10 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        placeholder={placeholder}
        disabled={disabled}
      />
      <Calendar
        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
        size={18}
      />
    </div>
  )
} 
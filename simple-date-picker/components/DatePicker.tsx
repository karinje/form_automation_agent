"use client"

import type React from "react"
import { useState } from "react"
import { Calendar } from "lucide-react"

interface DatePickerProps {
  onChange: (date: string) => void
  placeholder?: string
}

export const DatePicker: React.FC<DatePickerProps> = ({ onChange, placeholder = "Select date" }) => {
  const [date, setDate] = useState("")

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = event.target.value
    setDate(newDate)
    onChange(newDate)
  }

  return (
    <div className="relative">
      <input
        type="date"
        value={date}
        onChange={handleChange}
        className="w-full px-3 py-2 pr-10 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={placeholder}
      />
      <Calendar
        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
        size={18}
      />
    </div>
  )
}


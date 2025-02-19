"use client"

import type React from "react"
import { Calendar } from "lucide-react"
import { useFormContext } from "react-hook-form"

interface DateFieldProps {
  name: string
  label: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
}

export const DateField: React.FC<DateFieldProps> = ({
  name,
  label,
  placeholder = "Select date",
  required = false,
  disabled = false,
}) => {
  const { register, formState: { errors } } = useFormContext()

  return (
    <div className="form-field">
      <label className="block text-sm font-medium mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <input
          type="date"
          {...register(name)}
          className="w-full px-3 py-2 pr-10 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          placeholder={placeholder}
          disabled={disabled}
        />
        <Calendar
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
          size={18}
        />
      </div>
      {errors[name] && (
        <p className="text-sm text-red-500 mt-1">
          {errors[name]?.message as string}
        </p>
      )}
    </div>
  )
} 
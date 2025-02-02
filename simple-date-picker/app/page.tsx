"use client"
import { DatePicker } from "../components/DatePicker"

export default function Home() {
  const handleDateChange = (date: string) => {
    console.log("Selected date:", date)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Date Picker Example</h1>
        <DatePicker onChange={handleDateChange} placeholder="Enter or select a date" />
      </div>
    </div>
  )
}


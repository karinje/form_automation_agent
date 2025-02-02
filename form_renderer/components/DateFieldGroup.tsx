import { Label } from "@/components/ui/label"
import type { DateFieldGroup as DateFieldGroupType } from "@/types/form-definition"
import { DatePicker } from "./DatePicker"

const MONTH_MAP: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
};

const REVERSE_MONTH_MAP: Record<number, string> = Object.entries(MONTH_MAP).reduce(
  (acc, [key, value]) => ({ ...acc, [value]: key }),
  {} as Record<number, string>
);

interface DateFieldGroupProps {
  dateGroup: DateFieldGroupType;
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  visible: boolean;
}

const DateFieldGroup = ({ dateGroup, values, onChange, visible }: DateFieldGroupProps) => {
  const { dayField, monthField, yearField } = dateGroup;
  
  if (!visible) return null;

  const handleDateChange = (value: string) => {
    if (!value) {
      // Clear all fields if date is cleared
      onChange(dayField.name, "")
      onChange(monthField.name, "")
      onChange(yearField.name, "")
      return
    }

    // Parse the selected date
    const date = new Date(value)
    const day = date.getDate().toString()
    const monthIndex = date.getMonth()
    const year = date.getFullYear().toString()

    // Convert month number to three-letter format (e.g., JAN, FEB)
    const monthStr = REVERSE_MONTH_MAP[monthIndex]

    // Update all three fields
    onChange(dayField.name, day)
    onChange(monthField.name, monthStr)
    onChange(yearField.name, year)
  }

  // Convert from form values to date string
  const getDateValue = () => {
    if (!values[yearField.name] || !values[monthField.name] || !values[dayField.name]) {
      return ""
    }

    try {
      const year = values[yearField.name]
      const monthStr = values[monthField.name].toUpperCase()
      const day = values[dayField.name]

      // Convert month string to number (0-11)
      const monthIndex = MONTH_MAP[monthStr]
      if (monthIndex === undefined) {
        // If not a three-letter month, assume it's already a number
        const monthNum = parseInt(monthStr)
        if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) return ""
        return `${year}-${monthNum.toString().padStart(2, '0')}-${day.padStart(2, '0')}`
      }

      // Add 1 to monthIndex since HTML date input expects 1-12
      return `${year}-${(monthIndex + 1).toString().padStart(2, '0')}-${day.padStart(2, '0')}`
    } catch (error) {
      console.error('Error converting date values:', error)
      return ""
    }
  }

  return (
    <div className="flex flex-col space-y-2">
      <Label>{dateGroup.basePhrase}</Label>
      <DatePicker
        name={dayField.name}
        value={getDateValue()}
        onChange={handleDateChange}
        placeholder="Select date"
      />
    </div>
  )
}

export default DateFieldGroup
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { FormField as FormFieldType } from "@/types/form-definition"
import { DatePicker } from "./DatePicker"

interface DateFieldGroup {
  basePhrase: string
  dayField: FormFieldType
  monthField: FormFieldType
  yearField: FormFieldType
}

interface DateFieldGroupProps {
  dateGroup: DateFieldGroup
  values: Record<string, string>
  onChange: (name: string, value: string) => void
  visible: boolean
}

const MONTH_MAP: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
};

const REVERSE_MONTH_MAP: Record<number, string> = Object.entries(MONTH_MAP).reduce(
  (acc, [key, value]) => ({ ...acc, [value]: key }),
  {} as Record<number, string>
);

const DateFieldGroup = ({ dateGroup, values, onChange, visible }: DateFieldGroupProps) => {
  const { dayField, monthField, yearField } = dateGroup;
  
  // Check if any field has NA to determine initial state
  const [isNAChecked, setIsNAChecked] = useState(() => {
    return values[dayField.name] === "N/A" ||
           values[monthField.name] === "N/A" ||
           values[yearField.name] === "N/A";
  });

  // Add effect to handle NA state changes from YAML
  useEffect(() => {
    const naCheckboxValue = dayField.na_checkbox_id ? values[dayField.na_checkbox_id] : undefined;
    if (naCheckboxValue === "true" && !isNAChecked) {
      setIsNAChecked(true);
      // Batch these updates together to avoid multiple re-renders
      const updates = {
        [dayField.name]: "N/A",
        [monthField.name]: "N/A",
        [yearField.name]: "N/A"
      };
      Object.entries(updates).forEach(([name, value]) => onChange(name, value));
    }
  }, [values[dayField.na_checkbox_id]]); // Only depend on the checkbox value

  if (!visible) return null;

  const handleDateChange = (value: string) => {
    if (!value) {
      onChange(dayField.name, "")
      onChange(monthField.name, "")
      onChange(yearField.name, "")
      return
    }

    const date = new Date(value)
    const day = date.getDate().toString().padStart(2, '0')
    const monthIndex = date.getMonth()
    const year = date.getFullYear().toString()

    // Convert month number to three-letter format (e.g., JAN, FEB)
    const monthStr = REVERSE_MONTH_MAP[monthIndex]

    onChange(dayField.name, day)
    onChange(monthField.name, monthStr)
    onChange(yearField.name, year)
  }

  const handleNACheckboxChange = (checked: boolean) => {
    setIsNAChecked(checked);
    const value = checked ? "N/A" : "";
    
    // Batch these updates together
    const updates = {
      [dayField.name]: value,
      [monthField.name]: value,
      [yearField.name]: value
    };
    
    if (dayField.na_checkbox_id) {
      updates[dayField.na_checkbox_id] = checked ? "true" : "false";
    }

    // Apply all updates at once
    Object.entries(updates).forEach(([name, value]) => onChange(name, value));
  };

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
      <div className="flex items-center gap-4">
        <DatePicker
          name={dayField.name}
          value={getDateValue()}
          onChange={handleDateChange}
          placeholder="Select date"
          disabled={isNAChecked}
        />
        {dayField.has_na_checkbox && dayField.na_checkbox_id && (
          <div className="flex items-center">
            <Checkbox
              id={dayField.na_checkbox_id}
              checked={isNAChecked}
              onCheckedChange={handleNACheckboxChange}
              className="w-6 h-6"
            />
            <Label 
              htmlFor={dayField.na_checkbox_id}
              className="text-sm text-gray-500 ml-2"
            >
              {dayField.na_checkbox_text || "Does Not Apply"}
            </Label>
          </div>
        )}
      </div>
    </div>
  )
}

export default DateFieldGroup
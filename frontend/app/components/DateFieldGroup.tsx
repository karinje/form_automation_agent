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

// Month mappings (both ways)
const MONTH_MAP: Record<string, string> = {
  "JAN": "01", "FEB": "02", "MAR": "03", "APR": "04", "MAY": "05", "JUN": "06",
  "JUL": "07", "AUG": "08", "SEP": "09", "OCT": "10", "NOV": "11", "DEC": "12"
};

const REVERSE_MONTH_MAP: Record<string, string> = {
  "01": "JAN", "02": "FEB", "03": "MAR", "04": "APR", "05": "MAY", "06": "JUN",
  "07": "JUL", "08": "AUG", "09": "SEP", "10": "OCT", "11": "NOV", "12": "DEC",
  "1": "JAN", "2": "FEB", "3": "MAR", "4": "APR", "5": "MAY", "6": "JUN",
  "7": "JUL", "8": "AUG", "9": "SEP"
};

const DateFieldGroup = ({ dateGroup, values, onChange, visible }: DateFieldGroupProps) => {
  const { dayField, monthField, yearField } = dateGroup;
  
  // Check if any field has NA to determine initial state
  const [isNAChecked, setIsNAChecked] = useState(() => {
    return values[dayField.name] === "N/A" ||
           values[monthField.name] === "N/A" ||
           values[yearField.name] === "N/A";
  });

  // State to track the last valid date
  const [lastValidDate, setLastValidDate] = useState<string>("");

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

  // Improved date conversion from DatePicker to individual fields
  const handleDateChange = (value: string) => {
    if (!value) {
      onChange(dayField.name, "")
      onChange(monthField.name, "")
      onChange(yearField.name, "")
      return
    }

    try {
      // Split the date into parts
      const [year, month, day] = value.split('-');
      
      // Ensure we have valid parts
      if (!year || !month || !day) return;
      
      // Store as a valid date for future reference
      setLastValidDate(value);
      
      // Get month abbreviation from the numeric month
      const monthAbbr = REVERSE_MONTH_MAP[month] || "";
      
      // Update all fields with properly formatted values
      onChange(dayField.name, day.replace(/^0/, '')); // Remove leading zero for day
      onChange(monthField.name, monthAbbr);
      onChange(yearField.name, year);
    } catch (error) {
      console.error('Error parsing date:', error);
    }
  }

  // Improved conversion from individual fields to DatePicker value
  const getDateValue = () => {
    if (isNAChecked) return "";
    
    // If any field is empty or N/A, don't try to create a date
    if (!values[yearField.name] || 
        !values[monthField.name] || 
        !values[dayField.name] ||
        values[yearField.name] === "N/A" ||
        values[monthField.name] === "N/A" ||
        values[dayField.name] === "N/A") {
      return "";
    }

    try {
      const year = values[yearField.name].trim();
      const monthStr = values[monthField.name].trim().toUpperCase();
      const day = values[dayField.name].trim();
      
      // Convert from month abbreviation to number
      const monthNum = MONTH_MAP[monthStr] || monthStr;
      
      // Ensure day has 2 digits
      const dayPadded = day.padStart(2, '0');
      
      // Return in YYYY-MM-DD format
      const dateStr = `${year}-${monthNum}-${dayPadded}`;
      
      // Validate the date is correct (e.g., not 2023-02-31)
      const date = new Date(`${year}-${monthNum}-${dayPadded}T00:00:00`);
      if (isNaN(date.getTime())) {
        // If invalid, return last valid date or empty string
        return lastValidDate;
      }
      
      return dateStr;
    } catch (error) {
      console.error('Error converting date values:', error);
      return lastValidDate;
    }
  }

  // Handle NA checkbox
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
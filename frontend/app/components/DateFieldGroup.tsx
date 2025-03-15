import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { FormField as FormFieldType } from "@/types/form-definition"

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

// Helper function to validate a date string
const isValidDate = (year: string, month: string, day: string): boolean => {
  try {
    // Skip validation if any field is empty
    if (!year || !month || !day) return true;
    
    // Convert month abbreviation to number if needed
    const monthNum = MONTH_MAP[month.toUpperCase()] || month;
    
    // Try to create a numeric date
    const numericDay = parseInt(day, 10);
    const numericMonth = parseInt(monthNum, 10);
    const numericYear = parseInt(year, 10);
    
    // Basic range validation
    if (isNaN(numericDay) || isNaN(numericMonth) || isNaN(numericYear)) return false;
    if (numericDay < 1 || numericDay > 31) return false;
    if (numericMonth < 1 || numericMonth > 12) return false;
    if (numericYear < 1900 || numericYear > 2100) return false;
    
    // Create Date object to check validity (Feb 30, etc.)
    const date = new Date(numericYear, numericMonth - 1, numericDay);
    
    // Verify that the date wasn't silently adjusted
    return (
      date.getFullYear() === numericYear &&
      date.getMonth() === numericMonth - 1 &&
      date.getDate() === numericDay
    );
  } catch (e) {
    console.error("Date validation error:", e);
    return false;
  }
};

const DateFieldGroup = ({ dateGroup, values, onChange, visible }: DateFieldGroupProps) => {
  const { dayField, monthField, yearField } = dateGroup;
  
  // Check if any field has NA to determine initial state
  const [isNAChecked, setIsNAChecked] = useState(() => {
    return values[dayField.name] === "N/A" ||
           values[monthField.name] === "N/A" ||
           values[yearField.name] === "N/A";
  });
  
  // Add state to track if the date is invalid
  const [isInvalidDate, setIsInvalidDate] = useState(false);
  
  // Add state to track which fields have been touched
  const [touchedFields, setTouchedFields] = useState({
    day: false,
    month: false,
    year: false
  });

  // Create a memoized function to update all date parts at once
  const updateAllDateFields = useCallback((day: string, month: string, year: string) => {
    // Create a batch of updates to apply together
    const updates: Record<string, string> = {
      [dayField.name]: day,
      [monthField.name]: month,
      [yearField.name]: year
    };
    
    // Apply all updates at once
    Object.entries(updates).forEach(([name, value]) => {
      onChange(name, value);
    });
  }, [dayField.name, monthField.name, yearField.name, onChange]);

  // Update effect to handle NA state changes from YAML
  useEffect(() => {
    const naCheckboxValue = dayField.na_checkbox_id ? values[dayField.na_checkbox_id] : undefined;
    if (naCheckboxValue === "true" && !isNAChecked) {
      setIsNAChecked(true);
      updateAllDateFields("N/A", "N/A", "N/A");
    }
  }, [values, dayField.na_checkbox_id, isNAChecked, updateAllDateFields]);
  
  // Add validation effect when date parts change manually
  useEffect(() => {
    if (isNAChecked) {
      setIsInvalidDate(false);
      return;
    }
    
    const day = values[dayField.name] || "";
    const month = values[monthField.name] || "";
    const year = values[yearField.name] || "";
    
    // Only validate if all fields have values and at least one was touched
    const allFieldsFilled = day && month && year;
    const anyFieldTouched = touchedFields.day || touchedFields.month || touchedFields.year;
    
    if (allFieldsFilled && anyFieldTouched) {
      setIsInvalidDate(!isValidDate(year, month, day));
    } else {
      setIsInvalidDate(false);
    }
  }, [values, dayField.name, monthField.name, yearField.name, touchedFields, isNAChecked]);

  if (!visible) return null;

  // Handle manual field changes
  const handleManualFieldChange = (field: 'day' | 'month' | 'year', value: string) => {
    // Mark this field as touched
    setTouchedFields(prev => ({
      ...prev,
      [field]: true
    }));
    
    // Update the field value
    onChange(
      field === 'day' ? dayField.name : 
      field === 'month' ? monthField.name : 
      yearField.name, 
      value
    );
  };

  // Handle NA checkbox
  const handleNACheckboxChange = (checked: boolean) => {
    setIsNAChecked(checked);
    
    if (checked) {
      updateAllDateFields("N/A", "N/A", "N/A");
      setIsInvalidDate(false);
      
      if (dayField.na_checkbox_id) {
        onChange(dayField.na_checkbox_id, "true");
      }
    } else {
      updateAllDateFields("", "", "");
      
      if (dayField.na_checkbox_id) {
        onChange(dayField.na_checkbox_id, "false");
      }
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      <Label>{dateGroup.basePhrase}</Label>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          {/* Manual entry fields */}
          <div className={`flex gap-2 items-center flex-1 ${isInvalidDate ? 'border border-red-500 rounded-md p-2' : ''}`}>
            <div className="w-20">
              <Input
                value={values[dayField.name] || ""}
                onChange={(e) => handleManualFieldChange('day', e.target.value)}
                placeholder="Day"
                className={isInvalidDate ? 'border-red-500' : ''}
                disabled={isNAChecked}
              />
            </div>
            <span>/</span>
            <div className="w-28">
              <Select 
                value={values[monthField.name] || ""}
                onValueChange={(value) => handleManualFieldChange('month', value)}
                disabled={isNAChecked}
              >
                <SelectTrigger className={isInvalidDate ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MONTH_MAP).map(([abbr]) => (
                    <SelectItem key={abbr} value={abbr}>{abbr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span>/</span>
            <div className="w-24">
              <Input
                value={values[yearField.name] || ""}
                onChange={(e) => handleManualFieldChange('year', e.target.value)}
                placeholder="Year"
                className={isInvalidDate ? 'border-red-500' : ''}
                disabled={isNAChecked}
              />
            </div>
          </div>
          
          {/* N/A checkbox */}
          {dayField.has_na_checkbox && dayField.na_checkbox_id && (
            <div className="flex items-center ml-4">
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
        
        {/* Error message */}
        {isInvalidDate && (
          <p className="text-red-500 text-sm mt-1">
            Please enter a valid date combination
          </p>
        )}
      </div>
    </div>
  );
};

export default DateFieldGroup;
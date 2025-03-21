"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import type { FormField as FormFieldType } from "@/types/form-definition"
import { useState, useEffect, useRef } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DateField } from "./DateField"
import { DatePicker } from "./DatePicker"
import { debugLog } from "@/utils/consoleLogger"

interface FormFieldProps {
  field: FormFieldType & {
    type: "text" | "textarea" | "radio" | "dropdown" | "date"
    na_checkbox_text?: string
  }
  value: string
  onChange: (name: string, value: string) => void
  visible: boolean
  dependencies?: Record<string, any>
  onDependencyChange?: (key: string, field: FormFieldType) => void
  formData: Record<string, string>
}

// Add this helper function at the top of the component
const isValidDropdownValue = (value: string, options: string[]) => {
  return options.some(option => option.trim() === value.trim());
};

export function FormField({ field, value, onChange, visible, dependencies, onDependencyChange, formData }: FormFieldProps) {
  const [hasFocus, setHasFocus] = useState(false)
  const valuesRef = useRef<string[]>([])

  // The issue is that the useEffect is overriding manual state changes
  // Let's add a ref to track if the change was manual
  const manualChangeRef = useRef(false);

  // Initialize NA checkbox state
  const [isNAChecked, setIsNAChecked] = useState(() => {
    return value === "N/A" || (field.na_checkbox_id && formData[field.na_checkbox_id] === "true");
  });

  // Modify the useEffect to respect manual changes
  useEffect(() => {
    // Skip if the change was manual - this is key to fix the issue
    if (manualChangeRef.current) {
      manualChangeRef.current = false;
      return;
    }

    const newState = value === "N/A" || (field.na_checkbox_id && formData[field.na_checkbox_id] === "true");
    setIsNAChecked(newState);
  }, [value, field.na_checkbox_id, formData]);

  // Check if this is part of a date group
  const isDateComponent = field.text_phrase ? /^(.*?)\s*-\s*(Day|Month|Year)$/i.test(field.text_phrase) : false;
  if (isDateComponent) {
    // Skip rendering individual components - they'll be handled by DateFieldGroup
    return null;
  }

  // Add useEffect to handle initial dependencies when value is loaded from YAML
  useEffect(() => {
    if (onDependencyChange && field.type === "radio" && value && field.button_ids?.[value]) {
      const buttonId = field.button_ids[value]
      const key = `${buttonId}.${value}`
      onDependencyChange(key, field)
    }
  }, []) // Empty dependency array to run only on mount

  // NEW effect for dropdown fields to trigger dependency evaluation on mount or when value changes
  useEffect(() => {
    if (onDependencyChange && field.type === "dropdown" && value) {
      const key = `${field.name}.${value}`
      //console.log('Dropdown dependency initial evaluation - key:', key)
      onDependencyChange(key, field)
    }
  }, [value])  // run on mount and when value changes

  useEffect(() => {
    // Initialize values for radio or dropdown fields
    if ((field.type === 'radio' || field.type === 'dropdown') && field.value) {
      // Ensure value is an array
      valuesRef.current = Array.isArray(field.value) ? field.value : [field.value]
    }
  }, [field])

  if (!visible) return null

  // Determine field status for styling
  const isEmpty = value === undefined || value === null || value === ""
  const fieldStatusClass = hasFocus ? "focus" : isEmpty ? "empty" : "filled"

  // Handle NA checkbox with better debugging
  const handleNACheckboxChange = (checked: boolean) => {
    console.log(`NA Checkbox MANUAL change for ${field.name}:`, {
      checked,
      prevState: isNAChecked,
      field_id: field.name,
      na_checkbox_id: field.na_checkbox_id
    });
    
    // Mark this as a manual change to prevent the useEffect from overriding it
    manualChangeRef.current = true;
    
    setIsNAChecked(checked);
    
    if (checked) {
      // When checking NA, set the field value and checkbox state
      onChange(field.name, "N/A");
      if (field.na_checkbox_id) {
        onChange(field.na_checkbox_id, "true");
      }
    } else {
      // When unchecking NA, forcefully clear both field value and checkbox state
      onChange(field.name, "");
      if (field.na_checkbox_id) {
        onChange(field.na_checkbox_id, "false");
      }
    }
  };

  // Handle regular field change
  const handleFieldChange = (newValue: string) => {
    onChange(field.name, newValue)
    
    // For radio and dropdown, trigger dependency logic
    if (onDependencyChange && (field.type === 'radio' || field.type === 'dropdown')) {
      const key = field.type === 'radio' 
        ? `${field.button_ids?.[newValue]}.${newValue}`
        : `${field.name}.${newValue.trim()}`;
      
      onDependencyChange(key, field)
    }
  }

  // Shared focus handling
  const handleFocus = () => setHasFocus(true)
  const handleBlur = () => setHasFocus(false)

  const renderRadioButton = () => {
    if (!Array.isArray(field.value) || !field.labels) return null;
    
    return (
      <div className="flex items-start justify-between gap-4">
        <div className="flex-grow">
          <p className="text-xl font-medium text-gray-800 my-auto">{field.text_phrase}</p>
        </div>
        <div className="min-w-[200px]">
          <Tabs
            value={value}
            onValueChange={(value) => handleFieldChange(value)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              {field.value.map((option: string, index: number) => (
                <TabsTrigger
                  key={option}
                  value={option}
                  id={field.button_ids?.[option]}
                  className={`font-medium text-xl py-2 border-2 border-gray-300 data-[state=active]:bg-gray-200 data-[state=active]:border-gray-400 data-[state=inactive]:bg-white data-[state=inactive]:hover:bg-gray-50 ${
                    field.optional ? '' : isEmpty ? 'border-2 border-red-600' : 'border-2 border-green-500'
                  }`}
                >
                  {field.labels?.[index]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>
    )
  }

  const renderField = () => {
    switch (field.type) {
      case "text":
        return (
          <Input
            type="text"
            id={field.name}
            value={value || ""}
            onChange={(e) => handleFieldChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            maxLength={field.maxlength ? parseInt(field.maxlength) : undefined}
            className={`form-field-${fieldStatusClass} text-xl leading-relaxed ${
              field.optional ? '' : isEmpty ? 'border-2 border-red-600' : 'border-2 border-green-500'
            }`}
            disabled={isNAChecked}
            style={{ fontSize: '1.25rem', padding: '0.75rem' }}
          />
        )

      case "textarea":
        return (
          <Textarea
            id={field.name}
            value={value || ""}
            onChange={(e) => handleFieldChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            maxLength={field.maxlength ? parseInt(field.maxlength) : undefined}
            className={`form-field-${fieldStatusClass} text-xl leading-relaxed ${
              field.optional ? '' : isEmpty ? 'border-2 border-red-600' : 'border-2 border-green-500'
            } min-h-[100px]`}
            disabled={isNAChecked}
            style={{ fontSize: '1.25rem', padding: '0.75rem', lineHeight: '1.5' }}
          />
        )

      case "radio":
        return renderRadioButton()

      case "dropdown":
        if (!Array.isArray(field.value) || field.value.length === 0) return null;
        
        // Check if the current value is valid
        const isValidValue = isValidDropdownValue(value || '', field.value);
        const isEmptyOrInvalid = isEmpty || !isValidValue;
        
        return (
          <Select 
            value={isValidValue ? value : ""}
            onValueChange={(value) => {
              handleFieldChange(value)
            }}
            onOpenChange={(open) => {
              if (open) handleFocus();
              else handleBlur();
            }}
          >
            <SelectTrigger 
              className={`w-full text-xl py-3 ${
                field.optional ? '' : isEmptyOrInvalid ? 'border-2 border-red-600' : 'border-2 border-green-500'
              }`}
            >
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {field.value
                .filter(option => option.trim() !== "")
                .map((option: string) => (
                  <SelectItem 
                    key={option} 
                    value={option} 
                    className="text-xl py-2"
                  >
                    {option}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        )

      case "date":
        return (
          <div className="space-y-2">
            <DatePicker
              name={field.name}
              value={value}
              onChange={(newValue) => handleFieldChange(newValue)}
              disabled={isNAChecked}
              placeholder={field.text_phrase}
              className={field.optional ? '' : undefined}
            />
          </div>
        )

      default:
        return null
    }
  }

  const renderNACheckbox = () => {
    if (!field.has_na_checkbox || !field.na_checkbox_id) return null;

    // Determine if this is a standalone field (not part of date/SSN group)
    const isStandalone = !field.text_phrase?.includes('Date') && 
                        !field.text_phrase?.includes('Social Security Number');

    return (
      <div className={`flex items-center ${isStandalone ? 'flex-shrink-0' : 'ml-4'}`}>
        <Checkbox
          id={field.na_checkbox_id}
          checked={isNAChecked}
          onCheckedChange={handleNACheckboxChange}
          className={`${isEmpty ? 'border-red-300' : 'border-green-300'} ${isStandalone ? 'h-6 w-6' : 'h-4 w-4'}`}
        />
        <Label 
          htmlFor={field.na_checkbox_id}
          className={`text-base text-gray-500 ${isStandalone ? 'ml-3' : 'ml-2'} whitespace-nowrap`}
        >
          {field.na_checkbox_text || "Does Not Apply"}
        </Label>
      </div>
    );
  };

  return (
    <div className={`w-full ${!visible ? 'hidden' : ''}`}>
      <div className="space-y-2">
        {field.type !== 'radio' && field.text_phrase && (
          <Label htmlFor={field.name} className="text-lg font-medium">{field.text_phrase}</Label>
        )}
        {field.has_na_checkbox && (field.type === "text" || field.type === "textarea") ? (
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              {renderField()}
            </div>
            {renderNACheckbox()}
          </div>
        ) : (
          <>
            {renderField()}
            {field.has_na_checkbox && renderNACheckbox()}
          </>
        )}
      </div>
    </div>
  )
} 
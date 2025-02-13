"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import type { FormField as FormFieldType } from "@/types/form-definition"
import { useState, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DateField } from "./DateField"
import { DatePicker } from "./DatePicker"
import { debugLog } from "@/utils/consoleLogger"

interface FormFieldProps {
  field: FormFieldType & {
    type: "text" | "textarea" | "radio" | "dropdown" | "date"
  }
  value: string
  onChange: (name: string, value: string) => void
  visible: boolean
  dependencies?: Record<string, any>
  onDependencyChange?: (key: string, field: FormFieldType) => void
}

export function FormField({ field, value, onChange, visible, dependencies, onDependencyChange }: FormFieldProps) {
  // Initialize NA checkbox state based on value
  const [isNAChecked, setIsNAChecked] = useState(() => {
    const initialState = value === "N/A";
    debugLog('all_pages', `Initializing NA checkbox for ${field.name}:`, {
      value,
      isNA: initialState,
      naCheckboxId: field.na_checkbox_id
    });
    return initialState;
  });

  // Update NA state when value changes from outside
  useEffect(() => {
    const newState = value === "N/A";
    debugLog('all_pages', `Updating NA checkbox for ${field.name}:`, {
      value,
      newState,
      naCheckboxId: field.na_checkbox_id
    });
    setIsNAChecked(newState);
  }, [value]);

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
      console.log('Dropdown dependency initial evaluation - key:', key)
      onDependencyChange(key, field)
    }
  }, [value])  // run on mount and when value changes

  if (!visible) return null

  const handleRadioChange = (value: string) => {
    onChange(field.name, value)
    if (onDependencyChange) {
      const buttonId = field.button_ids?.[value]
      if (buttonId) {
        console.log('Radio change - Button ID:', buttonId)
        const key = `${buttonId}.${value}`
        console.log('Radio change - Constructed key:', key)
        onDependencyChange(key, field)
      }
    }
  }

  const handleNACheckboxChange = (checked: boolean) => {
    debugLog('all_pages', `NA Checkbox changed for ${field.name}:`, {
      checked,
      field_id: field.name,
      na_checkbox_id: field.na_checkbox_id
    });
    
    setIsNAChecked(checked);
    if (checked) {
      onChange(field.name, "N/A");
      if (field.na_checkbox_id) {
        debugLog('all_pages', `Updating NA checkbox state:`, {
          id: field.na_checkbox_id,
          value: "true"
        });
        onChange(field.na_checkbox_id, "true");
      }
    } else {
      onChange(field.name, "");
      if (field.na_checkbox_id) {
        debugLog('all_pages', `Updating NA checkbox state:`, {
          id: field.na_checkbox_id,
          value: "false"
        });
        onChange(field.na_checkbox_id, "false");
      }
    }
  };

  const renderRadioButton = () => {
    if (!Array.isArray(field.value) || !field.labels) return null;
    
    return (
      <div className="flex items-start justify-between gap-4">
        <div className="flex-grow">
          <p className="text-sm font-medium text-gray-800 my-auto">{field.text_phrase}</p>
        </div>
        <div className="min-w-[200px]">
          <Tabs
            value={value}
            onValueChange={(value) => handleRadioChange(value)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              {field.value.map((option: string, index: number) => (
                <TabsTrigger
                  key={option}
                  value={option}
                  id={field.button_ids?.[option]}
                  className="font-medium border border-gray-300 data-[state=active]:bg-gray-200 data-[state=active]:border-gray-400 data-[state=inactive]:bg-white data-[state=inactive]:hover:bg-gray-50"
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
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            maxLength={field.maxlength ? parseInt(field.maxlength) : undefined}
            disabled={isNAChecked}
          />
        )

      case "textarea":
        return (
          <Textarea
            id={field.name}
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            maxLength={field.maxlength ? parseInt(field.maxlength) : undefined}
            disabled={isNAChecked}
            className="min-h-[100px]"
          />
        )

      case "radio":
        return renderRadioButton()

      case "dropdown":
        if (!Array.isArray(field.value) || field.value.length === 0) return null
        return (
          <Select 
            value={value || ""}
            onValueChange={(value) => {
              onChange(field.name, value)
              if (onDependencyChange) {
                const key = `${field.name}.${value}`
                console.log('Dropdown change - Constructed key:', key)
                onDependencyChange(key, field)
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {field.value
                .filter(option => option.trim() !== "")
                .map((option: string) => (
                  <SelectItem key={option} value={option}>
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
              onChange={(newValue) => onChange(field.name, newValue)}
              disabled={isNAChecked}
              placeholder={field.text_phrase}
            />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className={`w-full ${!visible ? 'hidden' : ''}`}>
      <div className="space-y-2">
        {field.type !== 'radio' && field.text_phrase && (
          <Label htmlFor={field.name}>{field.text_phrase}</Label>
        )}
        {field.has_na_checkbox && (field.type === "text" || field.type === "textarea") ? (
          <div className="flex items-center">
            {renderField()}
            <div className="ml-2 flex-shrink-0 flex items-center">
              <Checkbox 
                id={field.na_checkbox_id || field.name.replace('tbx', 'cbex') + '_NA'}
                checked={isNAChecked} 
                onCheckedChange={handleNACheckboxChange}
                className="w-6 h-6"
              />
              <Label 
                htmlFor={field.na_checkbox_id || field.name.replace('tbx', 'cbex') + '_NA'}
                className="ml-2 text-sm text-gray-500"
              >
                {field.na_checkbox_text || "Does Not Apply"}
              </Label>
            </div>
          </div>
        ) : (
          <>
            {renderField()}
            {field.has_na_checkbox && (
              <div className="flex items-center gap-2 mt-1">
                <Checkbox 
                  id={field.na_checkbox_id || field.name.replace('tbx', 'cbex') + '_NA'}
                  checked={isNAChecked} 
                  onCheckedChange={handleNACheckboxChange}
                />
                <Label 
                  htmlFor={field.na_checkbox_id || field.name.replace('tbx', 'cbex') + '_NA'}
                  className="text-sm text-gray-500"
                >
                  {field.na_checkbox_text || "Does Not Apply"}
                </Label>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
} 
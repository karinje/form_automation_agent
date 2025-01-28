"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import type { FormField as FormFieldType } from "@/types/form-definition"

interface FormFieldProps {
  field: FormFieldType
  value: string
  onChange: (name: string, value: string) => void
  visible: boolean
  dependencies?: Record<string, any>
  onDependencyChange?: (key: string, field: FormFieldType) => void
}

export function FormField({ field, value, onChange, visible, dependencies, onDependencyChange }: FormFieldProps) {
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
          />
        )

      case "radio":
        if (!Array.isArray(field.value) || !Array.isArray(field.labels)) return null
        return (
          <RadioGroup value={value} onValueChange={handleRadioChange}>
            <div className="space-y-2">
              {field.value.map((option, index) => (
                <div key={option} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${field.name}-${option}`} />
                  <Label htmlFor={`${field.name}-${option}`}>{field.labels[index]}</Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        )

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

      default:
        return null
    }
  }

  return (
    <div className="space-y-2">
      {field.parent_text_phrase && (
        <div className="font-medium text-sm text-gray-500">{field.parent_text_phrase}</div>
      )}
      {field.text_phrase && <Label htmlFor={field.name}>{field.text_phrase}</Label>}
      {renderField()}
    </div>
  )
} 
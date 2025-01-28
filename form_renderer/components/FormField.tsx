"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import type { FormField as FormFieldType } from "@/types/form-definition"
import { useState } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface FormFieldProps {
  field: FormFieldType
  value: string
  onChange: (name: string, value: string) => void
  visible: boolean
  dependencies?: Record<string, any>
  onDependencyChange?: (key: string, field: FormFieldType) => void
}

export function FormField({ field, value, onChange, visible, dependencies, onDependencyChange }: FormFieldProps) {
  const [isNAChecked, setIsNAChecked] = useState(false)

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
    setIsNAChecked(checked)
    if (checked) {
      onChange(field.name, "N/A")
    } else {
      onChange(field.name, "")
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
        if (!Array.isArray(field.value) || !Array.isArray(field.labels)) return null
        return (
          <Tabs
            value={value}
            onValueChange={(value) => handleRadioChange(value)}
            className="w-[200px]"
          >
            <TabsList className="grid w-full grid-cols-2 bg-muted p-1 text-muted-foreground">
              {field.value.map((option, index) => (
                <TabsTrigger
                  key={option}
                  value={option}
                  id={`${field.name}-${option}`}
                  className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  {field.labels[index]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
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
      <div className="space-y-2">
        {field.text_phrase && <Label htmlFor={field.name}>{field.text_phrase}</Label>}
        <div className="flex items-start space-x-4">
          <div className="flex-grow">{renderField()}</div>
          {(field.type === "text" || field.type === "textarea") && field.has_na_checkbox && (
            <div className="flex items-center space-x-2 mt-1">
              <Checkbox 
                id={`${field.name}-na`} 
                checked={isNAChecked} 
                onCheckedChange={handleNACheckboxChange}
              />
              <Label htmlFor={`${field.name}-na`} className="text-sm text-gray-500">
                N/A
              </Label>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 
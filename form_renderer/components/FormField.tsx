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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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

  const renderRadioButton = () => {
    if (!field.value || !field.labels) return null
    
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
                  {field.labels[index]}
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
        {renderField()}
        {field.has_na_checkbox && (field.type === "text" || field.type === "textarea") && (
          <div className="flex items-center gap-2 mt-1">
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
  )
} 
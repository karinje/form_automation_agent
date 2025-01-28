import { useState } from "react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

interface FormFieldProps {
  field: any
  value: string
  onChange: (name: string, value: string) => void
  visible: boolean
}

export default function FormField({ field, value, onChange, visible }: FormFieldProps) {
  const [isNAChecked, setIsNAChecked] = useState(false)

  if (!visible) return null

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
      case "radio":
        return (
          <RadioGroup value={value} onValueChange={(value) => onChange(field.name, value)} className="flex space-x-4">
            {field.value.map((option: string, index: number) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={field.button_ids[option]} />
                <Label htmlFor={field.button_ids[option]} className="text-sm font-medium text-gray-700">
                  {field.labels[index]}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )
      case "text":
        return (
          <Input
            type="text"
            id={field.name}
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            maxLength={field.maxlength}
            disabled={isNAChecked}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        )
      case "textarea":
        return (
          <Textarea
            id={field.name}
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            maxLength={field.maxlength}
            disabled={isNAChecked}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        )
      case "dropdown":
        return (
          <Select onValueChange={(value) => onChange(field.name, value)} value={value} disabled={isNAChecked}>
            <SelectTrigger className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {field.value.map((option: string) => (
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
      <Label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
        {field.text_phrase}
      </Label>
      {renderField()}
      {field.has_na_checkbox && (
        <div className="flex items-center space-x-2 mt-1">
          <Checkbox id={`${field.name}-na`} checked={isNAChecked} onCheckedChange={handleNACheckboxChange} />
          <Label htmlFor={`${field.name}-na`} className="text-sm text-gray-600">
            N/A
          </Label>
        </div>
      )}
    </div>
  )
}


import { useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { FormField as FormFieldType } from "@/types/form-definition"

interface SSNFieldGroup {
  basePhrase: string
  number1Field: FormFieldType
  number2Field: FormFieldType
  number3Field: FormFieldType
}

interface SSNFieldGroupProps {
  ssnGroup: SSNFieldGroup
  values: Record<string, string>
  onChange: (name: string, value: string) => void
  visible: boolean
}

const SSNFieldGroup = ({ ssnGroup, values, onChange, visible }: SSNFieldGroupProps) => {
  const { number1Field, number2Field, number3Field } = ssnGroup

  const handleSSNChange = (part: number, value: string) => {
    const field = part === 1 ? number1Field 
                : part === 2 ? number2Field 
                : number3Field
    
    // Only allow numbers and limit length
    const maxLength = part === 1 ? 3 : part === 2 ? 2 : 4
    const sanitizedValue = value.replace(/\D/g, '').slice(0, maxLength)
    
    onChange(field.name, sanitizedValue)

    // Auto-focus next input when current is filled
    if (sanitizedValue.length === maxLength) {
      const nextInput = document.querySelector(
        `input[name="${part === 1 ? number2Field.name 
                    : part === 2 ? number3Field.name 
                    : number3Field.name}"]`
      ) as HTMLInputElement
      if (nextInput && part !== 3) nextInput.focus()
    }
  }

  if (!visible) return null

  return (
    <div className="flex flex-col space-y-2">
      <Label>Social Security Number</Label>
      <div className="flex items-center gap-2">
        <Input
          type="text"
          name={number1Field.name}
          value={values[number1Field.name] || ''}
          onChange={(e) => handleSSNChange(1, e.target.value)}
          className="w-16"
          placeholder="XXX"
          maxLength={3}
        />
        <span className="text-gray-500">-</span>
        <Input
          type="text"
          name={number2Field.name}
          value={values[number2Field.name] || ''}
          onChange={(e) => handleSSNChange(2, e.target.value)}
          className="w-12"
          placeholder="XX"
          maxLength={2}
        />
        <span className="text-gray-500">-</span>
        <Input
          type="text"
          name={number3Field.name}
          value={values[number3Field.name] || ''}
          onChange={(e) => handleSSNChange(3, e.target.value)}
          className="w-20"
          placeholder="XXXX"
          maxLength={4}
        />
      </div>
    </div>
  )
}

export default SSNFieldGroup
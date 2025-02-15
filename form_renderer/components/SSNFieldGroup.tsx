import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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

export default function SSNFieldGroup({ ssnGroup, values, onChange, visible }: SSNFieldGroupProps) {
  // Check if any field has NA to determine initial state
  const [isNAChecked, setIsNAChecked] = useState(() => {
    return values[ssnGroup.number1Field.name] === "N/A" ||
           values[ssnGroup.number2Field.name] === "N/A" ||
           values[ssnGroup.number3Field.name] === "N/A";
  });

  const handleNACheckboxChange = (checked: boolean) => {
    setIsNAChecked(checked);
    const value = checked ? "N/A" : "";
    
    // Update all three fields
    onChange(ssnGroup.number1Field.name, value);
    onChange(ssnGroup.number2Field.name, value);
    onChange(ssnGroup.number3Field.name, value);

    // Update the NA checkbox state using the standardized na_checkbox_id
    if (ssnGroup.number1Field.na_checkbox_id) {
      onChange(ssnGroup.number1Field.na_checkbox_id, checked ? "true" : "false");
    }
  };

  if (!visible) return null

  return (
    <div className="space-y-2">
      <Label>{ssnGroup.basePhrase}</Label>
      <div className="flex items-center gap-4">
        <div className="flex-grow flex items-center gap-2">
          <Input
            type="text"
            maxLength={3}
            value={values[ssnGroup.number1Field.name] || ''}
            onChange={(e) => onChange(ssnGroup.number1Field.name, e.target.value)}
            disabled={isNAChecked}
            className="w-20"
          />
          <span>-</span>
          <Input
            type="text"
            maxLength={2}
            value={values[ssnGroup.number2Field.name] || ''}
            onChange={(e) => onChange(ssnGroup.number2Field.name, e.target.value)}
            disabled={isNAChecked}
            className="w-16"
          />
          <span>-</span>
          <Input
            type="text"
            maxLength={4}
            value={values[ssnGroup.number3Field.name] || ''}
            onChange={(e) => onChange(ssnGroup.number3Field.name, e.target.value)}
            disabled={isNAChecked}
            className="w-24"
          />
        </div>
        {ssnGroup.number1Field.has_na_checkbox && ssnGroup.number1Field.na_checkbox_id && (
          <div className="flex items-center">
            <Checkbox
              id={ssnGroup.number1Field.na_checkbox_id}
              checked={isNAChecked}
              onCheckedChange={handleNACheckboxChange}
              className="w-6 h-6"
            />
            <Label 
              htmlFor={ssnGroup.number1Field.na_checkbox_id}
              className="text-sm text-gray-500 ml-2"
            >
              {ssnGroup.number1Field.na_checkbox_text || "Does Not Apply"}
            </Label>
          </div>
        )}
      </div>
    </div>
  )
}
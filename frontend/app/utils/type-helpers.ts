import type { FormDefinition, FormField } from "@/types/form-definition"

export function assertFormType(field: any): field is FormField {
  const validTypes = ["dropdown", "text", "textarea", "radio", "date"] as const
  return validTypes.includes(field.type)
}

export function assertFormDefinition(json: any): FormDefinition {
  const formDef = json as FormDefinition
  formDef.fields = formDef.fields.map(field => ({
    ...field,
    type: field.type as "dropdown" | "text" | "textarea" | "radio" | "date"
  }))
  return formDef
} 
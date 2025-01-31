export interface FormField {
  name: string
  type: "radio" | "text" | "textarea" | "dropdown"
  value: string | string[]
  labels?: string[]
  button_ids?: Record<string, string>
  text_phrase: string
  parent_text_phrase: string
  maxlength?: string
  has_na_checkbox?: boolean
}

export interface Dependency {
  shows: FormField[]
  hides: any[]
  dependencies: Record<string, Dependency> | null
}

export interface FormDefinition {
  fields: FormField[]
  dependencies?: Record<string, Dependency>
  buttons: {
    id: string
    name: string
    type: string
    value: string
  }[]
}


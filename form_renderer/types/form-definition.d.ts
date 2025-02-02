export interface FormField {
  name: string
  type: "radio" | "text" | "textarea" | "dropdown"
  value: string | string[]
  labels?: string[]
  text_phrase?: string
  parent_text_phrase?: string
  maxlength?: string
  has_na_checkbox?: boolean
  button_ids?: Record<string, string>
}

export interface Dependency {
  shows: FormField[]
  hides: FormField[]
  dependencies?: Record<string, Dependency>
}

export interface FormDefinition {
  fields: FormField[]
  dependencies?: Record<string, Dependency>
  buttons?: {
    id: string
    name: string
    type: string
    value: string
  }[]
}

export interface DateFieldGroup {
  basePhrase: string;
  dayField: FormField;
  monthField: FormField;
  yearField: FormField;
}
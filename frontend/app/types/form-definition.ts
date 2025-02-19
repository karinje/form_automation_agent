export type FormFieldType = "dropdown" | "text" | "textarea" | "radio" | "date";

export interface FormField {
  name: string;
  type: FormFieldType;
  value: string | string[];
  text_phrase?: string;
  parent_text_phrase?: string;
  maxlength?: string;
  has_na_checkbox?: boolean;
  na_checkbox_id?: string;
  na_checkbox_text?: string;
  labels?: string[];
  button_ids?: Record<string, string>;
  help_text?: string;
  optional?: boolean;
  add_group?: boolean;
}

export interface Dependency {
  shows: FormField[];
  hides: FormField[];
  dependencies?: Record<string, Dependency>;
}

export interface Button {
  id: string;
  text: string;
}

export interface FormDefinition {
  fields: FormField[];
  dependencies: Record<string, Dependency>;
  buttons: Button[];
}

export interface DateFieldGroup {
  basePhrase: string;
  dayField: FormField;
  monthField: FormField;
  yearField: FormField;
}

export interface ArrayGroup {
  fieldId: string;
  values: Array<Record<string, string>>;
}

export interface FormState {
  formData: Record<string, string>;
  arrayGroups: Record<string, Array<Record<string, string>>>;
}

// Add type for form categories
export type FormCategory = {
  title: string;
  definition: FormDefinition;
  pageName: string;
}

export type FormCategories = {
  [key: string]: FormCategory[];
} 
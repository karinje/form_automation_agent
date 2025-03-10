export type FormFieldType = 'text' | 'textarea' | 'radio' | 'dropdown' | 'date';

export interface FormField {
  name: string;
  type: FormFieldType;
  value: string | string[];
  text_phrase: string;
  parent_text_phrase: string;
  maxlength?: string;
  has_na_checkbox?: boolean;
  na_checkbox_id?: string;
  na_checkbox_text?: string;
  labels?: string[];
  button_ids?: Record<string, string>;
  help_text?: string;
  help_text_phrase?: string;
  optional?: boolean;
  add_group?: boolean;
  add_group_button_id?: string;
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
export interface FormCategory {
  title: string;
  definition: FormDefinition;
  pageName: string;
  isVisible?: boolean | ((formData: Record<string, string>) => boolean);
}

export interface FormCategories {
  personal: FormCategory[];
  travel: FormCategory[];
  education: FormCategory[];
  security: FormCategory[];
}

export interface YamlData {
  [key: string]: any;
  security_page?: {
    privacy_agreement: boolean;
    security_question: string;
    security_answer: string;
    button_clicks: number[];
  };
  start_page: {
    language: string;
    location: string;
    button_clicks: number[];
  };
  retrieve_page: {
    application_id?: string;
    surname: string;
    year: string;
    security_question: string;
    security_answer: string;
    button_clicks: number[];
  };
} 
import { useState, useEffect } from "react"
import FormField from "./FormField"

interface DynamicFormProps {
  formDefinition: any
  formData: any
  onInputChange: (name: string, value: string) => void
}

export default function DynamicForm({ formDefinition, formData, onInputChange }: DynamicFormProps) {
  const [visibleFields, setVisibleFields] = useState<string[]>([])

  useEffect(() => {
    const initialFields = formDefinition.fields.map((field: any) => field.name)
    setVisibleFields(initialFields)
  }, [formDefinition])

  useEffect(() => {
    updateVisibleFields()
  }, [formDefinition, formData]) // Updated dependency array

  const updateVisibleFields = () => {
    const newVisibleFields = [...formDefinition.fields.map((field: any) => field.name)]

    const checkDependencies = (dependencies: any) => {
      Object.entries(dependencies).forEach(([key, value]: [string, any]) => {
        const [fieldName, fieldValue] = key.split(".")
        if (formData[fieldName] === fieldValue) {
          value.shows.forEach((field: any) => {
            newVisibleFields.push(field.name)
          })
          if (value.dependencies) {
            checkDependencies(value.dependencies)
          }
        }
      })
    }

    if (formDefinition.dependencies) {
      checkDependencies(formDefinition.dependencies)
    }

    setVisibleFields(newVisibleFields)
  }

  const renderFields = (fields: any[]) => {
    return fields.map((field: any) => (
      <FormField
        key={field.name}
        field={field}
        value={formData[field.name] || ""}
        onChange={onInputChange}
        visible={visibleFields.includes(field.name)}
      />
    ))
  }

  const renderDependentFields = (dependency: any) => {
    return (
      <>
        {renderFields(dependency.shows)}
        {dependency.dependencies &&
          Object.entries(dependency.dependencies).map(([key, value]: [string, any]) => renderDependentFields(value))}
      </>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {renderFields(formDefinition.fields)}
        {formDefinition.dependencies &&
          Object.entries(formDefinition.dependencies).map(([key, value]: [string, any]) =>
            renderDependentFields(value),
          )}
      </div>
    </div>
  )
}


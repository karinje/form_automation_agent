"use client"

import { useState, useEffect } from "react"
import { FormField } from "@/components/FormField"
import { Button } from "@/components/ui/button"
import type { FormDefinition, FormField as FormFieldType, Dependency } from "@/types/form-definition"

interface DynamicFormProps {
  formDefinition: FormDefinition
  formData: Record<string, string>
  onInputChange: (name: string, value: string) => void
}

export default function DynamicForm({ formDefinition, formData, onInputChange }: DynamicFormProps) {
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set())
  const [orderedFields, setOrderedFields] = useState<FormFieldType[]>([])
  // Track which fields were shown by which dependency
  const [fieldDependencyMap, setFieldDependencyMap] = useState<Map<string, Set<string>>>(new Map())

  useEffect(() => {
    const initialFields = new Set(formDefinition.fields.map((field) => field.name))
    setVisibleFields(initialFields)
    setOrderedFields(formDefinition.fields)
  }, [formDefinition])

  // Helper to get all dependent fields recursively from a dependency
  const getAllDependentFields = (dep: Dependency): Set<string> => {
    const fields = new Set<string>()
    
    // Add current level shows/hides
    dep.shows.forEach(field => fields.add(field.name))
    dep.hides.forEach(field => fields.add(field.name))
    
    // Recursively add nested dependencies
    if (dep.dependencies) {
      Object.values(dep.dependencies).forEach(childDep => {
        const childFields = getAllDependentFields(childDep)
        childFields.forEach(field => fields.add(field))
      })
    }
    return fields
  }

  // Helper to get all fields that need to be cleaned up for a parent field
  const getFieldsToCleanup = (parentFieldName: string): Set<string> => {
    const fieldsToCleanup = new Set<string>()
    
    // Get all fields that were shown by this parent's dependencies
    const shownFields = fieldDependencyMap.get(parentFieldName) || new Set()
    shownFields.forEach(field => {
      fieldsToCleanup.add(field)
      // Also get any fields that were shown by this field
      const nestedFields = fieldDependencyMap.get(field) || new Set()
      nestedFields.forEach(nestedField => fieldsToCleanup.add(nestedField))
    })
    
    return fieldsToCleanup
  }

  const findDependency = (deps: Record<string, Dependency> | undefined, searchKey: string): Dependency | undefined => {
    if (!deps) return undefined
    
    const directDep = deps[searchKey]
    if (directDep) return directDep

    // Search in nested dependencies
    for (const dep of Object.values(deps)) {
      if (dep.dependencies) {
        const nestedDep = findDependency(dep.dependencies, searchKey)
        if (nestedDep) return nestedDep
      }
    }
    return undefined
  }

  const handleDependencyChange = (key: string, parentField?: FormFieldType) => {
    console.log('Checking dependencies for key:', key)
    console.log('Parent field name:', parentField?.name)
    
    if (parentField) {
      const newVisibleFields = new Set(visibleFields)
      const newOrderedFields = [...orderedFields]
      const newFieldDependencyMap = new Map(fieldDependencyMap)

      // First, clean up ALL fields related to this parent
      const fieldsToCleanup = getFieldsToCleanup(parentField.name)
      console.log('Fields to cleanup:', Array.from(fieldsToCleanup))
      
      // Remove all dependent fields and their mappings
      fieldsToCleanup.forEach(fieldName => {
        newVisibleFields.delete(fieldName)
        const index = newOrderedFields.findIndex(f => f.name === fieldName)
        if (index !== -1) {
          console.log('Removing field:', fieldName)
          newOrderedFields.splice(index, 1)
        }
        // Clean up the dependency map
        newFieldDependencyMap.delete(fieldName)
      })
      // Clear the parent's shown fields
      newFieldDependencyMap.delete(parentField.name)

      // Find dependency for new selection
      const dependency = findDependency(formDefinition.dependencies, key)
      console.log('Found dependency for new selection:', dependency)

      // Only add new fields if there are dependencies AND shows for the current selection
      if (dependency?.shows?.length > 0) {
        const insertIndex = newOrderedFields.findIndex(f => f.name === parentField.name) + 1
        const shownFields = new Set<string>()
        
        dependency.shows.forEach(field => {
          console.log('Adding field:', field.name)
          newVisibleFields.add(field.name)
          shownFields.add(field.name)
          if (!newOrderedFields.find(f => f.name === field.name)) {
            newOrderedFields.splice(insertIndex, 0, field)
          }
        })
        
        // Update the dependency map
        newFieldDependencyMap.set(parentField.name, shownFields)
      }

      console.log('Final visible fields:', Array.from(newVisibleFields))
      console.log('Final ordered fields:', newOrderedFields.map(f => f.name))
      console.log('Field dependency map:', Object.fromEntries(newFieldDependencyMap))

      setVisibleFields(newVisibleFields)
      setOrderedFields(newOrderedFields)
      setFieldDependencyMap(newFieldDependencyMap)
    }
  }

  const handleInputChange = (name: string, value: string) => {
    onInputChange(name, value)
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-1">
        {orderedFields.map((field) => (
          <FormField
            key={field.name}
            field={field}
            value={formData[field.name] || ""}
            onChange={handleInputChange}
            visible={visibleFields.has(field.name)}
            dependencies={formDefinition.dependencies}
            onDependencyChange={(key) => handleDependencyChange(key, field)}
          />
        ))}
      </div>
      <div className="flex justify-end space-x-4">
        {formDefinition.buttons?.map((button) => (
          <Button key={button.id} type={button.type as "button" | "submit"}>
            {button.value}
          </Button>
        ))}
      </div>
    </div>
  )
} 
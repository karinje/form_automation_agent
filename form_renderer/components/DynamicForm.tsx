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
    
    // Look through all dependencies to find ones related to this parent
    Object.entries(formDefinition.dependencies || {}).forEach(([depKey, dep]) => {
      // Check if this dependency key starts with the base parent field name
      // Convert ctl00$SiteContentPlaceHolder$FormView1$rblPREV_US_TRAVEL_IND to 
      // ctl00_SiteContentPlaceHolder_FormView1_rblPREV_US_TRAVEL_IND
      const baseFieldName = parentFieldName.replace(/\$/g, '_')
      if (depKey.startsWith(baseFieldName)) {
        // Get all fields from this dependency branch
        if (dep.shows) {
          dep.shows.forEach(field => fieldsToCleanup.add(field.name))
        }
        
        // If this dependency has nested dependencies, get their fields too
        if (dep.dependencies) {
          Object.values(dep.dependencies).forEach(nestedDep => {
            if (nestedDep.shows) {
              nestedDep.shows.forEach(field => fieldsToCleanup.add(field.name))
            }
          })
        }
      }
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

      // First, clean up ALL fields related to this parent
      const fieldsToCleanup = getFieldsToCleanup(parentField.name)
      console.log('Fields to cleanup:', Array.from(fieldsToCleanup))
      
      // Remove all dependent fields first
      fieldsToCleanup.forEach(fieldName => {
        newVisibleFields.delete(fieldName)
        const index = newOrderedFields.findIndex(f => f.name === fieldName)
        if (index !== -1) {
          console.log('Removing field:', fieldName)
          newOrderedFields.splice(index, 1)
        }
      })

      // Find dependency for new selection
      const dependency = findDependency(formDefinition.dependencies, key)
      console.log('Found dependency for new selection:', dependency)

      // Only add new fields if there are dependencies AND shows for the current selection
      if (dependency?.shows?.length > 0) {
        const insertIndex = newOrderedFields.findIndex(f => f.name === parentField.name) + 1
        
        dependency.shows.forEach(field => {
          console.log('Adding field:', field.name)
          newVisibleFields.add(field.name)
          if (!newOrderedFields.find(f => f.name === field.name)) {
            newOrderedFields.splice(insertIndex, 0, field)
          }
        })
      }

      console.log('Final visible fields:', Array.from(newVisibleFields))
      console.log('Final ordered fields:', newOrderedFields.map(f => f.name))

      setVisibleFields(newVisibleFields)
      setOrderedFields(newOrderedFields)
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
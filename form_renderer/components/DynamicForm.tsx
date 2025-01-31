"use client"

import { useState, useEffect } from "react"
import { FormField } from "@/components/FormField"
import { Button } from "@/components/ui/button"
import type { FormDefinition, FormField as FormFieldType, Dependency } from "@/types/form-definition"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import yaml from 'js-yaml'

interface DynamicFormProps {
  formDefinition: FormDefinition
  formData: Record<string, string>
  onInputChange: (name: string, value: string) => void
}

// Add interface to track dependency hierarchy
interface DependencyLevel {
  parentField: FormFieldType;
  fields: FormFieldType[];
  level: number;
}

// Add a new interface to track dependency chain
interface DependencyChain {
  parentField: FormFieldType;
  childFields: FormFieldType[];
  parentChainId?: string; // Links to parent's chain
}

const getDependencyLevel = (fieldName: string, groups: DependencyLevel[]): number => {
  const group = groups.find(g => 
    g.fields.some(f => f.name === fieldName)
  )
  return group?.level ?? 0
}

// Modify groupFieldsByParent to handle dependency levels differently
const groupFieldsByParent = (fields: FormFieldType[], chains: DependencyChain[]): FormFieldType[][] => {
  console.log('Starting groupFieldsByParent:', {
    totalFields: fields.length,
    totalChains: chains.length
  })
  
  const result: FormFieldType[][] = []
  const processedFields = new Set<string>()
  
  // Helper to process a field and its dependencies recursively
  const processFieldWithDependencies = (field: FormFieldType, isBaseField: boolean = true) => {
    console.log('Processing field:', {
      fieldName: field.name,
      isBaseField,
      alreadyProcessed: processedFields.has(field.name)
    })

    if (processedFields.has(field.name)) return
    processedFields.add(field.name)
    
    // Add field to result if it's a base field
    if (isBaseField) {
      console.log('Adding base field to result:', field.name)
      result.push([field])
    }
    
    // Find direct dependencies of this field
    const chain = chains.find(c => c.parentField.name === field.name)
    if (chain) {
      console.log('Found dependency chain:', {
        parentField: field.name,
        dependencyCount: chain.childFields.length
      })

      const dependencyGroup: FormFieldType[] = []
      
      chain.childFields.forEach(depField => {
        // Add the dependency field
        dependencyGroup.push(depField)
        console.log('Added dependency to group:', {
          parentField: field.name,
          dependencyField: depField.name
        })
        
        // Check for nested dependencies (grandchildren)
        const nestedChain = chains.find(c => c.parentField.name === depField.name)
        if (nestedChain) {
          console.log('Found nested dependencies:', {
            parentField: depField.name,
            nestedCount: nestedChain.childFields.length
          })
          
          // Add nested dependencies right after their parent
          nestedChain.childFields.forEach(nestedField => {
            if (!processedFields.has(nestedField.name)) {
              dependencyGroup.push(nestedField)
              processedFields.add(nestedField.name)
              console.log('Added nested dependency:', {
                parentField: depField.name,
                nestedField: nestedField.name
              })
            }
          })
        }
      })
      
      if (dependencyGroup.length > 0) {
        console.log('Adding dependency group to result:', {
          parentField: field.name,
          groupSize: dependencyGroup.length,
          fields: dependencyGroup.map(f => f.name)
        })
        result.push(dependencyGroup)
      }
    }
  }
  
  // Process base fields first
  const baseFields = fields.filter(field => 
    !chains.some(chain => 
      chain.childFields.some(cf => cf.name === field.name)
    )
  )
  
  console.log('Found base fields:', baseFields.map(f => f.name))
  
  baseFields.forEach(field => {
    processFieldWithDependencies(field)
  })

  console.log('Final grouped result:', {
    totalGroups: result.length,
    groups: result.map(group => ({
      size: group.length,
      fields: group.map(f => f.name)
    }))
  })
  
  return result
}

const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, onFormDataLoad: (data: Record<string, any>) => void) => {
  const file = e.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (event) => {
    try {
      const yamlContent = event.target?.result as string
      const data = yaml.load(yamlContent) as Record<string, any>
      console.log('Loaded YAML data:', data)
      onFormDataLoad(data)
    } catch (error) {
      console.error('Error parsing YAML:', error)
    }
  }
  reader.readAsText(file)
}

export default function DynamicForm({ formDefinition, formData, onInputChange }: DynamicFormProps) {
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set())
  const [dependencyChains, setDependencyChains] = useState<DependencyChain[]>([])
  const [orderedFields, setOrderedFields] = useState<FormFieldType[]>([])

  useEffect(() => {
    console.log('Initializing form with fields:', formDefinition.fields)
    const initialFields = new Set(formDefinition.fields.map((field) => field.name))
    setVisibleFields(initialFields)
    setOrderedFields(formDefinition.fields)
    
    // Initialize dependency chains based on existing form data
    const initialChains: DependencyChain[] = []
    formDefinition.fields.forEach(field => {
      // For radio buttons, construct the key based on selected value
      if (field.type === 'radio' && formData[field.name]) {
        const selectedValue = formData[field.name]
        const buttonId = field.button_ids?.[selectedValue]
        if (buttonId) {
          const key = `${buttonId}.${selectedValue}`
          console.log('Checking initial dependency for:', {
            field: field.name,
            key,
            value: selectedValue
          })
          
          const dependency = findDependency(formDefinition.dependencies, key)
          if (dependency?.shows?.length) {
            const newChain: DependencyChain = {
              parentField: field,
              childFields: dependency.shows
            }
            initialChains.push(newChain)
            dependency.shows.forEach(depField => initialFields.add(depField.name))
            
            // Check for nested dependencies
            dependency.shows.forEach(depField => {
              if (depField.type === 'radio' && formData[depField.name]) {
                const nestedValue = formData[depField.name]
                const nestedButtonId = depField.button_ids?.[nestedValue]
                if (nestedButtonId) {
                  const nestedKey = `${nestedButtonId}.${nestedValue}`
                  const nestedDep = findDependency(formDefinition.dependencies, nestedKey)
                  if (nestedDep?.shows?.length) {
                    const nestedChain: DependencyChain = {
                      parentField: depField,
                      childFields: nestedDep.shows,
                      parentChainId: field.name
                    }
                    initialChains.push(nestedChain)
                    nestedDep.shows.forEach(nestedField => initialFields.add(nestedField.name))
                  }
                }
              }
            })
          }
        }
      }
    })
    
    console.log('Initial dependency setup:', {
      chains: initialChains,
      visibleFields: Array.from(initialFields)
    })
    
    setDependencyChains(initialChains)
    setVisibleFields(initialFields)
    
  }, [formDefinition, formData]) // Added formData as dependency

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

  const handleDependencyChange = (key: string, parentField: FormFieldType) => {
    console.log('Handling dependency change:', {
      key,
      parentField: parentField.name,
      currentChains: dependencyChains
    })

    const newVisibleFields = new Set(visibleFields)
    const newDependencyChains = [...dependencyChains]
    
    // Find existing chain for this parent
    const existingChainIndex = newDependencyChains.findIndex(
      chain => chain.parentField.name === parentField.name
    )
    
    // Remove this chain and all its children
    if (existingChainIndex !== -1) {
      const chainsToRemove = getChildChains(newDependencyChains, existingChainIndex)
      chainsToRemove.forEach(chain => {
        chain.childFields.forEach(field => newVisibleFields.delete(field.name))
      })
      newDependencyChains.splice(existingChainIndex, chainsToRemove.length)
    }
    
    // Find and add new dependencies
    const dependency = findDependency(formDefinition.dependencies, key)
    if (dependency?.shows?.length) {
      const parentChainId = getParentChainId(newDependencyChains, parentField)
      const newChain: DependencyChain = {
        parentField,
        childFields: dependency.shows,
        parentChainId
      }
      
      // Insert chain after its parent chain
      const insertIndex = parentChainId 
        ? newDependencyChains.findIndex(c => c.parentField.name === parentChainId) + 1
        : newDependencyChains.length
      
      newDependencyChains.splice(insertIndex, 0, newChain)
      dependency.shows.forEach(field => newVisibleFields.add(field.name))
    }
    
    console.log('Updated chains:', newDependencyChains)
    setVisibleFields(newVisibleFields)
    setDependencyChains(newDependencyChains)
    updateOrderedFields(newDependencyChains)
  }

  // Helper to get all child chains that need to be removed
  const getChildChains = (chains: DependencyChain[], startIndex: number): DependencyChain[] => {
    const result: DependencyChain[] = []
    const parentChain = chains[startIndex]
    result.push(parentChain)
    
    // Recursively find all chains that depend on this one
    let currentIndex = startIndex + 1
    while (currentIndex < chains.length) {
      const chain = chains[currentIndex]
      if (chain.parentChainId === parentChain.parentField.name) {
        const childChains = getChildChains(chains, currentIndex)
        result.push(...childChains)
        currentIndex += childChains.length
      } else {
        currentIndex++
      }
    }
    
    return result
  }

  // Helper to find parent chain ID
  const getParentChainId = (chains: DependencyChain[], field: FormFieldType): string | undefined => {
    for (const chain of chains) {
      if (chain.childFields.some(f => f.name === field.name)) {
        return chain.parentField.name
      }
    }
    return undefined
  }

  // Modified to handle dependency chains
  const updateOrderedFields = (chains: DependencyChain[]) => {
    console.log('Updating ordered fields with chains:', chains)
    let newOrdered = [...formDefinition.fields]
    
    // Process chains in order, maintaining parent-child relationships
    chains.forEach(chain => {
      const parentIndex = newOrdered.findIndex(f => f.name === chain.parentField.name)
      if (parentIndex !== -1) {
        // Find insert position - after parent and any preceding siblings
        let insertIndex = parentIndex + 1
        const parentChainId = chain.parentChainId
        
        if (parentChainId) {
          // If this is a nested dependency, find the last field of the parent chain
          const parentChain = chains.find(c => c.parentField.name === parentChainId)
          if (parentChain) {
            const lastParentChildIndex = newOrdered.findIndex(
              f => f.name === parentChain.childFields[parentChain.childFields.length - 1].name
            )
            if (lastParentChildIndex !== -1) {
              insertIndex = lastParentChildIndex + 1
            }
          }
        }
        
        // Remove any existing instances of these fields
        newOrdered = newOrdered.filter(f => !chain.childFields.some(cf => cf.name === f.name))
        
        // Insert at the correct position
        newOrdered.splice(insertIndex, 0, ...chain.childFields)
      }
    })
    
    setOrderedFields(newOrdered)
  }

  const handleInputChange = (name: string, value: string) => {
    onInputChange(name, value)
  }

  return (
    <form onSubmit={handleInputChange} className="space-y-6">
      {groupFieldsByParent(orderedFields, dependencyChains).map((group, index) => {
        const isParentGroup = group.length === 1
        const parentField = isParentGroup ? group[0] : undefined
        const chain = parentField ? dependencyChains.find(c => c.parentField.name === parentField.name) : undefined
        const isDependencyGroup = !isParentGroup && dependencyChains.some(c => 
          group.some(f => c.childFields.includes(f))
        )
        
        console.log('Rendering group:', {
          index,
          isParentGroup,
          parentFieldName: parentField?.name,
          isDependencyGroup,
          hasParentChain: !!chain?.parentChainId,
          fields: group.map(f => f.name)
        })
        
        return (
          <div key={index} className={`
            ${isDependencyGroup ? 'border-2 border-gray-200 p-4 rounded-lg mt-2' : ''}
            ${chain?.parentChainId ? 'ml-4' : ''} // Indent nested dependencies
            ${isDependencyGroup ? 'space-y-6' : 'space-y-4'} // Increased spacing for dependency groups
          `}>
            {group.map(field => {
              console.log('Rendering field in group:', {
                groupIndex: index,
                fieldName: field.name,
                isVisible: visibleFields.has(field.name),
                hasOwnDependencies: dependencyChains.some(c => c.parentField.name === field.name)
              })
              
              return (
                <div key={field.name} className="space-y-6">
                  <FormField
                    field={field}
                    value={formData[field.name] || ''}
                    onChange={handleInputChange}
                    visible={visibleFields.has(field.name)}
                    onDependencyChange={(key) => handleDependencyChange(key, field)}
                  />
                </div>
              )
            })}
          </div>
        )
      })}
      
      <div className="flex justify-end space-x-4">
        {formDefinition.buttons?.map((button) => (
          <Button key={button.id} type={button.type as "button" | "submit"}>
            {button.value}
          </Button>
        ))}
      </div>
    </form>
  )
} 
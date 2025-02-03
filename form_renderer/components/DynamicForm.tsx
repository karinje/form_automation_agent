"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { FormProvider } from "react-hook-form"
import { formSchema, type FormValues } from "@/lib/schema"
import { FormField } from "@/components/FormField"
import { Button } from "@/components/ui/button"
import type { FormDefinition, FormField as FormFieldType, Dependency, DateFieldGroup } from "@/types/form-definition"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import yaml from 'js-yaml'
import DateFieldGroup from "@/components/DateFieldGroup"
import SSNFieldGroup from "@/components/SSNFieldGroup"

interface DynamicFormProps {
  formDefinition: FormDefinition
  formData: Record<string, string>
  onInputChange: (name: string, value: string) => void
  onCompletionUpdate?: (completed: number, total: number) => void
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

interface SSNFieldGroup {
  basePhrase: string
  number1Field: FormFieldType
  number2Field: FormFieldType
  number3Field: FormFieldType
}

// Add new interface to track parent text phrase grouping
interface FieldGroup {
  parentTextPhrase: string;
  fields: FormFieldType[];
  subgroups: FieldGroup[];
}

const getDependencyLevel = (fieldName: string, groups: DependencyLevel[]): number => {
  const group = groups.find(g => 
    g.fields.some(f => f.name === fieldName)
  )
  return group?.level ?? 0
}

// Modify groupFieldsByParent to handle top-level fields that share parent_text_phrase:
const groupFieldsByParent = (fields: FormFieldType[], chains: DependencyChain[]): FormFieldType[][] => {
  console.log('Starting groupFieldsByParent:', {
    totalFields: fields.length,
    totalChains: chains.length
  })

  const result: FormFieldType[][] = []
  const processedFields = new Set<string>()

  // STEP 1: Collect base fields by parent_text_phrase
  // ------------------------------------------------
  // Instead of pushing each base field separately, we group them by their parent_text_phrase.
  type FieldsByPhrase = Record<string, FormFieldType[]>
  const topLevelGroups: FieldsByPhrase = {}

  // "Base" means fields not found as children in any chain.
  const baseFields = fields.filter(field => 
    !chains.some(chain => 
      chain.childFields.some(cf => cf.name === field.name)
    )
  )

  baseFields.forEach(field => {
    if (!topLevelGroups[field.parent_text_phrase ?? '']) {
      topLevelGroups[field.parent_text_phrase ?? ''] = []
    }
    topLevelGroups[field.parent_text_phrase ?? ''].push(field)
  })

  // STEP 2: Process base groups and recursively add dependencies
  // ------------------------------------------------------------
  const processGroupWithDependencies = (groupedFields: FormFieldType[]) => {
    // Mark them processed
    groupedFields.forEach(f => processedFields.add(f.name))

    // Insert this group as a single "top-level group" in result
    result.push([...groupedFields])

    // For each field in this group, handle its dependencies
    groupedFields.forEach(field => {
      const chain = chains.find(c => c.parentField.name === field.name)
      if (chain) {
        // Add child fields in a separate array, but keep them in the same bounding box
        const dependencyGroup: FormFieldType[] = []
        chain.childFields.forEach(depField => {
          dependencyGroup.push(depField)
          processedFields.add(depField.name)

          // Check for nested dependencies
          const nestedChain = chains.find(c => c.parentField.name === depField.name)
          if (nestedChain) {
            nestedChain.childFields.forEach(nestedField => {
              if (!processedFields.has(nestedField.name)) {
                dependencyGroup.push(nestedField)
                processedFields.add(nestedField.name)
              }
            })
          }
        })
        if (dependencyGroup.length > 0) {
          result.push(dependencyGroup)
        }
      }
    })
  }

  // For each top-level group by parent phrase, process together
  Object.values(topLevelGroups).forEach(grouped => {
    processGroupWithDependencies(grouped)
  })

  // STEP 3: Process leftover fields (in case any child fields not yet visited).
  // ------------------------------------------------
  fields.forEach(field => {
    if (!processedFields.has(field.name)) {
      // This is a child of some chain that never got processed
      // or an orphan we haven't handled. 
      console.log('Orphan or leftover field found, processing dependencies:', field.name)
      result.push([field])
    }
  })

  console.log('Final grouped result:', {
    totalGroups: result.length,
    groups: result
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

const detectDateFields = (fields: FormFieldType[]): DateFieldGroup[] => {
  const groups: DateFieldGroup[] = [];
  const dateRegex = /^(.*?)\s*-\s*(Day|Month|Year)$/i;
  
  // Group fields by their base phrase
  const fieldsByBase = new Map<string, {
    day?: FormFieldType;
    month?: FormFieldType;
    year?: FormFieldType;
  }>();

  fields.forEach(field => {
    const match = field.text_phrase?.match(dateRegex);
    if (match) {
      const [_, basePhrase, type] = match;
      if (!fieldsByBase.has(basePhrase)) {
        fieldsByBase.set(basePhrase, {});
      }
      const group = fieldsByBase.get(basePhrase)!;
      
      switch (type.toLowerCase()) {
        case 'day':
          group.day = field;
          break;
        case 'month':
          group.month = field;
          break;
        case 'year':
          group.year = field;
          break;
      }
    }
  });

  // Create groups where we have all three components
  fieldsByBase.forEach((components, basePhrase) => {
    if (components.day && components.month && components.year) {
      groups.push({
        basePhrase,
        dayField: components.day,
        monthField: components.month,
        yearField: components.year
      });
    }
  });

  return groups;
};

const detectSSNFields = (fields: FormFieldType[]): SSNFieldGroup[] => {
  const groups: SSNFieldGroup[] = []
  const ssnRegex = /^U\.S\. Social Security Number (\d+)$/i

  // Group fields by their base phrase
  const fieldsByNumber = new Map<string, {
    number1?: FormFieldType
    number2?: FormFieldType
    number3?: FormFieldType
  }>()

  fields.forEach(field => {
    const match = field.text_phrase?.match(ssnRegex)
    if (match) {
      const [_, number] = match
      const basePhrase = "U.S. Social Security Number"
      
      if (!fieldsByNumber.has(basePhrase)) {
        fieldsByNumber.set(basePhrase, {})
      }
      const group = fieldsByNumber.get(basePhrase)!
      
      switch (number) {
        case "1":
          group.number1 = field
          break
        case "2":
          group.number2 = field
          break
        case "3":
          group.number3 = field
          break
      }
    }
  })

  // Create groups where we have all three components
  fieldsByNumber.forEach((components, basePhrase) => {
    if (components.number1 && components.number2 && components.number3) {
      groups.push({
        basePhrase,
        number1Field: components.number1,
        number2Field: components.number2,
        number3Field: components.number3
      })
    }
  })

  return groups
}

// Helper function to group fields by parent_text_phrase
const groupFieldsByParentPhrase = (fields: FormFieldType[]): FieldGroup[] => {
  const groups = new Map<string, FieldGroup>();
  
  fields.forEach(field => {
    const parentPhrase = field.parent_text_phrase || '';
    if (!groups.has(parentPhrase)) {
      groups.set(parentPhrase, {
        parentTextPhrase: parentPhrase,
        fields: [],
        subgroups: []
      });
    }
    groups.get(parentPhrase)!.fields.push(field);
  });

  // Convert map to array without sorting by parent phrase
  // to preserve the original insertion order from the JSON
  return Array.from(groups.values());
};

export default function DynamicForm({ formDefinition, formData, onInputChange, onCompletionUpdate }: DynamicFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: undefined,
    },
  })

  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set())
  const [dependencyChains, setDependencyChains] = useState<DependencyChain[]>([])
  const [orderedFields, setOrderedFields] = useState<FormFieldType[]>([])
  const [repeatedGroups, setRepeatedGroups] = useState<Record<string, FormFieldType[][]>>({})

  const lastUpdateTimeRef = useRef<number>(0);
  const UPDATE_THRESHOLD = 100; // ms

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
    
    // Trigger initial completion update on mount
    if (onCompletionUpdate) {
      onCompletionUpdate(0, initialFields.size)
    }
  }, [formDefinition.fields, onCompletionUpdate])

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

  // Add a useEffect to calculate current (visible) completion counters
  useEffect(() => {
    const visibleFieldNames = Array.from(visibleFields)
    const total = visibleFieldNames.length
    const completed = visibleFieldNames.filter(name => formData[name] && formData[name].trim() !== "").length
    console.log('DynamicForm completion update:', { completed, total, visibleFieldNames })
    if (onCompletionUpdate) {
      onCompletionUpdate(completed, total)
    }
  }, [visibleFields, formData, onCompletionUpdate])

  // Group date fields
  const dateGroups = useMemo(() => 
    detectDateFields(orderedFields), 
    [orderedFields]
  );
  
  // Track which fields are part of date groups
  const dateFieldNames = useMemo(() => 
    new Set(dateGroups.flatMap(group => 
      [group.dayField.name, group.monthField.name, group.yearField.name]
    )),
    [dateGroups]
  );

  const ssnGroups = useMemo(() => 
    detectSSNFields(orderedFields), 
    [orderedFields]
  )

  const ssnFieldNames = useMemo(() => 
    new Set(ssnGroups.flatMap(group => 
      [group.number1Field.name, group.number2Field.name, group.number3Field.name]
    )),
    [ssnGroups]
  )

  // Add debug logging to track state updates
  const handleAddGroup = (phraseGroup: FieldGroup) => {
    const key = phraseGroup.parentTextPhrase || "NO_PHRASE";
    
    console.log("=== handleAddGroup BEFORE setState ===", {
      key,
      currentGroups: repeatedGroups[key]?.length || 0
    });
    
    setRepeatedGroups(prev => {
      const newState = {
        ...prev,
        [key]: [
          ...(prev[key] || []),
          phraseGroup.fields.map(f => ({ ...f }))
        ]
      };
      console.log("=== handleAddGroup DURING setState ===", {
        prevLength: prev[key]?.length || 0,
        newLength: newState[key].length
      });
      return newState;
    });
  };

  // 2. Add effect to track state changes
  useEffect(() => {
    console.log("=== repeatedGroups state changed ===", repeatedGroups)
  }, [repeatedGroups])

  // 2) Add new remove handler
  const handleRemoveGroup = (phraseGroup: FieldGroup, index: number, e: React.MouseEvent) => {
    // Stop event propagation
    e.preventDefault();
    e.stopPropagation();
    
    const key = phraseGroup.parentTextPhrase || "NO_PHRASE";
    setRepeatedGroups(prev => {
      const newState = { ...prev };
      if (newState[key]) {
        // Create new array with the item removed
        newState[key] = [
          ...newState[key].slice(0, index),
          ...newState[key].slice(index + 1)
        ];
      }
      return newState;
    });
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(() => {})} className="space-y-6">
        {groupFieldsByParent(orderedFields, dependencyChains).map((group, index) => {
          // Add back the necessary group calculations
          const isParentGroup = group.length === 1
          const parentField = isParentGroup ? group[0] : undefined
          const isDependencyGroup = !isParentGroup && dependencyChains.some(c => 
            group.some(f => c.childFields.includes(f))
          )
          
          // Group fields by parent_text_phrase
          const phraseGroups = groupFieldsByParentPhrase(group)

          return (
            <div
              key={index}
              className={`
                space-y-4
                ${isDependencyGroup ? 'border-2 border-gray-200 p-4 rounded-lg mt-2' : ''}
              `}
            >
              {phraseGroups.map((phraseGroup, phraseIndex) => {
                // track which date groups / SSN groups we've already rendered
                const renderedDateGroups = new Set<string>()
                const renderedSSNGroups = new Set<string>()

                const hasAddGroup = phraseGroup.fields.some(f => f.add_group)

                return (
                  <div key={phraseIndex}>
                    {/* Original fields */}
                    <div className="space-y-4">
                      {phraseGroup.fields.map((field) => {
                        // 1) Check if this field is the 'dayField' of any date group
                        const dateGroup = dateGroups.find(dg => dg.dayField.name === field.name)
                        if (dateGroup && !renderedDateGroups.has(dateGroup.basePhrase)) {
                          // Render the entire date group here
                          renderedDateGroups.add(dateGroup.basePhrase)
                          return (
                            <DateFieldGroup
                              key={dateGroup.basePhrase}
                              dateGroup={dateGroup}
                              values={formData}
                              onChange={onInputChange}
                              visible={visibleFields.has(dateGroup.dayField.name)}
                            />
                          )
                        }

                        // 2) Check if this field is the 'number1Field' (first SSN field) of an SSN group
                        const ssnGroup = ssnGroups.find(
                          sg => sg.number1Field.name === field.name
                        )
                        if (ssnGroup && !renderedSSNGroups.has(ssnGroup.basePhrase)) {
                          // Render entire SSN group
                          renderedSSNGroups.add(ssnGroup.basePhrase)
                          return (
                            <SSNFieldGroup
                              key={ssnGroup.basePhrase}
                              ssnGroup={ssnGroup}
                              values={formData}
                              onChange={onInputChange}
                              visible={visibleFields.has(ssnGroup.number1Field.name)}
                            />
                          )
                        }

                        // 3) Otherwise, if it's part of a date or SSN group but not the "first" field,
                        // skip it so we don't double-render. We already rendered the entire group above:
                        if (
                          dateGroups.some(dg =>
                            [dg.dayField.name, dg.monthField.name, dg.yearField.name]
                              .includes(field.name)
                          ) ||
                          ssnGroups.some(sg =>
                            [sg.number1Field.name, sg.number2Field.name, sg.number3Field.name]
                              .includes(field.name)
                          )
                        ) {
                          return null
                        }

                        // 4) Render regular fields
                        return (
                          <div
                            key={field.name}
                            className={`
                              space-y-2
                              ${field.parent_text_phrase ? 'pl-3' : ''}
                            `}
                          >
                            <FormField
                              field={field}
                              value={formData[field.name] || ''}
                              onChange={onInputChange}
                              visible={visibleFields.has(field.name)}
                              onDependencyChange={(key) => handleDependencyChange(key, field)}
                            />
                          </div>
                        )
                      })}

                      {/* Add Group button with updated click handler */}
                      {hasAddGroup && (
                        <div className="flex justify-end mt-4">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddGroup(phraseGroup)}
                          >
                            Add Group
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Repeated copies */}
                    <div className="space-y-4">
                      {repeatedGroups[phraseGroup.parentTextPhrase || "NO_PHRASE"]?.map((clonedFields, cloneIdx) => {
                        const renderedDateGroupsCopy = new Set<string>()
                        const renderedSSNGroupsCopy = new Set<string>()

                        return (
                          <div 
                            key={`clone-${phraseIndex}-${cloneIdx}`} 
                            className="relative border border-dashed border-gray-300 p-4 rounded-md bg-gray-50"
                          >
                            <div className="flex justify-end mb-4">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={(e) => handleRemoveGroup(phraseGroup, cloneIdx, e)}
                              >
                                Remove Group
                              </Button>
                            </div>

                            {/* Cloned fields */}
                            {clonedFields.map((field) => {
                              // Check for date groups first
                              const dateGroup = dateGroups.find(dg => 
                                [dg.dayField.name, dg.monthField.name, dg.yearField.name].includes(field.name)
                              )
                              if (dateGroup && !renderedDateGroupsCopy.has(dateGroup.basePhrase)) {
                                renderedDateGroupsCopy.add(dateGroup.basePhrase)
                                return (
                                  <DateFieldGroup
                                    key={`${dateGroup.basePhrase}-clone${cloneIdx}`}
                                    dateGroup={dateGroup}
                                    values={formData}
                                    onChange={onInputChange}
                                    visible={visibleFields.has(dateGroup.dayField.name)}
                                  />
                                )
                              }

                              // Skip if this field is part of an already rendered date group
                              if (dateGroup && renderedDateGroupsCopy.has(dateGroup.basePhrase)) {
                                return null
                              }

                              // Rest of the field rendering logic...
                              return (
                                <div key={`${field.name}-clone${cloneIdx}`} className="space-y-2">
                                  <FormField
                                    field={field}
                                    value={formData[field.name] || ''}
                                    onChange={onInputChange}
                                    visible={visibleFields.has(field.name)}
                                    onDependencyChange={(key) => handleDependencyChange(key, field)}
                                  />
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
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
    </FormProvider>
  )
} 
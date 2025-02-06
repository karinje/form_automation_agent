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
import { debugLog } from '@/utils/consoleLogger'

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

// Instead, just check if we're in the previous travel page
const isPrevTravelPage = (formDef: FormDefinition): boolean => {
  // The form title or ID should indicate which page we're on
  return formDef.title?.includes('Previous Travel') || 
         formDef.id?.includes('previous_travel');
}

const getDependencyLevel = (fieldName: string, groups: DependencyLevel[]): number => {
  const group = groups.find(g => 
    g.fields.some(f => f.name === fieldName)
  )
  return group?.level ?? 0
}

// Modify groupFieldsByParent to handle top-level fields that share parent_text_phrase:
const groupFieldsByParent = (
  fields: FormFieldType[], 
  chains: DependencyChain[],
  formDef: FormDefinition
): FormFieldType[][] => {
  const hasPrevTravel = fields.some(f => isPrevTravelPage(formDef));
  if (hasPrevTravel) {
    debugLog('previous_travel_page', 'Grouping fields:', fields);
  }
  
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
      result.push([field])
    }
  })

  if (hasPrevTravel) {
    debugLog('previous_travel_page', 'Grouped result:', result);
  }
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
      const hasPrevTravel = Object.keys(data).some(key => key.includes('previous_travel'));
      if (hasPrevTravel) {
        debugLog('previous_travel_page', 'Loaded YAML data:', data);
      }
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

const renderPhraseGroup = (
  phraseGroup: FieldGroup,
  formData: Record<string, string>,
  onInputChange: (name: string, value: string) => void,
  visibleFields: Set<string>,
  handleDependencyChange: (key: string, field: FormFieldType) => void
) => {
  if (!phraseGroup.fields.length) return null;
  
  // Skip border and label for single-field groups
  if (phraseGroup.fields.length === 1) {
    return (
      <div className="space-y-4">
        <FormField
          key={phraseGroup.fields[0].name}
          field={phraseGroup.fields[0]}
          value={formData[phraseGroup.fields[0].name] || ''}
          onChange={onInputChange}
          visible={visibleFields.has(phraseGroup.fields[0].name)}
          onDependencyChange={(key) => handleDependencyChange(key, phraseGroup.fields[0])}
        />
      </div>
    );
  }

  // For multi-field groups, render with border and label
  return (
    <div className="relative border border-gray-200 rounded-lg p-4 mb-4">
      {phraseGroup.parentTextPhrase && (
        <span className="absolute -top-3 left-3 bg-white px-2 text-sm text-gray-600">
          {phraseGroup.parentTextPhrase}
        </span>
      )}
      <div className="space-y-4">
        {phraseGroup.fields.map((field) => (
          <FormField
            key={field.name}
            field={field}
            value={formData[field.name] || ''}
            onChange={onInputChange}
            visible={visibleFields.has(field.name)}
            onDependencyChange={(key) => handleDependencyChange(key, field)}
          />
        ))}
      </div>
    </div>
  );
};

// Keep this simple check that was working
const isPrevTravelField = (name: string) => {
  return name.includes('PREV_US_TRAVEL') || 
         name.includes('PREV_US_VISIT') || 
         name.includes('PREV_VISA');
}

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
  const [renderedSSNGroups] = useState(() => new Set<string>());

  const lastUpdateTimeRef = useRef<number>(0);
  const UPDATE_THRESHOLD = 100; // ms
  const lastVisibleFieldsSize = useRef<number>(0);

  useEffect(() => {
    // Remove or filter these logs:
    // console.log('Initializing form with fields:', formDefinition.fields);
    // console.log('Initial dependency setup:', { formData, dependencies });
    // console.log('Handling dependency change:', { formData, dependencyChains });

    // Instead, only log for previous travel page:
    const isPrevTravelFields = formDefinition.fields.some(f => f.name.includes('previoustravel')) ||
      Object.keys(formDefinition.dependencies || {}).some(key => key.includes('previoustravel'));

    if (isPrevTravelFields) {
      debugLog('previous_travel_page', 'Form initialization:', {
        fields: formDefinition.fields,
        dependencies: formDefinition.dependencies
      });
      debugLog('previous_travel_page', 'Dependency update:', {
        formData,
        dependencyChains
      });
    }

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
          if (field.name.includes('previoustravel')) {
            debugLog('previous_travel_page', 'Checking dependency:', field.name);
          }
          
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
    
    if (isPrevTravelFields) {
      debugLog('previous_travel_page', 'Initial dependency setup:', {
        chains: initialChains,
        visibleFields: Array.from(initialFields)
      });
    }
    
    setDependencyChains(initialChains)
    setVisibleFields(initialFields)
    
    // Trigger initial completion update on mount
    if (onCompletionUpdate) {
      onCompletionUpdate(0, initialFields.size)
    }
  }, [formData, formDefinition.dependencies])

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
        chain.childFields.forEach(field => {
          // Check if this is part of a date group
          const dateGroup = dateGroups.find(dg => 
            [dg.dayField.name, dg.monthField.name, dg.yearField.name].includes(field.name)
          )
          // Check if this is part of an SSN group
          const ssnGroup = ssnGroups.find(sg => 
            [sg.number1Field.name, sg.number2Field.name, sg.number3Field.name].includes(field.name)
          )
          
          if (dateGroup) {
            // Remove all components of the date group
            newVisibleFields.delete(dateGroup.dayField.name)
            newVisibleFields.delete(dateGroup.monthField.name)
            newVisibleFields.delete(dateGroup.yearField.name)
          } else if (ssnGroup) {
            // Remove all components of the SSN group
            newVisibleFields.delete(ssnGroup.number1Field.name)
            newVisibleFields.delete(ssnGroup.number2Field.name)
            newVisibleFields.delete(ssnGroup.number3Field.name)
          } else {
            newVisibleFields.delete(field.name)
          }
        })
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
      dependency.shows.forEach(field => {
        // Check if this is part of a date group
        const dateGroup = dateGroups.find(dg => 
          [dg.dayField.name, dg.monthField.name, dg.yearField.name].includes(field.name)
        )
        // Check if this is part of an SSN group
        const ssnGroup = ssnGroups.find(sg => 
          [sg.number1Field.name, sg.number2Field.name, sg.number3Field.name].includes(field.name)
        )
        
        if (dateGroup) {
          // Add all components of the date group
          newVisibleFields.add(dateGroup.dayField.name)
          newVisibleFields.add(dateGroup.monthField.name)
          newVisibleFields.add(dateGroup.yearField.name)
        } else if (ssnGroup) {
          // Add all components of the SSN group
          newVisibleFields.add(ssnGroup.number1Field.name)
          newVisibleFields.add(ssnGroup.number2Field.name)
          newVisibleFields.add(ssnGroup.number3Field.name)
        } else {
          newVisibleFields.add(field.name)
        }
      })
    }
    
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
    if (isPrevTravelField(name)) {
      debugLog('previous_travel_page', `Field changed: ${name} = ${value}`);
    }
    onInputChange(name, value);
  }

  // Add a useEffect to calculate current (visible) completion counters
  useEffect(() => {
    const visibleFieldNames = Array.from(visibleFields);
    const total = visibleFieldNames.length;
    const completed = visibleFieldNames.filter(name => formData[name]?.trim() !== "").length;
    
    const hasPrevTravelFields = visibleFieldNames.some(name => isPrevTravelPage(formDefinition));
    if (hasPrevTravelFields) {
      debugLog('previous_travel_page', 'Form completion update:', { completed, total });
    }
    
    if (onCompletionUpdate) {
      onCompletionUpdate(completed, total);
    }
  }, [visibleFields, formData, onCompletionUpdate]);

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
    const hasPrevTravelField = isPrevTravelPage(formDefinition);
    if (hasPrevTravelField) {
      debugLog('previous_travel_page', `Adding group: ${key}`);
    }
    
    setRepeatedGroups(prev => {
      const newState = {
        ...prev,
        [key]: [
          ...(prev[key] || []),
          phraseGroup.fields.map(f => ({ ...f }))
        ]
      };
      return newState;
    });
  }

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

  // Add this after the handleDependencyChange function
  useEffect(() => {
    updateOrderedFields(dependencyChains)
  }, [visibleFields]) // Add visibleFields as dependency

  useEffect(() => {
    if (visibleFields.size !== lastVisibleFieldsSize.current) {
      debugLog('previous_travel_page', 'Visible fields updated:', {
        count: visibleFields.size,
        fields: Array.from(visibleFields)
      });
      lastVisibleFieldsSize.current = visibleFields.size;
    }
  }, [visibleFields]);

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(() => {})} className="space-y-6">
        {groupFieldsByParent(orderedFields, dependencyChains, formDefinition).map((group, index) => {
          const phraseGroups = groupFieldsByParentPhrase(group)
          
          // Calculate if this is a dependency group
          const isDependencyGroup = dependencyChains.some(chain => 
            group.some(field => chain.childFields.some(cf => cf.name === field.name))
          )
          
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

                // Collect all fields that will be rendered
                const fieldsToRender = phraseGroup.fields.map(field => {
                  // First check for date groups
                  const dateGroup = dateGroups.find(dg => 
                    [dg.dayField.name, dg.monthField.name, dg.yearField.name].includes(field.name)
                  )
                  
                  // Add check for SSN groups
                  const ssnGroup = ssnGroups.find(sg => 
                    [sg.number1Field.name, sg.number2Field.name, sg.number3Field.name].includes(field.name)
                  )
                  
                  if (dateGroup && !renderedDateGroups.has(dateGroup.basePhrase)) {
                    renderedDateGroups.add(dateGroup.basePhrase)
                    return {
                      type: 'date',
                      dateGroup,
                      key: `date-${dateGroup.basePhrase}`
                    }
                  }
                  
                  if (ssnGroup && !renderedSSNGroups.has(ssnGroup.basePhrase)) {
                    renderedSSNGroups.add(ssnGroup.basePhrase)
                    return {
                      type: 'ssn',
                      ssnGroup,
                      key: `ssn-${ssnGroup.basePhrase}`
                    }
                  }
                  
                  // Only render individual fields if they're not part of a rendered group
                  if ((!dateFieldNames.has(field.name) || !renderedDateGroups.has(dateGroup?.basePhrase || '')) &&
                      (!ssnFieldNames.has(field.name) || !renderedSSNGroups.has(ssnGroup?.basePhrase || ''))) {
                    return {
                      type: 'field',
                      field,
                      key: `field-${field.name}`
                    }
                  }
                  
                  return null
                }).filter(Boolean)

                return (
                  <div key={`phrase-group-${phraseGroup.parentTextPhrase}-${phraseIndex}`} className="space-y-4">
                    {/* Render the phrase group with border if it has multiple fields */}
                    <div className={`relative ${phraseGroup.fields.length > 1 ? 'border border-gray-200 rounded-lg p-4 mb-4' : ''}`}>
                      {phraseGroup.fields.length > 1 && phraseGroup.parentTextPhrase && (
                        <span className="absolute -top-3 left-3 bg-white px-2 text-sm text-gray-600">
                          {phraseGroup.parentTextPhrase}
                        </span>
                      )}
                      
                      <div className="space-y-4">
                        {fieldsToRender.map(item => {
                          if (item.type === 'date') {
                            return (
                              <DateFieldGroup
                                key={item.key}
                                dateGroup={item.dateGroup}
                                values={formData}
                                onChange={onInputChange}
                                visible={visibleFields.has(item.dateGroup.dayField.name)}
                              />
                            )
                          }
                          
                          if (item.type === 'ssn') {
                            return (
                              <SSNFieldGroup
                                key={item.key}
                                ssnGroup={item.ssnGroup}
                                values={formData}
                                onChange={onInputChange}
                                visible={visibleFields.has(item.ssnGroup.number1Field.name)}
                              />
                            )
                          }
                          
                          return (
                            <FormField
                              key={item.key}
                              field={item.field}
                              value={formData[item.field.name] || ''}
                              onChange={onInputChange}
                              visible={visibleFields.has(item.field.name)}
                              onDependencyChange={(key) => handleDependencyChange(key, item.field)}
                            />
                          )
                        })}
                      </div>
                    </div>

                    {/* Add Group button */}
                    {phraseGroup.fields.some(f => f.add_group) && (
                      <div key={`add-group-${phraseIndex}`} className="flex justify-end mt-4">
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

                    {/* Repeated groups */}
                    {repeatedGroups[phraseGroup.parentTextPhrase || "NO_PHRASE"]?.map((clonedFields, cloneIdx) => {
                      // Process cloned fields for date groups
                      const clonedFieldsToRender = clonedFields.map(field => {
                        const dateGroup = dateGroups.find(dg => 
                          [dg.dayField.name, dg.monthField.name, dg.yearField.name].includes(field.name)
                        )
                        
                        if (dateGroup && !renderedDateGroups.has(dateGroup.basePhrase + `-clone-${cloneIdx}`)) {
                          renderedDateGroups.add(dateGroup.basePhrase + `-clone-${cloneIdx}`)
                          return {
                            type: 'date',
                            dateGroup,
                            key: `date-${dateGroup.basePhrase}-clone-${cloneIdx}`
                          }
                        }
                        
                        if (!dateFieldNames.has(field.name) || !renderedDateGroups.has(dateGroup?.basePhrase + `-clone-${cloneIdx}` || '')) {
                          return {
                            type: 'field',
                            field,
                            key: `field-${field.name}-clone-${cloneIdx}`
                          }
                        }
                        
                        return null
                      }).filter(Boolean)

                      return (
                        <div key={`clone-${phraseGroup.parentTextPhrase}-${phraseIndex}-${cloneIdx}`} 
                             className="relative border border-dashed border-gray-300 p-4 rounded-md bg-gray-50">
                          <div className="flex justify-end mb-4">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => handleRemoveGroup(phraseGroup, cloneIdx, e)}
                            >
                              Remove Group
                            </Button>
                          </div>

                          <div className="space-y-4">
                            {clonedFieldsToRender.map(item => {
                              if (item.type === 'date') {
                                return (
                                  <DateFieldGroup
                                    key={item.key}
                                    dateGroup={item.dateGroup}
                                    values={formData}
                                    onChange={onInputChange}
                                    visible={visibleFields.has(item.dateGroup.dayField.name)}
                                  />
                                )
                              }
                              
                              return (
                                <FormField
                                  key={item.key}
                                  field={item.field}
                                  value={formData[item.field.name] || ''}
                                  onChange={onInputChange}
                                  visible={visibleFields.has(item.field.name)}
                                  onDependencyChange={(key) => handleDependencyChange(key, item.field)}
                                />
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
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
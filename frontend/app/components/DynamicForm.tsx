"use client"

import { useState, useEffect, useMemo, useRef, useLayoutEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { FormProvider } from "react-hook-form"
import { formSchema, type FormValues } from "../lib/schema"
import { FormField } from "./FormField"
import { Button } from "./ui/button"
import type { FormDefinition, FormField as FormFieldType, Dependency, FormCategories } from "@/types/form-definition"
import type { DateFieldGroup as DateFieldGroupType } from "@/types/form-definition"
import DateFieldGroupComponent from "@/components/DateFieldGroup"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import yaml from 'js-yaml'
import DateFieldGroup from "@/components/DateFieldGroup"
import SSNFieldGroup from "@/components/SSNFieldGroup"
import { debugLog } from '@/utils/consoleLogger'
import { normalizeTextPhrase, isPrevTravelPage, getPreviousForm, getNextForm, getPageTitle } from '@/utils/helpers'
import { triggerAsyncId } from "async_hooks"
import { workerData } from "worker_threads"
import { transformFieldName } from '@/utils/yaml-helpers'
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { getYamlField } from '@/utils/mappings'
import debounce from 'lodash/debounce';

interface DynamicFormProps {
  formDefinition: FormDefinition
  formData: Record<string, string>
  arrayGroups?: Record<string, Array<Record<string, string>>>
  onInputChange: (name: string, value: string) => void
  onCompletionUpdate?: (completed: number, total: number) => void
  formCategories: FormCategories
  currentCategory: string
  currentIndex: number
  onNavigate: (category: string, index: number) => void
  onArrayGroupsChange?: (pageName: string, groupKey: string, groupData: Array<Record<string, string>>) => void
  onSave?: () => Promise<{ success: boolean, error?: any }>
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

  // Process base fields and their complete dependency chains
  fields.forEach(field => {
    if (!processedFields.has(field.name)) {
      // Find all dependencies for this field
      const chain = chains.find(c => c.parentField.name === field.name);
      if (chain) {
        // Create a new result group for this chain's dependencies
        const dependencyGroup: FormFieldType[] = [field];
        processedFields.add(field.name);

        // Process all child fields in this chain
        chain.childFields.forEach(depField => {
          dependencyGroup.push(depField);
          processedFields.add(depField.name);

          // Also process any nested dependencies
          const nestedChain = chains.find(c => c.parentField.name === depField.name);
          if (nestedChain) {
            nestedChain.childFields.forEach(nestedField => {
              if (!processedFields.has(nestedField.name)) {
                dependencyGroup.push(nestedField);
                processedFields.add(nestedField.name);
              }
            });
          }
        });

        // Add the dependency group to result if it has more than just the parent field
        if (dependencyGroup.length > 1) {
          result.push(dependencyGroup);
        } else {
          // If no dependencies, add as single field
          result.push([field]);
        }
      } else {
        // Handle non-dependency fields - group by parent_text_phrase
        const parentPhrase = field.parent_text_phrase ?? '';
        const existingGroup = result.find(group => 
          group[0].parent_text_phrase === parentPhrase
        );
        
        if (existingGroup) {
          existingGroup.push(field);
        } else {
          result.push([field]);
        }
        processedFields.add(field.name);
      }
    }
  });

  if (hasPrevTravel) {
    debugLog('previous_travel_page', 'Grouped result:', result);
  }
  return result;
}

const detectDateFields = (fields: FormFieldType[]): DateFieldGroupType[] => {
  const groups: DateFieldGroupType[] = [];
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
          formData={formData}
        />
      </div>
    );
  }

  // For multi-field groups, render with border and label
  return (
    <div className="relative border border-gray-200 rounded-lg p-4 mb-4">
      {phraseGroup.parentTextPhrase && (
        <span className="absolute -top-3 left-3 bg-white px-2 text-lg text-gray-600 font-medium">
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
            visible={visibleFields.has(field.name) || true}
            onDependencyChange={(key) => handleDependencyChange(key, field)}
            formData={formData}
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
         name.includes('PREV_VISA') ||
         name.includes('previous_travel');
}

const waitForButton = async (selector: string, maxAttempts = 10): Promise<HTMLElement | null> => {
  for (let i = 0; i < maxAttempts; i++) {
    const btn = document.querySelector(selector);
    if (btn) return btn as HTMLElement;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return null;
};

// Add this helper to check if we're on the previous travel section
const isPrevTravelSection = (fields: string[]): boolean => {
  return fields.some(f => 
    f.includes('PREV_US_TRAVEL') || 
    f.includes('PREV_US_VISIT') || 
    f.includes('PREV_VISA')
  );
};

// Add helper function to count effective fields (treating grouped fields as one)
const getEffectiveFieldCount = (fields: FormFieldType[]) => {
  const dateGroups = new Set();
  const ssnGroups = new Set();
  let effectiveCount = 0;

  fields.forEach(field => {
    // Check if field is part of a date group
    const dateMatch = field.text_phrase?.match(/^(.*?)\s*-\s*(Day|Month|Year)$/i);
    if (dateMatch) {
      const basePhrase = dateMatch[1];
      if (!dateGroups.has(basePhrase)) {
        dateGroups.add(basePhrase);
        effectiveCount++; // Count entire date group as one field
      }
      return;
    }

    // Check if field is part of an SSN group
    const ssnMatch = field.text_phrase?.match(/^U\.S\. Social Security Number (\d+)$/i);
    if (ssnMatch) {
      const basePhrase = "U.S. Social Security Number";
      if (!ssnGroups.has(basePhrase)) {
        ssnGroups.add(basePhrase);
        effectiveCount++; // Count entire SSN group as one field
      }
      return;
    }

    // Regular field
    effectiveCount++;
  });

  return effectiveCount;
};

export default function DynamicForm({ formDefinition, formData, arrayGroups, onInputChange, onCompletionUpdate, formCategories, currentCategory, currentIndex, onNavigate, onArrayGroupsChange, onSave }: DynamicFormProps) {
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

  const [pendingArrayGroups, setPendingArrayGroups] = useState<Record<string, boolean>>({});

  const [fieldGroups, setFieldGroups] = useState<FieldGroup[]>([]);

  const prevArrayGroupsRef = useRef(arrayGroups);  // Move useRef to component level

  // Add a flag to track if we're in the initial load from arrayGroups
  const [isInitialArrayGroupsLoad, setIsInitialArrayGroupsLoad] = useState(true);

  // Add logging for page identification and initial state
  const currentPageName = useMemo(() => {
    const currentForm = formCategories[currentCategory]?.[currentIndex];
    return currentForm?.pageName || 'unknown';
  }, [formCategories, currentCategory, currentIndex]);
  
  useEffect(() => {
    if (currentPageName === 'workeducation3_page') {
      debugLog('workeducation3_page', `Component mounted/updated for page: ${currentPageName}`, {
        currentPageName,
        isInitialArrayGroupsLoad,
        repeatedGroups,
        arrayGroups,
        repeatedGroupsCount: Object.keys(repeatedGroups).length,
        hasArrayGroups: arrayGroups && Object.keys(arrayGroups).length > 0
      });
    }
  }, [currentPageName, isInitialArrayGroupsLoad, repeatedGroups, arrayGroups]);

  // Update findDependency to better handle nested dependencies
  const findDependency = (deps: Record<string, Dependency> | undefined, searchKey: string): Dependency | undefined => {
    if (!deps) return undefined;
    
    // First try to find direct dependency
    const directDep = deps[searchKey];
    if (directDep) return directDep;

    // Then look in nested dependencies
    for (const dep of Object.values(deps)) {
      if (dep.dependencies) {
        const nestedDep = dep.dependencies[searchKey];
        if (nestedDep) return nestedDep;
        
        // Recursively search deeper
        const deeperDep = findDependency(dep.dependencies, searchKey);
        if (deeperDep) return deeperDep;
      }
    }
    
    return undefined;
  };

  // Move getFieldsForGroup inside component
  const getFieldsForGroup = (parentTextPhrase: string, fields: FormFieldType[]): FormFieldType[] => {
    const normalizedParentPhrase = normalizeTextPhrase(parentTextPhrase);
    
    // Get all fields (direct + from dependencies)
    const allFields = [
      ...fields,
      ...getAllDependencyFields(formDefinition.dependencies)
    ];
    
    // Filter by parent phrase
    const groupFields = allFields.filter(field => {
      const fieldParentPhrase = normalizeTextPhrase(field.parent_text_phrase || '');
      return fieldParentPhrase === normalizedParentPhrase;
    });

    if (isPrevTravelPage(formDefinition)) {
      debugLog('previous_travel_page', `Found direct fields for group:`, {
        parentTextPhrase,
        normalizedParentPhrase,
        fieldCount: groupFields.length,
        fields: groupFields.map(f => f.name)
      });
    }

    return groupFields;
  };

  // Helper to recursively get all fields from dependencies
  const getAllDependencyFields = (deps: Record<string, Dependency> | undefined): FormFieldType[] => {
    if (!deps) return [];
    
    return Object.values(deps).flatMap(dep => {
      const fields = [...(dep.shows || [])];
      if (dep.dependencies) {
        fields.push(...getAllDependencyFields(dep.dependencies));
      }
      return fields;
    });
  };

  // Add a ref to track processed groups
  const processedGroups = useRef<Set<string>>(new Set());

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

  useEffect(() => {
    if (isPrevTravelPage(formDefinition)) {
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
    
    // Initialize dependency chains based on radio dependencies (ignore formData changes)
    const initialChains: DependencyChain[] = []
    formDefinition.fields.forEach(field => {
      if ((field.type === 'radio' || field.type === 'dropdown') && formData[field.name]) {
        const selectedValue = formData[field.name];
        let key = "";
        if (field.type === 'radio') {
          const buttonId = field.button_ids?.[selectedValue];
          if (!buttonId) return;
          key = `${buttonId}.${selectedValue}`;
        } else { // dropdown
          key = `${field.name}.${selectedValue.trim()}`;
        }
        const dependency = findDependency(formDefinition.dependencies, key);
        if (dependency?.shows?.length) {
          const newChain: DependencyChain = {
            parentField: field,
            childFields: dependency.shows
          };
          initialChains.push(newChain);
          dependency.shows.forEach(depField => initialFields.add(depField.name));

          // Check for nested dependencies for radio OR dropdown children
          dependency.shows.forEach(depField => {
            if ((depField.type === 'radio' || depField.type === 'dropdown') && formData[depField.name]) {
              const nestedValue = formData[depField.name];
              let nestedKey = "";
              if (depField.type === 'radio') {
                const nestedButtonId = depField.button_ids?.[nestedValue];
                if (!nestedButtonId) return;
                nestedKey = `${nestedButtonId}.${nestedValue}`;
              } else {
                nestedKey = `${depField.name}.${nestedValue.trim()}`;
              }
              const nestedDep = findDependency(formDefinition.dependencies, nestedKey);
              if (nestedDep?.shows?.length) {
                const nestedChain: DependencyChain = {
                  parentField: depField,
                  childFields: nestedDep.shows,
                  parentChainId: field.name
                };
                initialChains.push(nestedChain);
                nestedDep.shows.forEach(nestedField => initialFields.add(nestedField.name));
              }
            }
          });
        }
      }
    })
    
    if (isPrevTravelPage(formDefinition)) {
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
  }, [formDefinition.dependencies])

  // Update handleDependencyChange to handle nested dependencies
  const handleDependencyChange = (key: string, parentField: FormFieldType) => {
    const groupMatch = parentField.name.match(/_ctl(\d+)/);
    const groupIndex = groupMatch ? parseInt(groupMatch[1]) : null;
    
    const newVisibleFields = new Set(visibleFields);
    const newDependencyChains = [...dependencyChains];

    // Find existing chain for this parent
    const existingChainIndex = newDependencyChains.findIndex(
      chain => chain.parentField.name === parentField.name
    );
    
    // Remove this chain and all its children
    if (existingChainIndex !== -1) {
      const chainsToRemove = getChildChains(newDependencyChains, existingChainIndex);
      chainsToRemove.forEach(chain => {
        chain.childFields.forEach(field => {
          newVisibleFields.delete(field.name);
        });
      });
      newDependencyChains.splice(existingChainIndex, chainsToRemove.length);
    }

    // Find the original dependency key if this is a group field
    let originalKey = key;
    if (groupIndex !== null) {
      // Replace all instances of _ctlXX with _ctl00 to match original dependency structure
      originalKey = key.replace(/_ctl\d+/g, '_ctl00');
    }

    // First try to find direct dependency
    let dependency = findDependency(formDefinition.dependencies, originalKey);
    
    // If not found, check if this is a nested dependency
    if (!dependency) {
      // Look through all top-level dependencies and their nested dependencies
      Object.entries(formDefinition.dependencies || {}).forEach(([topKey, topDep]) => {
        if (topDep?.dependencies) {
          // Convert the original key pattern to match nested dependency pattern
          const nestedKey = originalKey.replace('_ctl00_', '_ctl00_dtlOTHER_NATL_ctl00_');
          if (topDep.dependencies[nestedKey]) {
            dependency = topDep.dependencies[nestedKey];
          }
        }
      });
    }

    if (dependency?.shows?.length) {
      const parentChainId = getParentChainId(newDependencyChains, parentField);
      
      // Transform child field names if this is a repeated group
      const transformedChildFields = dependency.shows.map(field => {
        const transformedName = groupIndex !== null ? 
          transformFieldName(field.name, groupIndex) : 
          field.name;

        return {
          ...field,
          name: transformedName,
          button_ids: field.button_ids && groupIndex !== null ? 
            Object.fromEntries(
              Object.entries(field.button_ids).map(([k, id]) => [
                k,
                transformFieldName(id, groupIndex)
              ])
            ) : field.button_ids
        };
      });

      const newChain: DependencyChain = {
        parentField,
        childFields: transformedChildFields,
        parentChainId
      };
      
      newDependencyChains.splice(
        parentChainId ? 
          newDependencyChains.findIndex(c => c.parentField.name === parentChainId) + 1 : 
          newDependencyChains.length, 
        0, 
        newChain
      );
      
      transformedChildFields.forEach(field => {
        newVisibleFields.add(field.name);
        debugLog('previous_travel_page', `Adding field to visible fields:`, {
          name: field.name,
          originalName: field.name.replace(new RegExp(`_ctl${groupIndex}`), '_ctl00')
        });
      });
    }
    
    setVisibleFields(newVisibleFields);
    setDependencyChains(newDependencyChains);
    updateOrderedFields(newDependencyChains);
  };

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

  // Update the useLayoutEffect that handles form completion calculation
  useLayoutEffect(() => {
    const visibleFieldNames = Array.from(visibleFields);
    
    // Track all field names that should be excluded from completion requirements
    const excludedFieldNames = new Set<string>();
    
    // Track fields marked as NA (these should count as completed)
    const naCheckedFields = new Set<string>();
    
    // First pass: collect all NA fields
    orderedFields.forEach(field => {
      if (field.optional) {
        excludedFieldNames.add(field.name);
      }
      
      // Check if this field has NA checked
      if (field.na_checkbox_id && formData[field.na_checkbox_id] === "true") {
        naCheckedFields.add(field.name);
        
        // For date groups, add all related fields
        const dateGroup = dateGroups.find(dg => 
          dg.dayField.name === field.name || 
          dg.monthField.name === field.name || 
          dg.yearField.name === field.name
        );
        
        if (dateGroup) {
          naCheckedFields.add(dateGroup.dayField.name);
          naCheckedFields.add(dateGroup.monthField.name);
          naCheckedFields.add(dateGroup.yearField.name);
        }
      }
    });
    
    // Do the same for repeated groups
    Object.values(repeatedGroups).forEach(groupsList => {
      groupsList.forEach(fieldsGroup => {
        fieldsGroup.forEach(field => {
          if (field.optional) {
            excludedFieldNames.add(field.name);
          }
          
          if (field.na_checkbox_id && formData[field.na_checkbox_id] === "true") {
            naCheckedFields.add(field.name);
            
            // Handle date groups in repeated sections
            const isDateField = dateFieldNames.has(field.name.replace(/\d+$/, ''));
            if (isDateField) {
              const baseFieldName = field.name.replace(/_(day|month|year)(_\d+)?$/, '');
              const groupSuffix = field.name.match(/(_\d+)$/)?.[1] || '';
              
              naCheckedFields.add(`${baseFieldName}_day${groupSuffix}`);
              naCheckedFields.add(`${baseFieldName}_month${groupSuffix}`);
              naCheckedFields.add(`${baseFieldName}_year${groupSuffix}`);
            }
          }
        });
      });
    });
    
    // Calculate total excluding optional fields
    const total = visibleFieldNames.filter(name => {
      if (name.includes('.')) return false;
      return !excludedFieldNames.has(name);
    }).length;
    
    // Calculate completed fields
    const completed = visibleFieldNames.filter(name => {
      if (name.includes('.')) return false;
      if (excludedFieldNames.has(name)) return false;
      
      // If field is marked as NA, count it as completed
      if (naCheckedFields.has(name)) {
        return true;
      }
      
      const value = formData[name];
      if (!value || value.toString().trim() === "") return false;
      
      // For dropdown fields, check if the value is valid
      const fieldDef = findFieldDefinition(name);
      if (fieldDef && fieldDef.type === 'dropdown') {
        return Array.isArray(fieldDef.value) && fieldDef.value.includes(value);
      }
      
      return true;
    }).length;
    
    if (onCompletionUpdate) {
      onCompletionUpdate(completed, total);
    }
    
    // Helper function to find a field's definition
    function findFieldDefinition(fieldName: string) {
      let field = orderedFields.find(f => f.name === fieldName);
      if (field) return field;
      
      for (const groupList of Object.values(repeatedGroups)) {
        for (const group of groupList) {
          field = group.find(f => f.name === fieldName);
          if (field) return field;
        }
      }
      
      return null;
    }
  }, [visibleFields, formData, onCompletionUpdate, orderedFields, repeatedGroups, dateGroups, dateFieldNames]);

  // Modify the useEffect that processes arrayGroups
  useEffect(() => {
    if (currentPageName === 'workeducation3_page') {
      debugLog('workeducation3_page', `ArrayGroups useEffect triggered`, {
        pageInfo: currentPageName,
        hasArrayGroups: arrayGroups && Object.keys(arrayGroups).length > 0,
        arrayGroupsKeys: arrayGroups ? Object.keys(arrayGroups) : []
      });
    }
    if (!arrayGroups || Object.keys(arrayGroups).length === 0) {
      debugLog('workeducation3_page', `No arrayGroups found, setting isInitialArrayGroupsLoad to false`);
      setIsInitialArrayGroupsLoad(false);
      return;
    }
    
    // Set flag to true while processing arrayGroups from props
    debugLog('workeducation3_page', `Starting arrayGroups processing, setting isInitialArrayGroupsLoad to true`);
    setIsInitialArrayGroupsLoad(true);
    
    // Use setTimeout to move state updates out of the render phase
    setTimeout(() => {
      const processArrayGroups = async () => {
        // Process each array group
        for (const [groupKey, groups] of Object.entries(arrayGroups)) {
          const normalizedGroupKey = normalizeTextPhrase(groupKey);
          // Skip if we've already processed this group
          if (processedGroups.current.has(normalizedGroupKey)) {
            continue;
          }
          // Mark this group as processed immediately
          processedGroups.current.add(normalizedGroupKey);
          
          const groupFields = getFieldsForGroup(groupKey, formDefinition.fields);
          
          // If there are additional groups, call handleAddGroup for each extra group
          if (groups.length > 1) {
            const addGroupButton = await waitForButton(`[data-group-id*="${normalizedGroupKey}"]`, 20);
            
            // Only add groups if they don't already exist in repeatedGroups
            const existingGroups = repeatedGroups[normalizedGroupKey]?.length || 0;
            if (addGroupButton && existingGroups < groups.length) {
              // Only add the missing groups
              for (let i = existingGroups; i < groups.length - 1; i++) {
                debugLog('workeducation3_page', `Clicking add group button for extra group ${i}`);
                addGroupButton.click();
              }
            }
          }
          
          // Now fill in fields for all groups (index 0 is the primary group; indexes > 0 are added groups).
          for (let index = 0; index < groups.length; index++) {
            const groupData = groups[index];
            for (const field of groupFields) {
              const baseFieldName = field.name;
              const transformedName = index === 0 
                ? baseFieldName 
                : transformFieldName(baseFieldName, index);
              const value = groupData[baseFieldName];
              if (value !== undefined) {
                debugLog('workeducation3_page', `Setting field value for group ${index}:`, {
                  original: baseFieldName,
                  transformed: transformedName,
                  value
                });
                onInputChange(transformedName, String(value));
              }
            }
          }
        }
        
        // Once all processing is done, set the flag to false
        debugLog('workeducation3_page', `Completed arrayGroups processing, setting isInitialArrayGroupsLoad to false`);
        setIsInitialArrayGroupsLoad(false);
      };

      // Call the async function
      processArrayGroups();
    }, 0);
  }, [arrayGroups, currentPageName]); // Added currentPageName for logging

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

  // Add effect to initialize field groups
  useEffect(() => {
    const groups = groupFieldsByParentPhrase(formDefinition.fields);
    setFieldGroups(groups);
  }, [formDefinition.fields]);

  // Modify handleAddGroup to correctly format the group data for parent component
  const handleAddGroup = (phraseGroup: FieldGroup) => {
    const groupKey = normalizeTextPhrase(phraseGroup.parentTextPhrase);
    
    if (currentPageName === 'workeducation3_page') {
      debugLog('workeducation3_page', `handleAddGroup called for: ${groupKey}`, {
        isInitialLoad: isInitialArrayGroupsLoad,
        parentTextPhrase: phraseGroup.parentTextPhrase,
        fieldsCount: phraseGroup.fields.length,
        currentPage: currentPageName,
        phraseGroup
      });
    }
    
    setRepeatedGroups(prev => {
      const currentGroups = prev[groupKey] || [];
      const newGroupIndex = currentGroups.length + 1;
      
      // Clone fields and update names using transformFieldName helper
      const newClonedFields = phraseGroup.fields.map(field => {
        const dateGroup = dateGroups.find(dg => 
          [dg.dayField.name, dg.monthField.name, dg.yearField.name].includes(field.name)
        );
        
        const newField = {
          ...field,
          name: transformFieldName(field.name, newGroupIndex),
          // Also transform na_checkbox_id if it exists
          na_checkbox_id: field.na_checkbox_id ? 
            transformFieldName(field.na_checkbox_id, newGroupIndex) : 
            undefined,
          // Transform button_ids for the new group
          button_ids: field.button_ids ? {
            ...field.button_ids,
            ...Object.fromEntries(
              Object.entries(field.button_ids).map(([key, id]) => [
                key,
                transformFieldName(id, newGroupIndex)
              ])
            )
          } : undefined
        };

        if (dateGroup) {
          return {
            ...newField,
            dateGroup: {
              ...dateGroup,
              dayField: { ...dateGroup.dayField, name: transformFieldName(dateGroup.dayField.name, newGroupIndex) },
              monthField: { ...dateGroup.monthField, name: transformFieldName(dateGroup.monthField.name, newGroupIndex) },
              yearField: { ...dateGroup.yearField, name: transformFieldName(dateGroup.yearField.name, newGroupIndex) }
            }
          };
        }
        
        return newField;
      });

      // Update findAndTransformDependencies to better handle nested dependencies
      const findAndTransformDependencies = (field: FormFieldType) => {
        if (!field.button_ids) return [];

        const chains: DependencyChain[] = [];
        
        Object.entries(field.button_ids).forEach(([value, buttonId]) => {
          // First find the original dependency key (using ctl00)
          const originalKey = buttonId.replace(/_ctl\d+/g, '_ctl00') + '.' + value;
          const transformedButtonId = transformFieldName(buttonId, newGroupIndex);
          
          // Find the dependency in the original form definition
          const dependency = findDependency(formDefinition.dependencies, originalKey);
          
          if (dependency?.shows?.length) {
            // Transform the parent field
            const transformedParent = {
              ...field,
              name: transformFieldName(field.name, newGroupIndex),
              button_ids: {
                ...field.button_ids,
                [value]: transformedButtonId
              }
            };

            // Transform child fields
            const transformedChildren = dependency.shows.map(child => ({
              ...child,
              name: transformFieldName(child.name, newGroupIndex),
              button_ids: child.button_ids ? 
                Object.fromEntries(
                  Object.entries(child.button_ids).map(([k, id]) => [
                    k,
                    transformFieldName(id, newGroupIndex)
                  ])
                ) : undefined,
              add_group: child.add_group
            }));

            // Add this chain
            chains.push({
              parentField: transformedParent,
              childFields: transformedChildren,
              parentChainId: undefined
            });

            // Important: Also add the nested dependencies from the original form definition
            if (dependency.dependencies) {
              Object.entries(dependency.dependencies).forEach(([depKey, nestedDep]) => {
                // Transform the nested dependency key to match the new group
                const [baseId, val] = depKey.split('.');
                const transformedNestedButtonId = transformFieldName(baseId.replace(/_ctl\d+/g, '_ctl00'), newGroupIndex);
                
                // Find the parent field for this nested dependency
                const nestedParent = transformedChildren.find(
                  child => child.button_ids && Object.values(child.button_ids).includes(transformedNestedButtonId)
                );

                if (nestedParent && nestedDep?.shows?.length) {
                  // Transform the nested children
                  const transformedNestedChildren = nestedDep.shows.map(child => ({
                    ...child,
                    name: transformFieldName(child.name, newGroupIndex),
                    button_ids: child.button_ids ? 
                      Object.fromEntries(
                        Object.entries(child.button_ids).map(([k, id]) => [
                          k,
                          transformFieldName(id, newGroupIndex)
                        ])
                      ) : undefined
                  }));

                  // Add the nested chain
                  chains.push({
                    parentField: nestedParent,
                    childFields: transformedNestedChildren,
                    parentChainId: transformedParent.name
                  });
                }
              });
            }
          }
        });

        return chains;
      };

      // Get all dependency chains for the new group
      const newDependencyChains = phraseGroup.fields.flatMap(field => 
        findAndTransformDependencies(field)
      );

      // Update visible fields and dependencies
      setVisibleFields(prevVisible => {
        const updated = new Set(Array.from(prevVisible));
        newClonedFields.forEach(field => {
          updated.add(field.name);
          if ((field as any).dateGroup) {
            const dg = (field as any).dateGroup;
            updated.add(dg.dayField.name);
            updated.add(dg.monthField.name);
            updated.add(dg.yearField.name);
          }
        });
        return updated;
      });

      // Add new dependency chains
      setDependencyChains(prev => [...prev, ...newDependencyChains]);
      
      // Create updated structure 
      const updatedGroups = {
        ...prev,
        [groupKey]: [...(prev[groupKey] || []), newClonedFields]
      };
      
      // UNCOMMENT THIS SECTION to propagate changes to parent component
      if (!isInitialArrayGroupsLoad && onArrayGroupsChange) {
        setTimeout(() => {
          const pageName = Object.values(formCategories)
            .flat()
            .find(form => form.definition === formDefinition)?.pageName;
          
          if (pageName) {
            if (pageName === 'workeducation3_page') {
              debugLog('workeducation3_page', `Updating parent's arrayGroups for: ${groupKey}`, {
                pageName, 
                groupKey,
                fieldCount: updatedGroups[groupKey].length
              });
            }
            
            // FIXED: Convert form fields to YAML format for all groups
            const allGroupsData = [];
            
            // Include both original fields (if present) and added groups
            // First, get the original fields (from the form, not from repeatedGroups)
            const originalFields = phraseGroup.fields.reduce((acc, field) => {
              const baseValue = formData[field.name] || '';
              if (baseValue) {
                // Get the YAML field name
                const yamlField = getYamlField(pageName, field.name);
                if (currentPageName === 'workeducation3_page') {
                  debugLog('workeducation3_page', `yamlField:`, {
                    yamlField
                  });
                }
                if (yamlField) {
                  // Extract the property name (after the last dot)
                  //const propName = yamlField.split('.').pop() || yamlField;
                  acc[yamlField] = baseValue;
                }
              }
              return acc;
            }, {} as Record<string, string>);
            
            // Add the original fields as first group if they exist
            if (Object.keys(originalFields).length > 0) {
              allGroupsData.push(originalFields);
            }
            
            // Now add all the repeated groups
            updatedGroups[groupKey].forEach(groupFields => {
              const groupData = {} as Record<string, string>;
              
              groupFields.forEach(field => {
                // Get base field name by removing control number
                const baseFieldName = field.name.replace(/_ctl\d+/, '_ctl00');
                const yamlField = getYamlField(pageName, baseFieldName);
                
                if (yamlField) {
                  // Extract just the property name (after the last dot)
                  //const propName = yamlField.split('.').pop() || yamlField;
                  groupData[yamlField] = formData[field.name] || '';
                }
              });
              
              // Only add non-empty groups
              if (Object.keys(groupData).length > 0) {
                allGroupsData.push(groupData);
              }
            });
            
            if (currentPageName === 'workeducation3_page') {
              debugLog('workeducation3_page', `Converted form data to YAML format:`, {
                pageName,
                groupKey,
                allGroupsData
              });
            }
            
            onArrayGroupsChange(pageName, groupKey, allGroupsData);
          }
        }, 0);
      }
      
      return updatedGroups;
    });
  };

  // Update handleRemoveGroup to remove the specific group by index
  const handleRemoveGroup = (phraseGroup: FieldGroup, cloneIndex: number, e: React.MouseEvent) => {
    const groupKey = normalizeTextPhrase(phraseGroup.parentTextPhrase);
    
    if (currentPageName === 'workeducation3_page') {
      debugLog(currentPageName, `handleRemoveGroup called for: ${groupKey} at index ${cloneIndex}`, {
        isInitialLoad: isInitialArrayGroupsLoad,
        parentTextPhrase: phraseGroup.parentTextPhrase,
        currentPage: currentPageName
      });
    }
    
    const currentGroups = repeatedGroups[groupKey] || [];
    if (currentGroups.length > 0 && cloneIndex < currentGroups.length) {
      // Instead of removing the specific index, we'll shift values down
      // and remove the last one
      
      // Step 1: Shift all values from higher indices to lower indices
      // For example: if removing index 1 (ctl02), shift values from:
      // ctl03 → ctl02, ctl04 → ctl03, etc.
      for (let i = cloneIndex; i < currentGroups.length - 1; i++) {
        const currentFields = currentGroups[i];
        const nextFields = currentGroups[i + 1];
        
        // Copy values from the next higher group to current group
        currentFields.forEach(field => {
          // Find the corresponding field in the next group
          const matchingNextField = nextFields.find(nextField => {
            // Match by removing control number (ctl01, ctl02, etc.) and comparing
            const baseNameCurrent = field.name.replace(/(_ctl)\d+/, '$1');
            const baseNameNext = nextField.name.replace(/(_ctl)\d+/, '$1');
            return baseNameCurrent === baseNameNext;
          });
          
          if (matchingNextField) {
            // Copy the value down
            if (formData[matchingNextField.name]) {
              if (currentPageName === 'workeducation3_page') {
                debugLog('workeducation3_page', `Shifting values: ${matchingNextField.name} → ${field.name}`, {
                  fromValue: formData[matchingNextField.name],
                  toField: field.name
                });
              }
              onInputChange(field.name, formData[matchingNextField.name]);
            } else {
              // Clear the field if next group doesn't have a value
              onInputChange(field.name, '');
            }
          }
        });
      }
      
      // Step 2: Clear values in the last group
      const lastGroup = currentGroups[currentGroups.length - 1];
      lastGroup.forEach(field => {
        if (formData[field.name]) {
          onInputChange(field.name, '');
        }
        
        // Also remove from visibleFields to update the denominator
        if (visibleFields.has(field.name)) {
          setVisibleFields(prev => {
            const next = new Set(prev);
            next.delete(field.name);
            return next;
          });
        }
      });
      
      // Step 3: Remove the last group from repeatedGroups
      const updatedGroups = currentGroups.slice(0, -1);
      
      setRepeatedGroups(prev => {
        const result = {
          ...prev,
          [groupKey]: updatedGroups
        };
        
        // UNCOMMENT THIS SECTION to propagate changes to parent component
        if (!isInitialArrayGroupsLoad && onArrayGroupsChange) {
          setTimeout(() => {
            const pageName = Object.values(formCategories)
              .flat()
              .find(form => form.definition === formDefinition)?.pageName;
            
            if (pageName) {
              // Create array data for remaining groups
              const allGroupsData: Record<string, string>[] = [];
              
              // Original fields (first group)
              const originalFields = phraseGroup.fields.reduce((acc, field) => {
                const baseValue = formData[field.name] || '';
                if (baseValue) {
                  const yamlField = getYamlField(pageName, field.name);
                  if (yamlField) {
                    acc[yamlField] = baseValue;
                  }
                }
                return acc;
              }, {} as Record<string, string>);
              
              // Add original fields if they exist
              if (Object.keys(originalFields).length > 0) {
                allGroupsData.push(originalFields);
              }
              
              // Add all remaining repeated groups with their values
              updatedGroups.forEach(fields => {
                const groupData = {} as Record<string, string>;
                
                fields.forEach(field => {
                  const baseFieldName = field.name.replace(/_ctl\d+/, '_ctl00');
                  const yamlField = getYamlField(pageName, baseFieldName);
                  const fieldValue = formData[field.name];
                  
                  if (yamlField && fieldValue) {
                    groupData[yamlField] = fieldValue;
                  }
                });
                
                if (Object.keys(groupData).length > 0) {
                  allGroupsData.push(groupData);
                }
              });
              
              onArrayGroupsChange(pageName, groupKey, allGroupsData);
            }
          }, 0);
        }
        
        return result;
      });
      
      if (currentPageName === 'workeducation3_page') {
        debugLog(currentPageName, `Removed group at index ${cloneIndex} (via shifting values and removing last group)`, updatedGroups);
      }
      
    } else {
      if (currentPageName === 'workeducation3_page') {
        debugLog(currentPageName, `No extra group exists for phrase ${groupKey} to remove`);
      }
    }
  };

  const renderNavigationButtons = () => {
    const prevForm = getPreviousForm(formCategories, currentCategory, currentIndex);
    const nextForm = getNextForm(formCategories, currentCategory, currentIndex);

    return (
      <div className="flex justify-between mt-6">
        {prevForm && (
          <Button
            onClick={() => onNavigate(prevForm.category, prevForm.index)}
            variant="outline"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            ← {getPageTitle(formCategories, prevForm.category, prevForm.index)}
          </Button>
        )}
        
        {/* Save button */}
        <Button 
          onClick={() => {
            // Call the onSave function if provided
            if (onSave) {
              onSave().then(result => {
                if (result.success) {
                  // Optionally show a success message
                  //console.log('Form saved successfully');
                } else {
                  //console.error('Failed to save form:', result.error);
                }
              });
            }
          }}
          variant="outline"
          className="bg-green-600 hover:bg-green-700 text-white font-medium"
        >
          Save
        </Button>

        {nextForm && (
          <Button
            onClick={() => {
              // Call onSave before navigating to next form
              if (onSave) {
                onSave().then(() => {
                  onNavigate(nextForm.category, nextForm.index);
                });
              } else {
                onNavigate(nextForm.category, nextForm.index);
              }
            }}
            variant="outline"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            {getPageTitle(formCategories, nextForm.category, nextForm.index)} →
          </Button>
        )}
      </div>
    );
  };

  // Simplified useEffect to update arrayGroups when field values change
  useEffect(() => {
    if (currentPageName === 'workeducation3_page') {
      //console.log('useEffect formData investigation', currentPageName, isInitialArrayGroupsLoad, onArrayGroupsChange, repeatedGroups);
    }
    if (isInitialArrayGroupsLoad || !onArrayGroupsChange) {
      if (currentPageName === 'workeducation3_page') {
        //console.log('useEffect formData investigation', 'returning early');
      }
      return;
    }
    
    // Only proceed if we have some repeatedGroups
    if (Object.keys(repeatedGroups).length === 0) {
      if (currentPageName === 'workeducation3_page') {
        //console.log('useEffect formData investigation', 'returning early because no repeatedGroups');
      }
      return;
    }
    
    // Find the current page name
    const pageName = Object.values(formCategories)
      .flat()
      .find(form => form.definition === formDefinition)?.pageName;
      
    if (!pageName) {
      if (currentPageName === 'workeducation3_page') {
        //console.log('useEffect formData investigation', 'returning early because no pageName', pageName);
      }
      return;
    }
    
    if (currentPageName === 'workeducation3_page') {
      //console.log('useEffect formData investigation repeatedGroups & fieldGroups', repeatedGroups, fieldGroups);
    }

    // Update all groups with current values from formData
    Object.keys(repeatedGroups).forEach(groupKey => {
      if (currentPageName === 'workeducation3_page') {
        //console.log('useEffect formData processing groupKey:', groupKey);
      }
      
      // Get all the fields in this group directly from repeatedGroups
      const allFields = repeatedGroups[groupKey].flat();
      
      // We need unique field names to avoid duplicates when converting to YAML
      const uniqueBaseFields = new Set<string>();
      allFields.forEach(field => {
        // Get the base field name by removing control numbers
        const baseFieldName = field.name.replace(/_ctl\d+/, '_ctl00');
        uniqueBaseFields.add(baseFieldName);
      });
      
      // Convert to array of unique base fields
      const baseFieldsArray = Array.from(uniqueBaseFields);
      
      if (currentPageName === 'workeducation3_page') {
        //console.log('useEffect formData unique base fields:', baseFieldsArray);
      }
      
      // Get all array group data with current values
      const allGroupsData: Record<string, string>[] = [];
      
      // Get original fields (first group)
      const originalFields = {} as Record<string, string>;
      
      // Iterate through the unique base fields
      baseFieldsArray.forEach(baseFieldName => {
        const yamlField = getYamlField(pageName, baseFieldName);
        // Check if this field has a value in the original (non-repeated) form
        const originalFieldValue = formData[baseFieldName];
        
        if (yamlField && originalFieldValue) {
          originalFields[yamlField] = originalFieldValue;
        }
      });
      
      // Add original fields if they exist
      if (Object.keys(originalFields).length > 0) {
        allGroupsData.push(originalFields);
      }
      
      // Process repeated groups
      repeatedGroups[groupKey].forEach(fields => {
        const groupData = {} as Record<string, string>;
        
        // Process each field in this group
        fields.forEach(field => {
          const baseFieldName = field.name.replace(/_ctl\d+/, '_ctl00');
          const yamlField = getYamlField(pageName, baseFieldName);
          const fieldValue = formData[field.name];
          
          if (yamlField && fieldValue) {
            groupData[yamlField] = fieldValue;
          }
        });
        
        // Only add non-empty groups
        if (Object.keys(groupData).length > 0) {
          allGroupsData.push(groupData);
        }
      });
      
      if (currentPageName === 'workeducation3_page') {
        //console.log('allGroupsData pageName, groupKey, allGroupsData', pageName, groupKey, allGroupsData);
      }
      
      // Only update if we have some data
      if (allGroupsData.length > 0) {
        if (pageName === 'workeducation3_page') {
          debugLog('workeducation3_page', `allGroupsData from useEffect:`, {
            allGroupsData
          });
        }
        //debounce this 
        
        onArrayGroupsChange(pageName, groupKey, allGroupsData);
      }
    });
  }, [formData]);

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
                  <div key={`phrase-group-${phraseGroup.parentTextPhrase}-${phraseIndex}`}>
                    {/* Render the phrase group with border if it has multiple fields */}
                    <div className={`relative ${getEffectiveFieldCount(phraseGroup.fields) > 1 ? 
                      'border border-gray-400 rounded-lg p-12 mb-8 mt-12' : ''}`}>
                      {getEffectiveFieldCount(phraseGroup.fields) > 1 && phraseGroup.parentTextPhrase && (
                        <span className="absolute -top-3 left-3 bg-white px-2 text-lg font-bold text-gray-1000">
                          {phraseGroup.parentTextPhrase}
                        </span>
                      )}

                      <div className="space-y-4">
                        {fieldsToRender.map(item => {
                          if (!item) return null;
                          
                          if (item.type === 'date' && item.dateGroup) {
                            return (
                              <DateFieldGroupComponent
                                key={item.key}
                                dateGroup={item.dateGroup}
                                values={formData}
                                onChange={onInputChange}
                                visible={visibleFields.has(item.dateGroup.dayField.name)}
                              />
                            )
                          }
                          
                          if (item.type === 'ssn' && item.ssnGroup) {
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
                          
                          if (item.field) {
                            return (
                              <FormField
                                key={item.key}
                                field={item.field}
                                value={formData[item.field.name] || ''}
                                onChange={onInputChange}
                                visible={visibleFields.has(item.field.name)}
                                onDependencyChange={(key) => handleDependencyChange(key, item.field)}
                                formData={formData}
                              />
                            )
                          }
                          
                          return null;
                        })}
                      </div>

                      {/* Add Group button */}
                      {phraseGroup.fields.some(f => f.add_group) && (
                        <div className="absolute -bottom-4 right-3">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            data-group-id={normalizeTextPhrase(phraseGroup.parentTextPhrase)}
                            onClick={() => {
                              debugLog('workeducation3_page', 'Adding group with phraseGroup:', phraseGroup);
                              handleAddGroup(phraseGroup);
                            }}
                            className="bg-white border-2 border-gray-300 hover:bg-gray-50 text-gray-700"
                          >
                            Add Another
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Repeated groups with increased margins */}
                    {repeatedGroups[normalizeTextPhrase(phraseGroup.parentTextPhrase) || "NO_PHRASE"]?.map((clonedFields, cloneIdx) => {
                      // Process cloned fields for date groups
                      const clonedFieldsToRender = clonedFields.map(field => {
                        // Use the dateGroup that was attached during cloning
                        const dateGroup = (field as any).dateGroup;
                        
                        if (dateGroup && !renderedDateGroups.has(dateGroup.basePhrase + `-clone-${cloneIdx}`)) {
                          renderedDateGroups.add(dateGroup.basePhrase + `-clone-${cloneIdx}`)
                          return {
                            type: 'date',
                            dateGroup,
                            key: `date-${dateGroup.basePhrase}-clone-${cloneIdx}`
                          }
                        }
                        
                        // Return field as a regular form field
                        return {
                          type: 'field',
                          field,
                          key: `field-${field.name}-clone-${cloneIdx}`
                        }
                      }).filter(Boolean)

                      return (
                        <div key={`clone-${phraseGroup.parentTextPhrase}-${phraseIndex}-${cloneIdx}`} 
                             className="relative border border-dashed border-gray-300 p-4 pb-8 rounded-md bg-gray-50 mt-8 mb-8">
                          <div className="space-y-4">
                            {clonedFieldsToRender.map(item => {
                              if (item.type === 'date') {
                                return (
                                  <DateFieldGroupComponent
                                    key={item.key}
                                    dateGroup={item.dateGroup}
                                    values={formData}
                                    onChange={onInputChange}
                                    visible={visibleFields.has(item.dateGroup.dayField.name)}
                                  />
                                )
                              }
                              
                              // For regular fields
                              return (
                                <FormField
                                  key={item.key}
                                  field={item.field}
                                  value={formData[item.field.name] || ''}
                                  onChange={onInputChange}
                                  visible={visibleFields.has(item.field.name)}
                                  onDependencyChange={(key) => handleDependencyChange(key, item.field)}
                                  formData={formData}
                                />
                              )
                            })}
                          </div>

                          {/* Add Remove button at bottom right on the border */}
                          <div className="absolute -bottom-4 right-3">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => handleRemoveGroup(phraseGroup, cloneIdx, e)}
                              className="bg-white border-2 border-red-300 hover:bg-red-50 text-red-700"
                            >
                              Remove
                            </Button>
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
        
        {renderNavigationButtons()}
      </form>
    </FormProvider>
  )
} 
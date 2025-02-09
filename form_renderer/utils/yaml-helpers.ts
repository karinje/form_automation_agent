import { debugLog } from './consoleLogger';

// Helper to detect if a value is a YAML array (list)
const isYamlArray = (value: any): boolean => {
  return Array.isArray(value) && value.length > 0;
};

// Helper to transform field names for additional groups
export const transformFieldName = (fieldName: string, groupIndex: number): string => {
  // Don't transform the first group
  if (groupIndex === 0) return fieldName;
  
  // Replace the last occurrence of _ctl\d+ with _ctlXX where XX is the group index
  const match = fieldName.match(/(_ctl\d+)(?!.*_ctl\d+)/);
  if (!match) return fieldName;

  const prefix = fieldName.substring(0, match.index);
  const suffix = fieldName.substring(match.index + match[1].length);
  return `${prefix}_ctl${groupIndex.toString().padStart(2, '0')}${suffix}`;
};

// Modified flattenYamlData to handle arrays and transform field names
export const flattenYamlData = (
  obj: any, 
  prefix = '', 
  isDebugPage = false
): Record<string, string | Record<string, string>[]> => {
  const flattened: Record<string, string | Record<string, string>[]> = {};

  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (isYamlArray(value)) {
      debugLog('previous_travel_page', `Detected array at key: ${newKey}`, value);
      
      // Create a mapping for each item in the array
      const arrayMappings = value.map((item: any, index: number) => {
        if (typeof item === 'object' && !Array.isArray(item)) {
          const flattenedItem: Record<string, string> = {};
          Object.entries(item).forEach(([itemKey, itemValue]) => {
            if (typeof itemValue === 'object' && !Array.isArray(itemValue)) {
              // Keep parent prefix for nested objects
              Object.entries(itemValue).forEach(([subKey, subValue]) => {
                const formFieldKey = `${newKey}.${itemKey}.${subKey}`; // Keep parent prefix
                flattenedItem[formFieldKey] = String(subValue);
              });
            } else {
              // Keep parent prefix for direct fields
              const formFieldKey = `${newKey}.${itemKey}`; // Keep parent prefix
              flattenedItem[formFieldKey] = String(itemValue);
            }
          });
          return flattenedItem;
        }
        return { [newKey]: String(item) };
      });

      flattened[newKey] = arrayMappings;
      if (isDebugPage) {
        debugLog('previous_travel_page', `Created array mapping for ${newKey}:`);
        debugLog('previous_travel_page', JSON.stringify(arrayMappings, null, 2));
      }
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = flattenYamlData(value, newKey, isDebugPage);
      Object.assign(flattened, nested);
    } else {
      flattened[newKey] = String(value);
    }
  }

  // Add debug logging for complete flattened structure
  if (prefix === '' && isDebugPage) {  // Only log at top level
    debugLog('previous_travel_page', 'Complete flattened structure:', {
      regular_fields: Object.entries(flattened)
        .filter(([_, v]) => !Array.isArray(v))
        .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}),
      array_fields: Object.entries(flattened)
        .filter(([_, v]) => Array.isArray(v))
        .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})
    });
  }

  return flattened;
};

// Helper to convert flattened form data back to nested YAML structure
export const unflattenFormData = (data: Record<string, string>): Record<string, any> => {
  const result: Record<string, any> = {}
  
  for (const key in data) {
    const parts = key.split('.')
    let current = result
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      current[part] = current[part] || {}
      current = current[part]
    }
    
    current[parts[parts.length - 1]] = data[key]
  }
  
  return result
}

// Helper to identify if a page is the previous travel page
export const isPreviousTravelPage = (pageName: string): boolean => {
  return pageName === 'previous_travel_page';
}; 
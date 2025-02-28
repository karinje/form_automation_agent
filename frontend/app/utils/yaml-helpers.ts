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
  const result: Record<string, any> = {};
  const arrays: Record<string, any> = {}; // temporary store for array groups

  console.log("Starting unflattenFormData with data:", data);

  // First pass: Process each field
  Object.entries(data).forEach(([key, value]) => {
    // Match any _ctl followed by one or more digits anywhere in key
    const m = key.match(/(.*)_ctl(\d+)/);
    if (m) {
      // This is an array field
      const baseKey = m[1]; // e.g., "previous_travel_page.previous_travel_details.arrival.month"
      const index = parseInt(m[2]); // e.g., 0, 1, etc.
      const parts = baseKey.split('.');
      // Assume the first two parts define the array group:
      const pageName = parts[0];
      const groupName = parts[1];
      const groupPath = `${pageName}.${groupName}`;

      //console.log(`Found array field key: ${key}, groupPath: ${groupPath}, index: ${index}`);

      if (!arrays[groupPath]) {
        arrays[groupPath] = {};
      }
      if (!arrays[groupPath][index]) {
        arrays[groupPath][index] = {};
      }
      let obj = arrays[groupPath][index];
      for (let i = 2; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          obj[part] = value;
          //console.log(`Setting value for ${groupPath} at index ${index}, key part '${part}': ${value}`);
        } else {
          obj[part] = obj[part] || {};
          obj = obj[part];
        }
      }
    } else {
      // Non-array field: standard unflattening
      const parts = key.split('.');
      let obj = result;
      for (let i = 0; i < parts.length - 1; i++) {
        obj[parts[i]] = obj[parts[i]] || {};
        obj = obj[parts[i]];
      }
      obj[parts[parts.length - 1]] = value;
      //console.log(`Processed non-array field: ${key} => ${value}`);
    }
  });

  //console.log("Intermediate arrays object:", arrays);

  // Second pass: merge array groups into result
  Object.entries(arrays).forEach(([groupPath, groupObj]) => {
    const parts = groupPath.split('.');
    let obj = result;
    for (let i = 0; i < parts.length - 1; i++) {
      obj[parts[i]] = obj[parts[i]] || {};
      obj = obj[parts[i]];
    }
    // Convert groupObj (object with numeric keys) into an array sorted by numeric index
    const arr = [];
    Object.keys(groupObj).forEach(k => {
      const idx = parseInt(k);
      arr[idx] = groupObj[k];
    });
    obj[parts[parts.length - 1]] = arr;
    //console.log(`Merged array for groupPath: ${groupPath}`, arr);
  });

  //console.log("Final unflattened result:", result);
  return result;
};

// Helper to identify if a page is the previous travel page
export const isPreviousTravelPage = (pageName: string): boolean => {
  return pageName === 'previous_travel_page';
};

// New helper to "flatten" repeated groups into flat key/value pairs
export const flattenRepeatedGroups = (repeatedGroups: Record<string, Record<string, any[]>>): Record<string, any> => {
  const result: Record<string, any> = {};
  //console.log('flattenRepeatedGroups input:', repeatedGroups);
  
  // Iterate over each page
  Object.entries(repeatedGroups).forEach(([pageName, pageGroups]) => {
    //console.log(`Processing page ${pageName}:`, pageGroups);
    result[pageName] = {};
    
    Object.entries(pageGroups).forEach(([groupKey, groupArray]) => {
      //console.log(`Processing group ${groupKey}:`, groupArray);
      
      // Transform each group item into proper nested structure
      result[pageName][groupKey] = groupArray.map(group => {
        //console.log('Processing group item:', group);
        const restructured = {};
        
        Object.entries(group).forEach(([fieldKey, value]) => {
          const cleanKey = fieldKey.replace(`${groupKey}.`, '');
          const parts = cleanKey.split('.');
          //console.log(`Processing field ${fieldKey} -> ${cleanKey}:`, {parts, value});
          
          let current = restructured;
          for (let i = 0; i < parts.length - 1; i++) {
            current[parts[i]] = current[parts[i]] || {};
            current = current[parts[i]];
          }
          current[parts[parts.length - 1]] = value;
        });
        
        //console.log('Restructured group item:', restructured);
        return restructured;
      });
      //console.log(`Final array for ${groupKey}:`, result[pageName][groupKey]);
    });
  });
  
  //console.log('Final flattened result:', result);
  return result;
}; 
import { debugLog } from '../utils/consoleLogger';

/**
 * Recursively counts the actual data fields in a YAML-derived object structure
 * with special handling for _na fields and debugging support
 */
export const countDataFields = (obj: any, path: string = '', countedFields: string[] = []): number => {
  if (!obj || typeof obj !== 'object') return 0;
  
  let fieldCount = 0;
  const processedFields = new Set<string>(); // Track processed fields to avoid double counting
  
  // Skip button_clicks and street2 completely
  if (path === 'button_clicks' || path.endsWith('.button_clicks') || 
      path === 'street2' || path.endsWith('.street2')) {
    return 0;
  }
  
  // First pass: identify all _na fields and their values
  const naFields = new Map<string, boolean>();
  Object.entries(obj).forEach(([key, value]) => {
    // Skip button_clicks and street2
    if (key === 'button_clicks' || key === 'street2') return;
    
    if (key.endsWith('_na')) {
      const baseField = key.slice(0, -3); // Remove '_na' suffix
      naFields.set(baseField, value);
    }
  });
  
  // Second pass: count fields based on NA rules
  Object.entries(obj).forEach(([key, value]) => {
    // Skip button_clicks and street2
    if (key === 'button_clicks' || key === 'street2') return;
    
    // Skip if we already processed this field
    if (processedFields.has(key)) return;
    
    const currentPath = path ? `${path}.${key}` : key;
    
    // Handle regular fields (non-na fields)
    if (!key.endsWith('_na')) {
      const hasNaField = naFields.has(key);
      const naValue = naFields.get(key);
      
      if (hasNaField) {
        // This field has a corresponding _na field
        // Check for true, "true", "True", "TRUE", "Y", or "1"
        debugLog('field_counts', `Checking ${key} hasnaField: ${hasNaField} and naValue: ${naValue}`);
        const isNaTrue = naValue === true || naValue === "true" ;
          
        if (isNaTrue) {
          // If NA is true (any format), count the NA field only
          fieldCount++;
          countedFields.push(`${currentPath}_na=true`);
          processedFields.add(key);
          processedFields.add(`${key}_na`);
        } else {
          // NA is false, count only if value is non-empty
          const isEmpty = value === "" || value === null || value === undefined || 
                         (Array.isArray(value) && value.length === 0);
          
          if (!isEmpty) {
            fieldCount++;
            countedFields.push(`${currentPath}=${value}`);
          }
          processedFields.add(key);
          processedFields.add(`${key}_na`);
        }
      } else {
        // No NA field exists, count only if non-empty
        const isEmpty = value === "" || value === null || value === undefined || 
                       (Array.isArray(value) && value.length === 0);
        
        if (!isEmpty) {
          // If it's an array, count its items
          if (Array.isArray(value)) {
            value.forEach((item, index) => {
              if (typeof item === 'object' && item !== null) {
                // Recursively count nested objects in array
                const nestedCount = countDataFields(item, `${currentPath}[${index}]`, countedFields);
                fieldCount += nestedCount;
              } else if (item !== "" && item !== null && item !== undefined) {
                fieldCount++;
                countedFields.push(`${currentPath}[${index}]=${item}`);
              }
            });
          } 
          // If it's an object, recursively count its fields
          else if (typeof value === 'object' && value !== null) {
            const nestedCount = countDataFields(value, currentPath, countedFields);
            fieldCount += nestedCount;
          }
          // Otherwise count as a single field
          else {
            fieldCount++;
            countedFields.push(`${currentPath}=${value}`);
          }
        }
        processedFields.add(key);
      }
    }
    // _na fields are handled with their base fields
  });
  
  return fieldCount;
};

/**
 * Counts fields by page section in a YAML-derived object
 * Returns an object with counts per page section and logs the debug info
 */
export const countFieldsByPage = (yamlData: any): Record<string, number> => {
  const counts: Record<string, number> = {};
  const debugInfo: Record<string, string[]> = {};
  
  if (!yamlData) return counts;
  
  // Apply recursive counting to each page section
  Object.entries(yamlData).forEach(([pageKey, pageData]) => {
    if (pageData && typeof pageData === 'object') {
      const countedFields: string[] = [];
      counts[pageKey] = countDataFields(pageData, pageKey, countedFields);
      debugInfo[pageKey] = countedFields;
    }
  });
  
  // Log the debug info
  debugLog('field_counts', 'Fields included in count:', debugInfo);
  
  return counts;
};

/**
 * Gets both counts and list of fields for debugging
 * This can be used for more detailed debugging
 */
export const getFieldCountDetails = (yamlData: any): { 
  counts: Record<string, number>, 
  fieldDetails: Record<string, string[]> 
} => {
  const counts: Record<string, number> = {};
  const fieldDetails: Record<string, string[]> = {};
  
  if (!yamlData) return { counts, fieldDetails };
  
  // Apply recursive counting to each page section
  Object.entries(yamlData).forEach(([pageKey, pageData]) => {
    if (pageData && typeof pageData === 'object') {
      const countedFields: string[] = [];
      counts[pageKey] = countDataFields(pageData, pageKey, countedFields);
      fieldDetails[pageKey] = countedFields;
    }
  });
  
  return { counts, fieldDetails };
}; 
import { flattenYamlData, isPreviousTravelPage } from './yaml-helpers';
import { getFormFieldId } from './mappings';
import { normalizeTextPhrase } from './helpers';
import yaml from 'js-yaml';
import { debugLog } from './consoleLogger';

interface MappingResult {
  formData: Record<string, string>;
  arrayGroups: Record<string, Record<string, Array<Record<string, string>>>>;
}

// Add mapping for array fields
const arrayFieldMappings: Record<string, string> = {
  'arrival.month': 'ddlPREV_US_VISIT_DTEMonth',
  'arrival.day': 'ddlPREV_US_VISIT_DTEDay',
  'arrival.year': 'tbxPREV_US_VISIT_DTEYear',
  'length_of_stay.number': 'tbxPREV_US_VISIT_LOS',
  'length_of_stay.unit': 'ddlPREV_US_VISIT_LOS_CD'
};

export const createFormMapping = (yamlContent: string): MappingResult => {
  try {
    // Parse YAML content
    const parsedYaml = yaml.load(yamlContent) as Record<string, any>;
    debugLog('all_pages', '[Mapping Creation] Starting YAML processing');

    const formData: Record<string, string> = {};
    const arrayGroups: Record<string, Record<string, Array<Record<string, string>>>> = {};

    // Process each page in the YAML
    Object.entries(parsedYaml).forEach(([pageName, pageData]) => {
      const isDebugPage = isPreviousTravelPage(pageName);
      
      // Log all page data for array detection
      debugLog('all_pages', `[Mapping Creation] Processing page: ${pageName}`, pageData);

      // Detect arrays in the raw data before flattening
      Object.entries(pageData).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          debugLog('all_pages', `[Mapping Creation] Detected array in ${pageName}.${key}:`, value);
        }
      });

      // Flatten the YAML data for this page
      const flattenedData = flattenYamlData(pageData, '', isDebugPage);

      // Process the flattened data
      Object.entries(flattenedData).forEach(([yamlField, value]) => {
        debugLog('all_pages', `Processing field: ${yamlField}`, { value, type: typeof value });
        
        // Handle NA checkbox fields
        if (yamlField.endsWith('_na')) {
          const formFieldId = getFormFieldId(pageName, yamlField);
          const stringValue = String(value) === 'true' ? "true" : "false";
      
          if (formFieldId) {
            // Set the checkbox state
            formData[formFieldId] = stringValue;
            
            // Special handling for SSN fields
            if (yamlField === "us_social_security_na" && stringValue === "true") {
              // Set all SSN fields to "N/A"
              formData["ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_SSN1"] = "N/A";
              formData["ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_SSN2"] = "N/A";
              formData["ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_SSN3"] = "N/A";
                        
            } else if (stringValue === "true") {
              // Regular NA field handling
              const mainYamlField = yamlField.replace(/_na$/, '');
              const mainFormFieldId = getFormFieldId(pageName, mainYamlField);
              if (mainFormFieldId) {
                formData[mainFormFieldId] = "N/A";
              }
            }
            
            debugLog('all_pages', `Set NA values:`, {
              checkboxField: formFieldId,
              checkboxValue: stringValue,
              formData
            });
          }
        } else if (Array.isArray(value)) {
          const normalizedField = normalizeTextPhrase(yamlField);
          if (!arrayGroups[pageName]) arrayGroups[pageName] = {};
          arrayGroups[pageName][normalizedField] = value;
          
          // Map first group fields to form fields
          value.forEach((item, index) => {
            Object.entries(item).forEach(([itemField, itemValue]) => {
              // Get the mapped field ID
              const mappedField = arrayFieldMappings[itemField];
              const formFieldId = mappedField ? 
                `ctl00_SiteContentPlaceHolder_FormView1_dtlPREV_US_VISIT_ctl00_${mappedField}` : 
                getFormFieldId(pageName, itemField);

              debugLog('previous_travel_page', `Getting form field ID:`, {
                pageName,
                itemField,
                mappedField,
                formFieldId
              });

              if (!formFieldId) {
                debugLog('previous_travel_page', `No form field ID found for:`, {
                  pageName,
                  itemField
                });
                return;
              }

              // Transform control number for additional items
              const finalFieldId = index === 0 
                ? formFieldId 
                : formFieldId.replace(/_ctl\d+/, `_ctl${index.toString().padStart(2, '0')}`);

              debugLog('previous_travel_page', `Adding to formData:`, {
                finalFieldId,
                value: itemValue
              });

              formData[finalFieldId] = String(itemValue);
            });
          });
        } else if (typeof value === 'string') {
          const formFieldId = getFormFieldId(pageName, yamlField);
          if (formFieldId) {
            formData[formFieldId] = value;
          }
        }
      });
    });

    // Log final mapping structure
    debugLog('all_pages', '[Mapping Creation] Final mapping structure:', {
      formData,
      arrayGroups
    });

    return { formData, arrayGroups };
  } catch (error) {
    console.error('[Mapping Creation] Error creating form mapping:', error);
    throw error;
  }
};

export const unflattenFormData = (data: Record<string, string>): Record<string, any> => {
  const result: Record<string, any> = {};
  const arrays: Record<string, any> = {}; // temporary store for array groups

  console.log("Starting unflattenFormData with data:", data);

  // First pass: Process each field
  Object.entries(data).forEach(([key, value]) => {
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

      console.log(`Found array field key: ${key}, groupPath: ${groupPath}, index: ${index}`);

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
          console.log(`Setting value for ${groupPath} index ${index}, key part '${part}': ${value}`);
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
      console.log(`Processed non-array field: ${key} => ${value}`);
    }
  });

  console.log("Intermediate arrays object:", arrays);

  // Second pass: merge arrays into result
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
      arr[parseInt(k)] = groupObj[k];
    });
    obj[parts[parts.length - 1]] = arr;
    console.log(`Merged array for groupPath: ${groupPath}`, arr);
  });

  console.log("Final unflattened result:", result);
  return result;
}; 
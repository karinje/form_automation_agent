import { flattenYamlData, isPreviousTravelPage } from './yaml-helpers';
import { getFormFieldId } from './mappings';
import yaml from 'js-yaml';
import { debugLog } from './consoleLogger';

interface MappingResult {
  formData: Record<string, string>;
  arrayGroups: Record<string, Array<Record<string, string>>>;
}

export const createFormMapping = (yamlContent: string): MappingResult => {
  try {
    // Parse YAML content
    const parsedYaml = yaml.load(yamlContent) as Record<string, any>;
    debugLog('all_pages', '[Mapping Creation] Processing YAML data');

    const formData: Record<string, string> = {};
    const arrayGroups: Record<string, Array<Record<string, string>>> = {};

    // Process each page in the YAML
    Object.entries(parsedYaml).forEach(([pageName, pageData]) => {
      const isDebugPage = isPreviousTravelPage(pageName);
      
      if (isDebugPage) {
        debugLog('previous_travel_page', 'Processing page data:', pageData);
      }

      // Flatten the YAML data for this page
      const flattenedData = flattenYamlData(pageData, '', isDebugPage);

      // Process the flattened data
      Object.entries(flattenedData).forEach(([yamlField, value]) => {
        if (Array.isArray(value)) {
          // Store array groups for later processing
          arrayGroups[yamlField] = value;
          
          // Process each array item
          value.forEach((item, index) => {
            Object.entries(item).forEach(([itemField, itemValue]) => {
              const formFieldId = getFormFieldId(pageName, itemField);
              if (!formFieldId) return;

              // Transform control number for additional items
              const finalFieldId = index === 0 
                ? formFieldId 
                : formFieldId.replace(/_ctl00/, `_ctl${index.toString().padStart(2, '0')}`);

              if (isDebugPage) {
                debugLog('previous_travel_page', `Mapping array field [${index}]:`, { 
                  from: itemField,
                  to: finalFieldId, 
                  value: itemValue 
                });
              }

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

    return { formData, arrayGroups };
  } catch (error) {
    console.error('[Mapping Creation] Error creating form mapping:', error);
    throw error;
  }
}; 
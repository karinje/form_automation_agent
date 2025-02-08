import { flattenYamlData, isPreviousTravelPage } from './yaml-helpers';
import { getFormFieldId } from './mappings';
import { normalizeTextPhrase } from './helpers';
import yaml from 'js-yaml';
import { debugLog } from './consoleLogger';

interface MappingResult {
  formData: Record<string, string>;
  arrayGroups: Record<string, Array<Record<string, string>>>;
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
    const arrayGroups: Record<string, Array<Record<string, string>>> = {};

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
        if (Array.isArray(value)) {
          const normalizedField = normalizeTextPhrase(yamlField);
          arrayGroups[normalizedField] = value;
          
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
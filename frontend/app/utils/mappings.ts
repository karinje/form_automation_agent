// Import generated mappings
import personal1 from './generated_mappings/personal_page1_mapping.json'
import personal2 from './generated_mappings/personal_page2_mapping.json'
import travel from './generated_mappings/travel_page_mapping.json'
import travelCompanions from './generated_mappings/travel_companions_page_mapping.json'
import previousTravel from './generated_mappings/previous_travel_page_mapping.json'
import addressPhone from './generated_mappings/address_phone_page_mapping.json'
import pptVisa from './generated_mappings/pptvisa_page_mapping.json'
import usContact from './generated_mappings/us_contact_page_mapping.json'
import relatives from './generated_mappings/relatives_page_mapping.json'
import workEducation1 from './generated_mappings/workeducation1_page_mapping.json'
import workEducation2 from './generated_mappings/workeducation2_page_mapping.json'
import workEducation3 from './generated_mappings/workeducation3_page_mapping.json'
import securityBackground1 from './generated_mappings/security_background1_page_mapping.json'
import securityBackground2 from './generated_mappings/security_background2_page_mapping.json'
import securityBackground3 from './generated_mappings/security_background3_page_mapping.json'
import securityBackground4 from './generated_mappings/security_background4_page_mapping.json'
import securityBackground5 from './generated_mappings/security_background5_page_mapping.json'
import spouse from './generated_mappings/spouse_page_mapping.json'
import { debugLog } from './consoleLogger'
// Convert Python mappings to TypeScript
export const pageNameMappings: Record<string, string> = {
  'personal_page1': 'p1_personal1_definition',
  'personal_page2': 'p2_personal2_definition',
  'travel_companions_page': 'p4_travelcompanions_definition',
  'previous_travel_page': 'p5_previousustravel_definition',
  'address_phone_page': 'p6_addressphone_definition',
  'pptvisa_page': 'p7_pptvisa_definition',
  'us_contact_page': 'p8_uscontact_definition',
  'relatives_page': 'p9_relatives_definition',
  'spouse_page': 'p18_spouse_definition',
  'workeducation1_page': 'p10_workeducation1_definition',
  'workeducation2_page': 'p11_workeducation2_definition',
  'workeducation3_page': 'p12_workeducation3_definition',
  'security_background1_page': 'p13_securityandbackground1_definition',
  'security_background2_page': 'p14_securityandbackground2_definition',
  'security_background3_page': 'p15_securityandbackground3_definition',
  'security_background4_page': 'p16_securityandbackground4_definition',
  'security_background5_page': 'p17_securityandbackground5_definition'
}

export const formMappings: Record<string, Record<string, string>> = {
    "personal_page1": personal1.form_mapping,
    "personal_page2": personal2.form_mapping,
    "travel_page": travel.form_mapping,
    "travel_companions_page": travelCompanions.form_mapping,
    "previous_travel_page": previousTravel.form_mapping,
    "address_phone_page": addressPhone.form_mapping,
    "pptvisa_page": pptVisa.form_mapping,
    "us_contact_page": usContact.form_mapping,
    "relatives_page": relatives.form_mapping,
    "workeducation1_page": workEducation1.form_mapping,
    "workeducation2_page": workEducation2.form_mapping,
    "workeducation3_page": workEducation3.form_mapping,
    "security_background1_page": securityBackground1.form_mapping,
    "security_background2_page": securityBackground2.form_mapping,
    "security_background3_page": securityBackground3.form_mapping,
    "security_background4_page": securityBackground4.form_mapping,
    "security_background5_page": securityBackground5.form_mapping,
    "spouse_page": spouse.form_mapping
}

// Helper to convert YAML field to form field
export function getFormFieldId(pageName: string, yamlField: string): string | null {
  // Log the mapping request for debugging
  //console.log(`Looking up form field ID for ${pageName}.${yamlField}`);
  
  const mapping = formMappings[pageName]?.[yamlField];
  
  if (!mapping) {
    console.log(`No mapping found for ${pageName}.${yamlField}`);
    return null;
  }
  
  return mapping;
}

// Helper to convert form field to YAML field
export const getYamlField = (pageName: string, formFieldId: string): string => {
  // Normalize field ID by replacing any _ctl01, _ctl02, etc. with _ctl00
  const normalizedFieldId = formFieldId.replace(/_ctl\d+/, '_ctl00');
  
  const pageMapping = formMappings[pageName];
  if (!pageMapping) {
    console.log(`No mapping found for page: ${pageName}`);
    return '';
  }
  
  // Find the YAML field that maps to this form field ID
  const match = Object.entries(pageMapping).find(([_, value]) => value === normalizedFieldId);
  
  if (!match) {
    // For debugging
    if (pageName === 'workeducation3_page') {
      //console.log(`No YAML field found for ${normalizedFieldId} in ${pageName}`);
    }
    return '';
  }
  
  return match[0];
} 
"use client"

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import DynamicForm from "@/components/DynamicForm"
import { flattenYamlData, unflattenFormData, flattenRepeatedGroups } from '../utils/yaml-helpers'
import { getFormFieldId, getYamlField, formMappings } from '../utils/mappings'
import yaml from 'js-yaml'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createFormMapping } from '../utils/yaml-mapping'
import { debugLog } from '../utils/consoleLogger'
import { Button } from "@/components/ui/button"
import { LinkedInImport } from "@/components/LinkedInImport"
import type { FormCategory, FormCategories, FormDefinition } from "@/types/form-definition"
import { processWithOpenAI, processLinkedIn, runDS160 } from '../utils/api'
import { I94Import } from "@/components/I94Import"
import { DocumentUpload } from "@/components/DocumentUpload"
import { PassportUpload } from "@/components/PassportUpload"
import { countFieldsByPage } from '../utils/field-counter'
import { StopwatchTimer } from '../components/StopwatchTimer'
import { Upload } from "lucide-react"
import { useFormPersistence } from '../../lib/hooks/useFormPersistence'
import { useUser } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";

// Import all form definitions in alphabetical order
import p10_workeducation1_definition from "../../form_definitions/p10_workeducation1_definition.json"
import p11_workeducation2_definition from "../../form_definitions/p11_workeducation2_definition.json"
import p12_workeducation3_definition from "../../form_definitions/p12_workeducation3_definition.json"
import p13_securityandbackground1_definition from "../../form_definitions/p13_securityandbackground1_definition.json"
import p14_securityandbackground2_definition from "../../form_definitions/p14_securityandbackground2_definition.json"
import p15_securityandbackground3_definition from "../../form_definitions/p15_securityandbackground3_definition.json"
import p16_securityandbackground4_definition from "../../form_definitions/p16_securityandbackground4_definition.json"
import p17_securityandbackground5_definition from "../../form_definitions/p17_securityandbackground5_definition.json"
import p18_spouse_definition from "../../form_definitions/p18_spouse_definition_fe.json"
import p1_personal1_definition from "../../form_definitions/p1_personal1_definition.json"
import p2_personal2_definition from "../../form_definitions/p2_personal2_definition.json"
import p3_travelinfo_definition from "../../form_definitions/p3_travel_definition.json"
import p4_travelcompanions_definition from "../../form_definitions/p4_travelcompanions_definition.json"
import p5_previoustravel_definition from "../../form_definitions/p5_previousustravel_definition.json"
import p6_addressphone_definition from "../../form_definitions/p6_addressphone_definition.json"
import p7_pptvisa_definition from "../../form_definitions/p7_pptvisa_definition.json"
import p8_uscontact_definition from "../../form_definitions/p8_uscontact_definition.json"
import p9_relatives_definition from "../../form_definitions/p9_relatives_definition.json"
import startPageDefinition from "../../form_definitions/p0_start_page_definition.json"
import securityPageDefinition from "../../form_definitions/p0_security_page_definition.json"

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

// Add these new types to manage DS-160 progress states
type DS160Status = 'idle' | 'processing' | 'success' | 'error';
type ProgressMessage = {
  status: 'info' | 'warning' | 'error' | 'success' | 'complete' | 'application_id';
  message: string;
  timestamp?: string;
  application_id?: string;
  summary?: {
    total: number;
    completed: number;
    errors: number;
    skipped: number;
  };
};

export default function Home() {
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [yamlData, setYamlData] = useState<YamlData>({})
  const [completionStatus, setCompletionStatus] = useState<Record<string, { completed: number; total: number }>>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractedText, setExtractedText] = useState<string>("");
  const [isConverting, setIsConverting] = useState(false);
  const [isProcessingLLM, setIsProcessingLLM] = useState(false);
  const [yamlOutput, setYamlOutput] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [consoleErrors, setConsoleErrors] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [accordionValues, setAccordionValues] = useState<Record<string, string>>({});
  const [currentTab, setCurrentTab] = useState<string>("personal");
  const [retrieveMode, setRetrieveMode] = useState<'new' | 'retrieve'>('new')
  const [applicationId, setApplicationId] = useState('')
  const [secretQuestion, setSecretQuestion] = useState('')
  const [secretAnswer, setSecretAnswer] = useState('')
  const [location, setLocation] = useState('ENGLAND, LONDON')
  const [surname, setSurname] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [isRunningDS160, setIsRunningDS160] = useState(false)
  const [arrayGroups, setArrayGroups] = useState<Record<string, Record<string, Array<Record<string, string>>>>>({});
  const securityQuestions = securityPageDefinition.fields.find(
    f => f.name === 'ctl00_SiteContentPlaceHolder_ddlQuestions'
  )?.value || []

  const locations = startPageDefinition.fields.find(
    f => f.name === 'ctl00_SiteContentPlaceHolder_ucLocation_ddlLocation'
  )?.value || []

  // Add at the top of your component
  const { 
    persistData, 
    saveAllFormData, 
    saveFormDataToDb, // Use the new function
    isInitialized, 
    formState 
  } = useFormPersistence();

  // Add at the top of your component, with other state declarations
  const [debugMode, setDebugMode] = useState(true); // Default to false

  // Add this function near the top of your component function
  const shouldShowSpousePage = (formData: Record<string, string>): boolean => {
    const maritalStatus = formData['ctl00_SiteContentPlaceHolder_FormView1_ddlAPP_MARITAL_STATUS'];
    return [
      'MARRIED', 
      'COMMON LAW MARRIAGE', 
      'CIVIL UNION/DOMESTIC PARTNERSHIP',
      'LEGALLY SEPARATED'
    ].includes(maritalStatus);
  }

  // Add similar functions for other conditional pages
  const shouldShowFormerSpousePage = (formData: Record<string, string>): boolean => {
    const maritalStatus = formData['ctl00_SiteContentPlaceHolder_FormView1_ddlAPP_MARITAL_STATUS'];
    return maritalStatus === 'DIVORCED';
  }

  const shouldShowDeceasedSpousePage = (formData: Record<string, string>): boolean => {
    const maritalStatus = formData['ctl00_SiteContentPlaceHolder_FormView1_ddlAPP_MARITAL_STATUS'];
    return maritalStatus === 'WIDOWED';
  }

  // Then modify your formCategories object
  const formCategories: FormCategories = {
    personal: [
      { title: "Personal Information 1", definition: p1_personal1_definition, pageName: "personal_page1" },
      { title: "Personal Information 2", definition: p2_personal2_definition, pageName: "personal_page2" },
      { title: "Address & Phone", definition: p6_addressphone_definition, pageName: "address_phone_page" },
      { title: "Passport", definition: p7_pptvisa_definition, pageName: "pptvisa_page" },
      { title: "Relatives", definition: p9_relatives_definition, pageName: "relatives_page" },
      { title: "Spouse Information", definition: p18_spouse_definition, pageName: "spouse_page",isVisible: shouldShowSpousePage },
      //{ title: "Former Spouse Information", definition: p19_former_spouse_definition, pageName: "former_spouse_page", isVisible: shouldShowFormerSpousePage},
      // {  title: "Deceased Spouse Information", definition: p20_deceased_spouse_definition, pageName: "deceased_spouse_page", isVisible: shouldShowDeceasedSpousePage},
    ],
    travel: [
      { title: "Travel Information", definition: p3_travelinfo_definition, pageName: "travel_page" },
      { title: "Travel Companions", definition: p4_travelcompanions_definition, pageName: "travel_companions_page" },
      { title: "Previous Travel", definition: p5_previoustravel_definition, pageName: "previous_travel_page" },
      { title: "U.S. Contact", definition: p8_uscontact_definition, pageName: "us_contact_page" },
    ],
    education: [
      { title: "Work/Education 1", definition: p10_workeducation1_definition, pageName: "workeducation1_page" },
      { title: "Work/Education 2", definition: p11_workeducation2_definition, pageName: "workeducation2_page" },
      { title: "Work/Education 3", definition: p12_workeducation3_definition, pageName: "workeducation3_page" },
    ],
    security: [
      { title: "Security and Background 1", definition: p13_securityandbackground1_definition, pageName: "security_background1_page" },
      { title: "Security and Background 2", definition: p14_securityandbackground2_definition, pageName: "security_background2_page" },
      { title: "Security and Background 3", definition: p15_securityandbackground3_definition, pageName: "security_background3_page" },
      { title: "Security and Background 4", definition: p16_securityandbackground4_definition, pageName: "security_background4_page" },
      { title: "Security and Background 5", definition: p17_securityandbackground5_definition, pageName: "security_background5_page" },
    ],
  }

  
  // On mount, initialize each form's counter based on its definition
  useEffect(() => {
    const initialStatus: Record<string, { completed: number, total: number }> = {}
    Object.entries(formCategories).forEach(([category, forms]) => {
      forms.forEach((form, index) => {
        const formId = `${category}-${index}`
        const total = form.definition.fields.length
        initialStatus[formId] = { completed: 0, total }
      })
    })
    setCompletionStatus(initialStatus)
  }, [])

  const extractTextFromPdf = async (file: File): Promise<string> => {
    if (file.type !== "application/pdf") {
      throw new Error('Please upload a PDF file');
    }

    // Reset all states before processing new file
    setFormData({});
    setYamlData({});
    setYamlOutput("");
    setExtractedText("");
    setErrorMessage("");
    setConsoleErrors([]);
    setRefreshKey(prev => prev + 1);
    
    setIsConverting(true);
    
    // Load PDF.js scripts dynamically
    const pdfjsLib = window.pdfjsLib;
    if (!pdfjsLib) {
      const script = document.createElement('script');
      script.src = "//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      await new Promise((resolve) => {
        script.onload = resolve;
        document.head.appendChild(script);
      });
    }

    // Extract text from PDF
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    setIsConverting(false);
    return fullText;
  };

  
  // Update the handleFormDataLoad function to properly merge YAML data
  const handleFormDataLoad = (
    uploadedYamlData: Record<string, any>, 
    showSuccess = true,
    pagesFilter?: string[]
  ) => {
    try {
      setIsProcessing(true);
      setProcessingProgress(['Processing form data...']);
      
      // Filter out button_clicks from the YAML data
      const filteredYamlData = JSON.parse(JSON.stringify(uploadedYamlData)); // Deep clone
      
      // Remove button_clicks from each page in the YAML data
      Object.keys(filteredYamlData).forEach(pageName => {
        if (filteredYamlData[pageName] && typeof filteredYamlData[pageName] === 'object') {
          // Delete button_clicks if it exists directly on the page
          if ('button_clicks' in filteredYamlData[pageName]) {
            delete filteredYamlData[pageName].button_clicks;
          }
          
          // Also check for nested button_clicks in sub-objects
          Object.keys(filteredYamlData[pageName]).forEach(key => {
            const value = filteredYamlData[pageName][key];
            if (value && typeof value === 'object' && 'button_clicks' in value) {
              delete filteredYamlData[pageName][key].button_clicks;
            }
          });
        }
      });
      
      console.log('filteredYamlData inside handleFormDataLoad after page and button clicks filters:', filteredYamlData)
      console.log('filteredYamlData[pageName] before assignment', filteredYamlData['previous_travel_page'])
      console.log('filteredYamlData keys before assignment', Object.keys(filteredYamlData))

      // IMPORTANT CHANGE: Merge the filtered YAML with existing YAML instead of replacing it
      const mergedYamlData = { ...yamlData };
      
      // Only update pages that are in the uploadedYamlData
      Object.keys(filteredYamlData).forEach(pageName => {
        // Skip if pagesFilter is provided and this page isn't in it
        if (pagesFilter && !pagesFilter.includes(pageName)) {
          return;
        }
        console.log('pageName inside handleFormDataLoad', pageName)
        console.log('filteredYamlData[pageName] inside handleFormDataLoad', filteredYamlData[pageName])
        // Update or add this page to the merged YAML
        mergedYamlData[pageName] = filteredYamlData[pageName];
        console.log('mergedYamlData[pageName] inside handleFormDataLoad', mergedYamlData[pageName])
      });
      console.log('mergedYamlData inside handleFormDataLoad', mergedYamlData)
      // Now set the merged YAML data
      setYamlData(mergedYamlData);
      
      // Convert the merged YAML to string and create form mapping
      const yamlString = yaml.dump(mergedYamlData);
      const { formData: arrayAwareFormData, arrayGroups: newArrayGroups } = createFormMapping(yamlString);
      
      // Merge array groups instead of replacing them completely
      const mergedArrayGroups = { ...arrayGroups };
      
      // Only update array groups for pages that are in the filteredYamlData
      Object.keys(newArrayGroups).forEach(pageName => {
        // Skip if pagesFilter is provided and this page isn't in it
        if (pagesFilter && !pagesFilter.includes(pageName)) {
          return;
        }
        
        // Update or add array groups for this page
        mergedArrayGroups[pageName] = newArrayGroups[pageName];
      });
      
      // Set the merged array groups
      setArrayGroups(mergedArrayGroups);
      
      // Continue with the rest of the function as before...
      const allFormFields: Record<string, string> = {};
      Object.entries(filteredYamlData).forEach(([pageName, pageData]) => {
        // Skip if pagesFilter is provided and this page isn't in it
        if (pagesFilter && !pagesFilter.includes(pageName)) {
          return;
        }
        
        const flattenedData = flattenYamlData(pageData);
        Object.entries(flattenedData).forEach(([yamlField, value]) => {
          const formFieldId = getFormFieldId(pageName, yamlField);
          if (formFieldId) {
            allFormFields[formFieldId] = String(value);
          }
        });
      });
      
      // If doing partial update, preserve existing form data
      const mergedFormData = pagesFilter 
        ? { ...formData, ...allFormFields, ...arrayAwareFormData }
        : { ...allFormFields, ...arrayAwareFormData };
      
      setFormData(mergedFormData);
      
      // Increment refreshKey to force a complete re-render of all DynamicForm components
      setRefreshKey(prev => prev + 1);
      
      // After processing, count and display the field stats
      const fieldCounts = countFieldsByPage(filteredYamlData);
      
      // Display field counts in progress
      const countMessages = Object.entries(fieldCounts)
        .filter(([page]) => !pagesFilter || pagesFilter.includes(page))
        .map(([page, count]) => {
          const readablePage = page.replace('_page', '').replace(/_/g, ' ');
          return `${readablePage}: ${count} fields`;
        });
      
      setProcessingProgress(prev => [
        ...prev, 
        'Form data loaded successfully',
        ...countMessages,
        'Filling form with extracted data...'
      ]);
      
      // Only update counters for filtered pages, or all pages if no filter
      if (!pagesFilter) {
        setCurrentTab('personal');
      }
      
      // Allow some time for the progress to be shown, then close progress and update counters
      setTimeout(() => {
        setIsProcessing(false);
        setProcessingProgress([]);
        updateFormCountersSilently(pagesFilter);
        
        if (showSuccess) {
          setConsoleErrors([
            'Form data loaded successfully!',
            ...consoleErrors
          ]);
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error loading form data:', error);
      setErrorMessage(`Error loading form data: ${error.message || 'Unknown error'}`);
      setIsProcessing(false);
      setProcessingProgress([]);
    } finally {
      setIsProcessingLLM(false);
    }
  };

  // Add processing progress state
  const [processingProgress, setProcessingProgress] = useState<string[]>([]);

  // Modify the isProcessing display to show progress
  {isProcessing && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center max-w-md w-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-lg font-semibold mb-4">
          Processing Data
        </p>
        
        <div className="w-full space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-3 bg-gray-50">
          {processingProgress.map((msg, idx) => (
            <div key={idx} className="text-sm">
              {msg}
            </div>
          ))}
        </div>
      </div>
    </div>
  )}

  // Add new state for extraction progress in the Home component
  const [extractionProgress, setExtractionProgress] = useState<string[]>([])
  const [extractionStatus, setExtractionStatus] = useState<'idle' | 'extracting' | 'processing' | 'filling' | 'complete'>('idle')

  // Add new state variables at the top of the component with other state variables
  const [formFillComplete, setFormFillComplete] = useState(false);

  // Add this function before handleFileUpload
  const sanitizeYaml = (yamlString: string): string => {
    // Fix common YAML syntax issues that could cause parsing errors
    return yamlString
      // Fix multiline strings with double quotes by replacing them with block scalar notation
      .replace(/: "([^"]*\n[^"]*)"/g, (match, content) => {
        if (content.trim()) {
          return `: |-\n${content.split('\n').map(line => `    ${line}`).join('\n')}`;
        }
        return ': ""'; // Just return empty string if content is empty
      })
      // Remove any trailing whitespace on lines
      .split('\n').map(line => line.trimRight()).join('\n')
      // Ensure empty string values are properly formatted
      .replace(/:\s*""\s*$/gm, ': ""')
      // Fix any hanging quotes that might be causing issues
      .replace(/:\s+"([^"]*)$/gm, ': "$1"');
  };

  // Add this to your state variables at the top
  const [fileInputKey, setFileInputKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Then modify your handleFileUpload function to reset the input at the end
  const handleFileUpload = async (file: File) => {
    if (file.type === "application/pdf") {
      try {
        // Call reset function at the start of file processing
        resetExtractionState();
        
        // Then continue with the normal process
        setErrorMessage("");
        setExtractionStatus('extracting');
        setExtractionProgress(['Starting DS-160 PDF extraction...']);
        setFormFillComplete(false);
        setYamlOutput(""); 
        setExtractedText(""); 
        
        // First phase: PDF to text
        setIsConverting(true);
        setExtractionProgress(prev => [...prev, 'Converting PDF to text...']);
        const fullText = await extractTextFromPdf(file);
        setExtractedText(fullText);
        setIsConverting(false);
        
        // Add progress update with text length as a simple metric
        const textSizeKb = Math.round(fullText.length / 1024);
        setExtractionProgress(prev => [...prev, `Extracted ${textSizeKb}KB of text from PDF`]);

        // Second phase: OpenAI processing
        setIsProcessingLLM(true);
        setExtractionStatus('processing');
        setExtractionProgress(prev => [...prev, 'Sending extracted text to AI for processing...']);
        const { text: yamlOutput } = await processWithOpenAI(fullText);
        setYamlOutput(yamlOutput);
        setExtractionProgress(prev => [...prev, 'Received structured data from AI']);

        // Third phase: Form filling
        try {
          setExtractionStatus('filling');
          setExtractionProgress(prev => [...prev, 'Preparing to fill form fields...']);
          
          // Sanitize the YAML string before parsing
          const sanitizedYaml = sanitizeYaml(yamlOutput);
          
          // Try parsing with safe options
          let parsedYaml;
          try {
            parsedYaml = yaml.load(sanitizedYaml, { 
              schema: yaml.FAILSAFE_SCHEMA,
              json: true 
            }) as Record<string, any>;
          } catch (parseError) {
            console.error('First parsing attempt failed:', parseError);
            
            // Try a more aggressive cleanup if the first attempt fails
            const harshSanitized = sanitizedYaml
              .replace(/: "[^"]*\n[^"]*"/g, ': ""')
              .replace(/\n\s+\n/g, '\n\n');
              
            setExtractionProgress(prev => [...prev, 'First parsing attempt failed, trying alternative approach...']);
            parsedYaml = yaml.load(harshSanitized, { schema: yaml.FAILSAFE_SCHEMA }) as Record<string, any>;
          }
          
          // Count fields to show progress
          const fieldCounts = countFieldsByPage(parsedYaml);
          setExtractionProgress(prev => [...prev, 'Filling form with extracted data...']);
          
          // Update form data using handleFormDataLoad instead of formManageRef
          handleFormDataLoad(parsedYaml);
          
          // Add count information to progress messages
          Object.entries(fieldCounts).forEach(([page, count]) => {
            const pageName = page.replace('_page', '').replace(/_/g, ' ');
            setExtractionProgress(prev => [
              ...prev, 
              `${pageName}: ${count} fields extracted`
            ]);
          });
          
          // Set a timer to mark form filling as complete and change status to complete
          setTimeout(() => {
            setExtractionProgress(prev => [...prev, 'Form filling complete!']);
            setExtractionStatus('complete');
            setFormFillComplete(true);
            setIsProcessingLLM(false);
            // Reset the file input
            setFileInputKey(prev => prev + 1);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }, 5000); // 5 second delay to allow form to expand/populate
          
        } catch (error) {
          console.error('Error processing YAML:', error);
          setExtractionStatus('error');
          setExtractionProgress(prev => [...prev, `Error: ${error instanceof Error ? error.message : String(error)}`]);
          setIsProcessingLLM(false);
        }
        
      } catch (error) {
        console.error('Error processing PDF:', error);
        setErrorMessage(error instanceof Error ? error.message : String(error));
        setExtractionStatus('error');
        setIsConverting(false);
        setIsProcessingLLM(false);
      }
    }
  };

  // First create a new function to generate YAML data
  const generateFormYamlData = useCallback((options: {
    location: string,
    retrieveMode: 'new' | 'retrieve',
    applicationId?: string,
    surname?: string,
    birthYear?: string,
    secretQuestion: string,
    secretAnswer: string,
    currentArrayGroups: Record<string, Record<string, Array<Record<string, string>>>>
  }) => {
    const { location, retrieveMode, applicationId, surname, birthYear, secretQuestion, secretAnswer, currentArrayGroups } = options;

    // Handle surname and birthYear differently based on mode
    let finalSurname, finalBirthYear;
    
    if (retrieveMode === 'new') {
      // For new applications, get from personal page 1
      const personalSurname = formData['ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_SURNAME'];
      finalSurname = personalSurname ? personalSurname.slice(0, 5).toUpperCase() : '';
      
      const personalDOB = formData['ctl00_SiteContentPlaceHolder_FormView1_tbxDOBYear'];
      finalBirthYear = personalDOB 
    } else {
      // For retrieve mode, use the values from input fields
      finalSurname = surname || '';
      finalBirthYear = birthYear || '';
    }

    // First get all the form data converted to YAML format
    const formYamlData: Record<string, any> = {}
    
    // Get list of pages that should be included
    const visiblePages: string[] = [];
    
    // Determine visible pages based on form data
    Object.values(formCategories).forEach(categoryForms => {
      categoryForms.forEach(form => {
        let isVisible = true;
        if (typeof form.isVisible === 'function') {
          isVisible = form.isVisible(formData);
        } else if (form.isVisible === false) {
          isVisible = false;
        }
        
        if (isVisible) {
          visiblePages.push(form.pageName);
        }
      });
    });
    
    // Only process visible pages
    Object.keys(formMappings).forEach(pageName => {
      // Skip pages that should be hidden based on conditions
      if (!visiblePages.includes(pageName)) {
        return;
      }
      
      const pageFormData: Record<string, string> = {}
      Object.entries(formData).forEach(([formFieldId, value]) => {
        const yamlField = getYamlField(pageName, formFieldId)
        if (yamlField) {
          pageFormData[yamlField] = value
        }
      })

      if (Object.keys(pageFormData).length > 0) {
        formYamlData[pageName] = {
          ...unflattenFormData(pageFormData),
          button_clicks: [1, 2]
        }

        // If this page has array groups, use them directly
        if (currentArrayGroups[pageName]) {
          Object.entries(currentArrayGroups[pageName]).forEach(([groupKey, groupArray]) => {
            // Create array structure
            const arrayData = groupArray.map(group => {
              // Convert flat keys to nested structure
              const restructured = {};
              Object.entries(group).forEach(([key, value]) => {
                const cleanKey = key.replace(`${groupKey}.`, '');
                const parts = cleanKey.split('.');
                let current = restructured;
                for (let i = 0; i < parts.length - 1; i++) {
                  current[parts[i]] = current[parts[i]] || {};
                  current = current[parts[i]];
                }
                current[parts[parts.length - 1]] = value;
              });
              return restructured;
            });
            // Add array directly
            formYamlData[pageName][groupKey] = arrayData;
          });
        }
      }
    })

    // Add start_page section
    const startPage = {
      language: "English",
      location: location,
      button_clicks: retrieveMode === 'retrieve' ? [1] : [0]
    }

    // Always add retrieve_page section
    const retrievePage = {
      application_id: retrieveMode === 'new' ? '' : applicationId,
      surname: finalSurname,
      year: finalBirthYear,
      security_question: secretQuestion,
      security_answer: secretAnswer,
      button_clicks: [0, 1]
    }

    // Add security_page section if in new mode
    const securityPage = retrieveMode === 'new' ? {
      privacy_agreement: true,
      security_question: secretQuestion,
      security_answer: secretAnswer,
      button_clicks: [0]
    } : undefined

    // Combine all sections - ALWAYS include retrieve_page
    return {
      start_page: startPage,
      retrieve_page: retrievePage,  // Always include this, not conditionally
      ...(securityPage && { security_page: securityPage }),
      ...formYamlData
    }
  }, [formData, arrayGroups, formCategories])

  // Then modify both handlers to use this function
  const handleDownloadYaml = useCallback(() => {
    const finalYamlData = generateFormYamlData({
      location,
      retrieveMode,
      applicationId,
      surname,
      birthYear,
      secretQuestion,
      secretAnswer,
      currentArrayGroups: arrayGroups
    })

    // Process button_clicks before serializing
    Object.keys(finalYamlData).forEach(key => {
      if (finalYamlData[key] && typeof finalYamlData[key] === 'object' && finalYamlData[key].button_clicks) {
        // Ensure button_clicks is a simple array
        if (Array.isArray(finalYamlData[key].button_clicks)) {
          if (typeof finalYamlData[key].button_clicks[0] === 'object') {
            // Convert from [{button_clicks: "1"}, {button_clicks: "2"}] to [1, 2]
            finalYamlData[key].button_clicks = finalYamlData[key].button_clicks.map(item => 
              parseInt(item.button_clicks || "0", 10)
            );
          }
        }
      }
    });

    let yamlStr = yaml.dump(finalYamlData, {
      lineWidth: -1,
      quotingType: '"',
      forceQuotes: true,
      indent: 2,
      flowLevel: -1,
      noArrayIndent: false,
      noCompatMode: true,
    })

    // Fix button_clicks formatting and add newlines
    yamlStr = yamlStr
      .replace(/button_clicks:\s*(?:-\s*0|"\[0\]")/g, 'button_clicks: [0]')
      .replace(/button_clicks:\s*(?:-\s*1|"\[1\]")/g, 'button_clicks: [1]')
      .replace(/button_clicks:\s*(?:-\s*1\s*-\s*2|"\[1,\s*2\]"|"\[1, 2\]"|\[1\]\s*-\s*2)/g, 'button_clicks: [1, 2]')
      .replace(/button_clicks:\s*\[\s*(\d+)\s*\]\s*-\s*(\d+)/g, 'button_clicks: [$1, $2]')
      .replace(/^([a-zA-Z][a-zA-Z0-9_]*(?:_page)?:)/gm, '\n$1')
      .replace(/^\n/, '')

    // Save to server, with fallback to browser download
    const filename = 'form_data.yaml';
    
    try {
      // Always attempt server-side save first
      fetch('/api/save-yaml', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          yamlStr,
          path: filename
        }),
      }).then(response => {
        if (!response.ok) {
          console.warn('Server-side YAML saving failed, falling back to browser download');
          // Create blob and download
          downloadYamlToDevice(yamlStr, filename);
        } else {
          console.log('YAML saved successfully on server at logs/form_data.yaml');
          // Optionally show a notification to the user
          setConsoleErrors(prev => [...prev, 'YAML saved successfully at logs/form_data.yaml']);
        }
      }).catch(error => {
        console.error('Error saving YAML to server:', error);
        downloadYamlToDevice(yamlStr, filename);
      });
    } catch (error) {
      console.error('Failed to save YAML:', error);
      downloadYamlToDevice(yamlStr, filename);
    }
  }, [generateFormYamlData, location, retrieveMode, applicationId, surname, birthYear, secretQuestion, secretAnswer, arrayGroups])

  // Helper function for browser download fallback
  const downloadYamlToDevice = (yamlStr: string, filename: string) => {
    const blob = new Blob([yamlStr], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Add new function to get filtered YAML data
  const getFilteredYamlData = (pageFilter: string[]) => {
    try {
      // Use the same function as handleDownloadYaml to get complete YAML
      const yamlData = generateFormYamlData({
        location,
        retrieveMode,
        applicationId,
        surname,
        birthYear,
        secretQuestion,
        secretAnswer,
        currentArrayGroups: arrayGroups
      })
      
      // Return only requested pages that are visible based on current form data
      const filteredData: Record<string, any> = {}
      pageFilter.forEach(page => {
        // Find the form category this page belongs to
        let isVisible = true;
        
        // Check all categories for this page
        Object.values(formCategories).forEach(categoryForms => {
          const form = categoryForms.find(f => f.pageName === page);
          if (form && typeof form.isVisible === 'function') {
            isVisible = form.isVisible(formData);
          } else if (form && form.isVisible === false) {
            isVisible = false;
          }
        });
        
        // Only include visible pages
        if (yamlData[page] && isVisible) {
          filteredData[page] = yamlData[page]
        }
      })
      
      return filteredData
    } catch (error) {
      console.error('Error filtering YAML data:', error)
      return {}
    }
  }

  const [ds160Status, setDS160Status] = useState<DS160Status>('idle');
  const [progressMessages, setProgressMessages] = useState<ProgressMessage[]>([]);
  const progressEndRef = useRef<HTMLDivElement>(null);
  
  // Add this effect to scroll to bottom of progress messages
  useEffect(() => {
    if (progressEndRef.current) {
      progressEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [progressMessages]);

  // Add this new reset function in your component
  const resetDS160State = () => {
    console.log("Resetting DS-160 state");
    setProgressMessages([]);
    // Only reset applicationId if we're not in retrieve mode
    if (retrieveMode !== 'retrieve') {
      setApplicationId('');
    }
    setDS160Status('idle');
    // Reset any other relevant state variables here
  };

  // Modify the start of handleRunDS160
  const handleRunDS160WithLocalValues = async (localValues?: {
    secretQuestion: string;
    secretAnswer: string;
    applicationId: string;
    surname: string;
    birthYear: string;
    location: string;
  }) => {
    if (isRunningDS160) return; // Prevent multiple concurrent requests
    
    try {
      setIsRunningDS160(true);
      // Call the reset function at the beginning
      setProgressMessages([]);
      console.log("Inside handleRunDS160 progressMessages reset to", progressMessages);
      resetDS160State();
      
      if (retrieveMode === 'retrieve') {
        const activeValues = localValues || {
          secretQuestion, secretAnswer, applicationId, surname, birthYear, location
        };
        
        if (!activeValues.applicationId || !activeValues.surname || !activeValues.birthYear || 
            !activeValues.secretQuestion || !activeValues.secretAnswer) {
          setErrorMessage("Please fill in all retrieve fields");
          return;
        }
      }

      // Set to processing AFTER reset
      setDS160Status('processing');
      
      const finalYamlData = generateFormYamlData({
        location: localValues?.location || location,
        retrieveMode,
        applicationId: localValues?.applicationId || applicationId,
        surname: localValues?.surname || surname,
        birthYear: localValues?.birthYear || birthYear,
        secretQuestion: localValues?.secretQuestion || secretQuestion,
        secretAnswer: localValues?.secretAnswer || secretAnswer,
        currentArrayGroups: arrayGroups
      });

      // Process button_clicks before serializing
      Object.keys(finalYamlData).forEach(key => {
        if (finalYamlData[key] && typeof finalYamlData[key] === 'object' && finalYamlData[key].button_clicks) {
          // Ensure button_clicks is a simple array
          if (Array.isArray(finalYamlData[key].button_clicks)) {
            if (typeof finalYamlData[key].button_clicks[0] === 'object') {
              // Convert from [{button_clicks: "1"}, {button_clicks: "2"}] to [1, 2]
              finalYamlData[key].button_clicks = finalYamlData[key].button_clicks.map(item => 
                parseInt(item.button_clicks || "0", 10)
              );
            }
          }
        }
      });

      // Create YAML string
      const yamlStr = yaml.dump(finalYamlData, {
        lineWidth: -1,
        quotingType: '"',
        forceQuotes: true,
      });

      // Get streaming response
      const response = await runDS160(yamlStr);
      
      // Process the streaming response
      const reader = response.body?.getReader();
      console.log("Inside handleRunDS160 reader", reader) 
      if (!reader) {
        throw new Error('Response body is null');
      }
      
      // Read the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        console.log("Inside handleRunDS160 value", new TextDecoder().decode(value))
        // Convert the chunk to string
        const chunk = new TextDecoder().decode(value);
        
        // Fix: Use a proper JSON stream parsing approach
        // This handles cases where multiple JSON objects are concatenated without delimiters
        let buffer = chunk;
        while (buffer.length > 0) {
          try {
            // Try to find the end of a complete JSON object
            let endPos = 0;
            let bracketCount = 0;
            let inString = false;
            let escapeNext = false;
            
            for (let i = 0; i < buffer.length; i++) {
              const char = buffer[i];
              
              if (escapeNext) {
                escapeNext = false;
                continue;
              }
              
              if (char === '\\' && inString) {
                escapeNext = true;
                continue;
              }
              
              if (char === '"' && !escapeNext) {
                inString = !inString;
              }
              
              if (!inString) {
                if (char === '{') bracketCount++;
                if (char === '}') {
                  bracketCount--;
                  if (bracketCount === 0) {
                    endPos = i + 1;
                    break;
                  }
                }
              }
            }
            
            if (endPos === 0) {
              // Incomplete JSON object, wait for more data
              break;
            }
            
            // Extract a complete JSON object
            const jsonStr = buffer.substring(0, endPos);
            buffer = buffer.substring(endPos);
            
            // Parse the complete JSON object
            const message = JSON.parse(jsonStr) as ProgressMessage;
            message.timestamp = new Date().toLocaleTimeString();
            
            // Handle message as before
            if (message.status === 'application_id' && 'application_id' in message) {
              setApplicationId(message.application_id);
              message.status = 'info';
              message.message = `Retrieved application ID: ${message.application_id}`;
            }
            
            setProgressMessages(prev => [...prev, message]);
            
            if (message.status === 'complete') {
              setDS160Status('success');
            } else if (message.status === 'error') {
              setDS160Status('error');
            }
          } catch (e) {
            console.error('Failed to parse JSON chunk:', e);
            
            // If parsing fails, try to find the next JSON object
            const nextStart = buffer.indexOf('{"status":', 1);
            if (nextStart > 0) {
              buffer = buffer.substring(nextStart);
            } else {
              // No more valid JSON in this chunk
              break;
            }
          }
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setProgressMessages(prev => [
        ...prev, 
        { 
          status: 'error', 
          message: `DS-160 Processing Error: ${errorMessage}`,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
      setDS160Status('error');
    } finally {
      setIsRunningDS160(false);
    }
  };

  // Now modify the existing handleRunDS160 function to call our new function
  const handleRunDS160 = async () => {
    // Save current state before processing
    await saveAllFormData({
      yamlData,
      currentTab,
      accordionValues,
      retrieveMode,
      location,
      secretQuestion,
      secretAnswer,
      applicationId,
      surname,
      birthYear
    });
    
    // Continue with existing logic...
    handleRunDS160WithLocalValues();
  };

  // 1. First, we'll create memoized callbacks for all potential forms before any filtering
  const renderFormSection = (forms: typeof formCategories.personal, category: string) => {
    // Create all potential completion callbacks up front
    const completionCallbacks = useMemo(() => {
      return forms.map((_, index) => {
        const formId = `${category}-${index}`;
        return (completed: number, total: number) => {
          setCompletionStatus(prev => ({
            ...prev,
            [formId]: { completed, total }
          }));
        };
      });
    }, [category, forms.length]); // Only depend on category and length, not content

    return (
      <Accordion 
        type="single" 
        collapsible 
        className="space-y-4"
        value={accordionValues[category] || ""}
        onValueChange={(val) => setAccordionValues(prev => ({ ...prev, [category]: val }))}
      >
        {forms
          // Filter forms based on visibility condition
          .filter(form => {
            if (typeof form.isVisible === 'function') {
              return form.isVisible(formData);
            }
            return form.isVisible !== false; // Show by default if not specified
          })
          .map((form, index) => {
            const formId = `${category}-${index}`;
            // Use the pre-created callback
            const onCompletionMemo = completionCallbacks[index];
            
            const groupsForPage = form.pageName ? arrayGroups[form.pageName] || {} : {};
            
            // Check if all fields are completed for this form
            const status = completionStatus[formId] || { completed: 0, total: 0 };
            const isComplete = status.total > 0 && status.completed === status.total;
            
            return (
              <AccordionItem key={index} value={`item-${index}`} className="border border-gray-200 rounded-lg overflow-hidden">
                <AccordionTrigger className="w-full hover:no-underline [&>svg]:h-8 [&>svg]:w-8 [&>svg]:shrink-0 [&>svg]:text-gray-500 p-0">
                  <div className="flex justify-between items-center py-2 px-4 bg-gray-50 w-full">
                    <div className="flex items-center">
                      <h2 className="text-lg font-semibold leading-none">
                        {form.title}
                      </h2>
                    </div>
                    <div className="flex items-center">
                      {/* Create a fixed-width container with flex layout for perfect alignment */}
                      <div className="w-[180px] flex items-center justify-end">
                        {/* Icon with fixed position */}
                        <div className="w-[24px] flex justify-center mr-2">
                          {status.total > 0 && (
                            isComplete ? (
                              <svg
                                className="w-5 h-5 text-green-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="w-5 h-5 text-red-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            )
                          )}
                        </div>
                        {/* Counter text with fixed width */}
                        <span className="text-sm text-gray-600 w-[120px] text-right">
                          {(completionStatus[formId]?.completed || 0)}/
                          {(completionStatus[formId]?.total || 0)} completed
                        </span>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-4">
                  <DynamicForm
                    key={`${formId}-${refreshKey}`}
                    formDefinition={form.definition}
                    formData={formData}
                    arrayGroups={groupsForPage}
                    onInputChange={(name, value) => {
                      // Update form data state
                      const updatedFormData = { ...formData, [name]: value };
                      setFormData(updatedFormData);
                      
                      // Save directly to database
                      saveFormDataToDb(updatedFormData);
                    }}
                    onCompletionUpdate={onCompletionMemo}
                    formCategories={formCategories}
                    currentCategory={category}
                    currentIndex={index}
                    onNavigate={(category, index) => {
                      setCurrentTab(category)
                      setAccordionValues(prev => ({ ...prev, [category]: `item-${index}` }))
                    }}
                    onArrayGroupsChange={(pageName, groupKey, groupData) => {
                      // Only do detailed logging for workeducation3_page
                      if (pageName === 'workeducation2_page') {
                        debugLog('workeducation2_page', `onArrayGroupsChange called from DynamicForm:`, {
                          pageName,
                          groupKey,
                          groupData
                        });
                      }
                      
                      setArrayGroups(prev => {
                        const updated = { ...prev };
                        
                        // Initialize the page object if it doesn't exist
                        if (!updated[pageName]) {
                          updated[pageName] = {};
                        }
                        if (pageName === 'workeducation2_page') {
                          console.log('updated before groupdata', updated)
                        }
                        // Update the group data
                        updated[pageName][groupKey] = [...groupData];
                        
                        // Log the updated state for debugging
                        if (pageName === 'workeducation2_page') {
                          debugLog('workeducation2_page', `Updated arrayGroups state:`, {
                            updated,
                            groupData,
                            pageName,
                            groupKey
                          });
                        }
                        
                        return updated;
                      });
                      if (pageName === 'workeducation2_page') {
                        console.log('arrayGroups finally', arrayGroups)
                      }
                    }}
                    onSave={saveYamlToBackend} // Add this new prop
                  />
                </AccordionContent>
              </AccordionItem>
            )
          })}
      </Accordion>
    );
  };

  // Handler for document extraction
  const handleDocumentExtraction = (extractedData: any) => {
    if (extractedData) {
      // Get current YAML for travel-related pages
      const currentPageData = getFilteredYamlData([
        'travel_page', 
        'travel_companions_page', 
        'previous_travel_page'
      ]);
      
      // Create merged YAML with both existing and new data
      const mergedYaml = {
        travel_page: {
          ...currentPageData?.travel_page,
          ...extractedData.travel_page,
          button_clicks: [1, 2]
        },
        travel_companions_page: {
          ...currentPageData?.travel_companions_page,
          ...extractedData.travel_companions_page,
          button_clicks: [1, 2]
        },
        previous_travel_page: {
          ...currentPageData?.previous_travel_page,
          ...extractedData.previous_travel_page,
          button_clicks: [1, 2]
        }
      };
      console.log('mergedYaml after document extraction is applied:', mergedYaml)
      // Update form with merged data
      handleFormDataLoad(
        mergedYaml,
        true,
        ['travel_page', 'travel_companions_page', 'previous_travel_page']
      );
      
      // Navigate to travel section
      setCurrentTab('travel');
    }
  };

  // Add this function definition right before or after handleFormDataLoad
  const updateFormCountersSilently = (pagesFilter?: string[]) => {
    // Only process categories that contain the filtered pages
    const categories = pagesFilter 
      ? Object.entries(formCategories)
          .filter(([_, forms]) => forms.some(form => pagesFilter.includes(form.pageName)))
          .map(([category]) => category)
      : Object.keys(formCategories);
    
    // Save the original accordion state
    const originalAccordionValues = {...accordionValues};
    const originalTab = currentTab;
    
    // Helper function to wait a specified time
    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Function to process each category sequentially
    const processCategory = async (categoryIndex: number) => {
      if (categoryIndex >= categories.length) {
        // All categories processed, restore original state
        setCurrentTab(originalTab);
        setAccordionValues(originalAccordionValues);
        return;
      }
      
      const category = categories[categoryIndex];
      setCurrentTab(category);
      
      // Wait for tab change to render
      await wait(1);
      
      // Process each form in this category
      const forms = formCategories[category];
      for (let i = 0; i < forms.length; i++) {
        // Skip forms not in the filter if one is provided
        if (pagesFilter && !pagesFilter.includes(forms[i].pageName)) {
          continue;
        }
        
        // Open the accordion item to trigger DynamicForm's completion calculation
        setAccordionValues(prev => ({ ...prev, [category]: `item-${i}` }));
        
        // Wait for render
        await wait(1);
      }
      
      // Go to next category
      processCategory(categoryIndex + 1);
    };
    
    // Start with the first category
    processCategory(0);
  };

  const resetExtractionState = () => {
    setExtractionStatus('idle');
    setExtractionProgress([]);
    setFormFillComplete(false);
    setYamlOutput("");
    setExtractedText("");
    setFileInputKey(prev => prev + 1);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Load data from backend when formState is available or changes
  useEffect(() => {
    if (isInitialized && formState) {
      try {
        // Always use yamlData if available
        if (formState.yamlData) {
          console.log('Loading YAML data from database');
          const parsedYaml = formState.yamlData;
          
          // Skip certain pages in the YAML data
          const filteredYaml = { ...parsedYaml };
          const pagesToSkip = ['start_page', 'retrieve_page', 'security_page'];
          
          pagesToSkip.forEach(page => {
            delete filteredYaml[page];
          });
          
          // Also filter out button_clicks from all pages
          Object.keys(filteredYaml).forEach(pageName => {
            if (filteredYaml[pageName] && typeof filteredYaml[pageName] === 'object') {
              // Delete button_clicks if it exists directly on the page
              if ('button_clicks' in filteredYaml[pageName]) {
                delete filteredYaml[pageName].button_clicks;
              }
              
              // Also check for nested button_clicks in sub-objects
              Object.keys(filteredYaml[pageName]).forEach(key => {
                const value = filteredYaml[pageName][key];
                if (value && typeof value === 'object' && 'button_clicks' in value) {
                  delete filteredYaml[pageName][key].button_clicks;
                }
              });
            }
          });
          
          // Use the existing handleFormDataLoad function to load the filtered YAML
          handleFormDataLoad(filteredYaml, false); // false = don't show success message
        } else {
          console.log('No YAML data found in database');
        }
        
        // Load UI state
        if (formState.currentTab) {
          setCurrentTab(formState.currentTab);
        }
        
        // Load other UI state from formState
        if (formState.accordionValues) {
          setAccordionValues(formState.accordionValues);
        }
        
        if (formState.retrieveMode) {
          setRetrieveMode(formState.retrieveMode as 'new' | 'retrieve');
        }
        
        if (formState.location) {
          setLocation(formState.location);
        }
        
        if (formState.secretQuestion) {
          setSecretQuestion(formState.secretQuestion);
        }
        
        if (formState.secretAnswer) {
          setSecretAnswer(formState.secretAnswer);
        }
        
        if (formState.applicationId) {
          setApplicationId(formState.applicationId);
        }
        
        if (formState.surname) {
          setSurname(formState.surname);
        }
        
        if (formState.birthYear) {
          setBirthYear(formState.birthYear);
        }
        
      } catch (error) {
        console.error('Error loading saved form data:', error);
      }
    }
  }, [formState, isInitialized]);

  // Replace the existing useEffect hooks to only use backend persistence
  useEffect(() => {
    if (Object.keys(yamlData).length > 0) {
      console.log('yamlData savings to backend is:', yamlData)
      persistData('ds160_yaml_data', yamlData);
    }
  }, [yamlData, persistData]);

  useEffect(() => {
    persistData('ds160_current_tab', currentTab);
  }, [currentTab, persistData]);

  useEffect(() => {
    if (Object.keys(accordionValues).length > 0) {
      persistData('ds160_accordion_values', accordionValues);
    }
  }, [accordionValues, persistData]);

  useEffect(() => {
    persistData('ds160_retrieve_mode', retrieveMode);
  }, [retrieveMode, persistData]);

  useEffect(() => {
    persistData('ds160_location', location);
  }, [location, persistData]);

  useEffect(() => {
    if (secretQuestion) {
      persistData('ds160_secret_question', secretQuestion);
    }
  }, [secretQuestion, persistData]);

  useEffect(() => {
    if (secretAnswer) {
      persistData('ds160_secret_answer', secretAnswer);
    }
  }, [secretAnswer, persistData]);

  useEffect(() => {
    if (applicationId) {
      persistData('ds160_application_id', applicationId);
    }
  }, [applicationId, persistData]);

  useEffect(() => {
    if (surname) {
      persistData('ds160_surname', surname);
    }
  }, [surname, persistData]);

  useEffect(() => {
    if (birthYear) {
      persistData('ds160_birth_year', birthYear);
    }
  }, [birthYear, persistData]);

  // Update the clearSavedData function:
  const clearSavedData = async () => {
    try {
      // Clear form data from the database by saving minimal values
      await saveAllFormData({
        yamlData: {},
        currentTab: 'personal',
        accordionValues: {},
        retrieveMode: 'new',
        location: 'ENGLAND, LONDON',
        secretQuestion: '',
        secretAnswer: '',
        applicationId: '',
        surname: '',
        birthYear: '',
      });
      
      // Reset local state
      setFormData({});
      setArrayGroups({});
      setYamlData({});
      setCurrentTab('personal');
      setAccordionValues({});
      setRetrieveMode('new');
      setLocation('ENGLAND, LONDON');
      setSecretQuestion('');
      setSecretAnswer('');
      setApplicationId('');
      setSurname('');
      setBirthYear('');
      
      // Reset form completion status
      const initialStatus: Record<string, { completed: number, total: number }> = {};
      Object.entries(formCategories).forEach(([category, forms]) => {
        forms.forEach((form, index) => {
          const formId = `${category}-${index}`;
          const total = form.definition.fields.length;
          initialStatus[formId] = { completed: 0, total };
        });
      });
      setCompletionStatus(initialStatus);
      
      // Force a refresh
      setRefreshKey(prev => prev + 1);
      
      console.log('Form data cleared successfully');
    } catch (error) {
      console.error('Error clearing form data:', error);
    }
  };

  // First, let's add a state for the new upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [incompletePages, setIncompletePages] = useState<string[]>([]);

  // Add a function to validate form completion before showing the upload modal
  const validateAndShowUploadModal = () => {
    // Check if all forms are completed
    const incomplete: string[] = [];
    
    Object.entries(formCategories).forEach(([category, forms]) => {
      forms.forEach((form, index) => {
        const formId = `${category}-${index}`;
        const status = completionStatus[formId];
        
        if (!status || status.completed < status.total) {
          incomplete.push(`${category} - ${form.title}`);
        }
      });
    });
    
    if (incomplete.length > 0) {
      // Show error with incomplete pages
      setIncompletePages(incomplete);
      // You might want to add an error state or message here
    } else {
      // All forms are complete, show the upload modal
      setShowUploadModal(true);
      setIncompletePages([]);
    }
  };

  // Now we need to create a new Upload Modal component
  // Add this component inside your Home component

  const UploadConfigModal = () => {
    if (!showUploadModal) return null;
    
    // Add local state to prevent focus loss when typing
    const [localValues, setLocalValues] = useState({
      secretQuestion: secretQuestion,
      secretAnswer: secretAnswer,
      applicationId: applicationId,
      surname: surname,
      birthYear: birthYear,
      location: location
    });

    // Effect to sync parent state to local state when modal opens
    useEffect(() => {
      setLocalValues({
        secretQuestion: secretQuestion,
        secretAnswer: secretAnswer,
        applicationId: applicationId,
        surname: surname,
        birthYear: birthYear,
        location: location
      });
    }, [showUploadModal]);
    
    // Use one handler for all inputs to update local state
    const handleInputChange = (field: string, value: string) => {
      setLocalValues(prev => ({ ...prev, [field]: value }));
    };
    
    // Handle the final upload and commit all values to parent state
    const handleUploadClick = () => {
      // First update the parent state with local values
      setSecretQuestion(localValues.secretQuestion);
      setSecretAnswer(localValues.secretAnswer);
      setApplicationId(localValues.applicationId);
      setSurname(localValues.surname);
      setBirthYear(localValues.birthYear);
      setLocation(localValues.location);
      
      // Instead of calling handleRunDS160 directly, call it with the local values
      handleRunDS160WithLocalValues(localValues);
      setShowUploadModal(false); // Close the modal
    };
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        {/* Modal content */}
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">DS-160 Upload Configuration</h2>
            <button
              onClick={() => setShowUploadModal(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-4">
            {/* New/Retrieve toggle */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <Label className="text-base font-medium mb-2">Make Selection:</Label>
              <Tabs 
                value={retrieveMode} 
                onValueChange={(value: 'new' | 'retrieve') => setRetrieveMode(value)}
                className="flex-1 mt-1"
              >
                <TabsList className="w-full bg-blue-50">
                  <TabsTrigger 
                    value="new" 
                    className="flex-1 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                  >
                    New Application
                  </TabsTrigger>
                  <TabsTrigger 
                    value="retrieve" 
                    className="flex-1 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                  >
                    Retrieve Application
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Location selector */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <Label className="block mb-2">Location:</Label>
              <Select 
                value={localValues.location} 
                onValueChange={(value) => handleInputChange('location', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Security question/answer - with improved layout */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <Label className="block mb-2">Security Details:</Label>
              <div className="flex flex-col gap-3">
                <div className="w-full">
                  <Select 
                    value={localValues.secretQuestion} 
                    onValueChange={(value) => handleInputChange('secretQuestion', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a security question" />
                    </SelectTrigger>
                    <SelectContent className="max-w-xl">
                      {securityQuestions.map((q) => (
                        <SelectItem key={q} value={q} className="whitespace-normal">
                          {q}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input 
                  value={localValues.secretAnswer}
                  onChange={(e) => handleInputChange('secretAnswer', e.target.value)}
                  placeholder="Enter your answer"
                  className="w-full"
                />
              </div>
            </div>

            {/* Retrieve-specific fields */}
            {retrieveMode === 'retrieve' && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <Label className="block mb-2">Retrieve Details:</Label>
                <div className="grid sm:grid-cols-3 gap-4">
                  <Input 
                    value={localValues.applicationId}
                    onChange={(e) => handleInputChange('applicationId', e.target.value)}
                    placeholder="Application ID"
                    className="w-full"
                  />
                  <Input 
                    value={localValues.surname}
                    onChange={(e) => {
                      const upperValue = e.target.value.slice(0, 5).toUpperCase();
                      handleInputChange('surname', upperValue);
                    }}
                    placeholder="Surname (5 chars)"
                    maxLength={5}
                    className="w-full"
                  />
                  <Input 
                    value={localValues.birthYear}
                    onChange={(e) => handleInputChange('birthYear', e.target.value)}
                    placeholder="Birth Year"
                    className="w-full"
                  />
                </div>
              </div>
            )}
            
            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleUploadClick}
                disabled={isRunningDS160}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
              >
                {isRunningDS160 ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Upload to DS160</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // First, I'll add a function to check if all forms are complete
  const areAllFormsComplete = () => {
    return !Object.entries(formCategories).some(([category, forms]) => {
      return forms.some((form, index) => {
        const formId = `${category}-${index}`;
        const status = completionStatus[formId];
        return !status || status.completed < status.total;
      });
    });
  };

  // Replace the problematic effect with this more stable version
  useEffect(() => {
    // Skip if no form data yet
    if (Object.keys(formData).length === 0) return;
    
    // First, determine which forms should be visible
    const visibleFormIds = new Set<string>();
    
    Object.entries(formCategories).forEach(([category, forms]) => {
      forms.forEach((form, index) => {
        const formId = `${category}-${index}`;
        let isVisible = true;
        if (typeof form.isVisible === 'function') {
          isVisible = form.isVisible(formData);
        } else if (form.isVisible === false) {
          isVisible = false;
        }
        
        if (isVisible) {
          visibleFormIds.add(formId);
        }
      });
    });
    
    // Check if visibility has actually changed to avoid unnecessary updates
    const currentVisibleIds = new Set(
      Object.keys(completionStatus).filter(id => completionStatus[id]?.total > 0)
    );
    
    // Get formIds to add and remove
    const toAdd: string[] = [];
    const toRemove: string[] = [];
    
    // Find forms to add (visible but not in status)
    visibleFormIds.forEach(id => {
      if (!currentVisibleIds.has(id)) {
        toAdd.push(id);
      }
    });
    
    // Find forms to remove (in status but not visible)
    currentVisibleIds.forEach(id => {
      if (!visibleFormIds.has(id)) {
        toRemove.push(id);
      }
    });
    
    // Only update if there are actual changes
    if (toAdd.length > 0 || toRemove.length > 0) {
      setCompletionStatus(prev => {
        const updated = { ...prev };
        
        // Add new visible forms
        toAdd.forEach(formId => {
          const [category, indexStr] = formId.split('-');
          const index = parseInt(indexStr, 10);
          const form = formCategories[category]?.[index];
          
          if (form) {
            updated[formId] = { 
              completed: 0, 
              total: form.definition.fields.length 
            };
          }
        });
        
        // Remove forms that are now hidden
        toRemove.forEach(formId => {
          delete updated[formId];
        });
        
        return updated;
      });
    }
    
  // Add formCategories to dependencies since we use it in the effect
  }, [formData, formCategories, completionStatus]);
  
  // Add a reference for the periodic backup timer (keep this)
  const yamlBackupInterval = useRef<NodeJS.Timeout | null>(null);

  // Move this function ABOVE the useEffect that uses it
  // Add this function to save YAML to backend - can be called manually or by interval
  const saveYamlToBackend = useCallback(() => {
    // Skip if no form data
    if (Object.keys(formData).length === 0) return Promise.resolve({ success: false });
    
    console.log('Saving YAML to backend');
    
    // Generate YAML using the existing function
    const yamlData = generateFormYamlData({
      location: location,
      retrieveMode: retrieveMode,
      applicationId: applicationId,
      surname: surname,
      birthYear: birthYear,
      secretQuestion: secretQuestion,
      secretAnswer: secretAnswer,
      currentArrayGroups: arrayGroups
    });
    
    // Save to database
    return saveAllFormData({ yamlData })
      .then(() => {
        console.log('YAML saved to backend successfully');
        return { success: true };
      })
      .catch(err => {
        console.error('Failed to save YAML to backend:', err);
        return { success: false, error: err };
      });
  }, [
    formData,
    generateFormYamlData,
    location,
    retrieveMode,
    applicationId,
    surname,
    birthYear,
    secretQuestion,
    secretAnswer,
    arrayGroups,
    saveAllFormData
  ]);

  // AFTER defining saveYamlToBackend, now use it in the useEffect
  // Simplified useEffect for periodic YAML backup
  useEffect(() => {
    // Clear any existing interval
    if (yamlBackupInterval.current) {
      clearInterval(yamlBackupInterval.current);
    }
    
    // Set up a new interval to backup YAML every 3 minutes
    yamlBackupInterval.current = setInterval(() => {
      saveYamlToBackend();
    }, 180000); // 3 minutes
    
    // Clean up on unmount
    return () => {
      if (yamlBackupInterval.current) {
        clearInterval(yamlBackupInterval.current);
      }
    };
  }, [saveYamlToBackend]);
  
  // Add this function where other event handlers are defined (near handleDownloadYaml)
  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const data = yaml.load(content) as Record<string, any>;
          handleFormDataLoad(data);
        } catch (error) {
          console.error('Error parsing YAML:', error);
          setErrorMessage('Error parsing YAML file');
        }
      };
      reader.readAsText(file);
    }
  };
  
  // Add this new state for the reset confirmation modal
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);

  // Add this new modal component inside the Home component
  const ResetConfirmationModal = () => {
    if (!showResetConfirmation) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
          <h2 className="text-xl font-bold mb-4">Caution: This will delete all form data</h2>
          <p className="text-gray-600 mb-6">
            All your form entries and progress will be permanently deleted. This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-4">
            <button
              onClick={() => setShowResetConfirmation(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                clearSavedData().then(() => {
                  setShowResetConfirmation(false);
                });
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Proceed
            </button>
          </div>
        </div>
      </div>
    );
  };

  const { user } = useUser();
  
  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      {(isProcessing || isProcessingLLM) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center max-w-md w-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-lg font-semibold">
              {isProcessing ? 'Loading saved data...' : 'Processing with AI...'}
            </p>
            
            {/* Add StopwatchTimer to start whenever processing begins */}
            <StopwatchTimer 
              isRunning={isProcessing || isProcessingLLM} 
              estimatedTime="up to 2 minutes"
            />
            
            <p className="text-sm text-gray-500 mt-2">
              {isProcessing ? 'Converting document to form data' : 'This typically takes 1-2 minutes'}
            </p>
          </div>
        </div>
      )}
      
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">
            DS-160 Agent
          </h1>
          
          {/* Show user info when signed in */}
          {user && (
            <div className="flex items-center bg-blue-50 px-4 py-2 rounded-md">
              <span className="text-sm text-gray-600 mr-3">
                Signed in as: <span className="font-semibold">{user.fullName || user.emailAddresses[0]?.emailAddress}</span>
              </span>
              <UserButton afterSignOutUrl="/" />
            </div>
          )}
        </div>
        
        <div className="bg-white shadow-lg rounded-lg p-4">
          {/* Keep blue theme instead of indigo and make the dropzone wider */}
          <div className="mb-10 p-6 bg-blue-50 border-2 border-blue-400 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-blue-800">Fill Manually or Import Data From Previous DS160</h2>
                <p className="text-sm text-gray-600 mt-1">Below fields will be automatically filled after import</p>
              </div>
              <div className="flex-1 flex justify-end ml-2"> 
                <div className="flex items-center">
                  <label 
                    htmlFor="dropzone-file" 
                    className={`flex items-center justify-center h-14 w-94 
                              border-2 border-blue-500 border-dashed rounded-lg 
                              ${isProcessing || isProcessingLLM ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-blue-50'} 
                              bg-white relative shadow-sm`}
                  >
                    <div className="flex items-center gap-1 text-center">
                      <Upload className="h-6 w-6 text-blue-500" />
                      <span className="text-gray-700 font-medium">
                        Click or Drag Drop Previous DS160 PDF
                      </span>
                    </div>
                    <input 
                      id="dropzone-file" 
                      type="file" 
                      className="hidden" 
                      key={fileInputKey}
                      ref={fileInputRef}
                      onChange={(e) => {
                        if (isProcessing || isProcessingLLM) return;
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                      disabled={isProcessing || isProcessingLLM}
                      accept=".pdf"
                    />
                  </label>
                </div>
              </div>
            </div>
            
            {((extractedText || yamlOutput) && debugMode) && (
              <div className="flex justify-between mt-4 text-sm">
                <button
                  onClick={() => {
                    const blob = new Blob([extractedText], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                  }}
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  DS160 text
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([yamlOutput], { type: 'text/yaml' });
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                  }}
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  DS160 yaml
                </button>
              </div>
            )}
          </div>

          {/* Increase margin-bottom to create more space between import section and tabs */}
          <div className="mb-10">
            <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 h-20 bg-gray-100">
                {Object.entries(formCategories).map(([category, forms]) => {
                  let categoryCompleted = 0, categoryTotal = 0
                  forms.forEach((_, index) => {
                    const formId = `${category}-${index}`
                    if (completionStatus[formId]) {
                      categoryCompleted += completionStatus[formId].completed
                      categoryTotal += completionStatus[formId].total
                    }
                  })
                  const isComplete = categoryTotal > 0 && categoryCompleted === categoryTotal

                  return (
                    <TabsTrigger 
                      key={category} 
                      value={category} 
                      className="relative flex flex-col items-center justify-center gap-2 py-2 data-[state=active]:bg-gray-200 data-[state=inactive]:bg-white"
                    >
                      <span className="text-xl font-bold">
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </span>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <span>
                          {categoryCompleted}/{categoryTotal} completed
                        </span>
                        {categoryTotal > 0 && (
                          isComplete ? (
                            <svg
                              className="w-5 h-5 text-green-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-5 h-5 text-red-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          )
                        )}
                      </div>
                    </TabsTrigger>
                  )
                })}
              </TabsList>
              <TabsContent value="personal">
                <div className="mb-6">
                  <PassportUpload 
                    formData={formData}
                    onExtractData={(passportData) => {
                      if (passportData) {
                        // Get current YAML for personal pages
                        const currentPageData = getFilteredYamlData([
                          'personal_page1', 
                          'personal_page2',
                          'address_phone_page',
                          'pptvisa_page', 
                          'relatives_page',
                          'spouse_page'
                        ]);
                        
                        // Create merged YAML with both existing and new data
                        const mergedYaml = {
                          personal_page1: {
                            ...currentPageData?.personal_page1,
                            ...passportData.personal_page1
                          },
                          personal_page2: {
                            ...currentPageData?.personal_page2,
                            ...passportData.personal_page2
                          },
                          address_phone_page: {
                            ...currentPageData?.address_phone_page,
                            ...passportData.address_phone_page
                          },
                          pptvisa_page: {
                            ...currentPageData?.pptvisa_page,
                            ...passportData.pptvisa_page
                          },
                          relatives_page: {
                            ...currentPageData?.relatives_page,
                            ...passportData.relatives_page
                          },
                          spouse_page: {
                            ...currentPageData?.spouse_page,
                            ...passportData.spouse_page
                          }
                        };
                        
                        // Update form with merged data
                        handleFormDataLoad(
                          mergedYaml,
                          true,
                          [
                            'personal_page1', 
                            'personal_page2',
                            'address_phone_page',
                            'pptvisa_page', 
                            'relatives_page',
                            'spouse_page'
                          ]
                        );
                      }
                    }} 
                  />
                </div>
                {renderFormSection(formCategories.personal, 'personal')}
              </TabsContent>
              <TabsContent value="travel">
                {/* Reduce space-y-6 to space-y-2 to bring components closer together */}
              <I94Import 
                  formData={formData} 
                  onDataImported={(i94Data) => {
                    if (i94Data) {
                      // Use the function with appropriate filter
                      const currentPageData = getFilteredYamlData([
                        'previous_travel_page'
                      ]);
                      
                      // Create merged YAML with both existing and new data
                      const mergedYaml = {
                        previous_travel_page: {
                          ...currentPageData?.previous_travel_page,
                          ...i94Data.previous_travel_page
                        }
                      }
                      console.log('mergedYaml inside travel tab for i94 import', mergedYaml)
                      // Update form with merged data
                      handleFormDataLoad(
                        mergedYaml,
                        true,
                        ['previous_travel_page']
                      );
                      
                    }
                  }}
                />
                <DocumentUpload 
                  onExtractData={(docData) => {
                    // Handle document data
                    if (docData) {
                      //handleFormDataLoad(docData, true);
                      handleDocumentExtraction(docData);
                    }
                  }}
                  formData={formData}
                />
                {renderFormSection(formCategories.travel, 'travel')}
              
              </TabsContent>
              <TabsContent value="education">
                <LinkedInImport onDataImported={(linkedInData) => {
                  if (linkedInData) {
                    // Debug: Log the pages found in the LinkedIn data
                    console.log("LinkedIn data pages:", Object.keys(linkedInData));
                    
                    // Create a subset of the form data with only work/education pages
                    const workEducationYaml = {
                      workeducation1_page: linkedInData.workeducation1_page,
                      workeducation2_page: linkedInData.workeducation2_page
                    };
                    
                    // Use existing handleFormDataLoad with pages filter
                    handleFormDataLoad(
                      workEducationYaml, 
                      true, // Show default success message
                      ['workeducation1_page', 'workeducation2_page']
                    );
                    
                    // Navigate to all education accordion items
                    const updatedAccordionValues = { ...accordionValues };
                    
                    // Open all education items
                    formCategories.education.forEach((_, index) => {
                      updatedAccordionValues.education = `item-${index}`;
                    });
                    
                    setAccordionValues(updatedAccordionValues);
                  }
                }} />
                {renderFormSection(formCategories.education, 'education')}
              </TabsContent>
              <TabsContent value="security">
                <div className="mb-6 p-4 bg-gray-50 border-l-4 border-l-gray-500 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold">Select Default Reponse For All Security Questions </p>
                      <p className="text-sm text-gray-500">You can change individual responses later</p>
                    </div>
                    <div className="min-w-[200px]">
                      <Tabs
                        defaultValue=""
                        onValueChange={(value) => {
                          const newFormData = { ...formData };
                          formCategories.security.forEach(form => {
                            form.definition.fields.forEach((field: FormField) => {
                              if (field.type === 'radio') {
                                newFormData[field.name] = value;
                              }
                            });
                          });
                          setFormData(newFormData);
                          
                          formCategories.security.forEach((_, index) => {
                            setTimeout(() => {
                              setAccordionValues(prev => ({ ...prev, security: `item-${index}` }));
                              setTimeout(() => {
                                setAccordionValues(prev => ({ ...prev, security: "" }));
                              }, 100);
                            }, index * 200);
                          });
                        }}
                        className="w-full"
                      >
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger
                            value="Y"
                            className="font-medium border border-gray-300 data-[state=active]:bg-gray-200 data-[state=active]:border-gray-400 data-[state=inactive]:bg-white data-[state=inactive]:hover:bg-gray-50"
                          >
                            Yes
                          </TabsTrigger>
                          <TabsTrigger
                            value="N"
                            className="font-medium border border-gray-300 data-[state=active]:bg-gray-200 data-[state=active]:border-gray-400 data-[state=inactive]:bg-white data-[state=inactive]:hover:bg-gray-50"
                          >
                            No
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </div>
                </div>
                {renderFormSection(formCategories.security, 'security')}
              </TabsContent>
            </Tabs>
          </div>

          {/* Change "Continue to Upload" button color back to green */}
          <div className="mt-12 p-6 bg-blue-50 border-2 border-blue-400 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xl font-bold text-blue-800">Ready to upload to the DS160 website?</Label>
                <p className="text-sm text-gray-600 mt-1">Fill all fields above to proceed</p>
              </div>
              <Button 
                onClick={validateAndShowUploadModal}
                disabled={!areAllFormsComplete()}
                className={`${!areAllFormsComplete() 
                  ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700'} text-white px-8 py-3 rounded-lg font-medium text-lg shadow-sm`}
              >
                Continue to Upload
              </Button>
            </div>
            
            {/* Show incomplete forms if validation failed */}
            {incompletePages.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300 rounded-md">
                <p className="font-medium text-yellow-800 mb-2">
                  Please complete the following sections before uploading:
                </p>
                <ul className="list-disc pl-5 text-yellow-700 text-sm">
                  {incompletePages.map((page, index) => (
                    <li key={index}>{page}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Only show debug buttons when debugMode is true */}
        {debugMode && (
          <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleDownloadYaml}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
            >
              Download YAML
            </button>
            
            <label className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-center cursor-pointer">
              Upload YAML
              <input
                type="file"
                className="hidden"
                onChange={handleUploadFile}
                accept=".yaml,.yml"
              />
            </label>
          </div>
        )}
        
        {/* Add the Reset Form button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setShowResetConfirmation(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
          >
            Reset Form
          </button>
        </div>
      </div>

      {/* Full-screen DS-160 progress overlay */}
      {ds160Status === 'processing' && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center max-w-2xl w-full max-h-[90vh]">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mb-6"></div>
            <h2 className="text-2xl font-bold mb-4">Processing DS-160 Form</h2>
            
            {/* Add StopwatchTimer */}
            <StopwatchTimer 
              isRunning={ds160Status === 'processing'} 
              estimatedTime="up to 3 minutes"
            />
            
            {/* Progress messages container with scrolling */}
            <div className="w-full border border-gray-200 rounded-lg bg-gray-50 p-4 max-h-[60vh] overflow-y-auto mb-4">
              {progressMessages.length === 0 ? (
                <p className="text-gray-500 italic text-center">Waiting for updates...</p>
              ) : (
                <div className="space-y-2">
                  {progressMessages.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`p-2 rounded text-sm ${
                        msg.status === 'error' ? 'bg-red-100 text-red-800' :
                        msg.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        msg.status === 'success' ? 'bg-green-100 text-green-800' :
                        msg.status === 'complete' ? 'bg-blue-100 text-blue-800 font-bold' :
                        'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <div className="flex items-start">
                        <span className="text-xs text-gray-500 mr-2">[{msg.timestamp}]</span>
                        <span>{msg.message}</span>
                      </div>
                    </div>
                  ))}
                  <div ref={progressEndRef} />
                </div>
              )}
            </div>
            
            {/* Action buttons */}
            <div className="flex justify-end space-x-4">
              <button
                onClick={resetDS160State}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
              >
                Close
              </button>
              
              {ds160Status === 'success' && (
                <button
                  onClick={handleDownloadYaml}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
                >
                  Download YAML
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success or Error Modal */}
      {(ds160Status === 'success' || ds160Status === 'error') && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className={`flex items-center ${ds160Status === 'success' ? 'text-green-600' : 'text-red-600'} mb-4`}>
              {ds160Status === 'success' ? (
                <svg className="w-8 h-8 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-8 h-8 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <h2 className="text-2xl font-bold">
                {ds160Status === 'success' ? 'DS-160 Completed Successfully' : 'DS-160 Processing Error'}
              </h2>
            </div>
            
            {/* Show application ID for new applications */}
            {ds160Status === 'success' && applicationId && (
              <div className="bg-blue-50 border border-blue-300 p-4 rounded-lg mb-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-medium">Application ID</p>
                    <p className="text-lg font-bold tracking-wider">{applicationId}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Save this ID to retrieve your application in the future.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Process summary from backend, if available */}
            {progressMessages.find(msg => msg.summary)?.summary && (
              <div className={`p-3 rounded-lg mb-4 ${
                progressMessages.find(msg => msg.summary)?.summary?.errors ?? 0 <= 2 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <h3 className="font-medium mb-1">Form Completion Summary</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Pages completed:</div>
                  <div className="font-medium">{progressMessages.find(msg => msg.summary)?.summary?.completed}</div>
                  <div>Pages with errors:</div>
                  <div className="font-medium">{progressMessages.find(msg => msg.summary)?.summary?.errors}</div>
                  <div>Pages skipped:</div>
                  <div className="font-medium">{progressMessages.find(msg => msg.summary)?.summary?.skipped}</div>
                  <div>Total pages:</div>
                  <div className="font-medium">{progressMessages.find(msg => msg.summary)?.summary?.total}</div>
                </div>
              </div>
            )}
            
            {/* Show progress messages - with scrolling preserved */}
            <div className="border border-gray-200 rounded-lg bg-gray-50 p-4 overflow-y-auto flex-1 mb-4">
              <div className="space-y-2">
                {progressMessages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`p-2 rounded text-sm ${
                      msg.status === 'error' ? 'bg-red-100 text-red-800' :
                      msg.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      msg.status === 'success' ? 'bg-green-100 text-green-800' :
                      msg.status === 'complete' ? 'bg-blue-100 text-blue-800 font-bold' :
                      'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <div className="flex items-start">
                      <span className="text-xs text-gray-500 mr-2">[{msg.timestamp}]</span>
                      <span>{msg.message}</span>
                    </div>
                  </div>
                ))}
                <div ref={progressEndRef} />
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex justify-end space-x-4">
              <button
                onClick={resetDS160State}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
              >
                Close
              </button>
              
              {ds160Status === 'success' && (
                <button
                  onClick={handleDownloadYaml}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
                >
                  Download YAML
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {consoleErrors.length > 0 && (
        <div className="fixed bottom-0 right-0 p-4 m-4 bg-black bg-opacity-75 text-white rounded-lg max-w-lg">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium">Console Errors</h3>
            <button 
              onClick={() => setConsoleErrors([])}
              className="text-white hover:text-gray-300"
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto text-xs font-mono">
            {consoleErrors.map((error, index) => (
              <div key={index} className="p-2 bg-red-900 bg-opacity-50 rounded">
                {error}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extraction Progress Modal */}
      {extractionStatus !== 'idle' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex flex-col items-center">
              {(extractionStatus !== 'complete' || !formFillComplete) && (
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
              )}
              
              <h3 className="text-lg font-semibold mb-4">
                {extractionStatus === 'extracting' ? 'Extracting DS-160 PDF' : 
                 extractionStatus === 'processing' ? 'Processing with AI' :
                 extractionStatus === 'filling' && !formFillComplete ? 'Filling Form Fields' : 
                 extractionStatus === 'complete' && formFillComplete ? 'Form Filling Complete' :
                 'Processing...'}
              </h3>
              
              {/* Add StopwatchTimer */}
              {extractionStatus !== 'complete' && (
                <StopwatchTimer 
                  isRunning={extractionStatus !== 'idle' && !formFillComplete} 
                  estimatedTime="up to 2 minutes"
                />
              )}
              
              <div className="w-full space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-3 bg-gray-50">
                {extractionProgress.map((msg, idx) => (
                  <div key={idx} className="text-sm">
                    {msg}
                  </div>
                ))}
              </div>
              
              {/* Only show Done button when extraction is complete AND form filling is complete */}
              {extractionStatus === 'complete' && formFillComplete && (
                <Button 
                  onClick={() => setExtractionStatus('idle')}
                  className="mt-4"
                >
                  Done
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Configuration Modal */}
      <UploadConfigModal />

      {/* Add the reset confirmation modal here */}
      <ResetConfirmationModal />
    </div>
  )
}

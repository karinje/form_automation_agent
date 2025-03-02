"use client"

import { useState, useCallback, useEffect } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import DynamicForm from "@/components/DynamicForm"
import { flattenYamlData, unflattenFormData, flattenRepeatedGroups } from './utils/yaml-helpers'
import { getFormFieldId, getYamlField, formMappings } from './utils/mappings'
import yaml from 'js-yaml'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createFormMapping } from './utils/yaml-mapping'
import { debugLog } from './utils/consoleLogger'
import { Button } from "@/components/ui/button"
import { LinkedInImport } from "@/components/LinkedInImport"
import type { FormCategory, FormCategories, FormDefinition } from "@/types/form-definition"
import { processWithOpenAI, processLinkedIn, runDS160 } from './utils/api'
import { I94Import } from "@/components/I94Import"
import { DocumentUpload } from "@/components/DocumentUpload"

// Import all form definitions in alphabetical order
import p10_workeducation1_definition from "../form_definitions/p10_workeducation1_definition.json"
import p11_workeducation2_definition from "../form_definitions/p11_workeducation2_definition.json"
import p12_workeducation3_definition from "../form_definitions/p12_workeducation3_definition.json"
import p13_securityandbackground1_definition from "../form_definitions/p13_securityandbackground1_definition.json"
import p14_securityandbackground2_definition from "../form_definitions/p14_securityandbackground2_definition.json"
import p15_securityandbackground3_definition from "../form_definitions/p15_securityandbackground3_definition.json"
import p16_securityandbackground4_definition from "../form_definitions/p16_securityandbackground4_definition.json"
import p17_securityandbackground5_definition from "../form_definitions/p17_securityandbackground5_definition.json"
import p18_spouse_definition from "../form_definitions/p18_spouse_definition.json"
import p1_personal1_definition from "../form_definitions/p1_personal1_definition.json"
import p2_personal2_definition from "../form_definitions/p2_personal2_definition.json"
import p3_travelinfo_definition from "../form_definitions/p3_travel_definition.json"
import p4_travelcompanions_definition from "../form_definitions/p4_travelcompanions_definition.json"
import p5_previoustravel_definition from "../form_definitions/p5_previousustravel_definition.json"
import p6_addressphone_definition from "../form_definitions/p6_addressphone_definition.json"
import p7_pptvisa_definition from "../form_definitions/p7_pptvisa_definition.json"
import p8_uscontact_definition from "../form_definitions/p8_uscontact_definition.json"
import p9_relatives_definition from "../form_definitions/p9_relatives_definition.json"
import startPageDefinition from "../form_definitions/p0_start_page_definition.json"
import securityPageDefinition from "../form_definitions/p0_security_page_definition.json"

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export default function Home() {
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [yamlData, setYamlData] = useState<Record<string, any>>({})
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

  const formCategories: FormCategories = {
    personal: [
      { title: "Personal Information 1", definition: p1_personal1_definition, pageName: "personal_page1" },
      { title: "Personal Information 2", definition: p2_personal2_definition, pageName: "personal_page2" },
      { title: "Address & Phone", definition: p6_addressphone_definition, pageName: "address_phone_page" },
      { title: "Passport", definition: p7_pptvisa_definition, pageName: "pptvisa_page" },
      { title: "Relatives", definition: p9_relatives_definition, pageName: "relatives_page" },
      { title: "Spouse Information", definition: p18_spouse_definition, pageName: "spouse_page" },
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

  // Generate years for dropdown (e.g., 1940 to current year)
  const years = Array.from({ length: new Date().getFullYear() - 1940 + 1 }, (_, i) => 
    (1940 + i).toString()
  ).reverse()

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

  const handleFormDataLoad = useCallback((uploadedYamlData: Record<string, any>, showSuccess = true, pagesFilter?: string[]) => {
    try {
      debugLog('all_pages', '[Mapping Creation] Processing YAML data');
      
      setYamlData(uploadedYamlData);
      const yamlString = yaml.dump(uploadedYamlData);
      const { formData: arrayAwareFormData, arrayGroups } = createFormMapping(yamlString);
      
      setArrayGroups(arrayGroups);
      
      const allFormFields: Record<string, string> = {};
      Object.entries(uploadedYamlData).forEach(([pageName, pageData]) => {
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
      setIsProcessingLLM(false);

      // Only update counters for filtered pages, or all pages if no filter
      setTimeout(() => {
        if (!pagesFilter) {
          setCurrentTab('personal');
        }
        updateFormCountersSilently(pagesFilter);
      }, 200);
      
      if (showSuccess) {
        setConsoleErrors([
          'Form data loaded successfully!',
          ...consoleErrors
        ]);
      }
      
      return true;
    } catch (error) {
      console.error('[Form Load] Error loading form data:', error);
      return false;
    } finally {
      setIsProcessingLLM(false);
    }
  }, [formCategories]);

  // Add a new function to update counters by temporarily opening accordion items
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


  const handleFileUpload = async (file: File) => {
    if (file.type === "application/pdf") {
      try {
        // First phase: PDF to text
        setIsConverting(true);
        const fullText = await extractTextFromPdf(file);
        setExtractedText(fullText);
        setIsConverting(false);

        // Second phase: OpenAI processing
        setIsProcessingLLM(true);
        const { text: yamlOutput } = await processWithOpenAI(fullText);
        setYamlOutput(yamlOutput);

        // Third phase: Form filling
        try {
          const parsedYaml = yaml.load(yamlOutput) as Record<string, any>;
          await handleFormDataLoad(parsedYaml);
        } catch (error) {
          console.error('Error parsing YAML:', error);
          setErrorMessage('Error parsing the generated YAML data');
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setErrorMessage(errorMessage);
        console.error('PDF to YAML conversion error:', error);
      } finally {
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
    Object.keys(formMappings).forEach(pageName => {
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
  }, [formData, arrayGroups])

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
      
      console.log('Complete yaml data:', yamlData)
      
      // Return only requested pages
      const filteredData: Record<string, any> = {}
      pageFilter.forEach(page => {
        if (yamlData[page]) {
          filteredData[page] = yamlData[page]
        }
      })
      
      console.log('Filtered yaml data:', filteredData)
      return filteredData
    } catch (error) {
      console.error('Error filtering YAML data:', error)
      return {}
    }
  }

  const handleRunDS160 = async () => {
    try {
      if (retrieveMode === 'retrieve') {
        if (!applicationId || !surname || !birthYear || !secretQuestion || !secretAnswer) {
          setErrorMessage("Please fill in all retrieve fields");
          return;
        }
        
        // Validation checks...
      }

      try {
        setIsRunningDS160(true)
        
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

        // Create YAML string with same formatting as download
        const yamlStr = yaml.dump(finalYamlData, {
          lineWidth: -1,
          quotingType: '"',
          forceQuotes: true,
        })
          
        // Send to backend
        const result = await runDS160(yamlStr)
        
        if (result.status === 'error') {
          setConsoleErrors(prev => [...prev, `DS-160 Processing Error: ${result.message}`])
        } else {
          console.log('DS-160 Processing Output:', result.message)
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setConsoleErrors(prev => [...prev, `DS-160 Processing Error: ${errorMessage}`]);
      } finally {
        setIsRunningDS160(false)
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setConsoleErrors(prev => [...prev, `DS-160 Processing Error: ${errorMessage}`]);
    }
  }

  const renderFormSection = (forms: typeof formCategories.personal, category: string) => (
    <Accordion 
      type="single" 
      collapsible 
      className="space-y-4"
      value={accordionValues[category] || ""}
      onValueChange={(val) => setAccordionValues(prev => ({ ...prev, [category]: val }))}
    >
      {forms.map((form, index) => {
        const formId = `${category}-${index}`
        const onCompletionMemo = useCallback((completed: number, total: number) => {
          setCompletionStatus(prev => ({
            ...prev,
            [formId]: { completed, total }
          }))
        }, [formId])
        
        const groupsForPage = form.pageName ? arrayGroups[form.pageName] || {} : {};
        
        // Add debug logging for workeducation3_page
        // if (form.pageName === 'workeducation3_page') {
        //   debugLog('workeducation3_page', `Rendering form with arrayGroups:`, {
        //     pageName: form.pageName,
        //     groupsForPage,
        //     hasArrayGroups: Object.keys(groupsForPage).length > 0
        //   });
        // }
        
        return (
          <AccordionItem key={index} value={`item-${index}`} className="border border-gray-200 rounded-lg overflow-hidden">
            <AccordionTrigger className="w-full hover:no-underline [&>svg]:h-8 [&>svg]:w-8 [&>svg]:shrink-0 [&>svg]:text-gray-500 p-0">
              <div className="flex justify-between items-center py-2 px-4 bg-gray-50 w-full">
                <h2 className="text-lg font-semibold leading-none">
                  {form.title}
                </h2>
                <div className="flex items-center gap-4">
                  <div className="flex items-center">
                    <span className="mr-2 text-sm text-gray-600">
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
                  setFormData(prev => ({ ...prev, [name]: value }))
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
                  if (pageName === 'workeducation3_page') {
                    debugLog('workeducation3_page', `onArrayGroupsChange called from DynamicForm:`, {
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
                    if (pageName === 'workeducation3_page') {
                      console.log('updated before groupdata', updated)
                    }
                    // Update the group data
                    updated[pageName][groupKey] = [...groupData];
                    
                    // Log the updated state for debugging
                    if (pageName === 'workeducation3_page') {
                      debugLog('workeducation3_page', `Updated arrayGroups state:`, {
                        updated,
                        groupData,
                        pageName,
                        groupKey
                      });
                    }
                    
                    return updated;
                  });
                  if (pageName === 'workeducation3_page') {
                    console.log('arrayGroups finally', arrayGroups)
                  }
                }}
              />
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      {(isProcessing || isProcessingLLM) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-lg font-semibold">
              {isProcessing ? 'Processing PDF...' : 'Processing with AI...'}
            </p>
            <p className="text-sm text-gray-500">
              {isProcessing ? 'Converting document to form data' : 'This typically takes 1-2 minutes'}
            </p>
          </div>
        </div>
      )}
      
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">
            DS-160 Agent
          </h1>
        </div>
        
        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="mb-4 flex flex-col bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold whitespace-nowrap">Upload Previous DS160 to fill form</h2>
              <div className="flex-1 flex justify-end">
                <label 
                  htmlFor="dropzone-file" 
                  className={`flex items-center justify-center h-12 w-96 
                             border-2 border-blue-500 border-dashed rounded-lg 
                             ${isProcessing || isProcessingLLM ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-100'} 
                             bg-gray-50 relative ml-8`}
                >
                  <div className="flex items-center">
                    {isConverting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
                        <span className="text-sm text-gray-500">Converting...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-6 h-6 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="text-sm text-gray-500">Click to upload or drag and drop PDF files</span>
                      </>
                    )}
                  </div>
                  <input 
                    id="dropzone-file" 
                    type="file" 
                    className="hidden" 
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
            
            {(extractedText || yamlOutput) && (
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

          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <Label className="text-lg font-semibold min-w-[150px]">Make Selection:</Label>
              <Tabs 
                value={retrieveMode} 
                onValueChange={(value: 'new' | 'retrieve') => setRetrieveMode(value)}
                className="flex-1"
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

            <div className="space-y-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2">
                <Label className="min-w-[150px]">Location:</Label>
                <Select value={location} onValueChange={setLocation} className="flex-1">
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

              <div className="flex items-start gap-2">
                <Label className="min-w-[150px] mt-2">Security Details:</Label>
                <div className="flex-1 flex gap-4">
                  <Select value={secretQuestion} onValueChange={setSecretQuestion} className="w-[70%]">
                    <SelectTrigger>
                      <SelectValue placeholder="Select a security question" />
                    </SelectTrigger>
                    <SelectContent>
                      {securityQuestions.map((q) => (
                        <SelectItem key={q} value={q}>{q}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input 
                    value={secretAnswer} 
                    onChange={(e) => setSecretAnswer(e.target.value)}
                    placeholder="Enter Answer"
                    className="w-[30%]"
                  />
                </div>
              </div>

              {retrieveMode === 'retrieve' && (
                <div className="flex items-center gap-2">
                  <Label className="min-w-[150px]">Retrieve Details:</Label>
                  <div className="flex-1 grid grid-cols-3 gap-4">
                    <Input 
                      value={applicationId} 
                      onChange={(e) => setApplicationId(e.target.value)}
                      placeholder="Application ID"
                    />
                    <Input 
                      value={surname} 
                      onChange={(e) => setSurname(e.target.value.slice(0, 5).toUpperCase())}
                      placeholder="Surname (5 chars)"
                      maxLength={5}
                    />
                    <Input 
                      value={birthYear} 
                      onChange={(e) => setBirthYear(e.target.value)}
                      placeholder="Birth Year"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">After filling all pages below, upload to DS160 website:</Label>
              <Button 
                onClick={handleRunDS160}
                disabled={isRunningDS160}
                className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-2 rounded-lg flex items-center gap-2 text-lg"
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

          <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-20">
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
                    className="relative flex flex-col items-center justify-center gap-2 py-2"
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
              {renderFormSection(formCategories.personal, 'personal')}
            </TabsContent>
            <TabsContent value="travel" className="mt-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-4">Travel Information</h2>
                <I94Import 
                  formData={formData}
                  onDataImported={(data) => {
                    // Handle imported data
                  }} 
                />
                <DocumentUpload 
                  onExtractData={(data) => {
                    // Handle extracted data
                  }} 
                />
              </div>
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
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-grow">
                    <p className="text-base font-medium text-gray-800 my-auto">
                      Select default answer for all Security and Background Questions:
                    </p>
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

        <div className="mt-8 flex justify-end">
          <div className="flex space-x-4">
            <input
              type="file"
              accept=".yaml,.yml"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  const reader = new FileReader()
                  reader.onload = (event) => {
                    try {
                      const content = event.target?.result as string
                      const data = yaml.load(content) as Record<string, any>
                      handleFormDataLoad(data)
                    } catch (error) {
                      console.error('Error parsing YAML:', error)
                    }
                  }
                  reader.readAsText(file)
                }
              }}
              className="hidden"
              id="yaml-upload"
            />
            <label 
              htmlFor="yaml-upload"
              className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Upload YAML
            </label>
            <button
              onClick={handleDownloadYaml}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
            >
              Download YAML
            </button>
          </div>
        </div>
      </div>

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
    </div>
  )
}

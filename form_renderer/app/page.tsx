"use client"

import { useState, useCallback, useEffect } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import DynamicForm from "@/components/DynamicForm"
import { flattenYamlData, unflattenFormData, flattenRepeatedGroups } from '@/utils/yaml-helpers'
import { getFormFieldId, getYamlField, formMappings } from '@/utils/mappings'
import yaml from 'js-yaml'
import { generatePrompt } from '@/prompts/pdf_to_yaml'
import { callOpenAI } from '@/utils/openai'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createFormMapping } from '@/utils/yaml-mapping'
import { debugLog } from '@/utils/consoleLogger'

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
  // Sample secret questions - replace with actual questions later
  const secretQuestions = [
    "What is your mother's maiden name?",
    "What was your first pet's name?",
    "What city were you born in?",
    "What was your high school mascot?",
    "What is your favorite book?"
  ]

  const formCategories = {
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

  // Add locations array
  const locations = [
    'ENGLAND, LONDON',
    'USA, NEW YORK',
    'CANADA, TORONTO',
    // Add more locations as needed
  ]

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

  const handleFormDataLoad = useCallback((uploadedYamlData: Record<string, any>) => {
    try {
      // Only log mapping creation and previous_travel_page data
      debugLog('all_pages', '[Mapping Creation] Processing YAML data');
      const relevantPage = uploadedYamlData['previous_travel_page'];
      if (relevantPage) {
        debugLog('previous_travel_page', 'Processing page data:', relevantPage);
      }
      
      setYamlData(uploadedYamlData);
      
      // Convert to YAML string for array detection
      const yamlString = yaml.dump(uploadedYamlData);
      
      // Create the mapping using our new helper - this handles arrays
      const { formData: arrayAwareFormData, arrayGroups } = createFormMapping(yamlString);
      console.log("Mapping returned arrayGroups:", arrayGroups);
      setArrayGroups(arrayGroups);
      
      // Also process using existing logic to ensure backward compatibility
      const allFormFields: Record<string, string> = {};
      Object.entries(uploadedYamlData).forEach(([pageName, pageData]) => {
        const isDebugPage = pageName === 'previous_travel_page';
        const flattenedData = flattenYamlData(pageData);
        
        if (isDebugPage) {
          debugLog('previous_travel_page', 'Processing page:', { pageName, pageData });
          debugLog('previous_travel_page', 'Flattened data:', { pageName, flattenedData });
        }
        
        Object.entries(flattenedData).forEach(([yamlField, value]) => {
          const formFieldId = getFormFieldId(pageName, yamlField);
          if (formFieldId) {
            if (isDebugPage) {
              debugLog('previous_travel_page', 'Mapping field:', { yamlField, formFieldId, value });
            }
            allFormFields[formFieldId] = value;
          }
        });
      });
      
      // Merge the results, preferring array-aware mappings
      const mergedFormData = {
        ...allFormFields,
        ...arrayAwareFormData
      };
      // Only log form data for previous_travel_page fields
      const travelPageData = Object.entries(mergedFormData)
        .filter(([key]) => key.includes('PREV_') || key.includes('PrevTravel'))
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
      
      debugLog('previous_travel_page', 'Setting form data:', travelPageData);
      
      setFormData(mergedFormData);
      setRefreshKey(prev => prev + 1);
      
      // Cycle through tabs (preserve existing behavior)
      const categories = Object.keys(formCategories);
      let delay = 0;
      categories.forEach((category) => {
        setTimeout(() => {
          setCurrentTab(category);
          const forms = formCategories[category];
          forms.forEach((_, index) => {
            setTimeout(() => {
              setAccordionValues(prev => ({ ...prev, [category]: `item-${index}` }));
              setTimeout(() => {
                setAccordionValues(prev => ({ ...prev, [category]: "" }));
              }, 100);
            }, index * 200);
          });
        }, delay);
        delay += formCategories[category].length * 200 + 500;
      });
    } catch (error) {
      console.error('[Form Load] Error loading form data:', error);
    }
  }, [formCategories]);

  const handleDownloadYaml = useCallback(() => {
    console.log('Starting handleDownloadYaml with arrayGroups:', arrayGroups);
    
    // First get all the form data converted to YAML format
    const formYamlData: Record<string, any> = {}
    
    Object.keys(formMappings).forEach(pageName => {
      const pageFormData: Record<string, string> = {}
      
      // Find all form fields that belong to this page
      Object.entries(formData).forEach(([formFieldId, value]) => {
        const yamlField = getYamlField(pageName, formFieldId)
        if (yamlField) {
          pageFormData[yamlField] = value
        }
      })
      
      if (Object.keys(pageFormData).length > 0) {
        console.log(`Processing page ${pageName}:`, { pageFormData });
        
        formYamlData[pageName] = {
          ...unflattenFormData(pageFormData),
          button_clicks: [1, 2]
        }
        
        // If this page has array groups, just use them directly
        if (arrayGroups[pageName]) {
          console.log(`Found array groups for ${pageName}:`, arrayGroups[pageName]);
          Object.entries(arrayGroups[pageName]).forEach(([groupKey, groupArray]) => {
            console.log(`Processing group ${groupKey}:`, groupArray);
            
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
            
            console.log(`Added array group to ${pageName}.${groupKey}:`, arrayData);
          });
        }
        console.log(`Final page data for ${pageName}:`, formYamlData[pageName]);
      }
    })
    
    // Add start_page section
    const startPage = {
      language: "English",
      location: location,
      button_clicks: [0]
    }

    // Add retrieve_page section if in retrieve mode
    const retrievePage = retrieveMode === 'retrieve' ? {
      application_id: applicationId,
      surname: surname,
      year: birthYear,
      security_answer: secretAnswer,
      button_clicks: [1]
    } : undefined

    // Add security_page section if in new mode
    const securityPage = retrieveMode === 'new' ? {
      privacy_agreement: true,
      security_question: "What is the name of your favorite childhood friend?",
      security_answer: "John Doe",
      button_clicks: [0]
    } : undefined

    // Combine all sections
    const finalYamlData = {
      start_page: startPage,
      ...(retrievePage && { retrieve_page: retrievePage }),
      ...(securityPage && { security_page: securityPage }),
      ...formYamlData  // Add all the form data
    }
    
    debugLog('all_pages', '[Mapping Creation] Processing YAML data');
    
    let yamlStr = yaml.dump(finalYamlData, {
      lineWidth: -1,
      quotingType: '"',
      forceQuotes: true,
      indent: 2,
      flowLevel: -1,  // Force block style
      noArrayIndent: false,  // Allow array indentation
      noCompatMode: true,  // Use new style
    })
    
    // Fix button_clicks formatting
    yamlStr = yamlStr
      .replace(/button_clicks:\s*(?:-\s*0|"\[0\]")/g, 'button_clicks: [0]')
      .replace(/button_clicks:\s*(?:-\s*1|"\[1\]")/g, 'button_clicks: [1]')
      .replace(/button_clicks:\s*(?:-\s*1\s*-\s*2|"\[1,\s*2\]"|"\[1, 2\]"|\[1\]\s*-\s*2)/g, 'button_clicks: [1, 2]')
      .replace(/button_clicks:\s*\[\s*(\d+)\s*\]\s*-\s*(\d+)/g, 'button_clicks: [$1, $2]')
      // Add newlines between all pages (including those without _page suffix)
      .replace(/^([a-zA-Z][a-zA-Z0-9_]*(?:_page)?:)/gm, '\n$1')
      // Remove extra newline at the start of the file
      .replace(/^\n/, '')

    const blob = new Blob([yamlStr], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'form_data.yaml'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [formData, yamlData, location, retrieveMode, applicationId, surname, birthYear, secretAnswer, secretQuestion, arrayGroups])

  const handleInputChange = (name: string, value: string) => {
    console.log('Form input change:', { name, value })
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
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
        console.log(`Rendering DynamicForm for ${form.pageName}:`, groupsForPage);
        
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
                      { (completionStatus[formId]?.completed || 0) }/
                      { (completionStatus[formId]?.total || 0) } completed
                    </span>
                    { (completionStatus[formId]?.total || 0) > 0 && (completionStatus[formId]?.completed === completionStatus[formId]?.total ? (
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ))}
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
                onInputChange={handleInputChange}
                onCompletionUpdate={onCompletionMemo}
              />
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )

  const handleFileUpload = async (file: File) => {
    if (file.type === "application/pdf") {
      try {
        // Reset all states before processing new file
        setFormData({})
        setYamlData({})
        setYamlOutput("")
        setExtractedText("")
        setErrorMessage("")
        setConsoleErrors([])
        setRefreshKey(prev => prev + 1)
        
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
        
        setExtractedText(fullText);
        setIsConverting(false);
        
        // Start LLM processing
        setIsProcessingLLM(true);
        const prompt = generatePrompt(fullText);
        const yamlOutput = await callOpenAI(prompt);
        
        // Set the YAML output for display and later use
        setYamlOutput(yamlOutput);
        
        try {
          const parsedYaml = yaml.load(yamlOutput) as Record<string, any>;
          handleFormDataLoad(parsedYaml);
        } catch (error) {
          console.error('Error parsing YAML:', error);
          setErrorMessage('Error parsing the generated YAML data');
        }
        
        setIsProcessingLLM(false);
      } catch (error: any) {
        console.error('Error processing PDF:', error);
        setConsoleErrors(prev => [...prev, `PDF Processing Error: ${error.message}`]);
      } finally {
        setIsConverting(false);
        setIsProcessingLLM(false);
        // Reset the file input
        const fileInput = document.getElementById('dropzone-file') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      }
    } else {
      setErrorMessage('Please upload a PDF file');
    }
  }

  const handleRunDS160 = async () => {
    try {
      setIsRunningDS160(true)
      
      // First get all the form data converted to YAML format
      const formYamlData: Record<string, any> = {}
      Object.keys(formMappings).forEach(pageName => {
        const pageFormData: Record<string, string> = {}
        const pageMapping = formMappings[pageName]
        
        // Find all form fields that belong to this page
        Object.entries(formData).forEach(([formFieldId, value]) => {
          const yamlField = getYamlField(pageName, formFieldId)
          if (yamlField) {
            pageFormData[yamlField] = value
          }
        })
        
        if (Object.keys(pageFormData).length > 0) {
          formYamlData[pageName] = {
            ...unflattenFormData(pageFormData),
            button_clicks: [1, 2]  // Add button_clicks to each page
          }
        }
      })
      
      // Add start_page section
      const startPage = {
        language: "English",
        location: location,
        button_clicks: [0]
      }

      // Add retrieve_page section if in retrieve mode
      const retrievePage = retrieveMode === 'retrieve' ? {
        application_id: applicationId,
        surname: surname,
        year: birthYear,
        security_answer: secretAnswer,
        button_clicks: [1]
      } : undefined

      // Add security_page section if in new mode
      const securityPage = retrieveMode === 'new' ? {
        privacy_agreement: true,
        security_question: "What is the name of your favorite childhood friend?",
        security_answer: "John Doe",
        button_clicks: [0]
      } : undefined

      // Combine all sections
      const finalYamlData = {
        start_page: startPage,
        ...(retrievePage && { retrieve_page: retrievePage }),
        ...(securityPage && { security_page: securityPage }),
        ...formYamlData  // Add all the form data
      }

      // Create YAML string
      const yamlStr = yaml.dump(finalYamlData, {
        lineWidth: -1,
        quotingType: '"',
        forceQuotes: true,
      })
        
      // Create form data for upload (renamed to avoid conflict)
      const uploadFormData = new FormData()
      const yamlBlob = new Blob([yamlStr], { type: 'text/yaml' })
      uploadFormData.append('file', yamlBlob, 'ds160_input.yaml')
      
      // Send to backend
      const response = await fetch('http://localhost:8000/api/run-ds160', {
        method: 'POST',
        body: uploadFormData,
      })
      
      const result = await response.json()
      
      if (result.status === 'error') {
        setConsoleErrors(prev => [...prev, `DS-160 Processing Error: ${result.message}`])
      } else {
        console.log('DS-160 Processing Output:', result.message)
      }
    } catch (error) {
      setConsoleErrors(prev => [...prev, `DS-160 Processing Error: ${error.message}`])
    } finally {
      setIsRunningDS160(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-lg font-semibold">Processing PDF...</p>
            <p className="text-sm text-gray-500">Converting document to form data</p>
          </div>
        </div>
      )}
      
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">
            DS-160 Agent
          </h1>
          <p className="mt-2 text-base text-gray-500">
            Please fill out all sections below
          </p>
        </div>
        
        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="mb-6 space-y-4">
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h2 className="text-lg font-semibold mb-2">Upload Required Documents</h2>
              <p className="text-sm text-gray-600 mb-4">
                Please upload the following documents: Previous DS160, Passport, I767, Travel Ticket
              </p>
              <div className="space-y-4">
                <div className="upload-container relative">
                  {/* LLM processing overlay */}
                  {isProcessingLLM && (
                    <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg z-50">
                      <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center h-32 justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                        <p className="text-lg font-semibold">Extracting Information from DS160</p>
                        <p className="text-sm text-gray-500">Typically takes 1-2 minutes</p>
                      </div>
                    </div>
                  )}
                  <label
                    htmlFor="dropzone-file"
                    className={`flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg ${isProcessing ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-100'} bg-gray-50 relative`}
                    onDrop={(e) => {
                      if (isProcessing) return;
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file) handleFileUpload(file);
                    }}
                    onDragOver={(e) => {
                      if (isProcessing) return;
                      e.preventDefault();
                    }}
                  >
                    {isProcessing && (
                      <div className="absolute -top-16 left-0 w-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                      </div>
                    )}
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {isConverting ? (
                        <>
                          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-2"></div>
                          <p className="text-sm text-gray-500">Converting PDF to text...</p>
                        </>
                      ) : (
                        <>
                          <svg className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">PDF files only</p>
                        </>
                      )}
                    </div>
                    <input 
                      id="dropzone-file" 
                      type="file" 
                      className="hidden" 
                      onChange={(e) => {
                        if (isProcessing) return;
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                      disabled={isProcessing}
                      accept=".pdf"
                    />
                  </label>
                  {/* Download Links */}
                  {(extractedText || yamlOutput) && (
                    <div className="flex justify-between items-center mt-4 text-sm">
                      {extractedText && (
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">DS160 Text</span>
                          <button
                            onClick={() => {
                              const blob = new Blob([extractedText], { type: 'text/plain' });
                              const url = URL.createObjectURL(blob);
                              window.open(url, '_blank');
                              URL.revokeObjectURL(url);
                            }}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            Download
                          </button>
                        </div>
                      )}
                      {yamlOutput && (
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">Fields Extracted</span>
                          <button
                            onClick={() => {
                              const blob = new Blob([yamlOutput], { type: 'text/yaml' });
                              const url = URL.createObjectURL(blob);
                              window.open(url, '_blank');
                              URL.revokeObjectURL(url);
                            }}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            Download
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {errorMessage && (
                    <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-sm font-medium text-red-800">Error</h3>
                      </div>
                      <p className="mt-2 text-sm text-red-700">{errorMessage}</p>
                    </div>
                  )}
                </div>
              </div>
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
            <TabsContent value="travel">
              {renderFormSection(formCategories.travel, 'travel')}
            </TabsContent>
            <TabsContent value="education">
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
                          form.definition.fields.forEach(field => {
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

        <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Select
                value={location}
                onValueChange={setLocation}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={retrieveMode}
                onValueChange={(value: 'new' | 'retrieve') => setRetrieveMode(value)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New Application</SelectItem>
                  <SelectItem value="retrieve">Retrieve Application</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {retrieveMode === 'retrieve' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="application-id">Application ID</Label>
                  <Input
                    id="application-id"
                    value={applicationId}
                    onChange={(e) => setApplicationId(e.target.value)}
                    placeholder="Enter application ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surname">Surname</Label>
                  <Input
                    id="surname"
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    placeholder="Enter surname"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birth-year">Birth Year</Label>
                  <Select
                    value={birthYear}
                    onValueChange={setBirthYear}
                  >
                    <SelectTrigger id="birth-year">
                      <SelectValue placeholder="Select birth year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secret-question">Secret Question</Label>
                  <Select
                    value={secretQuestion}
                    onValueChange={setSecretQuestion}
                  >
                    <SelectTrigger id="secret-question">
                      <SelectValue placeholder="Select a security question" />
                    </SelectTrigger>
                    <SelectContent>
                      {secretQuestions.map((question) => (
                        <SelectItem key={question} value={question}>
                          {question}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="secret-answer">Answer</Label>
                  <Input
                    id="secret-answer"
                    value={secretAnswer}
                    onChange={(e) => setSecretAnswer(e.target.value)}
                    placeholder="Enter your answer"
                    type="password"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-between">
          <button
            onClick={handleRunDS160}
            disabled={isRunningDS160}
            className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white 
              ${isRunningDS160 ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {isRunningDS160 ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              'Upload to DS160'
            )}
          </button>

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

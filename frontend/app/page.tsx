"use client"

import { useState, useCallback, useEffect } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import DynamicForm from "@/components/DynamicForm"
import { flattenYamlData, unflattenFormData, flattenRepeatedGroups } from './utils/yaml-helpers'
import { getFormFieldId, getYamlField, formMappings } from './utils/mappings'
import yaml from 'js-yaml'
import { generatePrompt } from './prompts/pdf_to_yaml'
import { callOpenAI } from './utils/openai'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createFormMapping } from './utils/yaml-mapping'
import { debugLog } from './utils/consoleLogger'
import { Button } from "@/components/ui/button"
import { LinkedInImport } from "@/components/LinkedInImport"
import type { FormCategory, FormCategories, FormDefinition } from "@/types/form-definition"
import { assertFormDefinition } from './utils/type-helpers'
import { processWithOpenAI, processLinkedIn, runDS160 } from './utils/api'

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
        "What is the given name of your mother's mother?",
        "What is the given name of your father's father?",
        "What is your maternal grandmother's maiden name?",
        "What name did your family used to call you when you were a child?",
        "In what city did you meet your spouse/significant other?",
        "What is the name of your favorite childhood friend?",
        "What street did you live on when you were 8 years old?",
        "What is your oldest sibling's birthday month and year? (e.g., January 1900)",
        "What is the middle name of your youngest child?",
        "What is your oldest sibling's middle name?",
        "What school did you attend when you were 11 years old?",
        "What was your home phone number when you were a child?",
        "What is your oldest cousin's first and last name?",
        "What was the name of your favorite stuffed animal or toy?",
        "In what city or town did your mother and father meet?",
        "What was the last name of your favorite teacher?",
        "In what city does your nearest sibling live?",
        "What is your youngest sibling's birthday month and year? (e.g., January 1900)",
        "In what city or town was your first job?",
        "What was the name of your first boyfriend or girlfriend?"
  ]

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

  const handleFormDataLoad = useCallback((uploadedYamlData: Record<string, any>) => {
    try {
      debugLog('all_pages', '[Mapping Creation] Processing YAML data');
      
      setYamlData(uploadedYamlData);
      const yamlString = yaml.dump(uploadedYamlData);
      const { formData: arrayAwareFormData, arrayGroups } = createFormMapping(yamlString);
      
      setArrayGroups(arrayGroups);
      
      const allFormFields: Record<string, string> = {};
      Object.entries(uploadedYamlData).forEach(([pageName, pageData]) => {
        const flattenedData = flattenYamlData(pageData);
        Object.entries(flattenedData).forEach(([yamlField, value]) => {
          const formFieldId = getFormFieldId(pageName, yamlField);
          if (formFieldId) {
            allFormFields[formFieldId] = String(value);
          }
        });
      });
      
      const mergedFormData = {
        ...allFormFields,
        ...arrayAwareFormData
      };
      
      setFormData(mergedFormData);
      setRefreshKey(prev => prev + 1);
      setIsProcessingLLM(false);

      // Wait for state updates before animations
      setTimeout(() => {
        setCurrentTab('personal');
        animateFormSections();  // This should be controlled separately
      }, 1000);
      
    } catch (error) {
      console.error('[Form Load] Error loading form data:', error);
    } finally {
      setIsProcessingLLM(false);  // Move this here
    }
  }, [formCategories]);

  const animateFormSections = () => {
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
            }, 2000);
          }, index * 1000);
        });
      }, delay);
      delay += formCategories[category].length * 1000 + 2000;
    });
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

  const handleRunDS160 = async () => {
    try {
      if (retrieveMode === 'retrieve') {
        if (!applicationId || !surname || !birthYear || !secretQuestion || !secretAnswer) {
          setErrorMessage("Please fill in all retrieve fields");
          return;
        }
        
        // Update application ID format validation - more flexible
        if (!/^[A-Z0-9]{10}$/.test(applicationId)) {
          setErrorMessage("Application ID must be 10 characters (letters and numbers)");
          return;
        }

        // Validate birth year
        const currentYear = new Date().getFullYear();
        if (parseInt(birthYear) > currentYear || parseInt(birthYear) < 1900) {
          setErrorMessage("Please enter a valid birth year");
          return;
        }
      }
      
      const yamlData = {
        start_page: {
          button_clicks: retrieveMode === 'retrieve' ? [1] : [0]
        },
        retrieve_page: retrieveMode === 'retrieve' ? {
          application_id: applicationId,
          surname: surname,
          year: birthYear,
          security_question: secretQuestion,
          security_answer: secretAnswer
        } : undefined
      };

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
          start_page: {
            ...startPage,
            button_clicks: retrieveMode === 'retrieve' ? [1] : [0]
          },
          retrieve_page: retrieveMode === 'retrieve' ? {
            application_id: applicationId,
            surname: surname,
            year: birthYear,
            security_question: secretQuestion,
            security_answer: secretAnswer,
            button_clicks: [0, 1]
          } : undefined,
          ...(securityPage && { security_page: securityPage }),
          ...formYamlData  // Add all the form data
        }

        // Create YAML string
        const yamlStr = yaml.dump(finalYamlData, {
          lineWidth: -1,
          quotingType: '"',
          forceQuotes: true,
        })
          
        // Send to backend using the API utility
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
      button_clicks: retrieveMode === 'retrieve' ? [1] : [0]
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
      ...formYamlData // Add all the form data
    }

    debugLog('all_pages', '[Mapping Creation] Processing YAML data');
    let yamlStr = yaml.dump(finalYamlData, {
      lineWidth: -1,
      quotingType: '"',
      forceQuotes: true,
      indent: 2,
      flowLevel: -1, // Force block style
      noArrayIndent: false, // Allow array indentation
      noCompatMode: true, // Use new style
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
          <div className="mb-6 flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold">Upload DS160 to fill form</h2>
            <label
              htmlFor="dropzone-file"
              className={`flex items-center justify-center h-12 w-96 border-2 border-gray-300 border-dashed rounded-lg ${
                isProcessing || isProcessingLLM ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-100'
              } bg-gray-50 relative ml-4`}
              onDrop={(e) => {
                if (isProcessing || isProcessingLLM) return;
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handleFileUpload(file);
              }}
              onDragOver={(e) => {
                if (isProcessing || isProcessingLLM) return;
                e.preventDefault();
              }}
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

          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
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
              <LinkedInImport />
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

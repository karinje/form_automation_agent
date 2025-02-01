"use client"

import { useState, useCallback, useEffect } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import DynamicForm from "@/components/DynamicForm"
import { flattenYamlData, unflattenFormData } from '@/utils/yaml-helpers'
import { getFormFieldId, getYamlField, formMappings } from '@/utils/mappings'
import yaml from 'js-yaml'
import { generatePrompt } from '@/prompts/pdf_to_yaml'
import { callOpenAI } from '@/utils/openai'

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
import p7_passport_definition from "../form_definitions/p7_pptvisa_definition.json"
import p8_ucontact_definition from "../form_definitions/p8_uscontact_definition.json"
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

  const formCategories = {
    personal: [
      { title: "Personal Information 1", definition: p1_personal1_definition },
      { title: "Personal Information 2", definition: p2_personal2_definition },
      { title: "Address & Phone", definition: p6_addressphone_definition },
      { title: "Passport", definition: p7_passport_definition },
      { title: "Relatives", definition: p9_relatives_definition },
      { title: "Spouse Information", definition: p18_spouse_definition },
    ],
    travel: [
      { title: "Travel Information", definition: p3_travelinfo_definition },
      { title: "Travel Companions", definition: p4_travelcompanions_definition },
      { title: "Previous Travel", definition: p5_previoustravel_definition },
      { title: "U.S. Contact", definition: p8_ucontact_definition },
    ],
    education: [
      { title: "Work/Education 1", definition: p10_workeducation1_definition },
      { title: "Work/Education 2", definition: p11_workeducation2_definition },
      { title: "Work/Education 3", definition: p12_workeducation3_definition },
    ],
    security: [
      { title: "Security and Background 1", definition: p13_securityandbackground1_definition },
      { title: "Security and Background 2", definition: p14_securityandbackground2_definition },
      { title: "Security and Background 3", definition: p15_securityandbackground3_definition },
      { title: "Security and Background 4", definition: p16_securityandbackground4_definition },
      { title: "Security and Background 5", definition: p17_securityandbackground5_definition },
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

  const handleFormDataLoad = useCallback((uploadedYamlData: Record<string, any>) => {
    console.log('Loading complete YAML data:', uploadedYamlData)
    setYamlData(uploadedYamlData)
    
    // Process all pages
    const allFormFields: Record<string, string> = {}
    Object.entries(uploadedYamlData).forEach(([pageName, pageData]) => {
      console.log('Processing page:', pageName, pageData)
      const flattenedData = flattenYamlData(pageData)
      console.log('Flattened data for page:', pageName, flattenedData)
      
      Object.entries(flattenedData).forEach(([yamlField, value]) => {
        const formFieldId = getFormFieldId(pageName, yamlField)
        if (formFieldId) {
          console.log('Mapping field:', { pageName, yamlField, formFieldId, value })
          allFormFields[formFieldId] = value
        }
      })
    })
    
    console.log('Setting form data:', allFormFields)
    setFormData(allFormFields)
    setRefreshKey(prev => prev + 1)
    
    // Cycle through every tab and simulate expand/collapse for every page within each tab.
    const categories = Object.keys(formCategories)
    let delay = 0;
    categories.forEach((category) => {
      setTimeout(() => {
        setCurrentTab(category); // Switch tab
        const forms = formCategories[category];
        forms.forEach((_, index) => {
          setTimeout(() => {
            // Expand
            setAccordionValues(prev => ({ ...prev, [category]: `item-${index}` }));
            setTimeout(() => {
              // Collapse
              setAccordionValues(prev => ({ ...prev, [category]: "" }));
            }, 100);
          }, index * 200);
        });
      }, delay);
      delay += formCategories[category].length * 200 + 500;
    });
  }, [])

  const handleDownloadYaml = useCallback(() => {
    const updatedYamlData = { ...yamlData }
    
    // Use the actual page mappings from mappings.ts
    Object.keys(formMappings).forEach(pageName => {
      const pageFormData: Record<string, string> = {}
      const pageMapping = formMappings[pageName]
      
      // Find all form fields that belong to this page
      Object.entries(formData).forEach(([formFieldId, value]) => {
        const yamlField = getYamlField(pageName, formFieldId)
        if (yamlField) {
          console.log('Found YAML mapping:', {
            page: pageName,
            formField: formFieldId,
            yamlField,
            value
          })
          pageFormData[yamlField] = value
        }
      })
      
      if (Object.keys(pageFormData).length > 0) {
        console.log('Adding page data to YAML:', {
          page: pageName,
          data: pageFormData
        })
        updatedYamlData[pageName] = unflattenFormData(pageFormData)
      }
    })
    
    console.log('Final YAML data:', updatedYamlData)
    const yamlStr = yaml.dump(updatedYamlData)
    const blob = new Blob([yamlStr], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'form_data.yaml'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [formData, yamlData])

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
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
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
            <div className="mt-6">
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
                {renderFormSection(formCategories.security, 'security')}
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <div className="mt-8 flex justify-end space-x-4">
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

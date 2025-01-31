"use client"

import { useState, useCallback, useEffect } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import DynamicForm from "@/components/DynamicForm"
import { flattenYamlData, unflattenFormData } from '@/utils/yaml-helpers'
import { getFormFieldId, getYamlField, formMappings } from '@/utils/mappings'
import yaml from 'js-yaml'

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

export default function Home() {
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [yamlData, setYamlData] = useState<Record<string, any>>({})
  const [completionStatus, setCompletionStatus] = useState<Record<string, { completed: number; total: number }>>({})

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

  // Calculate completion for a single form
  const calculateFormCompletion = useCallback((formDefinition: any, currentFormData: Record<string, string>) => {
    const totalFields = formDefinition.fields.length
    const completedFields = formDefinition.fields.reduce((count: number, field: any) => {
      return currentFormData[field.name] ? count + 1 : count
    }, 0)
    return { completed: completedFields, total: totalFields }
  }, [])

  // Update completion status whenever form data changes
  useEffect(() => {
    const newCompletionStatus: Record<string, { completed: number; total: number }> = {}
    
    // Calculate for each form
    Object.entries(formCategories).forEach(([category, forms]) => {
      let categoryCompleted = 0
      let categoryTotal = 0
      
      forms.forEach((form, index) => {
        const formStatus = calculateFormCompletion(form.definition, formData)
        const formId = `${category}-${index}`
        newCompletionStatus[formId] = formStatus
        categoryCompleted += formStatus.completed
        categoryTotal += formStatus.total
      })
      
      // Store category totals
      newCompletionStatus[category] = {
        completed: categoryCompleted,
        total: categoryTotal
      }
    })
    
    setCompletionStatus(newCompletionStatus)
  }, [formData, calculateFormCompletion])

  const renderFormSection = (forms: typeof formCategories.personal, category: string) => (
    <Accordion type="single" collapsible className="space-y-4">
      {forms.map((form, index) => {
        const formId = `${category}-${index}`
        const isComplete = completionStatus[formId]?.completed === completionStatus[formId]?.total && 
                          completionStatus[formId]?.total > 0
        
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
                      {completionStatus[formId]?.completed || 0}/
                      {completionStatus[formId]?.total || 0} completed
                    </span>
                    {isComplete ? (
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-4">
              <DynamicForm
                formDefinition={form.definition}
                formData={formData}
                onInputChange={handleInputChange}
              />
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">
            DS-160 Form
          </h1>
          <p className="mt-2 text-base text-gray-500">
            Please fill out all sections below
          </p>
        </div>
        
        <div className="bg-white shadow-lg rounded-lg p-8">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-20">
              {Object.entries(formCategories).map(([category, forms]) => {
                const categoryStatus = completionStatus[category];
                const isComplete = categoryStatus?.completed === categoryStatus?.total && categoryStatus?.total > 0;
                
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
                        {categoryStatus?.completed || 0}/
                        {categoryStatus?.total || 0} completed
                      </span>
                      {categoryStatus?.total > 0 && (
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
                );
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
    </div>
  )
}

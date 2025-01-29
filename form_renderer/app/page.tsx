"use client"

import { useState } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import DynamicForm from "@/components/DynamicForm"

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

  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const renderFormSection = (forms: typeof formCategories.personal) => (
    <Accordion type="single" collapsible className="w-full">
      {forms.map((form, index) => (
        <AccordionItem key={index} value={`item-${index}`}>
          <AccordionTrigger className="text-base font-medium text-gray-600">
            {form.title}
          </AccordionTrigger>
          <AccordionContent>
            <DynamicForm
              formDefinition={form.definition}
              formData={formData}
              onInputChange={handleInputChange}
            />
          </AccordionContent>
        </AccordionItem>
      ))}
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
            <TabsList className="grid w-full grid-cols-4 mb-6 h-16">
              <TabsTrigger 
                value="personal" 
                className="text-lg font-bold text-gray-900 data-[state=active]:text-black data-[state=active]:font-extrabold"
              >
                Personal & Passport
              </TabsTrigger>
              <TabsTrigger 
                value="travel" 
                className="text-lg font-bold text-gray-900 data-[state=active]:text-black data-[state=active]:font-extrabold"
              >
                Travel Info
              </TabsTrigger>
              <TabsTrigger 
                value="education" 
                className="text-lg font-bold text-gray-900 data-[state=active]:text-black data-[state=active]:font-extrabold"
              >
                Work/Education
              </TabsTrigger>
              <TabsTrigger 
                value="security" 
                className="text-lg font-bold text-gray-900 data-[state=active]:text-black data-[state=active]:font-extrabold"
              >
                Security
              </TabsTrigger>
            </TabsList>
            <div className="mt-6">
              <TabsContent value="personal">
                {renderFormSection(formCategories.personal)}
              </TabsContent>
              <TabsContent value="travel">
                {renderFormSection(formCategories.travel)}
              </TabsContent>
              <TabsContent value="education">
                {renderFormSection(formCategories.education)}
              </TabsContent>
              <TabsContent value="security">
                {renderFormSection(formCategories.security)}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

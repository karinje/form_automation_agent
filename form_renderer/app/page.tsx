"use client"

import { useState } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
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

  const formDefinitions = [
    { title: "Personal Information 1", definition: p1_personal1_definition },
    { title: "Personal Information 2", definition: p2_personal2_definition },
    { title: "Travel Information", definition: p3_travelinfo_definition },
    { title: "Travel Companions", definition: p4_travelcompanions_definition },
    { title: "Previous Travel", definition: p5_previoustravel_definition },
    { title: "Address & Phone", definition: p6_addressphone_definition },
    { title: "Passport", definition: p7_passport_definition },
    { title: "U.S. Contact", definition: p8_ucontact_definition },
    { title: "Relatives", definition: p9_relatives_definition },
    { title: "Work/Education 1", definition: p10_workeducation1_definition },
    { title: "Work/Education 2", definition: p11_workeducation2_definition },
    { title: "Work/Education 3", definition: p12_workeducation3_definition },
    { title: "Security and Background 1", definition: p13_securityandbackground1_definition },
    { title: "Security and Background 2", definition: p14_securityandbackground2_definition },
    { title: "Security and Background 3", definition: p15_securityandbackground3_definition },
    { title: "Security and Background 4", definition: p16_securityandbackground4_definition },
    { title: "Security and Background 5", definition: p17_securityandbackground5_definition },
    { title: "Spouse Information", definition: p18_spouse_definition },
  ].sort((a, b) => a.title.localeCompare(b.title))

  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">DS-160 Form</h1>
          <p className="mt-3 text-xl text-gray-500 sm:mt-4">Please fill out all sections below</p>
        </div>
        <div className="bg-white shadow-lg rounded-lg p-8">
          <Accordion type="single" collapsible className="w-full">
            {formDefinitions.map((form, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-lg font-semibold">{form.title}</AccordionTrigger>
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
        </div>
      </div>
    </div>
  )
}

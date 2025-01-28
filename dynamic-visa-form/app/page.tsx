"use client"

import { useState, useEffect } from "react"
import formDefinition from "./form-definition.json"
import CollapsibleFormSection from "./components/CollapsibleFormSection"
import FileUpload from "./components/FileUpload"

export default function Home() {
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [completionStatus, setCompletionStatus] = useState<Record<string, { completed: number; total: number }>>({})

  // For this example, we'll create two identical pages
  const pages = [
    { title: "Personal Information", formDefinition },
    { title: "Additional Information", formDefinition },
  ]

  const handleInputChange = (name: string, value: string) => {
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }))
  }

  useEffect(() => {
    // Set initial form data to make the first page complete
    const initialFormData: Record<string, string> = {}
    pages[0].formDefinition.fields.forEach((field: any) => {
      initialFormData[field.name] = field.type === "dropdown" ? field.value[0] : "Sample Data"
    })
    setFormData(initialFormData)

    // Update completion status
    updateCompletionStatus(initialFormData)
  }, []) // Removed pages dependency

  const updateCompletionStatus = (data: Record<string, string>) => {
    const newStatus: Record<string, { completed: number; total: number }> = {}

    pages.forEach((page, index) => {
      const totalFields = page.formDefinition.fields.length
      const completedFields = page.formDefinition.fields.filter(
        (field: any) => data[field.name] && data[field.name] !== "",
      ).length

      newStatus[`page${index + 1}`] = { completed: completedFields, total: totalFields }
    })

    setCompletionStatus(newStatus)
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Visa Application Form</h1>
          <p className="mt-3 text-xl text-gray-500 sm:mt-4">
            Please fill out the form below to submit your visa application.
          </p>
        </div>
        <div className="bg-white shadow-lg rounded-lg p-8">
          <FileUpload />
          <form className="space-y-6">
            {pages.map((page, index) => (
              <CollapsibleFormSection
                key={index}
                title={page.title}
                formDefinition={page.formDefinition}
                formData={formData}
                onInputChange={handleInputChange}
                completedFields={completionStatus[`page${index + 1}`]?.completed || 0}
                totalFields={completionStatus[`page${index + 1}`]?.total || 0}
                buttons={formDefinition.buttons}
              />
            ))}
          </form>
        </div>
      </div>
    </div>
  )
}


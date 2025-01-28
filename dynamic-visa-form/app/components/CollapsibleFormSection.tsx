import { useState } from "react"
import { ChevronDown, ChevronUp, Check, X } from "lucide-react"
import DynamicForm from "./DynamicForm"

interface CollapsibleFormSectionProps {
  title: string
  formDefinition: any
  formData: any
  onInputChange: (name: string, value: string) => void
  completedFields: number
  totalFields: number
  buttons: any[]
}

export default function CollapsibleFormSection({
  title,
  formDefinition,
  formData,
  onInputChange,
  completedFields,
  totalFields,
  buttons,
}: CollapsibleFormSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isComplete = completedFields === totalFields

  return (
    <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
      <div
        className="flex justify-between items-center p-4 bg-gray-50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex items-center">
          <span className="mr-2 text-sm text-gray-600">
            {completedFields}/{totalFields} completed
          </span>
          {isComplete ? <Check className="w-5 h-5 text-green-500" /> : <X className="w-5 h-5 text-red-500" />}
          <span className="ml-4">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </span>
        </div>
      </div>
      {isExpanded && (
        <div className="p-4">
          <DynamicForm formDefinition={formDefinition} formData={formData} onInputChange={onInputChange} />
          <div className="flex justify-end space-x-4 mt-6">
            {buttons.map((button: any) => (
              <button
                key={button.id}
                type={button.type as "button" | "submit" | "reset"}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {button.value}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


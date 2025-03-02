"use client"

import { useState, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Accordion, AccordionContent, AccordionItem } from "@/components/ui/accordion"
import { ChevronDown, Upload } from "lucide-react"

interface DocumentUploadProps {
  onExtractData?: (data: any) => void
}

export function DocumentUpload({ onExtractData }: DocumentUploadProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [licenseFile, setLicenseFile] = useState<File | null>(null)
  const [visaFile, setVisaFile] = useState<File | null>(null)
  const [i797File, setI797File] = useState<File | null>(null)
  const [isDraggingLicense, setIsDraggingLicense] = useState(false)
  const [isDraggingVisa, setIsDraggingVisa] = useState(false)
  const [isDraggingI797, setIsDraggingI797] = useState(false)

  // Custom toggle handler to manage expand/collapse
  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleExtractData = async () => {
    if (!licenseFile && !visaFile && !i797File) {
      console.error('At least one document is required')
      return
    }

    try {
      setIsLoading(true)
      
      // Here you would implement the actual extraction logic
      // For example, send files to an API endpoint
      console.log('Extracting data from files:', {
        license: licenseFile?.name,
        visa: visaFile?.name,
        i797: i797File?.name
      })
      
      // Mock response for now
      const mockData = {
        success: true,
        message: 'Data extracted successfully',
        // Additional extracted data would go here
      }
      
      if (onExtractData) {
        onExtractData(mockData)
      }
      
    } catch (error) {
      console.error('Error extracting data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // File upload handlers
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: React.Dispatch<React.SetStateAction<File | null>>
  ) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setFile(files[0])
    }
  }

  // Drag and drop handlers
  const handleDragEnter = (
    e: React.DragEvent<HTMLDivElement>,
    setIsDragging: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (
    e: React.DragEvent<HTMLDivElement>,
    setIsDragging: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    setFile: React.Dispatch<React.SetStateAction<File | null>>,
    setIsDragging: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0])
      e.dataTransfer.clearData()
    }
  }

  const FileUploadZone = useCallback(({
    id,
    label, 
    file, 
    setFile,
    isDragging,
    setIsDragging
  }: {
    id: string,
    label: string, 
    file: File | null, 
    setFile: React.Dispatch<React.SetStateAction<File | null>>,
    isDragging: boolean,
    setIsDragging: React.Dispatch<React.SetStateAction<boolean>>
  }) => (
    <div className="flex items-center justify-between">
      <Label className="text-base font-medium">{label}</Label>
      <div className="w-[400px]">
        <div 
          className={`flex items-center justify-center h-12 border-2 border-dashed rounded-lg px-4 cursor-pointer transition-colors
            ${isDragging ? 'border-blue-500 bg-blue-50' : file ? 'border-blue-500' : 'border-blue-300'} hover:bg-blue-50`}
          onDragEnter={(e) => handleDragEnter(e, setIsDragging)}
          onDragLeave={(e) => handleDragLeave(e, setIsDragging)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, setFile, setIsDragging)}
          onClick={() => document.getElementById(id)?.click()}
        >
          {file ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 text-gray-700">
                <svg className="w-5 h-5 flex-shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium truncate">{file.name}</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation()
                  setFile(null)
                }}
                className="text-gray-500 hover:text-red-500 p-1 h-auto flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-gray-500">
              <Upload className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <span className="text-sm font-medium whitespace-nowrap">Click to upload or drag and drop</span>
            </div>
          )}
          <input
            id={id}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => handleFileChange(e, setFile)}
          />
        </div>
      </div>
    </div>
  ), []);

  return (
    <div className="mb-6">
      <Accordion 
        type="single" 
        collapsible 
        value={isExpanded ? "item-0" : ""} 
        onValueChange={(val) => setIsExpanded(val === "item-0")}
        className="border border-gray-200 rounded-lg overflow-hidden shadow-sm"
      >
        <AccordionItem value="item-0" className="border-0">
          <div className="flex items-center justify-between bg-gray-50 px-6 py-4">
            {/* Custom header */}
            <div 
              className="flex-1 flex items-center cursor-pointer"
              onClick={handleToggle}
            >
              <h3 className="text-lg font-semibold text-gray-900 leading-none">
                Upload applicable documents to fill form
              </h3>
            </div>
            
            {/* Extract Data button */}
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                handleExtractData();
              }}
              disabled={isLoading || (!licenseFile && !visaFile && !i797File)}
              className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap px-6 py-2 text-base"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : 'Extract Data & Fill Form'}
            </Button>
            
            {/* Chevron for expand/collapse */}
            <div 
              className="ml-6 cursor-pointer"
              onClick={handleToggle}
            >
              <ChevronDown 
                className={`h-8 w-8 shrink-0 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              />
            </div>
          </div>
          <AccordionContent className="p-6 bg-white border-t border-gray-200">
            <div className="space-y-4">
              {/* US License Upload */}
              <FileUploadZone
                id="license-upload"
                label="Upload US License:"
                file={licenseFile}
                setFile={setLicenseFile}
                isDragging={isDraggingLicense}
                setIsDragging={setIsDraggingLicense}
              />
              
              {/* Previous US Visa Upload */}
              <FileUploadZone
                id="visa-upload"
                label="Upload Previous US Visa:"
                file={visaFile}
                setFile={setVisaFile}
                isDragging={isDraggingVisa}
                setIsDragging={setIsDraggingVisa}
              />
              
              {/* I797 Upload */}
              <FileUploadZone
                id="i797-upload"
                label="Upload I797 for current visa:"
                file={i797File}
                setFile={setI797File}
                isDragging={isDraggingI797}
                setIsDragging={setIsDraggingI797}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
} 
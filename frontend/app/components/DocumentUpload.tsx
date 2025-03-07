"use client"

import { useState, useCallback, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Accordion, AccordionContent, AccordionItem } from "@/components/ui/accordion"
import { ChevronDown, Upload, CheckCircle2, Users, XCircle } from "lucide-react"
import { processDocuments } from '../utils/api'
import { countFieldsByPage } from '../utils/field-counter'
import { StopwatchTimer } from './StopwatchTimer'

interface DocumentUploadProps {
  onExtractData?: (data: any) => void
  formData: Record<string, string> // Add formData prop to check address country
}

export function DocumentUpload({ onExtractData, formData }: DocumentUploadProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  
  // File state - REMOVED i797File
  const [licenseFile, setLicenseFile] = useState<File | null>(null)
  const [visaFile, setVisaFile] = useState<File | null>(null)
  const [travelTicketFile, setTravelTicketFile] = useState<File | null>(null)
  
  // Address selection state
  const [selectedAddress, setSelectedAddress] = useState<'home' | 'mailing' | null>(null)
  
  // Travel companions selection state
  const [selectedCompanions, setSelectedCompanions] = useState<string[]>([])
  
  // Add state for "None" selection
  const [noCompanions, setNoCompanions] = useState(false)
  
  // Drag state - REMOVED isDraggingI797
  const [isDraggingLicense, setIsDraggingLicense] = useState(false)
  const [isDraggingVisa, setIsDraggingVisa] = useState(false)
  const [isDraggingTravelTicket, setIsDraggingTravelTicket] = useState(false)
  
  // We'll keep these state variables but won't show the buttons
  // REMOVED isI797NA
  const [isLicenseNA, setIsLicenseNA] = useState(false)
  const [isVisaNA, setIsVisaNA] = useState(false)
  const [isTravelTicketNA, setIsTravelTicketNA] = useState(false)
  
  // Check if addresses are in the US
  const homeAddressInUS = formData['ctl00_SiteContentPlaceHolder_FormView1_ddlCountry'] === 'UNITED STATES OF AMERICA'
  const mailingAddressSameAsHome = formData['ctl00_SiteContentPlaceHolder_FormView1_rblMailingAddrSame'] === 'Y'
  const mailingAddressInUS = mailingAddressSameAsHome 
    ? homeAddressInUS 
    : formData['ctl00_SiteContentPlaceHolder_FormView1_ddlMailCountry'] === 'UNITED STATES OF AMERICA'
  
  const showAddressSelection = homeAddressInUS || mailingAddressInUS
  
  // Check for relatives info
  const hasFather = formData['ctl00_SiteContentPlaceHolder_FormView1_tbxFATHER_SURNAME'] || ''
  const hasMother = formData['ctl00_SiteContentPlaceHolder_FormView1_tbxMOTHER_SURNAME'] || ''
  
  // Get other immediate relatives from formData
  const getImmediateRelatives = () => {
    const relatives: {id: string, name: string, relation: string}[] = []
    
    // Only add father if surname exists
    if (hasFather) {
      const fatherGivenName = formData['ctl00_SiteContentPlaceHolder_FormView1_tbxFATHER_GIVEN_NAME'] || ''
      const fatherSurname = formData['ctl00_SiteContentPlaceHolder_FormView1_tbxFATHER_SURNAME'] || ''
      if (fatherGivenName || fatherSurname) {
        relatives.push({
          id: 'father',
          name: `${fatherGivenName} ${fatherSurname}`.trim(),
          relation: 'Father'
        })
      }
    }
    
    // Only add mother if surname exists
    if (hasMother) {
      const motherGivenName = formData['ctl00_SiteContentPlaceHolder_FormView1_tbxMOTHER_GIVEN_NAME'] || ''
      const motherSurname = formData['ctl00_SiteContentPlaceHolder_FormView1_tbxMOTHER_SURNAME'] || ''
      if (motherGivenName || motherSurname) {
        relatives.push({
          id: 'mother',
          name: `${motherGivenName} ${motherSurname}`.trim(),
          relation: 'Mother'
        })
      }
    }
    
    // Check for spouse from spouse page
    const spouseGivenName = formData['ctl00_SiteContentPlaceHolder_FormView1_tbxSPOUSE_GIVEN_NAME'] || ''
    const spouseSurname = formData['ctl00_SiteContentPlaceHolder_FormView1_tbxSPOUSE_SURNAME'] || ''
    if (spouseGivenName || spouseSurname) {
      relatives.push({
        id: 'spouse',
        name: `${spouseGivenName} ${spouseSurname}`.trim(),
        relation: 'Spouse'
      })
    }
    
    // Check for immediate relatives
    const hasImmediateRelatives = formData['ctl00_SiteContentPlaceHolder_FormView1_rblUS_IMMED_RELATIVE_IND'] === 'Y'
    
    if (hasImmediateRelatives) {
      // Find all immediate relatives in the formData
      // The pattern for immediate relatives fields is:
      // ctl00_SiteContentPlaceHolder_FormView1_dlUSRelatives_ctl{INDEX}_tbxUS_REL_SURNAME
      // ctl00_SiteContentPlaceHolder_FormView1_dlUSRelatives_ctl{INDEX}_tbxUS_REL_GIVEN_NAME
      // ctl00_SiteContentPlaceHolder_FormView1_dlUSRelatives_ctl{INDEX}_ddlUS_REL_TYPE
      
      // Start with index 00
      let index = 0
      let indexStr = index.toString().padStart(2, '0')
      
      // Check if first immediate relative exists
      let relativeSurname = formData[`ctl00_SiteContentPlaceHolder_FormView1_dlUSRelatives_ctl${indexStr}_tbxUS_REL_SURNAME`]
      let relativeGivenName = formData[`ctl00_SiteContentPlaceHolder_FormView1_dlUSRelatives_ctl${indexStr}_tbxUS_REL_GIVEN_NAME`]
      let relativeType = formData[`ctl00_SiteContentPlaceHolder_FormView1_dlUSRelatives_ctl${indexStr}_ddlUS_REL_TYPE`]
      
      // Loop through all immediate relatives
      while (relativeSurname || relativeGivenName) {
        if (relativeSurname || relativeGivenName) {
          // Use the relationship type if available, otherwise use a generic name
          const relation = relativeType || 'Relative'
          
          relatives.push({
            id: `immediate_relative_${index}`,
            name: `${relativeGivenName || ''} ${relativeSurname || ''}`.trim(),
            relation: relation
          })
        }
        
        // Move to the next index
        index++
        indexStr = index.toString().padStart(2, '0')
        
        // Check if next immediate relative exists
        relativeSurname = formData[`ctl00_SiteContentPlaceHolder_FormView1_dlUSRelatives_ctl${indexStr}_tbxUS_REL_SURNAME`]
        relativeGivenName = formData[`ctl00_SiteContentPlaceHolder_FormView1_dlUSRelatives_ctl${indexStr}_tbxUS_REL_GIVEN_NAME`]
        relativeType = formData[`ctl00_SiteContentPlaceHolder_FormView1_dlUSRelatives_ctl${indexStr}_ddlUS_REL_TYPE`]
      }
    }
    
    return relatives
  }
  
  const immediateRelatives = getImmediateRelatives()
  const showCompanionsSelection = true // Always show companions section so "None" is always available

  // Custom toggle handler to manage expand/collapse
  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };
  
  const handleAddressSelect = (addressType: 'home' | 'mailing') => {
    setSelectedAddress(addressType === selectedAddress ? null : addressType);
  };
  
  // Modified to handle "None" selection
  const handleCompanionToggle = (companionId: string) => {
    if (noCompanions) {
      // If "None" was previously selected, deselect it and select the new companion
      setNoCompanions(false);
      setSelectedCompanions([companionId]);
    } else {
      setSelectedCompanions(prev => {
        if (prev.includes(companionId)) {
          return prev.filter(id => id !== companionId);
        } else {
          return [...prev, companionId];
        }
      });
    }
  };
  
  // Handler for the "None" button
  const handleNoneSelection = () => {
    if (noCompanions) {
      // If "None" is already selected, deselect it
      setNoCompanions(false);
    } else {
      // Select "None" and clear all other companions
      setNoCompanions(true);
      setSelectedCompanions([]);
    }
  };

  // Add state for progress at the top of the DocumentUpload component
  const [extractionProgress, setExtractionProgress] = useState<string[]>([])
  const [extractionStatus, setExtractionStatus] = useState<'idle' | 'extracting' | 'filling' | 'complete'>('idle')
  const [fieldCounts, setFieldCounts] = useState<Record<string, number>>({})

  // Add a new state for tracking form fill completion
  const [processingComplete, setProcessingComplete] = useState(false);

  // Update the handleExtractData function
  const handleExtractData = async () => {
    try {
      setIsLoading(true)
      setExtractionStatus('extracting')
      setExtractionProgress(['Extracting data from uploaded documents...'])
      
      // Prepare files object for upload
      const files: any = {}
      if (licenseFile) files.license = licenseFile
      if (visaFile) files.visa = visaFile
      if (travelTicketFile) files.travelTicket = travelTicketFile
      
      // Prepare metadata with YAML-friendly structures
      const metadata: any = {
        yamlData: {} // This will hold our YAML-ready data
      }
      
      // If home address is selected, format data for YAML
      if (selectedAddress === 'home') {
        metadata.yamlData.us_contact_page = {
          contact_type: "HOME_ADDRESS",
          address: {
            street1: formData['ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_ADDR_LN1'] || '',
            street2: formData['ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_ADDR_LN2'] || '',
            city: formData['ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_ADDR_CITY'] || '',
            state: formData['ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_ADDR_STATE'] || '',
            postal_code: formData['ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_ADDR_POSTAL_CD'] || '',
            country: formData['ctl00_SiteContentPlaceHolder_FormView1_ddlCountry'] || ''
          }
        }
      } 
      // If mailing address is selected
      else if (selectedAddress === 'mailing') {
        metadata.yamlData.us_contact_page = {
          contact_type: "MAILING_ADDRESS",
          address: {
            street1: formData['ctl00_SiteContentPlaceHolder_FormView1_tbxMAILING_ADDR_LN1'] || '',
            street2: formData['ctl00_SiteContentPlaceHolder_FormView1_tbxMAILING_ADDR_LN2'] || '',
            city: formData['ctl00_SiteContentPlaceHolder_FormView1_tbxMAILING_ADDR_CITY'] || '',
            state: formData['ctl00_SiteContentPlaceHolder_FormView1_tbxMAILING_ADDR_STATE'] || '',
            postal_code: formData['ctl00_SiteContentPlaceHolder_FormView1_tbxMAILING_ADDR_POSTAL_CD'] || '',
            country: formData['ctl00_SiteContentPlaceHolder_FormView1_ddlMailCountry'] || ''
          }
        }
      }
      
      // Modified for companions handling with "None" option
      if (noCompanions) {
        metadata.yamlData.travel_companions_page = {
          traveling_with_others: "N",
          travel_companions: [{ note: "None Chosen" }]
        }
      } else if (selectedCompanions.length > 0) {
        metadata.yamlData.travel_companions_page = {
          traveling_with_others: "Y",
          travel_companions: selectedCompanions.map(id => {
            const relative = immediateRelatives.find(r => r.id === id);
            if (!relative) return null;
            
            // Format based on relative type
            if (relative.id === 'father') {
              return {
                type: "FATHER",
                surname: formData['ctl00_SiteContentPlaceHolder_FormView1_tbxFATHER_SURNAME'] || '',
                given_name: formData['ctl00_SiteContentPlaceHolder_FormView1_tbxFATHER_GIVEN_NAME'] || '',
                relationship: "PARENT"
              };
            } 
            else if (relative.id === 'mother') {
              return {
                type: "MOTHER",
                surname: formData['ctl00_SiteContentPlaceHolder_FormView1_tbxMOTHER_SURNAME'] || '',
                given_name: formData['ctl00_SiteContentPlaceHolder_FormView1_tbxMOTHER_GIVEN_NAME'] || '',
                relationship: "PARENT"
              };
            }
            else if (relative.id === 'spouse') {
              return {
                type: "SPOUSE",
                surname: formData['ctl00_SiteContentPlaceHolder_FormView1_tbxSPOUSE_SURNAME'] || '',
                given_name: formData['ctl00_SiteContentPlaceHolder_FormView1_tbxSPOUSE_GIVEN_NAME'] || '',
                relationship: "SPOUSE"
              };
            }
            // For immediate relatives
            else if (relative.id.startsWith('immediate_relative_')) {
              const index = relative.id.split('_').pop();
              const indexStr = index?.padStart(2, '0');
              const relType = formData[`ctl00_SiteContentPlaceHolder_FormView1_dlUSRelatives_ctl${indexStr}_ddlUS_REL_TYPE`] || '';
              
              return {
                type: relType,
                surname: formData[`ctl00_SiteContentPlaceHolder_FormView1_dlUSRelatives_ctl${indexStr}_tbxUS_REL_SURNAME`] || '',
                given_name: formData[`ctl00_SiteContentPlaceHolder_FormView1_dlUSRelatives_ctl${indexStr}_tbxUS_REL_GIVEN_NAME`] || '',
                relationship: relType === "SPOUSE" ? "SPOUSE" : 
                              relType === "CHILD" ? "CHILD" : 
                              relType === "SIBLING" ? "OTHER RELATIVE" : "OTHER RELATIVE"
              };
            }
            
            return null;
          }).filter(Boolean)
        }
      }
      
      // Call the API
      const response = await processDocuments(files, metadata)
      
      // Update extraction progress with field counts
      if (response.status === 'success') {
        setExtractionStatus('complete')
        setExtractionProgress(prev => [...prev, 'Data extraction complete'])
        
        // Use the shared utility function
        const counts = countFieldsByPage(response.data);
        setFieldCounts(counts)
        
        // Add field counts to progress messages
        const countMessages = Object.entries(counts).map(([page, count]) => {
          const readablePage = page.replace('_page', '').replace(/_/g, ' ')
          return `${readablePage}: ${count} fields`
        })
        
        setExtractionProgress(prev => [...prev, ...countMessages])
        
        // If we're going to fill form, update status
        if (onExtractData) {
          setExtractionStatus('filling')
          setExtractionProgress(prev => [...prev, 'Filling form with extracted data...'])
          
          // Small delay before filling to show the message
          setTimeout(() => {
            onExtractData(response.data)
            setExtractionStatus('complete')
            setProcessingComplete(true)
          }, 1000)
        }
      }
    } catch (error) {
      console.error('Error extracting data:', error)
      setExtractionProgress(prev => [...prev, `Error: ${error.message || 'Unknown error'}`])
      setExtractionStatus('idle')
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
    setIsDragging: React.Dispatch<React.SetStateAction<boolean>>,
    isDisabled: boolean
  ) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    if (!isDisabled && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
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
    setIsDragging,
    isNA,
    setIsNA
  }: {
    id: string,
    label: string, 
    file: File | null, 
    setFile: React.Dispatch<React.SetStateAction<File | null>>,
    isDragging: boolean,
    setIsDragging: React.Dispatch<React.SetStateAction<boolean>>,
    isNA: boolean,
    setIsNA: React.Dispatch<React.SetStateAction<boolean>>
  }) => {
    const isDisabled = isNA;
    
    return (
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium flex-shrink-0 min-w-[230px]">{label}</Label>
        <div className="flex-1 flex justify-end">
          <div className="w-[400px]">
            <div 
              className={`flex items-center justify-center h-12 border-2 border-dashed rounded-lg px-4 cursor-pointer transition-colors
                ${isDisabled ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-60' : 
                isDragging ? 'border-blue-500 bg-blue-50' : 
                file ? 'border-blue-500' : 'border-blue-300'} 
                ${!isDisabled && 'hover:bg-blue-50'}`}
              onDragEnter={(e) => !isDisabled && handleDragEnter(e, setIsDragging)}
              onDragLeave={(e) => !isDisabled && handleDragLeave(e, setIsDragging)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, setFile, setIsDragging, isDisabled)}
              onClick={() => !isDisabled && document.getElementById(id)?.click()}
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
                    disabled={isDisabled}
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
                disabled={isDisabled}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }, []);

  // Get the first name only
  const getFirstName = (fullName: string) => {
    // Split the name by spaces and get the first part
    const parts = fullName.trim().split(' ')
    return parts[0] || fullName
  }

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
                Upload documents to import data
              </h3>
            </div>
            
            {/* Extract Data button */}
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                handleExtractData();
              }}
              disabled={isLoading || (
                !licenseFile && !visaFile && !travelTicketFile && 
                !selectedAddress && selectedCompanions.length === 0
              )}
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
                isNA={isLicenseNA}
                setIsNA={setIsLicenseNA}
              />
              
              {/* Previous US Visa Upload */}
              <FileUploadZone
                id="visa-upload"
                label="Upload Previous US Visa:"
                file={visaFile}
                setFile={setVisaFile}
                isDragging={isDraggingVisa}
                setIsDragging={setIsDraggingVisa}
                isNA={isVisaNA}
                setIsNA={setIsVisaNA}
              />
              
              {/* US Travel Ticket Upload */}
              <FileUploadZone
                id="travel-ticket-upload"
                label="Upload US Travel Ticket:"
                file={travelTicketFile}
                setFile={setTravelTicketFile}
                isDragging={isDraggingTravelTicket}
                setIsDragging={setIsDraggingTravelTicket}
                isNA={isTravelTicketNA}
                setIsNA={setIsTravelTicketNA}
              />
              
              {/* US Address Selection - only show if either home or mailing address is in the US */}
              {showAddressSelection && (
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium flex-shrink-0 min-w-[230px]">Address where you'll stay in the US:</Label>
                  <div className="flex-1 flex justify-end">
                    <div className="w-[400px] flex gap-4">
                      {homeAddressInUS && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddressSelect('home')}
                          className={`flex items-center gap-2 ${
                            selectedAddress === 'home' 
                              ? 'border-green-500 bg-green-50 text-green-700' 
                              : 'border-gray-300 text-gray-700'
                          }`}
                        >
                          {selectedAddress === 'home' && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          Home Address
                        </Button>
                      )}
                      {mailingAddressInUS && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddressSelect('mailing')}
                          className={`flex items-center gap-2 ${
                            selectedAddress === 'mailing' 
                              ? 'border-green-500 bg-green-50 text-green-700' 
                              : 'border-gray-300 text-gray-700'
                          }`}
                        >
                          {selectedAddress === 'mailing' && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          Mailing Address
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Travel Companions Selection - ALWAYS show */}
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium flex-shrink-0 min-w-[230px]">Travel companions:</Label>
                <div className="flex-1 flex justify-end">
                  <div className="w-[400px] flex flex-wrap gap-2">
                    {/* Add None button first */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleNoneSelection}
                      className={`flex items-center gap-2 ${
                        noCompanions
                          ? 'border-red-500 bg-red-50 text-red-700' 
                          : 'border-gray-300 text-gray-700'
                      }`}
                      title="No travel companions"
                    >
                      {noCompanions && (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      None
                    </Button>
                    
                    {/* Only show relatives if "None" is not selected */}
                    {!noCompanions && immediateRelatives.map(relative => (
                      <Button
                        key={relative.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCompanionToggle(relative.id)}
                        className={`flex items-center gap-2 ${
                          selectedCompanions.includes(relative.id)
                            ? 'border-green-500 bg-green-50 text-green-700' 
                            : 'border-gray-300 text-gray-700'
                        }`}
                        title={`${relative.name} (${relative.relation})`}
                        disabled={noCompanions}
                      >
                        {selectedCompanions.includes(relative.id) && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                        {getFirstName(relative.name)}
                      </Button>
                    ))}
                    
                    {immediateRelatives.length === 0 && !noCompanions && (
                      <div className="text-gray-500 text-sm italic flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        No family members found in your application
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Then add a progress modal inside the component's return */}
      {extractionStatus !== 'idle' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex flex-col items-center">
              {(extractionStatus !== 'complete' || !processingComplete) && (
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
              )}
              
              <h3 className="text-lg font-semibold mb-4">
                {extractionStatus === 'extracting' ? 'Extracting Document Data' : 
                 extractionStatus === 'filling' && !processingComplete ? 'Filling Form Fields' : 
                 extractionStatus === 'complete' && processingComplete ? 'Document Processing Complete' :
                 'Processing...'}
              </h3>
              
              {/* Add StopwatchTimer component */}
              {extractionStatus !== 'complete' && (
                <StopwatchTimer 
                  isRunning={extractionStatus !== 'idle' && !processingComplete} 
                  estimatedTime="up to 1 minute"
                />
              )}
              
              <div className="w-full space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-3 bg-gray-50">
                {extractionProgress.map((msg, idx) => (
                  <div key={idx} className="text-sm">
                    {msg}
                  </div>
                ))}
              </div>
              
              {/* Only show Done button when extraction is complete AND processing is complete */}
              {extractionStatus === 'complete' && processingComplete && (
                <Button 
                  onClick={() => setExtractionStatus('idle')}
                  className="mt-4"
                >
                  Done
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
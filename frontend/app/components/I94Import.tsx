"use client"

import { useState, useEffect } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { countryList } from '../utils/country-codes'
import { processI94 } from '../utils/api'
import { handleFormDataLoad } from '../utils/form-helpers'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ChevronDown } from "lucide-react"

interface I94ImportProps {
  formData: Record<string, string>
  onDataImported?: (data: any) => void
}

export function I94Import({ formData, onDataImported }: I94ImportProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [givenName, setGivenName] = useState('')
  const [surname, setSurname] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [documentNumber, setDocumentNumber] = useState('')
  const [documentCountry, setDocumentCountry] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  // Initialize form data from personal page and passport info
  useEffect(() => {
    if (formData) {
      // Get name from personal page
      const given = formData['ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_GIVEN_NAME'] || ''
      const sur = formData['ctl00_SiteContentPlaceHolder_FormView1_tbxAPP_SURNAME'] || ''
      setGivenName(given)
      setSurname(sur)
      
      // Format birth date from personal page (YYYY-MM-DD to MM/DD/YYYY)
      const year = formData['ctl00_SiteContentPlaceHolder_FormView1_tbxDOBYear'] || ''
      const month = formData['ctl00_SiteContentPlaceHolder_FormView1_ddlDOBMonth'] || ''
      const day = formData['ctl00_SiteContentPlaceHolder_FormView1_ddlDOBDay'] || ''
      
      console.log('Birth date components:', { year, month, day })
      
      let formattedDate = ''
      let monthNum = ''
      
      if (year && month && day) {
        monthNum = String(new Date(`${month} 1`).getMonth() + 1).padStart(2, '0')
        formattedDate = `${monthNum}/${day.padStart(2, '0')}/${year}`
        setBirthDate(formattedDate)
        console.log('Formatted birth date:', formattedDate)
      }
      
      // Get passport info
      const docNum = formData['ctl00_SiteContentPlaceHolder_FormView1_tbxPPT_NUM'] || ''
      setDocumentNumber(docNum)
      
      // Get country and find closest match from the list
      const ds160Country = formData['ctl00_SiteContentPlaceHolder_FormView1_ddlPPT_ISSUED_CNTRY'] || ''
      const matchingCountry = findClosestCountryMatch(ds160Country)
      setDocumentCountry(matchingCountry)
      
      // Log all relevant form fields for debugging
      console.log('Form Data Debug:', {
        givenName: given,
        surname: sur,
        birthDate: {
          year,
          month,
          day,
          formatted: formattedDate
        },
        documentNumber: docNum,
        originalCountry: ds160Country,
        matchedCountry: matchingCountry
      })
    }
  }, [formData])

  const findClosestCountryMatch = (ds160Country: string): string => {
    if (!ds160Country) return countryList[0]
    
    // Helper function to calculate string similarity score
    const getSimilarityScore = (str1: string, str2: string): number => {
      str1 = str1.toLowerCase()
      str2 = str2.toLowerCase()
      
      // Remove common words and special characters
      const normalize = (s: string) => s
        .replace(/\(.*?\)/g, '')
        .replace(/united states of america/g, 'united states')
        .replace(/the |and |of |republic |democratic /g, '')
        .replace(/[^a-z0-9]/g, '')
        .trim()
      
      const normalized1 = normalize(str1)
      const normalized2 = normalize(str2)
      
      // Calculate character overlap
      let overlap = 0
      for (let i = 0; i < normalized1.length; i++) {
        if (normalized2.includes(normalized1[i])) {
          overlap++
        }
      }
      
      // Score based on character overlap and length difference
      const lengthDiff = Math.abs(normalized1.length - normalized2.length)
      const score = (overlap * 2) - lengthDiff
      
      return score
    }
    
    // Find best matching country
    let bestMatch = countryList[0]
    let bestScore = -1
    
    countryList.forEach(country => {
      const countryName = country.split(' (')[0]  // Remove code in parentheses
      const score = getSimilarityScore(ds160Country, countryName)
      
      if (score > bestScore) {
        bestScore = score
        bestMatch = country
      }
    })
    
    console.log(`Best country match for "${ds160Country}": "${bestMatch}" (score: ${bestScore})`)
    return bestMatch
  }

  const handleImport = async () => {
    if (!givenName || !surname || !birthDate || !documentNumber || !documentCountry) {
      console.error('All fields are required')
      return
    }

    try {
      setIsLoading(true)
      const result = await processI94({
        givenName,
        surname,
        birthDate,
        documentNumber,
        documentCountry
      })
      
      console.log('I94 import result:', result)
      
      if (result.status === 'success' && result.data) {
        if (onDataImported) {
          onDataImported(result.data)
          setIsExpanded(false) // Collapse after successful import
        }
      } else {
        throw new Error(result.message || 'Failed to import I94 data')
      }
      
    } catch (error) {
      console.error('I94 import error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Custom toggle handler to manage expand/collapse
  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

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
            {/* Replace AccordionTrigger with custom header */}
            <div 
              className="flex-1 flex items-center cursor-pointer"
              onClick={handleToggle}
            >
              <h3 className="text-lg font-semibold text-gray-900 leading-none">
                Import previous 5 US visits info from I94 website
              </h3>
            </div>
            
            {/* Import button */}
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                handleImport();
              }}
              disabled={isLoading || !givenName || !surname || !birthDate || !documentNumber || !documentCountry}
              className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap px-6 py-2 text-base"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : 'Import Data & Fill Form'}
            </Button>
            
            {/* Chevron positioned to align with other accordion arrows */}
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
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label className="text-base font-medium mb-2 block">Given Name</Label>
                <Input
                  value={givenName}
                  onChange={(e) => setGivenName(e.target.value)}
                  placeholder="Given Name"
                  className="py-2 text-base"
                />
              </div>
              <div>
                <Label className="text-base font-medium mb-2 block">Surname</Label>
                <Input
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  placeholder="Surname"
                  className="py-2 text-base"
                />
              </div>
              <div>
                <Label className="text-base font-medium mb-2 block">Birth Date (MM/DD/YYYY)</Label>
                <Input
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  placeholder="MM/DD/YYYY"
                  className="py-2 text-base"
                />
              </div>
              <div>
                <Label className="text-base font-medium mb-2 block">Document Number</Label>
                <Input
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="Document Number"
                  className="py-2 text-base"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-base font-medium mb-2 block">Document Country of Issuance</Label>
                <Select value={documentCountry} onValueChange={setDocumentCountry}>
                  <SelectTrigger className="py-2 text-base">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countryList.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
} 
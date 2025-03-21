"use client"

import { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { processLinkedIn } from '../utils/api'
import { countFieldsByPage } from '../utils/field-counter'
import { StopwatchTimer } from './StopwatchTimer'
import { CheckCircle2 } from "lucide-react"

interface LinkedInImportProps {
  onDataImported?: (data: any) => void
}

export function LinkedInImport({ onDataImported }: LinkedInImportProps) {
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [extractionProgress, setExtractionProgress] = useState<string[]>([])
  const [extractionStatus, setExtractionStatus] = useState<'idle' | 'extracting' | 'filling' | 'complete'>('idle')
  const [fieldCounts, setFieldCounts] = useState<Record<string, number>>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [completionSummary, setCompletionSummary] = useState<Record<string, number>>({})
  const [hasImportedData, setHasImportedData] = useState(false)

  const handleImport = async () => {
    if (!linkedinUrl) {
      setError('Please enter a LinkedIn profile URL')
      return
    }

    try {
      setIsLoading(true)
      setError('')
      setSuccess(false)
      setExtractionStatus('extracting')
      setExtractionProgress(['Connecting to LinkedIn...', 'Retrieving profile data...'])
      
      console.log("Making API request to process LinkedIn data for URL:", linkedinUrl)
      const result = await processLinkedIn({ url: linkedinUrl })
      console.log("API response received:", result)
      
      if (result.status === 'error') {
        const errorMessage = typeof result.message === 'object' 
          ? (result.message.msg || JSON.stringify(result.message))
          : (result.message || 'Failed to import LinkedIn data');
        
        setError(errorMessage);
        setExtractionProgress(prev => [...prev, `Error: ${errorMessage}`]);
        setExtractionStatus('idle');
        return;
      }
      
      setSuccess(true)
      
      if (onDataImported && result.data) {
        console.log("Importing LinkedIn data to form:", result.data)
        setExtractionStatus('complete')
        setExtractionProgress(prev => [...prev, 'LinkedIn data retrieval complete'])
        
        // Count fields
        const counts = countFieldsByPage(result.data)
        
        setFieldCounts(counts)
        
        // Save counts for display after modal is closed
        setCompletionSummary(counts)
        setHasImportedData(true)
        
        // Add field counts to progress messages
        const countMessages = Object.entries(counts).map(([page, count]) => {
          const readablePage = page.replace('_page', '').replace(/_/g, ' ')
          return `${readablePage}: ${count} fields`
        })
        
        setExtractionProgress(prev => [...prev, ...countMessages])
        
        // If handler is provided to update form
        if (onDataImported) {
          setExtractionStatus('filling')
          setExtractionProgress(prev => [...prev, 'Filling form with LinkedIn data...'])
          
          setTimeout(() => {
            onDataImported(result.data)
            setExtractionStatus('complete')
          }, 1000)
        }
      } else {
        console.log("No data to import or onDataImported not provided")
        setExtractionStatus('complete')
        setExtractionProgress(prev => [...prev, 'LinkedIn data retrieval complete'])
      }
    } catch (error) {
      console.error('LinkedIn import error:', error)
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : (typeof error === 'object' 
            ? JSON.stringify(error) 
            : 'An unknown error occurred');
        
      setError('An error occurred while importing LinkedIn data. Check console for details.')
      setExtractionProgress(prev => [...prev, `Error: ${errorMessage}`])
      setExtractionStatus('idle')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mb-6 p-4 bg-gray-50 border-l-4 border-l-gray-500 border border-gray-200 rounded-lg">
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-xl font-semibold">Fill Manually or Provide LinkedIn Profile URL to Import Work/Education</h3>
            <p className="text-base text-gray-500">Work and education 1/2 pages will be automatically filled after import</p>
            
            {hasImportedData && Object.keys(completionSummary).length > 0 && (
              <div className="mt-2 text-sm text-green-600 font-medium">
                <div className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  <span>Data imported: {Object.entries(completionSummary).map(([page, count]) => (
                    <span key={page} className="mr-2">
                      {page.replace('_page', '').replace(/_/g, ' ')} ({count} fields)
                    </span>
                  ))}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Input
            type="text"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://www.linkedin.com/in/username"
            className="flex-1 text-lg py-3"
          />
          <Button 
            onClick={handleImport}
            disabled={isLoading || !linkedinUrl}
            className={`bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap px-6 py-3 text-lg`}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Importing...
              </>
            ) : 'Import LinkedIn Data'}
          </Button>
        </div>
        
        {error && (
          <div className="mt-2 text-base text-red-600">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mt-2 text-base text-green-600">
            LinkedIn data successfully imported and form updated!
          </div>
        )}
        
        {extractionStatus !== 'idle' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
              <div className="flex flex-col items-center">
                {extractionStatus !== 'complete' && (
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                )}
                
                <h3 className="text-xl font-semibold mb-4">
                  {extractionStatus === 'extracting' ? 'Extracting LinkedIn Data' : 
                   extractionStatus === 'filling' ? 'Filling Form with LinkedIn Data' : 
                   'Data Extraction Complete'}
                </h3>
                
                <StopwatchTimer 
                  isRunning={extractionStatus !== 'idle' && extractionStatus !== 'complete'} 
                  estimatedTime="up to 2 minutes"
                />
                
                <div className="w-full space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-3 bg-gray-50">
                  {extractionProgress.map((msg, idx) => (
                    <div key={idx} className="text-base">
                      {msg}
                    </div>
                  ))}
                </div>
                
                {extractionStatus === 'complete' && (
                  <Button 
                    onClick={() => setExtractionStatus('idle')}
                    className="mt-4"
                  >
                    Close
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 

"use client"

import { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { processLinkedIn } from '../app/utils/api'

interface LinkedInImportProps {
  onDataImported?: (data: any) => void
}

export function LinkedInImport({ onDataImported }: LinkedInImportProps) {
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleImport = async () => {
    if (!linkedinUrl) {
      setError('Please enter a LinkedIn profile URL')
      return
    }

    try {
      setIsLoading(true)
      setError('')
      setSuccess(false)
      
      console.log("Making API request to process LinkedIn data for URL:", linkedinUrl)
      const result = await processLinkedIn(linkedinUrl)
      console.log("API response received:", result)
      
      if (result.status === 'error') {
        setError(result.message || 'Failed to import LinkedIn data')
        return
      }
      
      setSuccess(true)
      
      if (onDataImported && result.data) {
        console.log("Importing LinkedIn data to form:", result.data)
        onDataImported(result.data)
      } else {
        console.log("No data to import or onDataImported not provided")
      }
    } catch (error) {
      console.error('LinkedIn import error:', error)
      setError('An error occurred while importing LinkedIn data. Check console for details.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold mb-2">Import LinkedIn Data</h3>
      <p className="text-sm text-gray-600 mb-4">
        Enter a LinkedIn profile URL to automatically fill work and education sections
      </p>
      
      <div className="flex gap-4">
        <Input
          placeholder="https://www.linkedin.com/in/username"
          value={linkedinUrl}
          onChange={(e) => setLinkedinUrl(e.target.value)}
          className="flex-1"
        />
        <Button 
          onClick={handleImport}
          disabled={isLoading || !linkedinUrl}
          className={isLoading ? 'opacity-70' : ''}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Importing...
            </>
          ) : 'Import Data and Fill Form'}
        </Button>
      </div>
      
      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mt-2 text-sm text-green-600">
          LinkedIn data successfully imported and form updated!
        </div>
      )}
    </div>
  )
} 
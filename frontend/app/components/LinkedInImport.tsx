"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { debugLog } from '@/utils/consoleLogger'

export function LinkedInImport() {
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const handleLinkedInImport = async () => {
    try {
      setIsImporting(true);
      const response = await fetch('/api/linkedin_import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: linkedInUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to import LinkedIn data');
      }

      const data = await response.json();
      debugLog('linkedin_import', 'LinkedIn data imported successfully:', data);
      
    } catch (error) {
      console.error('Error importing LinkedIn data:', error);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Import Work/Education from LinkedIn:</h3>
      <div className="flex gap-4">
        <Input
          type="url"
          placeholder="Enter LinkedIn Profile URL"
          value={linkedInUrl}
          onChange={(e) => setLinkedInUrl(e.target.value)}
          className="flex-grow"
        />
        <Button 
          onClick={handleLinkedInImport}
          disabled={isImporting || !linkedInUrl}
          className={`${isImporting ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
        >
          {isImporting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Importing...
            </>
          ) : (
            'Import Data and Fill Form'
          )}
        </Button>
      </div>
    </div>
  );
} 
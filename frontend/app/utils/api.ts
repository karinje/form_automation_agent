// Get the API base URL from environment variable or use localhost as fallback
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function processWithOpenAI(text: string) {
  const response = await fetch(`${API_BASE_URL}/api/pdf-to-yaml`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    throw new Error('Failed to convert PDF to YAML');
  }

  return response.json();
}

export async function runDS160(yamlContent: string): Promise<Response> {
  // Create a blob from the YAML content
  const yamlBlob = new Blob([yamlContent], { type: 'text/yaml' });
  
  // Create form data for file upload
  const formData = new FormData();
  formData.append('file', yamlBlob, 'form_data.yaml');
  
  // Make the request using the environment-based URL
  const response = await fetch(`${API_BASE_URL}/api/ds160/run-ds160`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`Server responded with status: ${response.status}`);
  }
  
  return response;
}

export const processLinkedIn = async (data: { url: string }) => {
  try {
    console.log('Sending LinkedIn URL to API:', data.url);
    
    const response = await fetch(`${API_BASE_URL}/api/linkedin/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: data.url
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LinkedIn API error response:', errorText);
      return {
        status: 'error',
        message: `API error: ${errorText}`
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error processing LinkedIn data:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const processI94 = async (data: {
  givenName: string;
  surname: string;
  birthDate: string;
  documentNumber: string;
  documentCountry: string;
}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/i94/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error processing I94 data:', error);
    throw error;
  }
};

export async function processDocuments(
  files: {
    license?: File,
    visa?: File,
    travelTicket?: File
  },
  metadata: {
    yamlData?: any
  }
) {
  try {
    const formData = new FormData();
    
    // Add files to FormData
    if (files.license) formData.append('license', files.license);
    if (files.visa) formData.append('visa', files.visa);
    if (files.travelTicket) formData.append('travelTicket', files.travelTicket);
    
    // Add metadata
    formData.append('metadata', JSON.stringify(metadata));
    
    const response = await fetch(`${API_BASE_URL}/api/documents/process`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to process documents: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error processing documents:', error);
    throw error;
  }
}

export async function processPassport(
  files: {
    passportFirst?: File,
    passportLast?: File
  },
  metadata: {
    yamlData?: any
  }
) {
  try {
    const formData = new FormData();
    
    // Add files to FormData
    if (files.passportFirst) formData.append('passportFirst', files.passportFirst);
    if (files.passportLast) formData.append('passportLast', files.passportLast);
    
    // Add metadata
    formData.append('metadata', JSON.stringify(metadata));
    
    const response = await fetch(`${API_BASE_URL}/api/passport/process`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to process passport: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error processing passport:', error);
    throw error;
  }
} 
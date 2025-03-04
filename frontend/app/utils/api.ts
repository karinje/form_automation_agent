export async function processWithOpenAI(text: string) {
  const response = await fetch('http://localhost:8000/api/pdf-to-yaml', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    throw new Error('Failed to convert PDF to YAML');
  }

  return response.json();
}

export async function runDS160(yamlStr: string) {
  const formData = new FormData()
  const yamlBlob = new Blob([yamlStr], { type: 'text/yaml' })
  formData.append('file', yamlBlob, 'ds160_input.yaml')
  
  try {
    const response = await fetch('http://localhost:8000/api/ds160/run-ds160', {
      method: 'POST',
      body: formData
    })

    const data = await response.json()
    
    if (!response.ok || data.status === 'error') {
      throw new Error(data.message || 'Failed to process DS-160')
    }

    return data
  } catch (error) {
    console.error('DS-160 processing error:', error)
    throw error
  }
}

export async function processLinkedIn(url: string): Promise<any> {
  try {
    const response = await fetch('http://localhost:8000/api/linkedin/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        status: 'error',
        message: errorData.detail || 'Failed to process LinkedIn data',
      }
    }

    return await response.json()
  } catch (error) {
    console.error('LinkedIn processing error:', error)
    return {
      status: 'error',
      message: 'An error occurred while processing LinkedIn data',
    }
  }
}

export const processI94 = async (data: {
  givenName: string;
  surname: string;
  birthDate: string;
  documentNumber: string;
  documentCountry: string;
}) => {
  try {
    const response = await fetch('http://localhost:8000/api/i94/process', {
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
    
    // Change to absolute URL to match other API calls
    const response = await fetch('http://localhost:8000/api/documents/process', {
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
    
    const response = await fetch('http://localhost:8000/api/passport/process', {
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
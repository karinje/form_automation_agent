export async function processLinkedIn(data: any) {
  const response = await fetch('http://localhost:8000/api/linkedin/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return response.json()
}

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
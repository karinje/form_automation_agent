export async function callOpenAI(prompt: string) {
  try {
    console.log('Sending request to OpenAI endpoint');
    const response = await fetch('/api/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    console.log('Response status:', response.status);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API error details:', data);
      throw new Error(data.details || 'OpenAI API call failed');
    }

    return data.text;
  } catch (error) {
    console.error('OpenAI call error:', error);
    throw error;
  }
} 
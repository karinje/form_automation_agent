export async function callOpenAI(prompt: string) {
  try {
    console.log('Sending request to OpenAI backend:', { prompt: prompt.slice(0, 100) + '...' });
    const response = await fetch('http://localhost:8000/api/openai/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    console.log('Response status:', response.status);
    if (!response.ok) {
      throw new Error('Failed to call OpenAI API');
    }
    // Wait for the response before returning
    const data = await response.json();
    console.log('OpenAI response:', { hasText: !!data.text });
    if (!data.text) {
      throw new Error('No response from OpenAI');
    }
    return data.text;
  } catch (error) {
    console.error('OpenAI call error:', error);
    throw error;
  }
} 
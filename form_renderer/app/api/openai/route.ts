import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Add debug logging
console.log('API Route Loading');
console.log('Environment variables:', {
  hasApiKey: !!process.env.OPENAI_API_KEY,
  keyPrefix: process.env.OPENAI_API_KEY?.slice(0, 4),
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    console.log('Received request to OpenAI endpoint');
    const { prompt } = await request.json();
    console.log('Prompt received, length:', prompt.length);

    console.log('Making OpenAI API call...');
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a DS-160 form assistant that converts PDF text to YAML format. Return only the raw YAML content without any markdown formatting, code blocks, or backticks."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
    });
    console.log('OpenAI API call successful');

    // Clean up any remaining markdown artifacts if they exist
    let yamlContent = completion.choices[0].message.content;
    yamlContent = yamlContent.replace(/^```ya?ml\n?/, '').replace(/```$/, '').trim();

    return NextResponse.json({ 
      text: yamlContent 
    });

  } catch (error: any) {
    console.error('Detailed OpenAI API error:', {
      error: error.message,
      status: error.status,
      type: error.type,
      code: error.code,
      details: error.response?.data
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to process the request',
        details: error.message 
      },
      { status: 500 }
    );
  }
} 
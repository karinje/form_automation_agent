import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasKey: !!process.env.OPENAI_API_KEY,
    keyPrefix: process.env.OPENAI_API_KEY?.slice(0, 4),
  });
} 
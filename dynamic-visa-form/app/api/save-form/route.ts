import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const formData = await request.json()
    
    // Here you would typically save to a database
    // For now, we'll just return success
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save form data' },
      { status: 500 }
    )
  }
} 
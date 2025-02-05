import { writeFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { logs, path: logPath } = await request.json();
    
    // Ensure the path is within your project
    const safePath = path.join(process.cwd(), 'logs', path.basename(logPath));
    
    await writeFile(safePath, JSON.stringify(logs, null, 2));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save logs:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { logs, path: filePath } = await request.json();
    
    // Determine the absolute path to save the logs
    // This is in the project root's "logs" directory
    const logsDir = path.join(process.cwd(), 'logs');
    
    // Create the logs directory if it doesn't exist
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const fullPath = path.join(logsDir, filePath);
    
    // Write the logs to the file, overwriting any existing file
    fs.writeFileSync(fullPath, JSON.stringify(logs, null, 2));
    
    return NextResponse.json({ success: true, path: fullPath });
  } catch (error) {
    console.error('Error saving logs:', error);
    return NextResponse.json(
      { error: 'Failed to save logs' },
      { status: 500 }
    );
  }
} 
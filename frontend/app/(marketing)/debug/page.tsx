import { headers } from 'next/headers';

export default function DebugPage() {
  // Server-side checks
  const hasPublishableKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const hasSecretKey = !!process.env.CLERK_SECRET_KEY;
  
  return (
    <div className="p-10 mt-20">
      <h1 className="text-2xl font-bold mb-4">Environment Variables Debug</h1>
      
      {/* Client-side variables */}
      <div className="bg-gray-100 p-4 rounded mb-8">
        <p className="mb-2">
          <strong>Client-side environment check:</strong>
        </p>
        <p>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 
           `Set (starts with ${process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.substring(0, 10)}...)` : 
           'Not set'}</p>
        <p>NEXT_PUBLIC_CLERK_SIGN_IN_URL: {process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || 'Not set'}</p>
        <p>NEXT_PUBLIC_CLERK_SIGN_UP_URL: {process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || 'Not set'}</p>
        <p>NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: {process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || 'Not set'}</p>
      </div>
      
      {/* Server-side variables */}
      <div className="bg-green-50 p-4 rounded border border-green-200 mt-8">
        <h2 className="text-lg font-semibold mb-2">Server-side environment check:</h2>
        <p>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: {hasPublishableKey ? 'Set' : 'Not set'}</p>
        <p>CLERK_SECRET_KEY: {hasSecretKey ? 'Set' : 'Not set'}</p>
      </div>
      
      <div className="bg-blue-50 p-4 rounded border border-blue-200 mt-8">
        <h2 className="text-lg font-semibold mb-2">Note:</h2>
        <p>If you see "Not set" for environment variables that you've added to .env.local, try these troubleshooting steps:</p>
        <ol className="list-decimal pl-5 mt-2">
          <li>Restart your Next.js server completely</li>
          <li>Make sure your .env.local file is in the root directory</li>
          <li>Check for any syntax errors in your .env.local (no quotes, spaces, etc.)</li>
        </ol>
      </div>
    </div>
  );
} 
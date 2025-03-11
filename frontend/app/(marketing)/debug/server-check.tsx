export function ServerCheck() {
  // This code runs on the server
  const hasPublishableKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const hasSecretKey = !!process.env.CLERK_SECRET_KEY;
  
  return (
    <div className="bg-green-50 p-4 rounded border border-green-200 mt-8">
      <h2 className="text-lg font-semibold mb-2">Server-side environment check:</h2>
      <p>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: {hasPublishableKey ? 'Set' : 'Not set'}</p>
      <p>CLERK_SECRET_KEY: {hasSecretKey ? 'Set' : 'Not set'}</p>
    </div>
  );
} 
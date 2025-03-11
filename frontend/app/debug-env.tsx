// Create this file temporarily for debugging
export default function DebugEnv() {
  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-4">Environment Variables Debug</h1>
      <div className="bg-gray-100 p-4 rounded">
        <p>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 
           `Set (starts with ${process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.substring(0, 10)}...)` : 
           'Not set'}</p>
        <p>CLERK_SECRET_KEY: {process.env.CLERK_SECRET_KEY ? 
           'Set (hidden for security)' : 
           'Not set'}</p>
        <p>Sign In URL: {process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || 'Not set'}</p>
        <p>Sign Up URL: {process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || 'Not set'}</p>
        <p>After Sign In URL: {process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || 'Not set'}</p>
      </div>
    </div>
  );
} 
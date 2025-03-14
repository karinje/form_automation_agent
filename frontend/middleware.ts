import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware({
  // Routes that can be accessed while signed out
  publicRoutes: [
    '/',
    '/auth/sign-in',
    '/auth/sign-up',
    '/api/webhooks(.*)',
    '/api/webhook(.*)',
    '/auth(.*)'
  ],
  
  // Routes that can always be accessed, and have
  // no authentication information
  ignoredRoutes: [
    '/api/health',
    '/_next/static/(.*)',
    '/favicon.ico'
  ],
});

// Configure the matcher to only run the middleware on specific paths
export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};

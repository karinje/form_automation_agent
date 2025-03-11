import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  // Public routes that don't require authentication
  publicRoutes: ["/", "/privacy", "/terms", "/contact"],
  
  // Protected routes that require authentication
  // The /app path should be protected
  ignoredRoutes: ["/(api|trpc)(.*)"],
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
}; 
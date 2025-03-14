import { Inter } from "next/font/google";
import { UserButton, SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "DS-160 Agent - Simplify Your US Visa Application",
  description: "Complete your DS-160 form faster and without frustration. Import data from LinkedIn, travel history, and more. Just $4.99 per use.",
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-10 bg-white bg-opacity-90 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center py-4 md:justify-start md:space-x-10">
            <div className="flex justify-start lg:w-0 lg:flex-1">
              <a href="/" className="flex items-center">
                <span className="text-2xl font-bold text-blue-600">DS-160 Agent</span>
              </a>
            </div>
            <div className="md:flex items-center justify-end md:flex-1 lg:w-0">
              <SignedOut>
                <Link href="/auth/sign-in" className="ml-8 whitespace-nowrap inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700">
                  Sign in
                </Link>
              </SignedOut>
              <SignedIn>
                <Link 
                  href="/app" 
                  className="ml-8 whitespace-nowrap px-4 py-2 border border-transparent rounded-md text-base font-medium text-blue-600 hover:text-blue-800"
                >
                  Go to App
                </Link>
                <UserButton 
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      userButtonAvatarBox: "w-10 h-10 ml-4"
                    }
                  }} 
                />
              </SignedIn>
            </div>
          </div>
        </div>
      </nav>
      <main className={inter.className}>{children}</main>
    </>
  );
} 
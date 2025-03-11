import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Authentication - DS-160 Agent",
  description: "Sign in or create an account for DS-160 Agent",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-10 bg-white bg-opacity-90 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center py-4">
            <a href="/" className="flex items-center">
              <span className="text-2xl font-bold text-blue-600">DS-160 Agent</span>
            </a>
          </div>
        </div>
      </nav>
      <main className={inter.className}>{children}</main>
    </>
  );
} 
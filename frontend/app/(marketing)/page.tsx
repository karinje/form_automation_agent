import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Clock, CloudUpload, FileText, Link as LinkIcon, Shield } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <header className="pt-20 pb-16 px-4 md:px-6 text-center">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 tracking-tight">
            DS-160 Form Filling Made <span className="text-blue-600">Simple</span>
          </h1>
          <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
            Say goodbye to timeouts, data loss, and frustration with the official DS-160 form. 
            Our smart agent helps you complete your US visa application with ease.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/sign-in">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg rounded-xl">
                Try Tool <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button variant="outline" className="px-8 py-6 text-lg rounded-xl border-2">
              Watch Demo
            </Button>
          </div>
        </div>
      </header>

      {/* Video Demo Section */}
      <section className="py-16 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="aspect-video bg-gray-200 rounded-2xl overflow-hidden border-8 border-white shadow-2xl">
            {/* Replace with actual video embed */}
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="mb-4 w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto">
                  <svg 
                    className="w-10 h-10 text-white" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" 
                    />
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                    />
                  </svg>
                </div>
                <p className="text-lg font-medium text-gray-700">Demo Video</p>
                <p className="text-sm text-gray-500">See how easy it is to fill out your DS-160 form</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problems & Solutions Section */}
      <section className="py-16 px-4 md:px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Common DS-160 Problems & Our Solutions
            </h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              The official DS-160 form is notoriously frustrating. Here's how we solve the most common issues.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Problems Column */}
            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <div className="inline-flex items-center justify-center p-3 bg-red-100 rounded-xl mb-6">
                <FileText className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Common DS-160 Problems</h3>
              
              <ul className="space-y-4">
                {[
                  "Timeouts causing data loss during long sessions",
                  "Sections failing to save properly",
                  "No ability to edit after submission",
                  "Technical glitches and crashes",
                  "Repetitive data entry for each application",
                  "Cannot import data from LinkedIn or travel history",
                  "Browser compatibility limitations",
                  "Photo upload failures",
                  "Lost confirmation page requiring reprints"
                ].map((problem, index) => (
                  <li key={index} className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-red-100 flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-red-600 text-sm font-medium">✕</span>
                    </div>
                    <span className="text-gray-700">{problem}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Solutions Column */}
            <div className="bg-blue-600 p-8 rounded-2xl shadow-lg text-white">
              <div className="inline-flex items-center justify-center p-3 bg-white rounded-xl mb-6">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold mb-6">Our Solutions</h3>
              
              <ul className="space-y-4">
                {[
                  "Real-time data saving prevents any loss of progress",
                  "Secure storage of all form data for future access",
                  "Review and edit everything before final submission",
                  "Stable, reliable platform without technical issues",
                  "Import from LinkedIn, passport OCR, and I94 records",
                  "Works with all modern browsers",
                  "Seamless photo upload handling",
                  "Digital copies of all documents securely stored",
                  "Agent-assisted form completion for accuracy"
                ].map((solution, index) => (
                  <li key={index} className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-white flex items-center justify-center mr-3 mt-0.5">
                      <Check className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <span>{solution}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Key Features
            </h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              Our platform is designed to make DS-160 form filling painless and efficient.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Clock className="h-10 w-10 text-blue-600" />,
                title: "Time-Saving",
                description: "Complete your DS-160 form in less than 30 minutes rather than hours."
              },
              {
                icon: <LinkIcon className="h-10 w-10 text-blue-600" />,
                title: "Smart Imports",
                description: "Import data from LinkedIn, scanned passports, and travel records."
              },
              {
                icon: <CloudUpload className="h-10 w-10 text-blue-600" />,
                title: "Agent Assistance",
                description: "Our agent helps fill out complex parts of the form automatically."
              },
              {
                icon: <Shield className="h-10 w-10 text-blue-600" />,
                title: "Secure Storage",
                description: "All your data is securely stored and accessible anytime."
              },
              {
                icon: <Check className="h-10 w-10 text-blue-600" />,
                title: "Error Prevention",
                description: "Built-in validation ensures your form meets all requirements."
              },
              {
                icon: <FileText className="h-10 w-10 text-blue-600" />,
                title: "Just $4.99 Per Use",
                description: "Affordable one-time payment with no subscriptions or hidden fees."
              }
            ].map((feature, index) => (
              <div key={index} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 md:px-6 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to simplify your DS-160 application?
          </h2>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Try our DS-160 Agent for just $4.99 per use and experience a hassle-free visa application process.
          </p>
          <Link href="/auth/sign-in">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg rounded-xl">
              Get Started Now <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 md:px-6 bg-gray-900 border-t border-gray-800 text-gray-400">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
            <div className="text-2xl font-bold text-white">DS-160 Agent</div>
            <p className="mt-2">Simplifying your US visa application process</p>
          </div>
          <div className="flex gap-8">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
            <Link href="/contact" className="hover:text-white transition-colors">
              Contact
            </Link>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-8 border-t border-gray-800 text-center text-sm">
          © {new Date().getFullYear()} DS-160 Agent. All rights reserved.
        </div>
      </footer>
    </div>
  );
} 
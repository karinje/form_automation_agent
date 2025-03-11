import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Clock, CloudUpload, FileText, Link as LinkIcon, Shield, Upload, ArrowUpRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - More modern with gradient */}
      <header className="relative pt-24 pb-20 px-4 md:px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 z-0"></div>
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-6">
              DS-160 Form Filling Made Simple
            </h1>
            <p className="mt-6 text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Say goodbye to timeouts, data loss, and frustration.
              Complete your US visa application with ease.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/sign-in">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg rounded-xl flex items-center gap-2 shadow-lg hover:shadow-xl transition-all">
                  Try Tool <ArrowRight className="ml-1 h-5 w-5" />
                </Button>
              </Link>
              <Button variant="outline" className="px-8 py-6 text-lg rounded-xl border-2 border-gray-300 hover:border-gray-400 flex items-center gap-2">
                Watch Demo <ArrowUpRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Key Benefits Section - Large bold fonts, SaaS style */}
      <section className="py-20 px-4 md:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Why DS-160 Agent?
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 flex items-center justify-center bg-blue-100 rounded-full mb-6">
                <Clock className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-2xl md:text-3xl font-bold mb-3">Save 90% of Time</h3>
              <p className="text-gray-600 text-lg">Complete your form in minutes instead of hours with smart data imports</p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 flex items-center justify-center bg-green-100 rounded-full mb-6">
                <Shield className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-2xl md:text-3xl font-bold mb-3">Never Lose Data</h3>
              <p className="text-gray-600 text-lg">Automatic saving prevents frustrating timeouts and data loss</p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 flex items-center justify-center bg-purple-100 rounded-full mb-6">
                <Upload className="h-10 w-10 text-purple-600" />
              </div>
              <h3 className="text-2xl md:text-3xl font-bold mb-3">Smart Imports</h3>
              <p className="text-gray-600 text-lg">Import from LinkedIn, passport, and travel records automatically</p>
            </div>
          </div>
        </div>
      </section>

      {/* Video Demo Section - Now with more style */}
      <section className="py-16 px-4 md:px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              See How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Watch our demo and see how easy DS-160 form filling can be
            </p>
          </div>
          
          <div className="aspect-video bg-white rounded-2xl overflow-hidden border-8 border-white shadow-2xl">
            {/* Replace with actual video embed */}
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="mb-4 w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto cursor-pointer hover:bg-blue-700 transition-colors">
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

      {/* Features Section - Streamlined */}
      <section className="py-20 px-4 md:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Every tool you need for a seamless visa application
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
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
              <div key={index} className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-blue-50 p-3 rounded-lg inline-block mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - More modern */}
      <section className="py-20 px-4 md:px-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
            Ready to simplify your DS-160 application?
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Try our DS-160 Agent for just $4.99 per use and experience a hassle-free visa application process.
          </p>
          <Link href="/auth/sign-in">
            <Button className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-6 text-lg rounded-xl shadow-lg">
              Get Started Now <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer - Simplified */}
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
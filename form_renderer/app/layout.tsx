import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConsoleLoggerInit } from '@/components/ConsoleLoggerInit';
import { DebugLogger } from '@/components/DebugLogger';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <script src="//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ConsoleLoggerInit />
        {children}
        <DebugLogger />
      </body>
    </html>
  );
}

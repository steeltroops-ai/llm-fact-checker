import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LLM Fact Checker",
  description: "AI-powered fact verification system using LLMs and semantic search",
};

// ============================================
// Environment Validation (Server-side only)
// ============================================
function validateEnvironment() {
  // Only run on server-side
  if (typeof window !== 'undefined') return;

  console.log('🔍 Validating frontend environment configuration...');

  const warnings: string[] = [];

  // Check API URL
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    warnings.push('NEXT_PUBLIC_API_URL is not set. Will default to http://localhost:8000');
    console.log('   API URL: http://localhost:8000 (default)');
  } else {
    console.log(`   API URL: ${apiUrl}`);
  }

  // Check App Name
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'LLM Fact Checker';
  console.log(`   App Name: ${appName}`);

  // Display warnings
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(warning => console.log(`   - ${warning}`));
  }

  console.log('✅ Frontend environment validation passed\n');
}

// Validate on module load
validateEnvironment();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

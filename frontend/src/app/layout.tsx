import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { Toaster } from "react-hot-toast";
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
  title: "Arogya Raksha — AI-Powered Intelligent Healthcare Platform",
  description: "Full-stack AI healthcare platform with agentic automation, real-time crisis response, 250K+ medicines, 200K+ hospitals, and 8 Indian languages. Built for Google Gemini Hackathon.",
  keywords: ["healthcare", "AI", "telemedicine", "medicine finder", "hospital discovery", "crisis response", "India", "Gemini hackathon", "Arogya Raksha"],
  authors: [{ name: "Team SSRRK" }],
  openGraph: {
    title: "Arogya Raksha — AI Healthcare for 1.4 Billion",
    description: "Agentic AI automation + real-time crisis response + multilingual support. 10+ AI features, 250K+ medicines, 200K+ hospitals.",
    type: "website",
    locale: "en_IN",
    siteName: "Arogya Raksha",
  },
  twitter: {
    card: "summary_large_image",
    title: "Arogya Raksha — AI-Powered Healthcare",
    description: "Full-stack AI healthcare platform with agentic automation and real-time crisis response.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          suppressHydrationWarning
        >
          <ThemeProvider>
            <LanguageProvider>
              {children}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: { background: '#1e293b', color: '#f1f5f9', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '14px' },
                  success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
                  error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
                }}
              />
            </LanguageProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

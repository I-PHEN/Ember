import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { BRAND } from "@/lib/brand";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = `${BRAND.name} — every problem, a lesson`;

export const metadata: Metadata = {
  title,
  description: BRAND.description,
  keywords: [
    "Ember",
    "Ember tutor",
    "AI tutor",
    "solve videos",
    "lecture videos",
    "whiteboard",
    "live writing",
    "math help",
    "step by step",
    "worked examples",
    "blackboard",
  ],
  icons: {
    icon: "/ember.svg",
    apple: "/ember-touch.png",
  },
  openGraph: {
    title,
    description:
      "Paste any question. Ember plans the lesson, hand-writes the board, and you watch a real solve video.",
    siteName: BRAND.name,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}

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
    "Chalkcast",
    "Professor Ada",
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
    icon: "/chalkcast.svg",
  },
  openGraph: {
    title,
    description:
      "Paste any question. Professor Ada plans the lecture, a marker hand-writes the board, and you watch a real solve video.",
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

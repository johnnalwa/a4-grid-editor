import React from "react"
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

const _inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "A4 Canvas Workspace",
  description:
    "A production-level document management workspace with A4 grid editing, asset management, and multi-page canvas support.",
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${_inter.variable} font-sans antialiased overflow-hidden`}>
        {children}
      </body>
    </html>
  );
}

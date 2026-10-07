import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ProConnect — Réseau professionnel d'entreprise",
  description: "ProConnect : réseau social professionnel d'entreprise — fil d'actualité, messagerie, emplois et communauté.",
  keywords: ["ProConnect", "réseau professionnel", "entreprise", "social", "recrutement"],
  authors: [{ name: "ProConnect" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "ProConnect",
    description: "Réseau professionnel d'entreprise",
    siteName: "ProConnect",
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

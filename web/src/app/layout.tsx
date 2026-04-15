import type { Metadata } from "next";
import { Inter, Lora, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "KnowSomeone: Referral-First Job Search Platform",
    template: "%s | KnowSomeone",
  },
  description:
    "Stop applying into the void. KnowSomeone puts referral outreach at the center of your job search, guiding you from finding a role to getting someone on the inside to vouch for you.",
  metadataBase: new URL("https://knowsomeone.vercel.app"),
  keywords: [
    "job search", "referral", "networking", "job tracker", "career",
    "outreach", "job application", "interview prep", "job board",
  ],
  authors: [{ name: "KnowSomeone" }],
  openGraph: {
    title: "KnowSomeone: Referral-First Job Search Platform",
    description:
      "The only job search tool that tracks the full referral journey. Find connections, draft outreach, and apply with a warm introduction behind you.",
    type: "website",
    url: "https://knowsomeone.vercel.app",
    siteName: "KnowSomeone",
  },
  twitter: {
    card: "summary_large_image",
    title: "KnowSomeone: Referral-First Job Search Platform",
    description:
      "Stop applying into the void. Track referrals, draft outreach, and apply with a warm introduction behind you.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${lora.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

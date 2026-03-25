import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
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
  title: "KnowSomeone — Referral-First Job Search Platform",
  description:
    "Stop applying into the void. KnowSomeone puts referral outreach at the center of your job search — guiding you from finding a role to getting someone on the inside to vouch for you.",
  openGraph: {
    title: "KnowSomeone — Referral-First Job Search Platform",
    description:
      "The only job search tool that tracks the full referral journey. Find connections, draft outreach, and apply with a warm introduction behind you.",
    type: "website",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

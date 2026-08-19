import "./globals.css";
import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import AppLayout from "@/components/layout/AppLayout";
/* ================================================================
   GATEKEEPER TYPOGRAPHY
   ================================================================ */
/*
 * Primary UI / body font.
 * Clean, modern and highly readable for an intelligence platform.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
/*
 * Data / intelligence font.
 * Used for:
 * - Wallet addresses
 * - Transaction hashes
 * - Case IDs
 * - Timestamps
 * - System status
 * - Telemetry
 */
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-data",
  weight: ["400", "500", "600"],
  display: "swap",
});
/* ================================================================
   METADATA
   ================================================================ */
export const metadata: Metadata = {
  title: {
    default: "Gatekeeper | Intelligence & Forensics",
    template: "%s | Gatekeeper",
  },
  description:
    "Gatekeeper is a digital intelligence and forensic investigation platform for evidence collection, OSINT analysis, cryptocurrency intelligence and entity correlation.",
  keywords: [
    "Gatekeeper",
    "digital forensics",
    "crypto intelligence",
    "cryptocurrency investigation",
    "OSINT",
    "wallet intelligence",
    "blockchain investigation",
    "digital evidence",
    "entity correlation",
    "threat intelligence",
  ],
  applicationName: "Gatekeeper",
  authors: [
    {
      name: "Gatekeeper",
    },
  ],
  creator: "Gatekeeper",
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: "/favicon.ico",
  },
};
/* ================================================================
   ROOT LAYOUT
   ================================================================ */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${plexMono.variable}`}
    >
      <body className="min-h-screen bg-[#05070b] font-[var(--font-body)] text-white antialiased">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}

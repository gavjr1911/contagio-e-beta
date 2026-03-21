import type { Metadata, Viewport } from "next";
import { Inter, DM_Sans } from "next/font/google";
import { Providers } from "@/providers";
import { OfflineIndicator } from "@/components/offline-indicator";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Contagio e Beta",
    template: "%s | Contagio e Beta",
  },
  description:
    "Sistema de gestao de escalas e eventos da Igreja Beta. Organize ministerios, escalas de louvor e eventos com facilidade.",
  keywords: [
    "igreja",
    "beta",
    "escalas",
    "ministerio",
    "louvor",
    "eventos",
    "gestao",
  ],
  authors: [{ name: "Igreja Beta" }],
  creator: "Igreja Beta",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Beta",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1B1B1B",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${dmSans.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          <OfflineIndicator />
          {children}
        </Providers>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next"
import { Fredoka } from "next/font/google"

import "./festival.css"

// Fonte festiva self-hosted (respeita o CSP: font-src 'self').
const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Festival Gastronômico | Igreja Beta",
  description:
    "Vote nas barracas do Festival Gastronômico da Igreja Beta. Sabores que unem, fé que transforma!",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0e4a34",
}

export default function FestivalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className={`${fredoka.variable} festival-root`}>{children}</div>
}

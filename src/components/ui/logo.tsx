import Image from "next/image"
import { cn } from "@/lib/utils"

type LogoVariant = "blue" | "orange" | "silver"
type LogoFormat = "svg" | "png"

interface LogoProps {
  variant?: LogoVariant
  format?: LogoFormat
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

const sizes = {
  sm: { width: 80, height: 28 },
  md: { width: 120, height: 40 },
  lg: { width: 160, height: 54 },
  xl: { width: 200, height: 68 },
}

// Mapeamento dos nomes dos arquivos
const fileNames: Record<LogoVariant, string> = {
  blue: "Beta-Logo-Blue",
  orange: "Beta-Logo-Orange",
  silver: "beta-logo-silver",
}

export function Logo({
  variant = "orange",
  format = "svg",
  size = "md",
  className,
}: LogoProps) {
  const { width, height } = sizes[size]
  const src = `/logos/${fileNames[variant]}.${format}`

  return (
    <Image
      src={src}
      alt="Beta"
      width={width}
      height={height}
      className={cn("object-contain", className)}
      priority
    />
  )
}

// Fallback text logo when images aren't available
export function LogoText({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}) {
  const textSizes = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl",
    xl: "text-4xl",
  }

  return (
    <span
      className={cn(
        "font-display font-light tracking-tight text-foreground",
        textSizes[size],
        className
      )}
    >
      Be
      <span className="relative">
        t
        <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-primary" />
      </span>
      a
    </span>
  )
}

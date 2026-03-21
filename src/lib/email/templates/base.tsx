import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"
import * as React from "react"

// Cores da identidade Beta
const colors = {
  primary: "#6366f1", // Indigo-500 - cor principal Beta
  primaryDark: "#4f46e5", // Indigo-600
  secondary: "#8b5cf6", // Violet-500
  background: "#f8fafc", // Slate-50
  surface: "#ffffff",
  text: "#1e293b", // Slate-800
  textMuted: "#64748b", // Slate-500
  border: "#e2e8f0", // Slate-200
  success: "#22c55e", // Green-500
  error: "#ef4444", // Red-500
  warning: "#f59e0b", // Amber-500
}

const fontFamily = {
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
}

interface BaseEmailProps {
  preview: string
  children: React.ReactNode
}

export function BaseEmail({ preview, children }: BaseEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header */}
          <Section style={styles.header}>
            <Img
              src="https://beta.church/logo.png"
              width="120"
              height="40"
              alt="Beta Church"
              style={styles.logo}
            />
          </Section>

          {/* Content */}
          <Section style={styles.content}>{children}</Section>

          {/* Footer */}
          <Section style={styles.footer}>
            <Hr style={styles.hr} />
            <Text style={styles.footerText}>
              Este email foi enviado automaticamente pelo sistema Beta Church.
            </Text>
            <Text style={styles.footerLinks}>
              <Link href="https://app.beta.church" style={styles.footerLink}>
                Acessar Sistema
              </Link>
              {" | "}
              <Link href="https://beta.church" style={styles.footerLink}>
                Site Oficial
              </Link>
              {" | "}
              <Link href="https://instagram.com/betachurchbr" style={styles.footerLink}>
                Instagram
              </Link>
            </Text>
            <Text style={styles.copyright}>
              Beta Church - Transformando vidas pelo evangelho
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Componentes reutilizaveis para templates
export function EmailHeading({ children }: { children: React.ReactNode }) {
  return <Heading style={styles.heading}>{children}</Heading>
}

export function EmailText({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return <Text style={muted ? styles.textMuted : styles.text}>{children}</Text>
}

export function EmailButton({
  href,
  children,
  variant = "primary",
}: {
  href: string
  children: React.ReactNode
  variant?: "primary" | "secondary" | "success" | "danger"
}) {
  const buttonStyle = {
    ...styles.button,
    backgroundColor:
      variant === "primary"
        ? colors.primary
        : variant === "secondary"
        ? colors.secondary
        : variant === "success"
        ? colors.success
        : colors.error,
  }

  return (
    <Link href={href} style={buttonStyle}>
      {children}
    </Link>
  )
}

export function EmailCard({ children }: { children: React.ReactNode }) {
  return <Section style={styles.card}>{children}</Section>
}

export function EmailDivider() {
  return <Hr style={styles.hr} />
}

export function EmailHighlight({ children }: { children: React.ReactNode }) {
  return <Text style={styles.highlight}>{children}</Text>
}

export function EmailBadge({
  children,
  color = "primary",
}: {
  children: React.ReactNode
  color?: "primary" | "success" | "warning" | "error"
}) {
  const badgeColors = {
    primary: { bg: "#eef2ff", text: colors.primary },
    success: { bg: "#dcfce7", text: "#166534" },
    warning: { bg: "#fef3c7", text: "#92400e" },
    error: { bg: "#fee2e2", text: "#991b1b" },
  }

  return (
    <span
      style={{
        ...styles.badge,
        backgroundColor: badgeColors[color].bg,
        color: badgeColors[color].text,
      }}
    >
      {children}
    </span>
  )
}

// Estilos
const styles = {
  body: {
    backgroundColor: colors.background,
    fontFamily: fontFamily.sans,
    margin: 0,
    padding: 0,
  },
  container: {
    backgroundColor: colors.surface,
    margin: "0 auto",
    maxWidth: "600px",
    borderRadius: "12px",
    overflow: "hidden" as const,
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  },
  header: {
    backgroundColor: colors.primary,
    padding: "24px 32px",
    textAlign: "center" as const,
  },
  logo: {
    margin: "0 auto",
  },
  content: {
    padding: "32px",
  },
  heading: {
    color: colors.text,
    fontSize: "24px",
    fontWeight: "700",
    lineHeight: "32px",
    margin: "0 0 16px 0",
  },
  text: {
    color: colors.text,
    fontSize: "16px",
    lineHeight: "24px",
    margin: "0 0 16px 0",
  },
  textMuted: {
    color: colors.textMuted,
    fontSize: "14px",
    lineHeight: "20px",
    margin: "0 0 16px 0",
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: "8px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "16px",
    fontWeight: "600",
    lineHeight: "1",
    padding: "14px 28px",
    textAlign: "center" as const,
    textDecoration: "none",
    margin: "8px 8px 8px 0",
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: "8px",
    padding: "20px",
    margin: "16px 0",
  },
  hr: {
    borderColor: colors.border,
    borderWidth: "1px",
    borderStyle: "solid",
    margin: "24px 0",
  },
  highlight: {
    backgroundColor: "#fef3c7",
    borderLeft: `4px solid ${colors.warning}`,
    borderRadius: "0 8px 8px 0",
    color: colors.text,
    fontSize: "14px",
    lineHeight: "20px",
    margin: "16px 0",
    padding: "12px 16px",
  },
  badge: {
    borderRadius: "4px",
    display: "inline-block",
    fontSize: "12px",
    fontWeight: "600",
    padding: "4px 8px",
    textTransform: "uppercase" as const,
  },
  footer: {
    padding: "0 32px 32px 32px",
  },
  footerText: {
    color: colors.textMuted,
    fontSize: "12px",
    lineHeight: "18px",
    margin: "0 0 8px 0",
    textAlign: "center" as const,
  },
  footerLinks: {
    color: colors.textMuted,
    fontSize: "12px",
    lineHeight: "18px",
    margin: "0 0 8px 0",
    textAlign: "center" as const,
  },
  footerLink: {
    color: colors.primary,
    textDecoration: "none",
  },
  copyright: {
    color: colors.textMuted,
    fontSize: "11px",
    lineHeight: "16px",
    margin: "16px 0 0 0",
    textAlign: "center" as const,
  },
} as const

export { colors, fontFamily }

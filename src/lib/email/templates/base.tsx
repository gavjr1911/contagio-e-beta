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

// URL base para assets/links (logo servida em /logos do app)
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXTAUTH_URL ||
  "https://contagie.igrejabeta.com.br"

// Identidade visual Beta (espelha o design system do app — globals.css)
const colors = {
  primary: "#D45A00", // terracotta (--primary)
  primaryDark: "#B84D00", // --primary-hover
  terracotta: "#BF531A", // --beta-terracotta
  black: "#1B1B1B", // --beta-black
  cream: "#F5E7D7", // --beta-cream
  background: "#FAFAFA", // página
  surface: "#FFFFFF",
  text: "#1A1A1A", // --foreground
  textMuted: "#737373", // neutral-500
  border: "#ECE7E0", // borda quente clara
  success: "#15803D",
  error: "#B91C1C",
  warning: "#C2410C",
}

// Fontes do sistema: DM Sans (títulos) e Inter (corpo), com fallbacks seguros
// para clientes de email que não carregam web fonts.
const fontFamily = {
  sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  display:
    '"DM Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
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
          {/* Faixa de destaque terracotta no topo */}
          <Section style={styles.accentBar} />

          {/* Header com a logo Beta sobre o creme da marca */}
          <Section style={styles.header}>
            <Img
              src={`${APP_URL}/logos/Beta-Logo-Orange.png`}
              width="116"
              alt="Beta"
              style={styles.logo}
            />
          </Section>

          {/* Content */}
          <Section style={styles.content}>{children}</Section>

          {/* Footer */}
          <Section style={styles.footer}>
            <Hr style={styles.hr} />
            <Text style={styles.slogan}>
              Impactar pra transformar. Conectar pra avançar.
            </Text>
            <Text style={styles.footerLinks}>
              <Link href={APP_URL} style={styles.footerLink}>
                Acessar o sistema
              </Link>
              {"  •  "}
              <Link href="https://igrejabeta.com.br" style={styles.footerLink}>
                Site da Igreja
              </Link>
            </Text>
            <Text style={styles.copyright}>
              Este email foi enviado automaticamente pelo sistema da Igreja Beta.
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
        ? colors.black
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
    primary: { bg: colors.cream, text: colors.terracotta },
    success: { bg: "#DCFCE7", text: "#166534" },
    warning: { bg: "#FEEAD9", text: colors.warning },
    error: { bg: "#FEE2E2", text: "#991B1B" },
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
    padding: "24px 0",
  },
  container: {
    backgroundColor: colors.surface,
    margin: "0 auto",
    maxWidth: "600px",
    borderRadius: "14px",
    overflow: "hidden" as const,
    border: `1px solid ${colors.border}`,
    boxShadow: "0 4px 16px rgba(27, 27, 27, 0.06)",
  },
  accentBar: {
    backgroundColor: colors.terracotta,
    height: "4px",
    lineHeight: "4px",
    fontSize: "4px",
  },
  header: {
    backgroundColor: colors.cream,
    padding: "28px 32px",
    textAlign: "center" as const,
  },
  logo: {
    margin: "0 auto",
    height: "auto",
  },
  content: {
    padding: "32px",
  },
  heading: {
    color: colors.black,
    fontFamily: fontFamily.display,
    fontSize: "24px",
    fontWeight: "700",
    lineHeight: "32px",
    margin: "0 0 16px 0",
  },
  text: {
    color: colors.text,
    fontSize: "16px",
    lineHeight: "26px",
    margin: "0 0 16px 0",
  },
  textMuted: {
    color: colors.textMuted,
    fontSize: "14px",
    lineHeight: "22px",
    margin: "0 0 16px 0",
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: "10px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "16px",
    fontWeight: "600",
    lineHeight: "1",
    padding: "15px 30px",
    textAlign: "center" as const,
    textDecoration: "none",
    margin: "8px 8px 8px 0",
  },
  card: {
    backgroundColor: colors.cream,
    borderRadius: "10px",
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
    backgroundColor: colors.cream,
    borderLeft: `4px solid ${colors.terracotta}`,
    borderRadius: "0 8px 8px 0",
    color: colors.text,
    fontSize: "14px",
    lineHeight: "22px",
    margin: "16px 0",
    padding: "12px 16px",
  },
  badge: {
    borderRadius: "6px",
    display: "inline-block",
    fontSize: "12px",
    fontWeight: "600",
    padding: "4px 10px",
    textTransform: "uppercase" as const,
  },
  footer: {
    padding: "0 32px 32px 32px",
  },
  slogan: {
    color: colors.black,
    fontFamily: fontFamily.display,
    fontSize: "14px",
    fontWeight: "600",
    lineHeight: "20px",
    margin: "0 0 10px 0",
    textAlign: "center" as const,
  },
  footerLinks: {
    color: colors.textMuted,
    fontSize: "13px",
    lineHeight: "18px",
    margin: "0 0 12px 0",
    textAlign: "center" as const,
  },
  footerLink: {
    color: colors.terracotta,
    fontWeight: "600",
    textDecoration: "none",
  },
  copyright: {
    color: colors.textMuted,
    fontSize: "11px",
    lineHeight: "16px",
    margin: "0",
    textAlign: "center" as const,
  },
} as const

export { colors, fontFamily }

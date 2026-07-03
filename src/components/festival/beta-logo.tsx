/**
 * Logo Beta para as páginas do Festival.
 *
 * Usa <img> puro (não next/image) de propósito: em produção o otimizador do
 * next/image recusa SVG (HTTP 400 sem `dangerouslyAllowSVG`), o que quebrava a
 * logo. Servir o SVG local direto (/logos/*.svg) respeita o CSP (img-src 'self')
 * e evita afrouxar a config de imagens do app inteiro.
 */
export function BetaLogo({
  className,
  height = 54,
}: {
  className?: string
  height?: number
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG local; evita a otimização de imagem (que falha p/ SVG em prod)
    <img
      src="/logos/beta-logo-silver.svg"
      alt="Igreja Beta"
      style={{ height, width: "auto" }}
      className={className}
      decoding="async"
    />
  )
}

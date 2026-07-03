/**
 * Bandeirolas (bandeirinhas juninas) decorativas do Festival.
 * Puro CSS (ver festival.css) — sem dependências externas.
 */
export function Bandeirolas({
  count = 16,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <div
      className={`fest-banner ${className ?? ""}`}
      aria-hidden="true"
      role="presentation"
    >
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="fest-flag" />
      ))}
    </div>
  )
}

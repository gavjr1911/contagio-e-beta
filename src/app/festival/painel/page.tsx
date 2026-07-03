"use client"

/**
 * Painel de Resultados do Festival Gastronômico (para exibir no TELÃO).
 *
 * Duas telas:
 *   1) Portão de código — pede o código e chama /api/festival/results.
 *   2) Painel — ranking das barracas por categoria, em formato de slide,
 *      com barras horizontais animadas, medalhas e navegação.
 *
 * Client Component puro (sem useSearchParams): o código vem de um input
 * controlado, evitando a exigência de <Suspense>.
 */

import { useCallback, useEffect, useRef, useState } from "react"

import { Bandeirolas } from "@/components/festival/bandeirolas"
import { BetaLogo } from "@/components/festival/beta-logo"
import { FESTIVAL_TAGLINE, festivalFlagSrc } from "@/lib/festival/data"

import styles from "./painel.module.css"

/* ---------- Tipagem local do contrato da API ---------- */

interface CategoryMeta {
  id: string
  title: string
  short: string
  emoji: string
  dish: "salgado" | "doce" | null
}

interface StateResult {
  key: string
  name: string
  emoji: string
  salgado: string
  doce: string
  votes: number
}

interface StateInfo {
  key: string
  name: string
  emoji: string
  salgado: string
  doce: string
  accent: string
}

interface ResultsData {
  totalVotes: number
  generatedAt: string
  categories: CategoryMeta[]
  results: Record<string, StateResult[]>
  stateByKey: Record<string, StateInfo>
}

interface ApiError {
  error: string
}

const MEDALS = ["🥇", "🥈", "🥉"] as const
const AUTOPLAY_MS = 12_000

export default function PainelResultadoPage() {
  const [data, setData] = useState<ResultsData | null>(null)
  const [code, setCode] = useState("")

  if (!data) {
    return <CodeGate onSuccess={(d, c) => { setData(d); setCode(c) }} />
  }

  return <Panel data={data} code={code} onUpdate={setData} />
}

/* ============================================================
   Tela 1 — Portão de código
   ============================================================ */

function CodeGate({
  onSuccess,
}: {
  onSuccess: (data: ResultsData, code: string) => void
}) {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim()
    if (!trimmed || loading) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/festival/results?code=${encodeURIComponent(trimmed)}`,
      )
      if (res.ok) {
        const json = (await res.json()) as ResultsData
        onSuccess(json, trimmed)
        return
      }
      const json = (await res.json().catch(() => null)) as ApiError | null
      setError(json?.error ?? "Não foi possível carregar o resultado.")
    } catch {
      setError("Falha de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.gateWrap}>
      <Bandeirolas count={20} />
      <div className={`fest-card fest-pop-in ${styles.gateCard}`}>
        <BetaLogo height={54} />
        <div>
          <p className={`fest-kicker ${styles.headerKicker}`}>Igreja Beta</p>
          <h1 className="fest-title" style={{ fontSize: "clamp(1.6rem, 6vw, 2.4rem)" }}>
            Resultado do Festival
          </h1>
        </div>

        <form className={styles.gateForm} onSubmit={handleSubmit}>
          <input
            className={styles.gateInput}
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            placeholder="Digite o código"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            aria-label="Código de acesso ao resultado"
            disabled={loading}
            autoFocus
          />
          {error && <p className={styles.gateError} role="alert">{error}</p>}
          <button
            type="submit"
            className={`fest-btn ${styles.gateBtn}`}
            disabled={loading || !code.trim()}
          >
            {loading ? "Carregando…" : "Entrar"}
          </button>
        </form>
      </div>
      <Bandeirolas count={20} />
    </div>
  )
}

/* ============================================================
   Tela 2 — Painel (telão)
   ============================================================ */

function Panel({
  data,
  code,
  onUpdate,
}: {
  data: ResultsData
  code: string
  onUpdate: (data: ResultsData) => void
}) {
  const categories = data.categories
  const [current, setCurrent] = useState(0)
  const [autoplay, setAutoplay] = useState(false)
  const [grown, setGrown] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const total = categories.length

  const goTo = useCallback(
    (index: number) => {
      if (total === 0) return
      setCurrent(((index % total) + total) % total)
    },
    [total],
  )
  const next = useCallback(() => goTo(current + 1), [goTo, current])
  const prev = useCallback(() => goTo(current - 1), [goTo, current])

  // Reanima as barras a cada troca de slide (duplo rAF para pintar o 0% antes).
  useEffect(() => {
    setGrown(false)
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setGrown(true))
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [current])

  // Auto-play cíclico entre categorias.
  useEffect(() => {
    if (!autoplay) return
    const id = setInterval(() => {
      setCurrent((c) => (total === 0 ? c : (c + 1) % total))
    }, AUTOPLAY_MS)
    return () => clearInterval(id)
  }, [autoplay, total])

  // Estado do fullscreen.
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  // Navegação por teclado (útil no telão).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next()
      else if (e.key === "ArrowLeft") prev()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [next, prev])

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen()
      }
    } catch {
      /* alguns navegadores/contextos bloqueiam; ignora silenciosamente */
    }
  }

  async function refresh() {
    if (refreshing) return
    setRefreshing(true)
    try {
      const res = await fetch(
        `/api/festival/results?code=${encodeURIComponent(code)}`,
      )
      if (res.ok) {
        onUpdate((await res.json()) as ResultsData)
      }
    } catch {
      /* mantém os dados atuais em caso de falha */
    } finally {
      setRefreshing(false)
    }
  }

  const category = categories[current]
  const rows = category ? data.results[category.id] ?? [] : []

  return (
    <div className={styles.panel}>
      <Bandeirolas count={22} className={styles.topBanner} />

      <header className={styles.header}>
        <div className={styles.headerId}>
          <BetaLogo height={54} />
          <div>
            <p className={`fest-kicker ${styles.headerKicker}`}>
              Festival Gastronômico
            </p>
            <h1 className={`fest-title ${styles.headerTitle}`}>Resultado</h1>
          </div>
        </div>
        <div className={styles.totalBox}>
          <CountUp value={data.totalVotes} className={styles.totalNumber} />
          <span className={styles.totalLabel}>
            {data.totalVotes === 1 ? "voto" : "votos"}
          </span>
        </div>
      </header>

      {category ? (
        <section className={styles.slide} aria-live="polite">
          <div className={styles.catHead}>
            <span className={styles.catEmoji} aria-hidden="true">
              {category.emoji}
            </span>
            <h2 className={`fest-title ${styles.catTitle}`}>{category.title}</h2>
            <span className={styles.catCounter}>
              {current + 1} / {total}
            </span>
          </div>

          <Ranking
            key={category.id}
            rows={rows}
            dish={category.dish}
            totalVotes={data.totalVotes}
            grown={grown}
          />

          <div className={styles.nav}>
            <button
              type="button"
              className={`fest-btn-ghost ${styles.ctrlBtn}`}
              onClick={prev}
              aria-label="Categoria anterior"
            >
              ◀ Anterior
            </button>

            <div className={styles.dots} role="tablist" aria-label="Categorias">
              {categories.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={i === current}
                  aria-label={c.short}
                  title={c.short}
                  className={`${styles.dot} ${i === current ? styles.dotActive : ""}`}
                  onClick={() => goTo(i)}
                />
              ))}
            </div>

            <button
              type="button"
              className={`fest-btn-ghost ${styles.ctrlBtn}`}
              onClick={next}
              aria-label="Próxima categoria"
            >
              Próxima ▶
            </button>
          </div>
        </section>
      ) : (
        <section className={styles.slide}>
          <p className={styles.empty}>Nenhuma categoria disponível.</p>
        </section>
      )}

      <div className={styles.controls}>
        <button
          type="button"
          className={`fest-btn-ghost ${styles.ctrlBtn} ${autoplay ? styles.active : ""}`}
          onClick={() => setAutoplay((a) => !a)}
          aria-pressed={autoplay}
        >
          {autoplay ? "⏸ Pausar" : "▶ Auto"}
        </button>
        <button
          type="button"
          className={`fest-btn-ghost ${styles.ctrlBtn}`}
          onClick={toggleFullscreen}
        >
          {isFullscreen ? "⛶ Sair do telão" : "⛶ Modo telão"}
        </button>
        <button
          type="button"
          className={`fest-btn-ghost ${styles.ctrlBtn}`}
          onClick={refresh}
          disabled={refreshing}
        >
          {refreshing ? "↻ Atualizando…" : "↻ Atualizar"}
        </button>
      </div>

      <footer className={`fest-tagline ${styles.footer}`}>
        {FESTIVAL_TAGLINE}
      </footer>
    </div>
  )
}

/* ============================================================
   Ranking em barras horizontais
   ============================================================ */

function Ranking({
  rows,
  dish,
  totalVotes,
  grown,
}: {
  rows: StateResult[]
  dish: "salgado" | "doce" | null
  totalVotes: number
  grown: boolean
}) {
  const maxVotes = rows.length > 0 ? rows[0]!.votes : 0

  if (maxVotes === 0) {
    return <p className={styles.empty}>Nenhum voto ainda 🕐</p>
  }

  return (
    <div className={styles.bars}>
      {rows.map((row, i) => {
        // Empates compartilham a posição (nº de barracas estritamente à frente).
        const rank = rows.filter((r) => r.votes > row.votes).length
        const isFirst = rank === 0 && row.votes > 0
        const medal = row.votes > 0 && rank < MEDALS.length ? MEDALS[rank] : null

        const widthPct = grown ? (row.votes / maxVotes) * 100 : 0
        const sharePct =
          totalVotes > 0 ? Math.round((row.votes / totalVotes) * 100) : 0
        const dishLabel = dish ? row[dish] : null

        return (
          <div
            key={row.key}
            className={`${styles.row} ${isFirst ? styles.firstRow : ""}`}
          >
            <div className={styles.rank} aria-hidden="true">
              {medal ?? i + 1}
            </div>

            <div className={styles.barWrap}>
              <div className={styles.rowTop}>
                {/* eslint-disable-next-line @next/next/no-img-element -- SVG local; evita config de next/image */}
                <img
                  className={styles.flag}
                  src={festivalFlagSrc(row.key)}
                  alt={`Bandeira de ${row.name}`}
                  loading="eager"
                  decoding="async"
                />
                <span className={styles.name}>{row.name}</span>
                {dishLabel && <span className={styles.dish}>{dishLabel}</span>}
              </div>

              <div className={styles.track}>
                <div
                  className={styles.fill}
                  style={{
                    width: `${widthPct}%`,
                    transitionDelay: `${i * 60}ms`,
                    background: `linear-gradient(90deg, var(--fest-green-600), var(--fest-yellow-deep))`,
                    ...(isFirst
                      ? {
                          background:
                            "linear-gradient(90deg, var(--fest-yellow-deep), var(--fest-yellow))",
                        }
                      : {}),
                  }}
                />
                <div className={styles.stats}>
                  <span className={styles.votes}>{row.votes}</span>
                  <span className={styles.pct}>{sharePct}%</span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ============================================================
   Contagem animada (count-up de 0 até value)
   ============================================================ */

function CountUp({
  value,
  className,
  duration = 1400,
}: {
  value: number
  className?: string
  duration?: number
}) {
  const [display, setDisplay] = useState(0)
  const rafRef = useRef(0)

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce || value <= 0) {
      setDisplay(value)
      return
    }

    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(eased * value))
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration])

  return (
    <span className={className}>{display.toLocaleString("pt-BR")}</span>
  )
}

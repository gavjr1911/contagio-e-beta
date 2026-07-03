"use client"

/**
 * Festival Gastronômico — página pública de votação (Igreja Beta).
 *
 * Máquina de estados de passos (mobile-first):
 *   intro → identify → vote (5 categorias) → review → sucesso
 * Recurso TEMPORÁRIO do evento de 04/07/2026 (ver modelo FestivalVote).
 *
 * Sem dependências externas: só CSS (festival.css + festival-form.module.css)
 * e assets locais, respeitando o CSP restritivo do app.
 */

import { useEffect, useMemo, useRef, useState } from "react"

import { Bandeirolas } from "@/components/festival/bandeirolas"
import { BetaLogo } from "@/components/festival/beta-logo"
import {
  FESTIVAL_CATEGORIES,
  FESTIVAL_STATES,
  FESTIVAL_STATE_BY_KEY,
  FESTIVAL_TAGLINE,
  festivalFlagSrc,
  type FestivalCategoryId,
} from "@/lib/festival/data"

import styles from "./festival-form.module.css"

/** Passo atual do fluxo. */
type Step = "intro" | "identify" | "vote" | "review"
/** Desfecho após o envio (ou já-votou detectado no localStorage). */
type Outcome = "voting" | "success" | "already"

/** Escolhas do usuário: categoria → key do estado (ex.: "BA"). */
type Choices = Partial<Record<FestivalCategoryId, string>>

const STORAGE_KEY = "festival_voted"
const AUTO_ADVANCE_MS = 400

/** Formata dígitos no padrão (99) 99999-9999 progressivamente. */
function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11)
  if (d.length === 0) return ""
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** Emojis decorativos flutuantes da capa. */
const FLOAT_EMOJIS = [
  { emoji: "🌽", top: "12%", left: "8%", delay: "0s", dur: "4s" },
  { emoji: "🎪", top: "22%", left: "82%", delay: "0.8s", dur: "4.6s" },
  { emoji: "🔥", top: "68%", left: "12%", delay: "1.4s", dur: "3.8s" },
  { emoji: "🎶", top: "74%", left: "80%", delay: "0.4s", dur: "5s" },
]

/** Cores usadas no confete da tela de sucesso. */
const CONFETTI_COLORS = [
  "var(--fest-yellow)",
  "var(--fest-red)",
  "var(--fest-blue)",
  "var(--fest-green-600)",
]

export default function FestivalVotePage() {
  const [outcome, setOutcome] = useState<Outcome>("voting")
  const [step, setStep] = useState<Step>("intro")
  const [categoryIndex, setCategoryIndex] = useState(0)

  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [idErrors, setIdErrors] = useState<{ name?: string; phone?: string }>({})

  const [choices, setChoices] = useState<Choices>({})

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Se já votou neste dispositivo, mostra direto a tela de agradecimento.
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") setOutcome("already")
    } catch {
      /* localStorage indisponível — segue o fluxo normal. */
    }
  }, [])

  // Limpa timer de auto-avanço ao desmontar.
  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
    }
  }, [])

  function clearAdvanceTimer() {
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current)
      advanceTimer.current = null
    }
  }

  // ---------- Passo IDENTIFICAÇÃO ----------
  function validateIdentity(): boolean {
    const next: { name?: string; phone?: string } = {}
    const words = fullName.trim().split(/\s+/).filter(Boolean)
    if (words.length < 2) {
      next.name = "Informe seu nome completo (nome e sobrenome)."
    }
    const digits = phone.replace(/\D/g, "")
    if (digits.length < 10 || digits.length > 13) {
      next.phone = "Telefone inválido. Informe DDD + número."
    }
    setIdErrors(next)
    return Object.keys(next).length === 0
  }

  function handleIdentityContinue() {
    if (validateIdentity()) {
      setStep("vote")
      setCategoryIndex(0)
    }
  }

  // ---------- Passo VOTAÇÃO ----------
  function selectBarraca(categoryId: FestivalCategoryId, key: string) {
    clearAdvanceTimer()
    setChoices((prev) => ({ ...prev, [categoryId]: key }))
    // Auto-avança suavemente após a seleção, mantendo os botões.
    advanceTimer.current = setTimeout(() => {
      goNextFromVote()
    }, AUTO_ADVANCE_MS)
  }

  function goNextFromVote() {
    clearAdvanceTimer()
    if (categoryIndex < FESTIVAL_CATEGORIES.length - 1) {
      setCategoryIndex((i) => i + 1)
    } else {
      setStep("review")
    }
  }

  function goBackFromVote() {
    clearAdvanceTimer()
    if (categoryIndex > 0) {
      setCategoryIndex((i) => i - 1)
    } else {
      setStep("identify")
    }
  }

  // ---------- Passo REVISÃO / ENVIO ----------
  function editCategory(index: number) {
    setCategoryIndex(index)
    setStep("vote")
  }

  async function handleSubmit() {
    setSubmitError(null)
    setSubmitting(true)
    try {
      const res = await fetch("/api/festival/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.replace(/\D/g, ""),
          barracaBonita: choices.barracaBonita,
          melhorAtendimento: choices.melhorAtendimento,
          gastronomiaSalgada: choices.gastronomiaSalgada,
          gastronomiaDoce: choices.gastronomiaDoce,
          espiritoBeta: choices.espiritoBeta,
        }),
      })

      if (res.status === 201) {
        try {
          localStorage.setItem(STORAGE_KEY, "1")
        } catch {
          /* ignora indisponibilidade do storage */
        }
        setOutcome("success")
        return
      }

      const data = (await res.json().catch(() => null)) as {
        error?: string
      } | null

      if (res.status === 409) {
        // Telefone já registrou voto — trata como "já votou".
        try {
          localStorage.setItem(STORAGE_KEY, "1")
        } catch {
          /* ignora */
        }
        setOutcome("already")
        return
      }

      setSubmitError(
        data?.error ?? "Não foi possível registrar seu voto. Tente novamente.",
      )
    } catch {
      setSubmitError(
        "Falha de conexão. Verifique sua internet e tente novamente.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  const allChosen = FESTIVAL_CATEGORIES.every((c) => choices[c.id])

  // ============================================================
  // TELAS DE DESFECHO (sucesso / já votou)
  // ============================================================
  if (outcome === "success" || outcome === "already") {
    return <ThankYouScreen outcome={outcome} />
  }

  // ============================================================
  // FLUXO DE VOTAÇÃO
  // ============================================================
  return (
    <main className="relative flex min-h-[100svh] flex-col items-center px-4 pb-14">
      <Bandeirolas count={18} className="shrink-0" />

      {/* Emojis decorativos flutuantes só na capa */}
      {step === "intro" && (
        <div className={styles.floatLayer} aria-hidden="true">
          {FLOAT_EMOJIS.map((f) => (
            <span
              key={f.emoji}
              className={`${styles.floatEmoji} fest-float`}
              style={{
                top: f.top,
                left: f.left,
                animationDelay: f.delay,
                animationDuration: f.dur,
              }}
            >
              {f.emoji}
            </span>
          ))}
        </div>
      )}

      <div className="relative z-10 flex w-full max-w-lg flex-1 flex-col">
        {step === "intro" && (
          <IntroStep onStart={() => setStep("identify")} />
        )}

        {step === "identify" && (
          <IdentifyStep
            fullName={fullName}
            phone={phone}
            errors={idErrors}
            onNameChange={(v) => {
              setFullName(v)
              if (idErrors.name) setIdErrors((e) => ({ ...e, name: undefined }))
            }}
            onPhoneChange={(v) => {
              setPhone(formatPhone(v))
              if (idErrors.phone)
                setIdErrors((e) => ({ ...e, phone: undefined }))
            }}
            onBack={() => setStep("intro")}
            onContinue={handleIdentityContinue}
          />
        )}

        {step === "vote" && (
          <VoteStep
            key={categoryIndex}
            index={categoryIndex}
            selectedKey={choices[FESTIVAL_CATEGORIES[categoryIndex]!.id]}
            onSelect={selectBarraca}
            onBack={goBackFromVote}
            onNext={goNextFromVote}
          />
        )}

        {step === "review" && (
          <ReviewStep
            choices={choices}
            submitting={submitting}
            error={submitError}
            allChosen={allChosen}
            onEdit={editCategory}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </main>
  )
}

/* ============================================================
   PASSO 1 — INTRO (capa)
   ============================================================ */
function IntroStep({ onStart }: { onStart: () => void }) {
  return (
    <section className="fest-fade-up flex flex-1 flex-col items-center justify-center gap-5 py-10 text-center">
      <BetaLogo height={54} className="fest-float" />

      <div>
        <p
          className="fest-kicker"
          style={{ fontSize: "0.85rem", marginBottom: "0.4rem" }}
        >
          Festival
        </p>
        <h1
          className="fest-title"
          style={{ fontSize: "clamp(2rem, 11vw, 4.5rem)", maxWidth: "100%" }}
        >
          GASTRONÔMICO
        </h1>
        <p
          style={{
            fontSize: "clamp(1.1rem, 5vw, 1.5rem)",
            fontWeight: 600,
            color: "var(--fest-cream)",
            marginTop: "0.35rem",
          }}
        >
          Igreja Beta
        </p>
      </div>

      <p className="fest-tagline" style={{ fontSize: "clamp(0.95rem, 4vw, 1.2rem)" }}>
        {FESTIVAL_TAGLINE}
      </p>

      <button
        type="button"
        className="fest-btn fest-pop-in"
        onClick={onStart}
        style={{ fontSize: "1.25rem", padding: "1rem 2.25rem", marginTop: "0.5rem" }}
      >
        Começar a votar 🎉
      </button>

      <p style={{ fontSize: "0.85rem", color: "var(--fest-cream-dim)" }}>
        5 categorias • leva 1 minutinho
      </p>
    </section>
  )
}

/* ============================================================
   PASSO 2 — IDENTIFICAÇÃO
   ============================================================ */
function IdentifyStep({
  fullName,
  phone,
  errors,
  onNameChange,
  onPhoneChange,
  onBack,
  onContinue,
}: {
  fullName: string
  phone: string
  errors: { name?: string; phone?: string }
  onNameChange: (v: string) => void
  onPhoneChange: (v: string) => void
  onBack: () => void
  onContinue: () => void
}) {
  return (
    <section className="fest-fade-up flex flex-1 flex-col justify-center gap-6 py-8">
      <header className="text-center">
        <h2
          className="fest-title"
          style={{ fontSize: "clamp(1.75rem, 8vw, 2.5rem)" }}
        >
          Quem é você? 👋
        </h2>
        <p style={{ color: "var(--fest-cream-dim)", marginTop: "0.5rem" }}>
          Só pra garantir um voto por pessoa.
        </p>
      </header>

      <form
        className="fest-card flex flex-col gap-5"
        style={{ padding: "1.5rem" }}
        onSubmit={(e) => {
          e.preventDefault()
          onContinue()
        }}
        noValidate
      >
        <div className={styles.field}>
          <label className={styles.label} htmlFor="fest-name">
            Nome completo
          </label>
          <input
            id="fest-name"
            name="name"
            type="text"
            autoComplete="name"
            inputMode="text"
            placeholder="Ex.: Maria Silva"
            className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
            value={fullName}
            onChange={(e) => onNameChange(e.target.value)}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "fest-name-err" : undefined}
          />
          {errors.name && (
            <span id="fest-name-err" className={styles.errorMsg} role="alert">
              {errors.name}
            </span>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="fest-phone">
            Telefone (WhatsApp)
          </label>
          <input
            id="fest-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="numeric"
            placeholder="(11) 99999-9999"
            className={`${styles.input} ${errors.phone ? styles.inputError : ""}`}
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "fest-phone-err" : undefined}
          />
          {errors.phone && (
            <span id="fest-phone-err" className={styles.errorMsg} role="alert">
              {errors.phone}
            </span>
          )}
        </div>

        <p className={styles.lockNote}>
          <span aria-hidden="true">🔒</span>
          <span>
            Seu voto é secreto: não divulgamos quem votou em quem. Pedimos nome
            e telefone apenas para garantir um voto por pessoa.
          </span>
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="fest-btn-ghost"
            onClick={onBack}
            style={{ padding: "0.85rem 1.25rem" }}
          >
            Voltar
          </button>
          <button
            type="submit"
            className="fest-btn flex-1"
            style={{ padding: "1rem 1.5rem", fontSize: "1.1rem" }}
          >
            Continuar
          </button>
        </div>
      </form>
    </section>
  )
}

/* ============================================================
   PASSO 3 — VOTAÇÃO (por categoria)
   ============================================================ */
function VoteStep({
  index,
  selectedKey,
  onSelect,
  onBack,
  onNext,
}: {
  index: number
  selectedKey: string | undefined
  onSelect: (categoryId: FestivalCategoryId, key: string) => void
  onBack: () => void
  onNext: () => void
}) {
  const category = FESTIVAL_CATEGORIES[index]!
  const total = FESTIVAL_CATEGORIES.length

  return (
    <section className="fest-fade-up flex flex-1 flex-col gap-5 py-6">
      {/* Progresso */}
      <div className="flex flex-col items-center gap-3">
        <p
          className="fest-kicker"
          style={{ fontSize: "0.75rem", letterSpacing: "0.2em" }}
        >
          Pergunta {index + 1} de {total}
        </p>
        <div
          className={styles.progress}
          role="progressbar"
          aria-valuenow={index + 1}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-label={`Pergunta ${index + 1} de ${total}`}
        >
          {FESTIVAL_CATEGORIES.map((c, i) => (
            <span
              key={c.id}
              className={`${styles.progressDot} ${
                i === index
                  ? styles.progressDotActive
                  : i < index
                    ? styles.progressDotDone
                    : ""
              }`}
            />
          ))}
        </div>
      </div>

      {/* Enunciado */}
      <header className="text-center">
        <div style={{ fontSize: "3rem", lineHeight: 1 }} aria-hidden="true">
          {category.emoji}
        </div>
        <h2
          className="fest-title"
          style={{ fontSize: "clamp(1.5rem, 7vw, 2.25rem)", marginTop: "0.5rem" }}
        >
          {category.title}
        </h2>
        <p
          style={{
            color: "var(--fest-cream)",
            marginTop: "0.5rem",
            fontSize: "1rem",
            lineHeight: 1.35,
          }}
        >
          {category.prompt}
        </p>
        <p
          style={{
            color: "var(--fest-cream-dim)",
            marginTop: "0.5rem",
            fontSize: "0.85rem",
            lineHeight: 1.35,
          }}
        >
          <strong style={{ color: "var(--fest-yellow)" }}>Considere:</strong>{" "}
          {category.considere}
        </p>
      </header>

      {/* Grade de barracas */}
      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-3"
        role="radiogroup"
        aria-label={category.title}
      >
        {FESTIVAL_STATES.map((state) => {
          const isSelected = selectedKey === state.key
          const dishText = category.dish ? state[category.dish] : null
          return (
            <button
              key={state.key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`${styles.barraca} ${
                isSelected ? styles.barracaSelected : ""
              }`}
              style={
                isSelected
                  ? {
                      borderColor: state.accent,
                      background: `${state.accent}26`,
                      boxShadow: `0 0 0 2px ${state.accent}, 0 8px 22px ${state.accent}55`,
                    }
                  : undefined
              }
              onClick={() => onSelect(category.id, state.key)}
            >
              {isSelected && (
                <span
                  className={styles.check}
                  style={{ background: state.accent }}
                  aria-hidden="true"
                >
                  ✓
                </span>
              )}
              {/* Bandeira oficial do estado (img comum p/ SVG, sem next/image). */}
              <span className={styles.flagBox}>
                {/* eslint-disable-next-line @next/next/no-img-element -- SVG local; next/image exigiria config extra e o CSP proíbe otimização remota. */}
                <img
                  className={styles.flagImg}
                  src={festivalFlagSrc(state.key)}
                  alt={`Bandeira de ${state.name}`}
                  width={52}
                  height={35}
                  loading="lazy"
                  decoding="async"
                />
              </span>
              <span className={styles.barracaName}>{state.name}</span>
              {dishText && <span className={styles.barracaDish}>{dishText}</span>}
            </button>
          )
        })}
      </div>

      {/* Navegação */}
      <div className="mt-1 flex items-center gap-3">
        <button
          type="button"
          className="fest-btn-ghost"
          onClick={onBack}
          style={{ padding: "0.85rem 1.25rem" }}
        >
          Voltar
        </button>
        <button
          type="button"
          className="fest-btn flex-1"
          onClick={onNext}
          disabled={!selectedKey}
          style={{ padding: "1rem 1.5rem", fontSize: "1.1rem" }}
        >
          {index < total - 1 ? "Próximo" : "Revisar votos"}
        </button>
      </div>
    </section>
  )
}

/* ============================================================
   PASSO 4 — REVISÃO / ENVIO
   ============================================================ */
function ReviewStep({
  choices,
  submitting,
  error,
  allChosen,
  onEdit,
  onSubmit,
}: {
  choices: Choices
  submitting: boolean
  error: string | null
  allChosen: boolean
  onEdit: (index: number) => void
  onSubmit: () => void
}) {
  return (
    <section className="fest-fade-up flex flex-1 flex-col gap-5 py-6">
      <header className="text-center">
        <h2
          className="fest-title"
          style={{ fontSize: "clamp(1.75rem, 8vw, 2.5rem)" }}
        >
          Confira seus votos 📝
        </h2>
        <p style={{ color: "var(--fest-cream-dim)", marginTop: "0.5rem" }}>
          Pode editar antes de enviar.
        </p>
      </header>

      <div className="flex flex-col gap-2.5">
        {FESTIVAL_CATEGORIES.map((category, i) => {
          const key = choices[category.id]
          const state = key ? FESTIVAL_STATE_BY_KEY[key] : undefined
          return (
            <div key={category.id} className={styles.reviewRow}>
              <span style={{ fontSize: "1.6rem" }} aria-hidden="true">
                {category.emoji}
              </span>
              <div className="flex flex-col">
                <span className={styles.reviewCat}>{category.short}</span>
                <span className={styles.reviewChoice}>
                  {state ? (
                    <>
                      {state.emoji} {state.name}
                    </>
                  ) : (
                    "— não escolhido"
                  )}
                </span>
              </div>
              <button
                type="button"
                className={styles.reviewEdit}
                onClick={() => onEdit(i)}
              >
                Editar
              </button>
            </div>
          )
        })}
      </div>

      {error && (
        <p className={styles.alertBox} role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        className="fest-btn"
        onClick={onSubmit}
        disabled={submitting || !allChosen}
        style={{ padding: "1.1rem 1.5rem", fontSize: "1.2rem" }}
      >
        {submitting ? "Enviando…" : "Enviar meus votos 🎉"}
      </button>
    </section>
  )
}

/* ============================================================
   PASSO 5/6 — SUCESSO / JÁ VOTOU
   ============================================================ */
function ThankYouScreen({ outcome }: { outcome: "success" | "already" }) {
  // Peças de confete geradas uma única vez (posições/atrasos fixos).
  const confetti = useMemo(
    () =>
      Array.from({ length: 40 }).map((_, i) => ({
        left: `${(i * 2.5 + (i % 5) * 3) % 100}%`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
        delay: `${(i % 10) * 0.25}s`,
        duration: `${2.8 + (i % 6) * 0.35}s`,
        width: i % 3 === 0 ? "9px" : "12px",
      })),
    [],
  )

  const isSuccess = outcome === "success"

  return (
    <main className="relative flex min-h-[100svh] flex-col items-center px-4 pb-14">
      <Bandeirolas count={18} />

      {isSuccess && (
        <div className={styles.confettiWrap} aria-hidden="true">
          {confetti.map((c, i) => (
            <span
              key={i}
              className={styles.confetti}
              style={{
                left: c.left,
                background: c.color,
                width: c.width,
                animationDelay: c.delay,
                animationDuration: c.duration,
              }}
            />
          ))}
        </div>
      )}

      <section className="fest-pop-in relative z-10 flex flex-1 flex-col items-center justify-center gap-5 text-center">
        <BetaLogo height={54} className="fest-float" />

        <div style={{ fontSize: "3.5rem", lineHeight: 1 }} aria-hidden="true">
          {isSuccess ? "🎉" : "🙌"}
        </div>

        <h1 className="fest-title" style={{ fontSize: "clamp(2rem, 10vw, 3.25rem)" }}>
          {isSuccess ? "Voto registrado!" : "Você já votou!"}
        </h1>

        <p
          style={{
            color: "var(--fest-cream)",
            fontSize: "1.1rem",
            lineHeight: 1.45,
            maxWidth: "26rem",
          }}
        >
          {isSuccess
            ? "Muito obrigado por participar do nosso Festival! Sua voz ajuda a celebrar cada barraca. Que Deus abençoe você. 💚"
            : "Seu voto já foi contabilizado neste dispositivo. Obrigado por celebrar o Festival com a gente! 💚"}
        </p>

        <p
          className="fest-tagline"
          style={{ fontSize: "clamp(0.95rem, 4vw, 1.2rem)", marginTop: "0.5rem" }}
        >
          {FESTIVAL_TAGLINE}
        </p>
      </section>
    </main>
  )
}

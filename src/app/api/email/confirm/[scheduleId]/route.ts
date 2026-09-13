import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendScheduleConfirmation } from "@/lib/email/send"
import {
  escapeHtml,
  isAutomatedRequest,
  isThrottled,
  redactPII,
  registerInvalidAttempt,
  validateToken,
  type ConfirmAction,
} from "./guards"
import {
  formatDateToISO,
  formatEventDateLongPtBR,
  formatTimeToHHMM,
  getTodayLocal,
} from "@/lib/date-utils"

// URL de redirecionamento — prioriza NEXT_PUBLIC_APP_URL, cai para NEXTAUTH_URL (sempre setado em prod)
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXTAUTH_URL ||
  "http://localhost:3005"

type RouteParams = {
  params: Promise<{ scheduleId: string }>
}

// ============================================================
// GET x POST — por que a ação mudou de método
// ============================================================
//
// O link do e-mail continua sendo um GET (é o que dá para colocar num e-mail),
// mas GET aqui NÃO altera nada: ele apenas renderiza uma página de confirmação
// com um botão que faz POST para a mesma URL. A mutação vive só no POST.
//
// Motivo: antes, qualquer GET nesta URL confirmava ou recusava a escala. Quem
// faz GET nesses links sem ninguém ter clicado:
//   - scanners de link de provedores e antivírus (Safe Links, Proofpoint,
//     Defender, gateways corporativos) — visitam todo link do corpo do e-mail
//     assim que ele chega;
//   - pré-visualização de link do cliente de e-mail e de apps de mensagem;
//   - prefetch/prerender do navegador ao digitar ou passar o mouse.
// Qualquer um deles confirmava presença no lugar do voluntário — e uma
// presença "confirmada" que a pessoa nunca deu é pior do que uma pendente,
// porque ninguém vai atrás dela.
//
// A experiência a partir do e-mail continua sendo um clique para chegar aqui;
// o que se acrescenta é um clique deliberado na página ("Sim, confirmar"), que
// é exatamente o sinal de intenção humana que faltava. O formulário é HTML
// puro, então funciona sem JavaScript.
//
// Como defesa extra, os sinais de prefetch conhecidos são recusados também no
// POST, e toda resposta vai com `no-store` para nenhum intermediário guardar a
// página de ação.

/**
 * GET — página de confirmação explícita. Não altera nada.
 *
 * GET /api/email/confirm/[scheduleId]?action=confirm&token=xxx
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { scheduleId } = await params

  try {
    const { searchParams } = new URL(request.url)
    const resolved = await resolveRequest(
      scheduleId,
      searchParams.get("action"),
      searchParams.get("token")
    )

    if (!resolved.ok) return resolved.response

    const { action, schedule } = resolved
    return renderConfirmationPage(scheduleId, action, schedule, searchParams.get("token")!)
  } catch (error) {
    console.error(
      `[Email/Confirm] Erro ao montar pagina (scheduleId=${scheduleId}):`,
      redactPII(error)
    )
    return renderResultPage("error", "Ocorreu um erro ao processar sua solicitacao")
  }
}

/**
 * POST — executa a confirmação/recusa. Disparado pelo formulário da página do
 * GET (ou por um cliente que saiba montar o POST com o token válido).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { scheduleId } = await params

  try {
    if (isAutomatedRequest(request.headers)) {
      // Nenhum scanner/prefetch legítimo faz POST, mas se fizer não deve agir
      // em nome da pessoa.
      return renderResultPage(
        "error",
        "Nao foi possivel confirmar automaticamente. Abra o link e clique no botao."
      )
    }

    const { searchParams } = new URL(request.url)
    const form = await readForm(request)

    const action = form.get("action") ?? searchParams.get("action")
    const token = form.get("token") ?? searchParams.get("token")

    const resolved = await resolveRequest(scheduleId, action, token)
    if (!resolved.ok) return resolved.response

    const { schedule } = resolved
    const newStatus = resolved.action === "confirm" ? "CONFIRMED" : "DECLINED"

    await prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        status: newStatus,
        confirmedAt: resolved.action === "confirm" ? new Date() : null,
        // `confirmedById` significa "confirmado EM NOME DE outra pessoa".
        // Este caminho e sempre a propria pessoa agindo pelo link do e-mail,
        // entao a autoria de terceiro tem de ser apagada nos dois casos.
        //
        // Sem isto, uma escala confirmada por um lider e depois RECUSADA pela
        // propria pessoa mantinha `confirmedById` preenchido: a tela mostrava
        // "Recusada" e "Confirmado por <lider>" ao mesmo tempo. Pior, se a
        // pessoa confirmasse de novo pelo link, o registro diria que quem
        // confirmou foi o lider — e um terceiro passaria a poder desfazer uma
        // decisao que foi dela.
        confirmedById: null,
      },
    })

    if (resolved.action === "confirm") {
      // Busca outros membros da equipe para mostrar no email
      const teamSchedules = await prisma.schedule.findMany({
        where: {
          eventId: schedule.eventId,
          ministryId: schedule.ministryId,
          status: "CONFIRMED",
          id: { not: scheduleId },
        },
        include: { user: true },
      })

      const teamMembers = teamSchedules.map((s) => ({
        name: s.user.name || "Voluntario",
        position: s.position || undefined,
      }))

      // Envia email de confirmacao (em background)
      sendScheduleConfirmation(
        schedule as Parameters<typeof sendScheduleConfirmation>[0],
        teamMembers
      ).catch((error) => {
        // Só identificadores no log: os logs do Railway são retidos e visíveis
        // a todo mundo com acesso ao projeto.
        console.error(
          `[Email/Confirm] Falha ao enviar confirmacao (scheduleId=${schedule.id} userId=${schedule.userId}):`,
          redactPII(error)
        )
      })
    }

    const message =
      resolved.action === "confirm"
        ? "Presenca confirmada com sucesso!"
        : "Escala recusada. Obrigado por nos avisar."

    return renderResultPage("success", message, schedule.eventId)
  } catch (error) {
    console.error(
      `[Email/Confirm] Erro ao processar acao (scheduleId=${scheduleId}):`,
      redactPII(error)
    )
    return renderResultPage("error", "Ocorreu um erro ao processar sua solicitacao")
  }
}

type ScheduleWithRelations = Awaited<ReturnType<typeof loadSchedule>>

async function loadSchedule(scheduleId: string) {
  return prisma.schedule.findUnique({
    where: { id: scheduleId },
    include: { event: true, ministry: true, user: true },
  })
}

type ResolveResult =
  | { ok: true; action: ConfirmAction; schedule: NonNullable<ScheduleWithRelations> }
  | { ok: false; response: NextResponse }

/**
 * Valida parâmetros, token e estado da escala. Compartilhado por GET e POST
 * para que a página mostrada e a ação executada nunca divirjam.
 */
async function resolveRequest(
  scheduleId: string,
  rawAction: string | null,
  token: string | null
): Promise<ResolveResult> {
  if (!rawAction || !["confirm", "decline"].includes(rawAction)) {
    return { ok: false, response: renderResultPage("error", "Acao invalida") }
  }
  const action = rawAction as ConfirmAction

  if (!token) {
    return { ok: false, response: renderResultPage("error", "Token nao fornecido") }
  }

  const tokenValidation = validateToken(scheduleId, action, token)
  if (!tokenValidation.valid) {
    // Só tentativa inválida consome orçamento de rate limit — ver comentário
    // extenso em `guards.ts`. Quem chega com token válido nunca é barrado,
    // então rede compartilhada/NAT não gera bloqueio cruzado.
    const nowBlocked = registerInvalidAttempt(scheduleId)
    if (nowBlocked || isThrottled(scheduleId)) {
      console.warn(
        `[Email/Confirm] Excesso de tokens invalidos (scheduleId=${scheduleId}) — possivel forca bruta`
      )
      return {
        ok: false,
        response: renderResultPage(
          "error",
          "Muitas tentativas invalidas para esta escala. Aguarde alguns minutos e use o link mais recente do e-mail."
        ),
      }
    }

    return {
      ok: false,
      response: renderResultPage(
        "error",
        tokenValidation.error || "Token invalido ou expirado"
      ),
    }
  }

  const schedule = await loadSchedule(scheduleId)
  if (!schedule) {
    return { ok: false, response: renderResultPage("error", "Escala nao encontrada") }
  }

  const eventDateStr = formatDateToISO(schedule.event.date)
  const todayStr = formatDateToISO(getTodayLocal())
  if (eventDateStr < todayStr) {
    return { ok: false, response: renderResultPage("error", "Este evento ja ocorreu") }
  }

  if (schedule.status === "CONFIRMED" && action === "confirm") {
    return { ok: false, response: renderResultPage("info", "Voce ja confirmou esta escala") }
  }

  if (schedule.status === "DECLINED" && action === "decline") {
    return { ok: false, response: renderResultPage("info", "Voce ja recusou esta escala") }
  }

  return { ok: true, action, schedule }
}

/** Lê o corpo do POST quando ele vier como formulário; tolera corpo vazio. */
async function readForm(request: NextRequest): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  const contentType = request.headers.get("content-type") ?? ""

  if (
    !contentType.includes("application/x-www-form-urlencoded") &&
    !contentType.includes("multipart/form-data")
  ) {
    return result
  }

  try {
    const data = await request.formData()
    for (const [key, value] of data.entries()) {
      if (typeof value === "string") result.set(key, value)
    }
  } catch {
    // Corpo ausente ou malformado — cai para os query params.
  }

  return result
}

/**
 * Página intermediária: mostra do que se trata e exige um clique deliberado.
 * Sem PII além do necessário para a pessoa reconhecer a própria escala (nome
 * do evento, ministério, data e horário) — nome e e-mail do voluntário não
 * aparecem, já que a página pode ser buscada por um scanner.
 */
function renderConfirmationPage(
  scheduleId: string,
  action: ConfirmAction,
  schedule: NonNullable<ScheduleWithRelations>,
  token: string
): NextResponse {
  const confirming = action === "confirm"
  const titulo = confirming ? "Confirmar presenca" : "Recusar escala"
  const botao = confirming ? "Sim, confirmar presenca" : "Sim, recusar escala"
  const cor = confirming ? "#16a34a" : "#dc2626"

  const evento = escapeHtml(schedule.event.name)
  const ministerio = escapeHtml(schedule.ministry.name)
  const data = escapeHtml(formatEventDateLongPtBR(schedule.event.date))
  const hora = escapeHtml(formatTimeToHHMM(schedule.event.startTime))
  const actionAttr = escapeHtml(action)
  const tokenAttr = escapeHtml(token)
  // Caminho RELATIVO de proposito: a CSP tem `form-action 'self'` (next.config.ts).
  // Com URL absoluta montada a partir de APP_URL, qualquer divergencia entre
  // NEXT_PUBLIC_APP_URL e o host que serviu a pagina (apex vs subdominio, www,
  // dominio .up.railway.app num rollback) faz o navegador BLOQUEAR o submit em
  // silencio — o botao simplesmente nao faz nada. Relativo nunca diverge.
  const url = `/api/email/confirm/${encodeURIComponent(scheduleId)}`

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(titulo)}</title>
<style>
  :root { color-scheme: light dark; }
  body { margin:0; padding:24px; font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;
         background:#f8fafc; color:#0f172a; display:flex; justify-content:center; }
  .card { background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:24px; max-width:440px; width:100%; }
  h1 { font-size:20px; margin:0 0 16px; }
  dl { margin:0 0 24px; }
  dt { font-size:12px; text-transform:uppercase; letter-spacing:.04em; color:#64748b; margin-top:12px; }
  dd { margin:2px 0 0; font-weight:600; }
  button { width:100%; padding:14px 16px; font-size:16px; font-weight:600; color:#fff;
           background:${cor}; border:0; border-radius:8px; cursor:pointer; }
  p.aviso { margin:16px 0 0; font-size:13px; color:#64748b; }
  @media (prefers-color-scheme: dark) {
    body { background:#0f172a; color:#e2e8f0; }
    .card { background:#1e293b; border-color:#334155; }
    dd { color:#f1f5f9; }
  }
</style>
</head>
<body>
  <main class="card">
    <h1>${escapeHtml(titulo)}</h1>
    <dl>
      <dt>Evento</dt><dd>${evento}</dd>
      <dt>Ministerio</dt><dd>${ministerio}</dd>
      <dt>Data</dt><dd>${data} as ${hora}</dd>
    </dl>
    <form method="post" action="${escapeHtml(url)}">
      <input type="hidden" name="action" value="${actionAttr}">
      <input type="hidden" name="token" value="${tokenAttr}">
      <button type="submit">${escapeHtml(botao)}</button>
    </form>
    <p class="aviso">Nada foi alterado ainda. A escala so muda quando voce clicar no botao acima.</p>
  </main>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    },
  })
}

/**
 * Renderiza o desfecho da acao para o voluntario.
 *
 * NAO redireciona para dentro da aplicacao. O voluntario chega aqui pelo link
 * do e-mail, tipicamente SEM sessao: `/eventos/<id>` e `/` vivem sob
 * `(dashboard)/layout.tsx`, que faz `redirect("/login")` quando nao ha sessao.
 * Redirecionar para la fazia todo desfecho — sucesso, "ja confirmou", token
 * expirado, escala inexistente — terminar na mesma tela de login, sem mensagem
 * alguma (nenhuma pagina do app le `?type=`/`?message=`). A escala era de fato
 * atualizada, mas a pessoa via apenas um login e concluia que o link falhou.
 *
 * A resposta e sempre 200 com HTML proprio: o desfecho precisa ser legivel por
 * quem nao esta logado.
 */
function renderResultPage(
  type: "success" | "error" | "info",
  message: string,
  eventId?: string
): NextResponse {
  const cor = type === "success" ? "#16a34a" : type === "error" ? "#dc2626" : "#0284c7"
  const titulo =
    type === "success" ? "Tudo certo" : type === "error" ? "Nao foi possivel concluir" : "Aviso"

  // Link opcional para o evento. Exige login — por isso e um convite explicito,
  // nunca um redirecionamento automatico.
  const destino = eventId ? `${APP_URL}/eventos/${encodeURIComponent(eventId)}` : APP_URL
  const rotulo = eventId ? "Ver detalhes do evento" : "Abrir o sistema"

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(titulo)}</title>
<style>
  :root { color-scheme: light dark; }
  body { margin:0; padding:24px; font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;
         background:#f8fafc; color:#0f172a; display:flex; justify-content:center; }
  .card { background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:24px; max-width:440px; width:100%; }
  h1 { font-size:20px; margin:0 0 8px; color:${cor}; }
  p.msg { margin:0 0 24px; font-size:16px; }
  a.acao { display:block; text-align:center; padding:14px 16px; font-size:16px; font-weight:600;
           color:#0f172a; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:8px; text-decoration:none; }
  p.aviso { margin:16px 0 0; font-size:13px; color:#64748b; }
  @media (prefers-color-scheme: dark) {
    body { background:#0f172a; color:#e2e8f0; }
    .card { background:#1e293b; border-color:#334155; }
    a.acao { color:#e2e8f0; background:#334155; border-color:#475569; }
  }
</style>
</head>
<body>
  <main class="card">
    <h1>${escapeHtml(titulo)}</h1>
    <p class="msg">${escapeHtml(message)}</p>
    <a class="acao" href="${escapeHtml(destino)}">${escapeHtml(rotulo)}</a>
    <p class="aviso">Voce precisa estar logado para abrir o sistema.</p>
  </main>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    },
  })
}

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

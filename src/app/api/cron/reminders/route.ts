import { NextRequest, NextResponse } from "next/server"
import { sendAllReminders } from "@/lib/email/send"
import { isAuthorizedCronRequest } from "@/lib/cron/auth"
import { recordReminderRun } from "@/lib/cron/last-run.store"
import { redactPII } from "@/lib/log-redact"

// Chave de autenticacao para cron jobs
const CRON_SECRET = process.env.CRON_SECRET;
if (!CRON_SECRET) {
  throw new Error("CRON_SECRET não configurado — defina a variável de ambiente");
}

/**
 * Endpoint para envio automatico de lembretes de escala (7, 3 e 1 dia antes).
 *
 * Acionado pelo cron do Railway (ver docs/DEPLOY.md), diariamente:
 *   curl -fsS -H "x-cron-secret: $CRON_SECRET" https://<host>/api/cron/reminders
 *
 * Autenticacao: o segredo e obrigatorio em TODOS os ambientes. Nao ha
 * confianca em header de provedor (`x-vercel-cron` e afins) — o projeto nao
 * roda na Vercel e qualquer cliente pode forjar esse header, o que tornaria
 * o disparo em massa de e-mails publico.
 *
 * Status HTTP (proposital):
 * - 200 quando o lote foi processado, MESMO com falhas parciais. O cron usa
 *   `curl -fsS`; um status de erro faz o curl sair com codigo != 0, o que pode
 *   acionar restart do container e reenviar e-mails. O corpo devolve apenas a
 *   CONTAGEM de falhas (`errorCount`); o detalhe fica em AppSettings
 *   (`last_reminder_run`) e a tela de Configuracoes mostra ALERTA quando
 *   `failed > 0`.
 * - 5xx apenas quando o lote inteiro falhou/lançou (nada foi processado).
 */
export async function GET(request: NextRequest) {
  // Valida autenticacao (segredo obrigatorio, comparacao em tempo constante)
  const authorized = isAuthorizedCronRequest(
    {
      cronSecret: request.headers.get("x-cron-secret"),
      authorization: request.headers.get("authorization"),
    },
    CRON_SECRET
  )

  if (!authorized) {
    console.warn("[Cron/Reminders] Acesso nao autorizado")
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
  }

  try {
    console.log("[Cron/Reminders] Iniciando envio de lembretes...")

    // Envia todos os lembretes
    const result = await sendAllReminders()

    console.log(
      `[Cron/Reminders] Concluido - Enviados: ${result.sent}, Falhas: ${result.failed}`
    )

    // So a CONTAGEM vai para o log: as mensagens de `errors` trazem nome de
    // voluntario e de evento para que o admin consiga agir, e os logs do Railway
    // sao retidos e visiveis a qualquer um com acesso ao projeto. O detalhe vive
    // em AppSettings e aparece no card de Configuracoes, que e ADMIN-only.
    if (result.errors.length > 0) {
      console.log(
        `[Cron/Reminders] ${result.errors.length} falha(s) — detalhe em Configuracoes`
      )
    }

    // Observabilidade: registra o resultado para a tela de Configuracoes.
    // Falha ao gravar nao invalida o envio ja feito.
    try {
      await recordReminderRun({
        sent: result.sent,
        failed: result.failed,
        errors: result.errors,
        skipped: result.skipped,
        schedulesCovered: result.schedulesCovered,
      })
    } catch (persistError) {
      console.error(
        "[Cron/Reminders] Falha ao registrar ultima execucao:",
        redactPII(persistError)
      )
    }

    // 200 mesmo com falhas parciais — ver nota sobre `curl -fsS` acima.
    return NextResponse.json({
      success: true,
      message: "Lembretes processados",
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped,
      schedulesCovered: result.schedulesCovered,
      // O DETALHE DOS ERROS NAO VAI NO CORPO. As mensagens trazem nome de
      // voluntario e de evento, e o comando do cron (`curl -fsS ... "$TARGET_URL"`,
      // sem `-o /dev/null`) imprime o corpo inteiro no log do servico — o que
      // reintroduziria no log exatamente a PII que tiramos do console.
      // O detalhe vive em AppSettings e aparece no card de Configuracoes (ADMIN).
      errorCount: result.errors.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido"
    console.error("[Cron/Reminders] Erro:", redactPII(message))

    try {
      await recordReminderRun({ sent: 0, failed: 0, error: message })
    } catch (persistError) {
      console.error(
        "[Cron/Reminders] Falha ao registrar ultima execucao:",
        redactPII(persistError)
      )
    }

    // Lote inteiro falhou: aqui sim devolvemos 5xx para um monitor externo ver.
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    )
  }
}

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60 // 60 segundos max

/**
 * Renderiza o template REAL de convite (UserInviteEmail) e envia um exemplo
 * para um destinatário, para visualização do design.
 *
 * Uso: RESEND_API_KEY=... RESEND_FROM_EMAIL=... PREVIEW_TO=... npx tsx scripts/preview-invite-email.ts
 */
import { render } from "@react-email/components"
import { Resend } from "resend"
import { UserInviteEmail } from "../src/lib/email/templates/user-invite"

async function main() {
  const to = process.env.PREVIEW_TO!
  const from = process.env.RESEND_FROM_EMAIL || "Contagie Beta <noreply@contagie.igrejabeta.com.br>"
  const apiKey = process.env.RESEND_API_KEY!

  const html = await render(
    UserInviteEmail({
      userName: "Gilson",
      ministryName: "Louvor",
      position: undefined,
      inviteUrl: "https://contagie.igrejabeta.com.br/set-password?token=EXEMPLO-DE-VISUALIZACAO",
      expiresAt: new Date("2026-06-22T12:00:00-03:00"),
    })
  )

  const resend = new Resend(apiKey)
  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    subject: "[EXEMPLO] Convite: Junte-se ao ministério Louvor",
    html,
  })

  if (error) {
    console.error("ERRO:", JSON.stringify(error))
    process.exit(1)
  }
  console.log("OK id:", data?.id)
}

main()

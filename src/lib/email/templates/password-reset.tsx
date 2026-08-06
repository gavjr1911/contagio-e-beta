import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  BaseEmail,
  EmailHeading,
  EmailText,
  EmailButton,
  EmailCard,
  EmailDivider,
} from "./base"

export interface PasswordResetEmailProps {
  userName: string
  resetUrl: string
  expiresAt: Date
  /** true quando o link foi disparado por um administrador (reenvio de acesso) */
  byAdmin?: boolean
}

export function PasswordResetEmail({
  userName,
  resetUrl,
  expiresAt,
  byAdmin = false,
}: PasswordResetEmailProps) {
  return (
    <BaseEmail preview="Redefinição de senha — Igreja Beta">
      <EmailHeading>Redefinir senha</EmailHeading>
      <EmailText>Olá {userName},</EmailText>
      <EmailText>
        {byAdmin
          ? "Um administrador gerou um link para você definir uma nova senha de acesso ao sistema da Igreja Beta."
          : "Recebemos um pedido para redefinir a senha da sua conta no sistema da Igreja Beta."}
      </EmailText>

      <EmailCard>
        <EmailText>
          Clique no botão abaixo para definir uma nova senha:
        </EmailText>

        <div style={{ textAlign: "center", margin: "24px 0" }}>
          <EmailButton href={resetUrl}>Definir nova senha</EmailButton>
        </div>

        <EmailText muted>
          Este link expira em{" "}
          {format(expiresAt, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}.
        </EmailText>
      </EmailCard>

      <EmailDivider />

      <EmailText muted>
        Se você não solicitou esta redefinição, pode ignorar este email — sua
        senha atual continua válida.
      </EmailText>
    </BaseEmail>
  )
}

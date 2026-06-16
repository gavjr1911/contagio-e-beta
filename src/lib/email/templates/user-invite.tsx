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

export interface UserInviteEmailProps {
  userName: string
  ministryName: string
  position?: string
  inviteUrl: string
  expiresAt: Date
}

export function UserInviteEmail({
  userName,
  ministryName,
  position,
  inviteUrl,
  expiresAt,
}: UserInviteEmailProps) {
  return (
    <BaseEmail preview={`Você foi convidado para a Igreja Beta`}>
      <EmailHeading>Bem-vindo!</EmailHeading>
      <EmailText>
        Bem-vindo ao sistema de gestão de eventos e escalas de serviço da Igreja Beta.
      </EmailText>
      <EmailText>
        Olá {userName}, você foi convidado para fazer parte do ministério {ministryName}
        {position && ` como ${position}`}.
      </EmailText>

      <EmailCard>
        <EmailText>
          Para completar seu cadastro e acessar o sistema, clique no botão abaixo e defina sua senha:
        </EmailText>

        <div style={{ textAlign: "center", margin: "24px 0" }}>
          <EmailButton href={inviteUrl}>Criar minha senha</EmailButton>
        </div>

        <EmailText muted>
          Este link expira em {format(expiresAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}.
        </EmailText>
      </EmailCard>

      <EmailDivider />

      <EmailText muted>
        Se você não solicitou este convite, pode ignorar este email.
      </EmailText>
    </BaseEmail>
  )
}

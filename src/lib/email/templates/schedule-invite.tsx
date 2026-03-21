import { Section, Text, Row, Column } from "@react-email/components"
import * as React from "react"
import {
  BaseEmail,
  EmailHeading,
  EmailText,
  EmailButton,
  EmailCard,
  EmailDivider,
  colors,
} from "./base"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export interface ScheduleInviteEmailProps {
  userName: string
  eventName: string
  eventDate: Date
  eventTime: string
  ministryName: string
  position?: string
  confirmUrl: string
  declineUrl: string
  eventLocation?: string
  additionalNotes?: string
}

export function ScheduleInviteEmail({
  userName,
  eventName,
  eventDate,
  eventTime,
  ministryName,
  position,
  confirmUrl,
  declineUrl,
  eventLocation,
  additionalNotes,
}: ScheduleInviteEmailProps) {
  const formattedDate = format(new Date(eventDate), "EEEE, dd 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  })

  return (
    <BaseEmail preview={`Convite para escala: ${eventName}`}>
      <EmailHeading>Voce foi escalado!</EmailHeading>

      <EmailText>
        Ola, <strong>{userName}</strong>!
      </EmailText>

      <EmailText>
        Temos o prazer de convidar voce para participar de um evento em nossa
        igreja. Sua presenca e muito importante para nos!
      </EmailText>

      <EmailCard>
        <Text style={styles.cardTitle}>{eventName}</Text>

        <Row style={styles.infoRow}>
          <Column style={styles.infoLabel}>
            <Text style={styles.label}>Data</Text>
          </Column>
          <Column style={styles.infoValue}>
            <Text style={styles.value}>{formattedDate}</Text>
          </Column>
        </Row>

        <Row style={styles.infoRow}>
          <Column style={styles.infoLabel}>
            <Text style={styles.label}>Horario</Text>
          </Column>
          <Column style={styles.infoValue}>
            <Text style={styles.value}>{eventTime}</Text>
          </Column>
        </Row>

        <Row style={styles.infoRow}>
          <Column style={styles.infoLabel}>
            <Text style={styles.label}>Ministerio</Text>
          </Column>
          <Column style={styles.infoValue}>
            <Text style={styles.value}>{ministryName}</Text>
          </Column>
        </Row>

        {position && (
          <Row style={styles.infoRow}>
            <Column style={styles.infoLabel}>
              <Text style={styles.label}>Funcao</Text>
            </Column>
            <Column style={styles.infoValue}>
              <Text style={styles.valueHighlight}>{position}</Text>
            </Column>
          </Row>
        )}

        {eventLocation && (
          <Row style={styles.infoRow}>
            <Column style={styles.infoLabel}>
              <Text style={styles.label}>Local</Text>
            </Column>
            <Column style={styles.infoValue}>
              <Text style={styles.value}>{eventLocation}</Text>
            </Column>
          </Row>
        )}
      </EmailCard>

      {additionalNotes && (
        <>
          <EmailText muted>
            <strong>Observacoes:</strong> {additionalNotes}
          </EmailText>
        </>
      )}

      <EmailDivider />

      <Section style={styles.buttonSection}>
        <Text style={styles.ctaText}>
          Por favor, confirme sua participacao clicando em um dos botoes abaixo:
        </Text>

        <Section style={styles.buttonGroup}>
          <EmailButton href={confirmUrl} variant="success">
            Confirmar Presenca
          </EmailButton>

          <EmailButton href={declineUrl} variant="danger">
            Nao Poderei Ir
          </EmailButton>
        </Section>
      </Section>

      <EmailText muted>
        Caso tenha algum impedimento ou precise trocar com outro voluntario,
        entre em contato com a lideranca do seu ministerio.
      </EmailText>

      <EmailText muted>
        Este convite expira 48 horas antes do evento. Apos esse prazo, caso nao
        haja resposta, entraremos em contato por outro meio.
      </EmailText>
    </BaseEmail>
  )
}

const styles = {
  cardTitle: {
    color: colors.text,
    fontSize: "20px",
    fontWeight: "700",
    lineHeight: "28px",
    margin: "0 0 16px 0",
    textAlign: "center" as const,
  },
  infoRow: {
    marginBottom: "12px",
  },
  infoLabel: {
    width: "120px",
    verticalAlign: "top" as const,
  },
  infoValue: {
    verticalAlign: "top" as const,
  },
  label: {
    color: colors.textMuted,
    fontSize: "14px",
    fontWeight: "500",
    margin: "0",
  },
  value: {
    color: colors.text,
    fontSize: "14px",
    fontWeight: "600",
    margin: "0",
  },
  valueHighlight: {
    color: colors.primary,
    fontSize: "14px",
    fontWeight: "700",
    margin: "0",
  },
  buttonSection: {
    textAlign: "center" as const,
    margin: "24px 0",
  },
  ctaText: {
    color: colors.text,
    fontSize: "16px",
    fontWeight: "500",
    lineHeight: "24px",
    margin: "0 0 16px 0",
    textAlign: "center" as const,
  },
  buttonGroup: {
    textAlign: "center" as const,
  },
} as const

export default ScheduleInviteEmail

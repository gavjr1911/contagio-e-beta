import { Section, Text, Row, Column } from "@react-email/components"
import * as React from "react"
import {
  BaseEmail,
  EmailHeading,
  EmailText,
  EmailButton,
  EmailCard,
  EmailHighlight,
  colors,
} from "./base"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { formatEventDateLongPtBR } from "@/lib/date-utils"

export interface ScheduleReminderEmailProps {
  userName: string
  eventName: string
  eventDate: Date
  eventTime: string
  ministryName: string
  position?: string
  daysUntilEvent: number
  eventUrl: string
  eventLocation?: string
  checklistItems?: string[]
}

export function ScheduleReminderEmail({
  userName,
  eventName,
  eventDate,
  eventTime,
  ministryName,
  position,
  daysUntilEvent,
  eventUrl,
  eventLocation,
  checklistItems,
}: ScheduleReminderEmailProps) {
  const formattedDate = formatEventDateLongPtBR(eventDate)

  const timeUntil = formatDistanceToNow(new Date(eventDate), {
    locale: ptBR,
    addSuffix: false,
  })

  const urgencyMessage =
    daysUntilEvent <= 1
      ? "O evento e amanha!"
      : daysUntilEvent <= 3
      ? `Faltam apenas ${daysUntilEvent} dias!`
      : `Faltam ${daysUntilEvent} dias`

  return (
    <BaseEmail preview={`Lembrete: ${eventName} em ${timeUntil}`}>
      <EmailHeading>Lembrete de Escala</EmailHeading>

      <EmailText>
        Ola, <strong>{userName}</strong>!
      </EmailText>

      <EmailText>
        Este e um lembrete sobre sua participacao no proximo evento.
        {daysUntilEvent <= 3 && " Estamos ansiosos para contar com voce!"}
      </EmailText>

      <EmailHighlight>{urgencyMessage}</EmailHighlight>

      <EmailCard>
        <Text style={styles.cardTitle}>{eventName}</Text>

        <Row style={styles.infoRow}>
          <Column style={styles.iconColumn}>
            <Text style={styles.icon}>&#128197;</Text>
          </Column>
          <Column style={styles.infoColumn}>
            <Text style={styles.label}>Data e Horario</Text>
            <Text style={styles.value}>
              {formattedDate} as {eventTime}
            </Text>
          </Column>
        </Row>

        <Row style={styles.infoRow}>
          <Column style={styles.iconColumn}>
            <Text style={styles.icon}>&#9962;</Text>
          </Column>
          <Column style={styles.infoColumn}>
            <Text style={styles.label}>Ministerio</Text>
            <Text style={styles.value}>{ministryName}</Text>
          </Column>
        </Row>

        {position && (
          <Row style={styles.infoRow}>
            <Column style={styles.iconColumn}>
              <Text style={styles.icon}>&#127775;</Text>
            </Column>
            <Column style={styles.infoColumn}>
              <Text style={styles.label}>Sua Funcao</Text>
              <Text style={styles.valueHighlight}>{position}</Text>
            </Column>
          </Row>
        )}

        {eventLocation && (
          <Row style={styles.infoRow}>
            <Column style={styles.iconColumn}>
              <Text style={styles.icon}>&#128205;</Text>
            </Column>
            <Column style={styles.infoColumn}>
              <Text style={styles.label}>Local</Text>
              <Text style={styles.value}>{eventLocation}</Text>
            </Column>
          </Row>
        )}
      </EmailCard>

      {checklistItems && checklistItems.length > 0 && (
        <Section style={styles.checklistSection}>
          <Text style={styles.checklistTitle}>Nao esqueca:</Text>
          {checklistItems.map((item, index) => (
            <Text key={index} style={styles.checklistItem}>
              <span style={styles.checkmark}>&#10003;</span> {item}
            </Text>
          ))}
        </Section>
      )}

      <Section style={styles.buttonSection}>
        <EmailButton href={eventUrl}>Ver Detalhes do Evento</EmailButton>
      </Section>

      <EmailText muted>
        Caso tenha algum impedimento de ultima hora, por favor entre em contato
        com a lideranca do seu ministerio o mais rapido possivel.
      </EmailText>

      <EmailText muted>
        Contamos com voce! Sua dedicacao faz toda a diferenca.
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
    margin: "0 0 20px 0",
    textAlign: "center" as const,
  },
  infoRow: {
    marginBottom: "16px",
  },
  iconColumn: {
    width: "40px",
    verticalAlign: "top" as const,
  },
  icon: {
    fontSize: "20px",
    margin: "0",
  },
  infoColumn: {
    verticalAlign: "top" as const,
  },
  label: {
    color: colors.textMuted,
    fontSize: "12px",
    fontWeight: "500",
    margin: "0 0 2px 0",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  value: {
    color: colors.text,
    fontSize: "15px",
    fontWeight: "600",
    margin: "0",
  },
  valueHighlight: {
    color: colors.primary,
    fontSize: "15px",
    fontWeight: "700",
    margin: "0",
  },
  checklistSection: {
    backgroundColor: "#f0fdf4",
    borderRadius: "8px",
    padding: "16px 20px",
    margin: "20px 0",
  },
  checklistTitle: {
    color: "#166534",
    fontSize: "14px",
    fontWeight: "700",
    margin: "0 0 12px 0",
  },
  checklistItem: {
    color: "#15803d",
    fontSize: "14px",
    lineHeight: "24px",
    margin: "0",
  },
  checkmark: {
    color: "#22c55e",
    fontWeight: "700",
    marginRight: "8px",
  },
  buttonSection: {
    textAlign: "center" as const,
    margin: "24px 0",
  },
} as const

export default ScheduleReminderEmail

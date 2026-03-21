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

export interface ScheduleChange {
  field: string
  oldValue: string
  newValue: string
}

export interface ScheduleChangedEmailProps {
  userName: string
  eventName: string
  eventDate: Date
  eventTime: string
  ministryName: string
  position?: string
  eventUrl: string
  changes: ScheduleChange[]
  changedBy?: string
  requiresReconfirmation?: boolean
  confirmUrl?: string
}

export function ScheduleChangedEmail({
  userName,
  eventName,
  eventDate,
  eventTime,
  ministryName,
  position,
  eventUrl,
  changes,
  changedBy,
  requiresReconfirmation = false,
  confirmUrl,
}: ScheduleChangedEmailProps) {
  const formattedDate = format(new Date(eventDate), "EEEE, dd 'de' MMMM", {
    locale: ptBR,
  })

  return (
    <BaseEmail preview={`Alteracao na escala: ${eventName}`}>
      {/* Warning Banner */}
      <Section style={styles.warningBanner}>
        <Text style={styles.warningIcon}>&#9888;</Text>
        <Text style={styles.warningTitle}>Alteracao na Escala</Text>
      </Section>

      <EmailHeading>Atencao, {userName}!</EmailHeading>

      <EmailText>
        Houve uma alteracao na sua escala para o evento abaixo. Por favor,
        verifique as mudancas e certifique-se de que esta ciente.
      </EmailText>

      <EmailCard>
        <Text style={styles.cardTitle}>{eventName}</Text>

        <Row style={styles.infoRow}>
          <Column style={styles.iconColumn}>
            <Text style={styles.icon}>&#128197;</Text>
          </Column>
          <Column style={styles.infoColumn}>
            <Text style={styles.label}>Quando</Text>
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
      </EmailCard>

      <EmailDivider />

      {/* Changes Section */}
      <Section style={styles.changesSection}>
        <Text style={styles.changesTitle}>O que mudou:</Text>

        {changes.map((change, index) => (
          <Section key={index} style={styles.changeItem}>
            <Text style={styles.changeField}>{change.field}</Text>
            <Row style={styles.changeRow}>
              <Column style={styles.changeOldColumn}>
                <Text style={styles.changeLabel}>Antes</Text>
                <Text style={styles.changeOldValue}>{change.oldValue}</Text>
              </Column>
              <Column style={styles.arrowColumn}>
                <Text style={styles.arrow}>&#8594;</Text>
              </Column>
              <Column style={styles.changeNewColumn}>
                <Text style={styles.changeLabel}>Agora</Text>
                <Text style={styles.changeNewValue}>{change.newValue}</Text>
              </Column>
            </Row>
          </Section>
        ))}
      </Section>

      {changedBy && (
        <EmailText muted>
          Alteracao realizada por: <strong>{changedBy}</strong>
        </EmailText>
      )}

      {requiresReconfirmation && confirmUrl ? (
        <Section style={styles.reconfirmSection}>
          <Text style={styles.reconfirmText}>
            Devido a natureza das alteracoes, precisamos que voce confirme
            novamente sua participacao.
          </Text>
          <Section style={styles.buttonSection}>
            <EmailButton href={confirmUrl} variant="primary">
              Confirmar Novamente
            </EmailButton>
          </Section>
        </Section>
      ) : (
        <Section style={styles.buttonSection}>
          <EmailButton href={eventUrl}>Ver Detalhes do Evento</EmailButton>
        </Section>
      )}

      <EmailText muted>
        Se estas alteracoes afetarem sua disponibilidade, por favor entre em
        contato com a lideranca do seu ministerio o mais rapido possivel.
      </EmailText>

      <EmailText muted>
        Agradecemos sua compreensao e flexibilidade. Sua dedicacao faz toda a
        diferenca!
      </EmailText>
    </BaseEmail>
  )
}

const styles = {
  warningBanner: {
    backgroundColor: "#fef3c7",
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "24px",
    textAlign: "center" as const,
  },
  warningIcon: {
    color: "#d97706",
    fontSize: "48px",
    margin: "0",
  },
  warningTitle: {
    color: "#92400e",
    fontSize: "20px",
    fontWeight: "700",
    margin: "8px 0 0 0",
  },
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
  changesSection: {
    margin: "24px 0",
  },
  changesTitle: {
    color: colors.text,
    fontSize: "16px",
    fontWeight: "700",
    margin: "0 0 16px 0",
  },
  changeItem: {
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "12px",
  },
  changeField: {
    color: colors.text,
    fontSize: "14px",
    fontWeight: "700",
    margin: "0 0 12px 0",
  },
  changeRow: {
    width: "100%",
  },
  changeOldColumn: {
    width: "45%",
    verticalAlign: "top" as const,
  },
  arrowColumn: {
    width: "10%",
    textAlign: "center" as const,
    verticalAlign: "middle" as const,
  },
  changeNewColumn: {
    width: "45%",
    verticalAlign: "top" as const,
  },
  changeLabel: {
    color: colors.textMuted,
    fontSize: "11px",
    fontWeight: "500",
    margin: "0 0 4px 0",
    textTransform: "uppercase" as const,
  },
  changeOldValue: {
    color: "#dc2626",
    fontSize: "14px",
    fontWeight: "500",
    margin: "0",
    textDecoration: "line-through",
  },
  changeNewValue: {
    color: "#16a34a",
    fontSize: "14px",
    fontWeight: "600",
    margin: "0",
  },
  arrow: {
    color: colors.textMuted,
    fontSize: "20px",
    margin: "0",
  },
  reconfirmSection: {
    backgroundColor: "#fef2f2",
    borderRadius: "8px",
    padding: "20px",
    margin: "24px 0",
    textAlign: "center" as const,
  },
  reconfirmText: {
    color: "#991b1b",
    fontSize: "14px",
    fontWeight: "500",
    margin: "0 0 16px 0",
  },
  buttonSection: {
    textAlign: "center" as const,
    margin: "24px 0",
  },
} as const

export default ScheduleChangedEmail

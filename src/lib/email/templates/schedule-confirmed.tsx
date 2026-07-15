import { Section, Text, Row, Column } from "@react-email/components"
import * as React from "react"
import {
  BaseEmail,
  EmailHeading,
  EmailText,
  EmailButton,
  EmailCard,
  colors,
} from "./base"
import { formatEventDateLongPtBR } from "@/lib/date-utils"

export interface ScheduleConfirmedEmailProps {
  userName: string
  eventName: string
  eventDate: Date
  eventTime: string
  ministryName: string
  position?: string
  eventUrl: string
  eventLocation?: string
  teamMembers?: Array<{
    name: string
    position?: string
  }>
}

export function ScheduleConfirmedEmail({
  userName,
  eventName,
  eventDate,
  eventTime,
  ministryName,
  position,
  eventUrl,
  eventLocation,
  teamMembers,
}: ScheduleConfirmedEmailProps) {
  const formattedDate = formatEventDateLongPtBR(eventDate)

  return (
    <BaseEmail preview={`Presenca confirmada: ${eventName}`}>
      {/* Success Banner */}
      <Section style={styles.successBanner}>
        <Text style={styles.checkIcon}>&#10004;</Text>
        <Text style={styles.successTitle}>Presenca Confirmada!</Text>
      </Section>

      <EmailHeading>Obrigado, {userName}!</EmailHeading>

      <EmailText>
        Sua participacao no evento foi confirmada com sucesso. Estamos muito
        felizes em contar com voce em nossa equipe!
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

        {eventLocation && (
          <Row style={styles.infoRow}>
            <Column style={styles.iconColumn}>
              <Text style={styles.icon}>&#128205;</Text>
            </Column>
            <Column style={styles.infoColumn}>
              <Text style={styles.label}>Onde</Text>
              <Text style={styles.value}>{eventLocation}</Text>
            </Column>
          </Row>
        )}

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

      {teamMembers && teamMembers.length > 0 && (
        <Section style={styles.teamSection}>
          <Text style={styles.teamTitle}>Equipe Escalada</Text>
          <Text style={styles.teamSubtitle}>
            Voce servira junto com estas pessoas incriveis:
          </Text>

          {teamMembers.map((member, index) => (
            <Row key={index} style={styles.teamMemberRow}>
              <Column style={styles.avatarColumn}>
                <Text style={styles.avatar}>
                  {member.name.charAt(0).toUpperCase()}
                </Text>
              </Column>
              <Column style={styles.memberInfoColumn}>
                <Text style={styles.memberName}>{member.name}</Text>
                {member.position && (
                  <Text style={styles.memberPosition}>{member.position}</Text>
                )}
              </Column>
            </Row>
          ))}
        </Section>
      )}

      <Section style={styles.tipsSection}>
        <Text style={styles.tipsTitle}>Dicas Importantes</Text>
        <Text style={styles.tip}>
          <span style={styles.tipBullet}>&#8226;</span>
          Chegue com 30 minutos de antecedencia para preparacao
        </Text>
        <Text style={styles.tip}>
          <span style={styles.tipBullet}>&#8226;</span>
          Use roupas apropriadas para o seu ministerio
        </Text>
        <Text style={styles.tip}>
          <span style={styles.tipBullet}>&#8226;</span>
          Mantenha seu celular no silencioso durante o evento
        </Text>
      </Section>

      <Section style={styles.buttonSection}>
        <EmailButton href={eventUrl}>Ver Detalhes do Evento</EmailButton>
      </Section>

      <EmailText muted>
        Se precisar cancelar ou trocar sua escala, entre em contato com a
        lideranca do seu ministerio o mais rapido possivel.
      </EmailText>

      <Text style={styles.blessingText}>
        Que Deus abencoe seu servico! &#128591;
      </Text>
    </BaseEmail>
  )
}

const styles = {
  successBanner: {
    backgroundColor: "#dcfce7",
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "24px",
    textAlign: "center" as const,
  },
  checkIcon: {
    color: "#22c55e",
    fontSize: "48px",
    margin: "0",
  },
  successTitle: {
    color: "#166534",
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
  teamSection: {
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
    padding: "20px",
    margin: "20px 0",
  },
  teamTitle: {
    color: colors.text,
    fontSize: "16px",
    fontWeight: "700",
    margin: "0 0 4px 0",
  },
  teamSubtitle: {
    color: colors.textMuted,
    fontSize: "14px",
    margin: "0 0 16px 0",
  },
  teamMemberRow: {
    marginBottom: "12px",
  },
  avatarColumn: {
    width: "40px",
    verticalAlign: "middle" as const,
  },
  avatar: {
    backgroundColor: colors.primary,
    borderRadius: "50%",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "14px",
    fontWeight: "700",
    height: "32px",
    lineHeight: "32px",
    margin: "0",
    textAlign: "center" as const,
    width: "32px",
  },
  memberInfoColumn: {
    verticalAlign: "middle" as const,
  },
  memberName: {
    color: colors.text,
    fontSize: "14px",
    fontWeight: "600",
    margin: "0",
  },
  memberPosition: {
    color: colors.textMuted,
    fontSize: "12px",
    margin: "0",
  },
  tipsSection: {
    backgroundColor: "#eff6ff",
    borderRadius: "8px",
    padding: "20px",
    margin: "20px 0",
  },
  tipsTitle: {
    color: "#1e40af",
    fontSize: "14px",
    fontWeight: "700",
    margin: "0 0 12px 0",
  },
  tip: {
    color: "#1e3a8a",
    fontSize: "14px",
    lineHeight: "22px",
    margin: "0 0 6px 0",
  },
  tipBullet: {
    color: "#3b82f6",
    marginRight: "8px",
  },
  buttonSection: {
    textAlign: "center" as const,
    margin: "24px 0",
  },
  blessingText: {
    color: colors.text,
    fontSize: "16px",
    fontWeight: "500",
    margin: "24px 0 0 0",
    textAlign: "center" as const,
  },
} as const

export default ScheduleConfirmedEmail

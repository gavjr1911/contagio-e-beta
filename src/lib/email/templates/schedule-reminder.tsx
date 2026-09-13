import { Section, Text, Row, Column } from "@react-email/components"
import * as React from "react"
import {
  BaseEmail,
  EmailHeading,
  EmailText,
  EmailButton,
  EmailCard,
  EmailDivider,
  EmailHighlight,
  colors,
} from "./base"
import { formatEventDateLongPtBR } from "@/lib/date-utils"

/**
 * Status da atribuicao no lembrete. Espelha ScheduleStatus do Prisma menos
 * DECLINED: quem recusou nao recebe lembrete nenhum.
 */
export type ReminderAssignmentStatus = "PENDING" | "CONFIRMED"

/**
 * Uma atribuicao do voluntario NAQUELE evento (um Schedule).
 * Quem serve em 2 ministerios no mesmo evento recebe UM email com as duas
 * atribuicoes listadas, em vez de dois emails identicos.
 *
 * `confirmUrl`/`declineUrl` sao por ESCALA (o token e assinado com o
 * scheduleId), por isso vivem na atribuicao e nao no topo das props: num grupo
 * com status misto cada pendencia precisa do seu proprio par de botoes.
 * So fazem sentido em atribuicoes PENDING.
 */
export interface ReminderAssignment {
  ministryName: string
  position?: string
  status: ReminderAssignmentStatus
  confirmUrl?: string
  declineUrl?: string
}

export interface ScheduleReminderEmailProps {
  userName: string
  eventName: string
  eventDate: Date
  eventTime: string
  /** Sempre com pelo menos 1 item. */
  assignments: ReminderAssignment[]
  daysUntilEvent: number
  eventUrl: string
  eventLocation?: string
  checklistItems?: string[]
}

const PENDING_LABEL = "aguardando sua confirmacao"
const CONFIRMED_LABEL = "confirmada"

export function ScheduleReminderEmail({
  userName,
  eventName,
  eventDate,
  eventTime,
  assignments,
  daysUntilEvent,
  eventUrl,
  eventLocation,
  checklistItems,
}: ScheduleReminderEmailProps) {
  const formattedDate = formatEventDateLongPtBR(eventDate)
  const isSingle = assignments.length <= 1

  const pending = assignments.filter((a) => a.status === "PENDING")
  const hasPending = pending.length > 0
  const allPending = hasPending && pending.length === assignments.length
  // Com 2+ atribuicoes o rotulo do botao precisa dizer de qual ministerio ele e:
  // sao pares de botoes diferentes (tokens por escala) na mesma mensagem.
  const labelPerMinistry = assignments.length > 1

  // Derivado de `daysUntilEvent`, NAO de `eventDate`.
  //
  // `eventDate` e `@db.Date` (meia-noite UTC); passa-lo por
  // `formatDistanceToNow`, que compara com o instante atual no fuso do
  // processo, fazia o preview da caixa de entrada dizer "6 dias" enquanto o
  // corpo do e-mail dizia 7 — em `TZ=America/Sao_Paulo` a meia-noite UTC e a
  // vespera as 21h. `daysUntilEvent` ja vem calculado no modelo do projeto.
  const timeUntil =
    daysUntilEvent <= 0
      ? "hoje"
      : daysUntilEvent === 1
        ? "amanha"
        : `${daysUntilEvent} dias`

  const timeUntilPhrase = daysUntilEvent <= 1 ? timeUntil : `em ${timeUntil}`

  const urgencyMessage =
    daysUntilEvent <= 1
      ? "O evento e amanha!"
      : daysUntilEvent <= 3
      ? `Faltam apenas ${daysUntilEvent} dias!`
      : `Faltam ${daysUntilEvent} dias`

  const preview = hasPending
    ? `Confirme sua participacao em ${eventName} — ${timeUntilPhrase}`
    : `Lembrete: ${eventName} ${timeUntilPhrase}`

  return (
    <BaseEmail preview={preview}>
      <EmailHeading>
        {hasPending ? "Confirme sua participacao" : "Lembrete de Escala"}
      </EmailHeading>

      <EmailText>
        Ola, <strong>{userName}</strong>!
      </EmailText>

      {allPending ? (
        <EmailText>
          Voce ainda <strong>nao respondeu</strong> ao convite para este evento.
          Confirme (ou recuse) por aqui mesmo, para a lideranca saber com quem
          pode contar.
        </EmailText>
      ) : hasPending ? (
        <EmailText>
          Voce ja confirmou parte das suas atribuicoes neste evento, mas ainda
          falta responder {pending.length > 1 ? "a outras" : "a uma"}. Veja
          abaixo o que esta pendente.
        </EmailText>
      ) : (
        <EmailText>
          Este e um lembrete sobre sua participacao no proximo evento.
          {daysUntilEvent <= 3 && " Estamos ansiosos para contar com voce!"}
        </EmailText>
      )}

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

        {/* 1 atribuicao: layout classico (Ministerio + Sua Funcao).
            2 ou mais: uma lista unica, para o email nao virar repeticao.
            Em ambos os casos o status aparece por atribuicao. */}
        {isSingle ? (
          <>
            <Row style={styles.infoRow}>
              <Column style={styles.iconColumn}>
                <Text style={styles.icon}>&#9962;</Text>
              </Column>
              <Column style={styles.infoColumn}>
                <Text style={styles.label}>Ministerio</Text>
                <Text style={styles.value}>{assignments[0].ministryName}</Text>
              </Column>
            </Row>

            {assignments[0].position && (
              <Row style={styles.infoRow}>
                <Column style={styles.iconColumn}>
                  <Text style={styles.icon}>&#127775;</Text>
                </Column>
                <Column style={styles.infoColumn}>
                  <Text style={styles.label}>Sua Funcao</Text>
                  <Text style={styles.valueHighlight}>{assignments[0].position}</Text>
                </Column>
              </Row>
            )}

            <Row style={styles.infoRow}>
              <Column style={styles.iconColumn}>
                <Text style={styles.icon}>
                  {assignments[0].status === "PENDING" ? "⏳" : "✓"}
                </Text>
              </Column>
              <Column style={styles.infoColumn}>
                <Text style={styles.label}>Status</Text>
                <Text
                  style={
                    assignments[0].status === "PENDING"
                      ? styles.statusPending
                      : styles.statusConfirmed
                  }
                >
                  {assignments[0].status === "PENDING"
                    ? "Aguardando sua confirmacao"
                    : "Presenca confirmada"}
                </Text>
              </Column>
            </Row>
          </>
        ) : (
          <Row style={styles.infoRow}>
            <Column style={styles.iconColumn}>
              <Text style={styles.icon}>&#9962;</Text>
            </Column>
            <Column style={styles.infoColumn}>
              <Text style={styles.label}>Suas Atribuicoes</Text>
              {assignments.map((assignment, index) => (
                <Text
                  key={`${assignment.ministryName}-${index}`}
                  style={styles.assignmentItem}
                >
                  <span style={styles.assignmentMinistry}>
                    {assignment.ministryName}
                  </span>
                  {assignment.position && (
                    <span style={styles.assignmentPosition}>
                      {" — "}
                      {assignment.position}
                    </span>
                  )}
                  <span
                    style={
                      assignment.status === "PENDING"
                        ? styles.assignmentStatusPending
                        : styles.assignmentStatusConfirmed
                    }
                  >
                    {" · "}
                    {assignment.status === "PENDING"
                      ? PENDING_LABEL
                      : CONFIRMED_LABEL}
                  </span>
                </Text>
              ))}
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

      {/* Um par Confirmar/Recusar POR ATRIBUICAO PENDENTE: os tokens sao
          assinados com o scheduleId, entao um botao so nao cobre duas escalas. */}
      {hasPending && (
        <>
          <EmailDivider />

          <Section style={styles.buttonSection}>
            <Text style={styles.ctaText}>
              {pending.length > 1
                ? "Responda a cada atribuicao pendente:"
                : "Por favor, responda clicando em um dos botoes abaixo:"}
            </Text>

            {pending.map((assignment, index) => (
              <Section
                key={`pending-${assignment.ministryName}-${index}`}
                style={styles.pendingBlock}
              >
                {labelPerMinistry && (
                  <Text style={styles.pendingTitle}>
                    {assignment.ministryName}
                    {assignment.position ? ` — ${assignment.position}` : ""}
                  </Text>
                )}

                {assignment.confirmUrl && (
                  <EmailButton href={assignment.confirmUrl} variant="success">
                    {labelPerMinistry
                      ? `Confirmar ${assignment.ministryName}`
                      : "Confirmar Presenca"}
                  </EmailButton>
                )}

                {assignment.declineUrl && (
                  <EmailButton href={assignment.declineUrl} variant="danger">
                    {labelPerMinistry
                      ? `Recusar ${assignment.ministryName}`
                      : "Nao Poderei Ir"}
                  </EmailButton>
                )}
              </Section>
            ))}
          </Section>
        </>
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
  assignmentItem: {
    color: colors.text,
    fontSize: "15px",
    fontWeight: "600",
    lineHeight: "22px",
    margin: "0 0 4px 0",
  },
  assignmentMinistry: {
    color: colors.text,
  },
  assignmentPosition: {
    color: colors.primary,
    fontWeight: "700",
  },
  assignmentStatusPending: {
    color: colors.warning,
    fontWeight: "600",
  },
  assignmentStatusConfirmed: {
    color: colors.success,
    fontWeight: "600",
  },
  statusPending: {
    color: colors.warning,
    fontSize: "15px",
    fontWeight: "700",
    margin: "0",
  },
  statusConfirmed: {
    color: colors.success,
    fontSize: "15px",
    fontWeight: "700",
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
  ctaText: {
    color: colors.text,
    fontSize: "16px",
    fontWeight: "500",
    lineHeight: "24px",
    margin: "0 0 16px 0",
    textAlign: "center" as const,
  },
  pendingBlock: {
    textAlign: "center" as const,
    margin: "0 0 12px 0",
  },
  pendingTitle: {
    color: colors.text,
    fontSize: "14px",
    fontWeight: "700",
    margin: "0 0 6px 0",
    textAlign: "center" as const,
  },
} as const

export default ScheduleReminderEmail

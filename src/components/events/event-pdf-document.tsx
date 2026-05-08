"use client"

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"
import type { Event } from "@/hooks/use-events"
import type { EventItem } from "@/hooks/use-event-items"
import type { EventScheduleGroup } from "@/hooks/use-schedules"
import { toLocalDate, formatTimeToHHMM } from "@/lib/date-utils"

// Cores do tema Beta
const colors = {
  primary: "#F97316",
  dark: "#18181B",
  gray: "#71717A",
  grayLight: "#A1A1AA",
  border: "#E4E4E7",
  background: "#F4F4F5",
  white: "#FFFFFF",
  green: "#22C55E",
  amber: "#F59E0B",
  red: "#EF4444",
}

// Estilos compactos
const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    padding: 30,
    paddingBottom: 50,
    backgroundColor: colors.white,
  },
  // Header compacto
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  churchName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: colors.primary,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  eventName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    color: colors.dark,
  },
  eventDate: {
    fontSize: 10,
    color: colors.gray,
    marginTop: 2,
  },
  headerMeta: {
    fontSize: 8,
    color: colors.grayLight,
  },
  headerMetaBold: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: colors.dark,
  },
  // Seções
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: colors.primary,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  // Ordem do culto - compacta
  orderTable: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
  },
  orderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 22,
  },
  orderRowLast: {
    flexDirection: "row",
    minHeight: 22,
  },
  orderRowAlt: {
    backgroundColor: colors.background,
  },
  orderTimeCol: {
    width: 45,
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  orderTime: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: colors.primary,
  },
  orderDuration: {
    fontSize: 6,
    color: colors.grayLight,
  },
  orderTypeCol: {
    width: 65,
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    justifyContent: "center",
  },
  orderType: {
    fontSize: 7,
    color: colors.gray,
  },
  orderContentCol: {
    flex: 1,
    padding: 4,
    justifyContent: "center",
  },
  orderTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: colors.dark,
  },
  orderDesc: {
    fontSize: 7,
    color: colors.gray,
    marginTop: 1,
  },
  orderResponsibleCol: {
    width: 80,
    padding: 4,
    justifyContent: "center",
  },
  orderResponsible: {
    fontSize: 7,
    color: colors.grayLight,
  },
  // Músicas em lista
  songsList: {
    marginTop: 3,
    paddingLeft: 6,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
  },
  songItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 1,
  },
  songNumber: {
    fontSize: 6,
    color: colors.primary,
    width: 10,
  },
  songName: {
    fontSize: 7,
    color: colors.dark,
  },
  songKey: {
    fontSize: 6,
    color: colors.grayLight,
    marginLeft: 4,
  },
  // Equipes - grid compacto
  teamsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  teamBox: {
    width: "48%",
    marginRight: "2%",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: 6,
  },
  teamHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  teamName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: colors.dark,
  },
  teamCount: {
    fontSize: 7,
    color: colors.grayLight,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
  },
  memberStatus: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 4,
  },
  statusConfirmed: {
    backgroundColor: colors.green,
  },
  statusPending: {
    backgroundColor: colors.amber,
  },
  statusDeclined: {
    backgroundColor: colors.red,
  },
  memberName: {
    fontSize: 7,
    color: colors.dark,
    flex: 1,
  },
  memberPosition: {
    fontSize: 6,
    color: colors.grayLight,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: 7,
    color: colors.grayLight,
  },
  // Notas
  notesRow: {
    backgroundColor: "#FEF9C3",
    padding: 3,
    marginTop: 2,
    borderRadius: 2,
  },
  notesText: {
    fontSize: 6,
    color: colors.dark,
  },
})

// Labels dos tipos
const typeLabels: Record<string, string> = {
  WELCOME: "Boas-vindas",
  WORSHIP: "Louvor",
  PRAYER: "Oração",
  READING: "Leitura",
  ANNOUNCEMENTS: "Avisos",
  OFFERING: "Oferta",
  PREACHING: "Pregação",
  COMMUNION: "Ceia",
  VIDEO: "Vídeo",
  SPECIAL: "Especial",
  TRANSITION: "Transição",
  OTHER: "Outros",
}

interface EventPDFDocumentProps {
  event: Event
  items: EventItem[]
  schedules: EventScheduleGroup[]
  churchName?: string
}

function calculateStartTimes(items: EventItem[], eventStartTime: string): Map<string, string> {
  const startTimes = new Map<string, string>()
  const [hours, minutes] = eventStartTime.split(":").map(Number)
  let currentMinutes = hours * 60 + minutes

  for (const item of items) {
    const itemHours = Math.floor(currentMinutes / 60)
    const itemMins = currentMinutes % 60
    startTimes.set(item.id, `${String(itemHours).padStart(2, "0")}:${String(itemMins).padStart(2, "0")}`)
    if (item.durationMinutes) currentMinutes += item.durationMinutes
  }
  return startTimes
}

function formatDate(dateString: string | Date): string {
  const date = toLocalDate(dateString)
  return date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" })
}

function formatTime(timeString: string | Date): string {
  if (typeof timeString === "string" && /^\d{2}:\d{2}$/.test(timeString)) return timeString
  const date = typeof timeString === "string" ? new Date(timeString) : timeString
  return formatTimeToHHMM(date)
}

export function EventPDFDocument({
  event,
  items,
  schedules,
  churchName = "Igreja Beta",
}: EventPDFDocumentProps) {
  const eventDate = formatDate(event.date)
  const startTime = formatTime(event.startTime)
  const startTimes = calculateStartTimes(items, startTime)

  const totalDuration = items.reduce((acc, item) => acc + (item.durationMinutes || 0), 0)
  const durationText = totalDuration >= 60
    ? `${Math.floor(totalDuration / 60)}h${totalDuration % 60 > 0 ? totalDuration % 60 + "min" : ""}`
    : `${totalDuration}min`

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header compacto */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.churchName}>{churchName}</Text>
            <Text style={styles.eventName}>{event.name}</Text>
            <Text style={styles.eventDate}>{eventDate}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerMeta}>Início</Text>
            <Text style={styles.headerMetaBold}>{startTime}</Text>
            <Text style={styles.headerMeta}>Duração</Text>
            <Text style={styles.headerMetaBold}>{durationText}</Text>
          </View>
        </View>

        {/* Ordem do Culto - Tabela compacta */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ordem do Culto ({items.length} itens)</Text>
          <View style={styles.orderTable}>
            {items.map((item, index) => {
              const itemTime = startTimes.get(item.id) || startTime
              const typeLabel = typeLabels[item.type] || item.type
              const isLast = index === items.length - 1
              const isAlt = index % 2 === 1
              const hasSongs = item.setlistItems && item.setlistItems.length > 0

              return (
                <View
                  key={item.id}
                  style={[
                    isLast ? styles.orderRowLast : styles.orderRow,
                    isAlt ? styles.orderRowAlt : {},
                  ]}
                  wrap={false}
                >
                  <View style={styles.orderTimeCol}>
                    <Text style={styles.orderTime}>{itemTime}</Text>
                    {item.durationMinutes && (
                      <Text style={styles.orderDuration}>{item.durationMinutes}min</Text>
                    )}
                  </View>
                  <View style={styles.orderTypeCol}>
                    <Text style={styles.orderType}>{typeLabel}</Text>
                  </View>
                  <View style={styles.orderContentCol}>
                    <Text style={styles.orderTitle}>{item.title}</Text>
                    {item.description && (
                      <Text style={styles.orderDesc}>{item.description}</Text>
                    )}
                    {hasSongs && (
                      <View style={styles.songsList}>
                        {item.setlistItems.map((setlist, idx) => (
                          <View key={setlist.id} style={styles.songItem}>
                            <Text style={styles.songNumber}>{idx + 1}.</Text>
                            <Text style={styles.songName}>{setlist.song.name}</Text>
                            {(setlist.key || setlist.song.defaultKey) && (
                              <Text style={styles.songKey}>({setlist.key || setlist.song.defaultKey})</Text>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                    {item.notes && (
                      <View style={styles.notesRow}>
                        <Text style={styles.notesText}>Nota: {item.notes}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.orderResponsibleCol}>
                    {item.responsible && (
                      <Text style={styles.orderResponsible}>{item.responsible.name}</Text>
                    )}
                    {item.bibleReference && (
                      <Text style={styles.orderResponsible}>{item.bibleReference}</Text>
                    )}
                  </View>
                </View>
              )
            })}
          </View>
        </View>

        {/* Equipes - Grid compacto */}
        {schedules.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Equipes ({schedules.reduce((acc, g) => acc + g.schedules.length, 0)} voluntários)
            </Text>
            <View style={styles.teamsGrid}>
              {schedules.map((group) => (
                <View key={group.ministry.id} style={styles.teamBox} wrap={false}>
                  <View style={styles.teamHeader}>
                    <Text style={styles.teamName}>{group.ministry.name}</Text>
                    <Text style={styles.teamCount}>{group.schedules.length}</Text>
                  </View>
                  {group.schedules.map((schedule) => {
                    const statusStyle =
                      schedule.status === "CONFIRMED"
                        ? styles.statusConfirmed
                        : schedule.status === "DECLINED"
                        ? styles.statusDeclined
                        : styles.statusPending

                    return (
                      <View key={schedule.id} style={styles.memberRow}>
                        <View style={[styles.memberStatus, statusStyle]} />
                        <Text style={styles.memberName}>
                          {schedule.user.name || schedule.user.email}
                        </Text>
                        {(schedule.vacancy?.position.name || schedule.position) && (
                          <Text style={styles.memberPosition}>
                            {schedule.vacancy?.position.name || schedule.position}
                          </Text>
                        )}
                      </View>
                    )
                  })}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}
          </Text>
          <Text style={styles.footerText}>Contagie</Text>
        </View>
      </Page>
    </Document>
  )
}

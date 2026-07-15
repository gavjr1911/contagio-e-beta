import { Section, Text, Row, Column, Link } from "@react-email/components"
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
import { formatEventDateLongPtBR } from "@/lib/date-utils"

export interface SetlistSong {
  order: number
  name: string
  artist?: string
  key: string
  chordLink?: string
  notes?: string
}

export interface SetlistUpdateEmailProps {
  userName: string
  eventName: string
  eventDate: Date
  eventTime: string
  songs: SetlistSong[]
  eventUrl: string
  updatedBy?: string
  isNewSetlist?: boolean
}

export function SetlistUpdateEmail({
  userName,
  eventName,
  eventDate,
  eventTime,
  songs,
  eventUrl,
  updatedBy,
  isNewSetlist = false,
}: SetlistUpdateEmailProps) {
  const formattedDate = formatEventDateLongPtBR(eventDate)

  return (
    <BaseEmail
      preview={`${isNewSetlist ? "Novo setlist" : "Setlist atualizado"}: ${eventName}`}
    >
      {/* Music Banner */}
      <Section style={styles.musicBanner}>
        <Text style={styles.musicIcon}>&#127925;</Text>
        <Text style={styles.musicTitle}>
          {isNewSetlist ? "Novo Setlist!" : "Setlist Atualizado"}
        </Text>
      </Section>

      <EmailHeading>Ola, {userName}!</EmailHeading>

      <EmailText>
        {isNewSetlist
          ? "O setlist para o proximo evento foi definido! Confira abaixo as musicas e prepare-se para louvar."
          : "O setlist do evento foi atualizado. Verifique as alteracoes e se prepare para as novas musicas."}
      </EmailText>

      <EmailCard>
        <Text style={styles.cardTitle}>{eventName}</Text>
        <Text style={styles.cardSubtitle}>
          {formattedDate} as {eventTime}
        </Text>
      </EmailCard>

      <EmailDivider />

      {/* Setlist */}
      <Section style={styles.setlistSection}>
        <Text style={styles.setlistTitle}>Setlist</Text>
        <Text style={styles.setlistSubtitle}>
          {songs.length} musica{songs.length !== 1 ? "s" : ""} no repertorio
        </Text>

        {songs.map((song, index) => (
          <Section key={index} style={styles.songItem}>
            <Row style={styles.songRow}>
              <Column style={styles.orderColumn}>
                <Text style={styles.orderNumber}>{song.order}</Text>
              </Column>
              <Column style={styles.songInfoColumn}>
                <Text style={styles.songName}>{song.name}</Text>
                {song.artist && (
                  <Text style={styles.songArtist}>{song.artist}</Text>
                )}
                {song.notes && (
                  <Text style={styles.songNotes}>{song.notes}</Text>
                )}
              </Column>
              <Column style={styles.keyColumn}>
                <Text style={styles.keyBadge}>{song.key}</Text>
              </Column>
              {song.chordLink && (
                <Column style={styles.linkColumn}>
                  <Link href={song.chordLink} style={styles.chordLink}>
                    Cifra
                  </Link>
                </Column>
              )}
            </Row>
          </Section>
        ))}
      </Section>

      {/* Quick Reference */}
      <Section style={styles.quickRefSection}>
        <Text style={styles.quickRefTitle}>Referencia Rapida de Tons</Text>
        <Row style={styles.keysRow}>
          {songs.map((song, index) => (
            <React.Fragment key={index}>
              <Column style={styles.keyRefColumn}>
                <Text style={styles.keyRefNumber}>{song.order}.</Text>
                <Text style={styles.keyRefKey}>{song.key}</Text>
              </Column>
              {index < songs.length - 1 && (
                <Column style={styles.keySeparator}>
                  <Text style={styles.separator}>|</Text>
                </Column>
              )}
            </React.Fragment>
          ))}
        </Row>
      </Section>

      {/* Tips for musicians */}
      <Section style={styles.tipsSection}>
        <Text style={styles.tipsTitle}>Dicas para Ensaio</Text>
        <Text style={styles.tip}>
          <span style={styles.tipBullet}>&#127927;</span>
          Estude cada musica individualmente antes do ensaio
        </Text>
        <Text style={styles.tip}>
          <span style={styles.tipBullet}>&#127927;</span>
          Atente-se aos tons - alguns podem estar diferentes do original
        </Text>
        <Text style={styles.tip}>
          <span style={styles.tipBullet}>&#127927;</span>
          Chegue com antecedencia para afinacao e passagem de som
        </Text>
      </Section>

      {updatedBy && (
        <EmailText muted>
          Atualizado por: <strong>{updatedBy}</strong>
        </EmailText>
      )}

      <Section style={styles.buttonSection}>
        <EmailButton href={eventUrl}>Ver Setlist Completo</EmailButton>
      </Section>

      <EmailText muted>
        Se tiver duvidas sobre alguma musica ou precisar de materiais
        adicionais, entre em contato com a lideranca do louvor.
      </EmailText>

      <Text style={styles.blessingText}>
        Que seu louvor seja uma oferta agradavel! &#127926;
      </Text>
    </BaseEmail>
  )
}

const styles = {
  musicBanner: {
    backgroundColor: "#faf5ff",
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "24px",
    textAlign: "center" as const,
  },
  musicIcon: {
    fontSize: "48px",
    margin: "0",
  },
  musicTitle: {
    color: "#7c3aed",
    fontSize: "20px",
    fontWeight: "700",
    margin: "8px 0 0 0",
  },
  cardTitle: {
    color: colors.text,
    fontSize: "20px",
    fontWeight: "700",
    lineHeight: "28px",
    margin: "0 0 8px 0",
    textAlign: "center" as const,
  },
  cardSubtitle: {
    color: colors.textMuted,
    fontSize: "14px",
    margin: "0",
    textAlign: "center" as const,
  },
  setlistSection: {
    margin: "24px 0",
  },
  setlistTitle: {
    color: colors.text,
    fontSize: "18px",
    fontWeight: "700",
    margin: "0 0 4px 0",
  },
  setlistSubtitle: {
    color: colors.textMuted,
    fontSize: "14px",
    margin: "0 0 20px 0",
  },
  songItem: {
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
    padding: "14px 16px",
    marginBottom: "8px",
  },
  songRow: {
    width: "100%",
  },
  orderColumn: {
    width: "36px",
    verticalAlign: "middle" as const,
  },
  orderNumber: {
    backgroundColor: colors.primary,
    borderRadius: "50%",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "12px",
    fontWeight: "700",
    height: "24px",
    lineHeight: "24px",
    margin: "0",
    textAlign: "center" as const,
    width: "24px",
  },
  songInfoColumn: {
    verticalAlign: "middle" as const,
  },
  songName: {
    color: colors.text,
    fontSize: "15px",
    fontWeight: "600",
    margin: "0",
  },
  songArtist: {
    color: colors.textMuted,
    fontSize: "13px",
    margin: "2px 0 0 0",
  },
  songNotes: {
    backgroundColor: "#fef3c7",
    borderRadius: "4px",
    color: "#92400e",
    display: "inline-block",
    fontSize: "11px",
    margin: "6px 0 0 0",
    padding: "2px 6px",
  },
  keyColumn: {
    width: "50px",
    textAlign: "center" as const,
    verticalAlign: "middle" as const,
  },
  keyBadge: {
    backgroundColor: "#ddd6fe",
    borderRadius: "4px",
    color: "#7c3aed",
    display: "inline-block",
    fontSize: "13px",
    fontWeight: "700",
    margin: "0",
    padding: "4px 10px",
  },
  linkColumn: {
    width: "60px",
    textAlign: "right" as const,
    verticalAlign: "middle" as const,
  },
  chordLink: {
    color: colors.primary,
    fontSize: "13px",
    fontWeight: "500",
    textDecoration: "none",
  },
  quickRefSection: {
    backgroundColor: "#f0fdf4",
    borderRadius: "8px",
    padding: "16px 20px",
    margin: "20px 0",
    textAlign: "center" as const,
  },
  quickRefTitle: {
    color: "#166534",
    fontSize: "13px",
    fontWeight: "700",
    margin: "0 0 12px 0",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  keysRow: {
    display: "inline-block",
  },
  keyRefColumn: {
    textAlign: "center" as const,
    padding: "0 8px",
    display: "inline-block",
  },
  keyRefNumber: {
    color: "#15803d",
    fontSize: "11px",
    margin: "0",
  },
  keyRefKey: {
    color: "#166534",
    fontSize: "16px",
    fontWeight: "700",
    margin: "0",
  },
  keySeparator: {
    display: "inline-block",
    padding: "0 4px",
  },
  separator: {
    color: "#bbf7d0",
    fontSize: "16px",
    margin: "0",
  },
  tipsSection: {
    backgroundColor: "#eff6ff",
    borderRadius: "8px",
    padding: "16px 20px",
    margin: "20px 0",
  },
  tipsTitle: {
    color: "#1e40af",
    fontSize: "13px",
    fontWeight: "700",
    margin: "0 0 12px 0",
  },
  tip: {
    color: "#1e3a8a",
    fontSize: "13px",
    lineHeight: "22px",
    margin: "0 0 4px 0",
  },
  tipBullet: {
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

export default SetlistUpdateEmail

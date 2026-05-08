"use client"

import * as React from "react"
import { Clock, Music, User, BookOpen, ExternalLink, ChevronDown, ChevronUp, ImageIcon, Video, FileText, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import {
  type EventItem,
  type EventItemType,
  eventItemTypeConfig,
} from "@/hooks/use-event-items"

interface OrderItemCardProps {
  item: EventItem
  startTime: string
  index: number
}

export function OrderItemCard({ item, startTime, index }: OrderItemCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(true) // Expandido por padrão

  const config = eventItemTypeConfig[item.type as EventItemType] || {
    label: item.type,
    emoji: "📋",
    color: "bg-slate-500",
  }

  const hasSongs = item.setlistItems && item.setlistItems.length > 0
  const hasNotes = item.notes && item.notes.trim().length > 0
  const hasBibleRef = item.bibleReference && item.bibleReference.trim().length > 0
  const hasDescription = item.description && item.description.trim().length > 0
  const hasMediaUrl = item.mediaUrl && item.mediaUrl.trim().length > 0
  const hasMediaFiles = item.mediaFiles && item.mediaFiles.length > 0
  const isPendingMedia = item.requiresMedia && !hasMediaFiles
  const hasExpandableContent = hasNotes || (hasSongs && item.setlistItems.length > 3)

  // Para blocos WORSHIP, calcular progresso de músicas
  const expectedSongs = item.expectedSongCount || 0
  const currentSongs = item.setlistItems?.length || 0
  const isWorshipComplete = expectedSongs > 0 && currentSongs >= expectedSongs

  return (
    <Card className="overflow-hidden border-border bg-card">
      <CardContent className="p-0">
        {/* Header Row */}
        <div className="flex items-start gap-4 p-4 pb-3">
          {/* Time Column */}
          <div className="flex flex-col items-center w-16 shrink-0 pt-1">
            <span className="text-lg font-semibold text-primary">{startTime}</span>
            {item.durationMinutes && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {item.durationMinutes}min
              </span>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Title Row */}
            <div className="flex items-center gap-3 mb-2">
              <div
                className={cn(
                  "flex items-center justify-center h-9 w-9 rounded-lg shrink-0 text-lg",
                  config.color,
                  "bg-opacity-20"
                )}
              >
                <span role="img" aria-label={config.label}>
                  {config.emoji}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {config.label}
                  </Badge>
                  {/* Badge de músicas para WORSHIP */}
                  {item.type === "WORSHIP" && (expectedSongs > 0 || hasSongs) && (
                    <Badge
                      variant={isWorshipComplete ? "default" : "secondary"}
                      className={cn(
                        "text-xs",
                        expectedSongs > 0 && !isWorshipComplete && "bg-amber-500/20 text-amber-600 border-amber-500/30"
                      )}
                    >
                      <Music className="h-3 w-3 mr-1" />
                      {expectedSongs > 0
                        ? `${currentSongs}/${expectedSongs}`
                        : currentSongs
                      }
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Meta Info Row */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              {/* Responsible */}
              {item.responsible && (
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={item.responsible.image || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {item.responsible.name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-foreground">
                    {item.responsible.name}
                  </span>
                </div>
              )}

              {/* Bible reference */}
              {hasBibleRef && (
                <div className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-amber-500" />
                  <span className="font-medium">{item.bibleReference}</span>
                </div>
              )}

              {/* Media URL */}
              {hasMediaUrl && (
                <a
                  href={item.mediaUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Ver mídia</span>
                </a>
              )}
            </div>

            {/* Description */}
            {hasDescription && (
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {item.description}
              </p>
            )}

            {/* Media Files */}
            {(hasMediaFiles || isPendingMedia) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {hasMediaFiles && item.mediaFiles.map((file) => (
                  <a
                    key={file.id}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Badge
                      variant="outline"
                      className="text-xs bg-blue-500/5 border-blue-500/20 cursor-pointer hover:bg-blue-500/10 transition-colors"
                    >
                      {file.mimeType?.startsWith("image/") ? (
                        <ImageIcon className="h-3 w-3 mr-1" />
                      ) : file.mimeType?.startsWith("video/") ? (
                        <Video className="h-3 w-3 mr-1" />
                      ) : (
                        <FileText className="h-3 w-3 mr-1" />
                      )}
                      <span className="max-w-[150px] truncate">
                        {file.originalName || "Arquivo"}
                      </span>
                      <ExternalLink className="h-3 w-3 ml-1 opacity-50" />
                    </Badge>
                  </a>
                ))}
                {isPendingMedia && (
                  <Badge variant="outline" className="text-xs bg-amber-500/10 border-amber-500/30 text-amber-600">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Mídia pendente
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Expand toggle for extra content */}
          {hasExpandableContent && (
            <button
              className="p-1.5 rounded-md hover:bg-muted transition-colors shrink-0"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          )}
        </div>

        {/* Songs Section - Always visible for WORSHIP with songs */}
        {hasSongs && (
          <div className="px-4 pb-4">
            <div className="ml-20 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Músicas
              </p>
              <div className="grid gap-1.5">
                {item.setlistItems.slice(0, isExpanded ? undefined : 3).map((setlistItem, idx) => (
                  <div
                    key={setlistItem.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 border border-border/50"
                  >
                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {setlistItem.song.name}
                      </p>
                      {setlistItem.song.artist && (
                        <p className="text-xs text-muted-foreground truncate">
                          {setlistItem.song.artist}
                        </p>
                      )}
                    </div>
                    {(setlistItem.key || setlistItem.song.defaultKey) && (
                      <Badge variant="outline" className="text-xs shrink-0 font-mono">
                        {setlistItem.key || setlistItem.song.defaultKey}
                      </Badge>
                    )}
                    {setlistItem.song.chordLink && (
                      <a
                        href={setlistItem.song.chordLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                ))}
                {!isExpanded && item.setlistItems.length > 3 && (
                  <button
                    onClick={() => setIsExpanded(true)}
                    className="text-sm text-primary hover:underline text-left py-1"
                  >
                    + {item.setlistItems.length - 3} mais músicas
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty song slots for WORSHIP without songs but with expectedSongCount */}
        {item.type === "WORSHIP" && !hasSongs && expectedSongs > 0 && (
          <div className="px-4 pb-4">
            <div className="ml-20">
              <div className="flex items-center gap-2 p-3 rounded-lg border-2 border-dashed border-amber-500/30 bg-amber-500/5">
                <Music className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-amber-600">
                  {expectedSongs} {expectedSongs === 1 ? "música" : "músicas"} pendentes na aba Setlist
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Notes Section - Expandable */}
        {hasNotes && isExpanded && (
          <div className="px-4 pb-4">
            <div className="ml-20">
              <div className="p-3 rounded-lg bg-slate-500/10 border border-slate-500/20">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                  Notas internas
                </p>
                <p className="text-sm text-foreground">{item.notes}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

"use client"

import * as React from "react"
import { ChevronDown, ChevronUp, Clock, Music, User, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  const [isExpanded, setIsExpanded] = React.useState(false)

  const config = eventItemTypeConfig[item.type as EventItemType] || {
    label: item.type,
    emoji: "📋",
    color: "bg-slate-500",
  }

  const hasSongs = item.setlistItems && item.setlistItems.length > 0
  const hasNotes = item.notes && item.notes.trim().length > 0
  const hasBibleRef = item.bibleReference && item.bibleReference.trim().length > 0
  const hasDetails = hasSongs || hasNotes || hasBibleRef || item.description

  return (
    <div
      className={cn(
        "group rounded-xl border border-border bg-card transition-all",
        isExpanded && "ring-1 ring-primary/20"
      )}
    >
      {/* Main Row - Always Visible */}
      <div
        className={cn(
          "flex items-center gap-4 p-4 cursor-pointer",
          hasDetails && "hover:bg-muted/30"
        )}
        onClick={() => hasDetails && setIsExpanded(!isExpanded)}
      >
        {/* Time */}
        <div className="flex flex-col items-center w-14 shrink-0">
          <span className="text-sm font-medium text-foreground">{startTime}</span>
          {item.durationMinutes && (
            <span className="text-xs text-muted-foreground">
              {item.durationMinutes}min
            </span>
          )}
        </div>

        {/* Emoji Icon */}
        <div
          className={cn(
            "flex items-center justify-center h-10 w-10 rounded-lg shrink-0 text-lg",
            config.color,
            "bg-opacity-10"
          )}
          style={{
            backgroundColor: `var(--${config.color.replace("bg-", "")}, rgba(139, 92, 246, 0.1))`,
          }}
        >
          <span role="img" aria-label={config.label}>
            {config.emoji}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-medium truncate">{item.title}</h3>
            <Badge variant="secondary" className="text-xs shrink-0">
              {config.label}
            </Badge>
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {/* Responsible */}
            {item.responsible && (
              <div className="flex items-center gap-1.5">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={item.responsible.image || undefined} />
                  <AvatarFallback className="text-[8px]">
                    {item.responsible.name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate max-w-[120px]">
                  {item.responsible.name}
                </span>
              </div>
            )}

            {/* Songs count */}
            {hasSongs && (
              <div className="flex items-center gap-1">
                <Music className="h-3.5 w-3.5" />
                <span>{item.setlistItems.length} musicas</span>
              </div>
            )}

            {/* Bible reference */}
            {hasBibleRef && (
              <div className="flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" />
                <span className="truncate max-w-[150px]">{item.bibleReference}</span>
              </div>
            )}
          </div>
        </div>

        {/* Expand button */}
        {hasDetails && (
          <button
            className="p-1 rounded-md hover:bg-muted transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
          >
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && hasDetails && (
        <div className="px-4 pb-4 pt-0 border-t border-border mt-0">
          <div className="pt-4 space-y-3">
            {/* Description */}
            {item.description && (
              <p className="text-sm text-muted-foreground">{item.description}</p>
            )}

            {/* Songs List */}
            {hasSongs && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Musicas
                </p>
                <div className="space-y-1">
                  {item.setlistItems.map((setlistItem, idx) => (
                    <div
                      key={setlistItem.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                    >
                      <span className="text-xs text-muted-foreground w-5">
                        {idx + 1}.
                      </span>
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
                        <Badge variant="outline" className="text-xs shrink-0">
                          {setlistItem.key || setlistItem.song.defaultKey}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {hasNotes && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Notas
                </p>
                <p className="text-sm text-foreground bg-muted/50 p-2 rounded-lg">
                  {item.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

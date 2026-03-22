"use client";

import Link from "next/link";
import { Music, Calendar, Clock, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Song } from "@/types/music";

interface SongCardProps {
  song: Song;
  showActions?: boolean;
  onSelect?: (song: Song) => void;
}

export function SongCard({ song, showActions = true, onSelect }: SongCardProps) {
  const formatDate = (date?: Date) => {
    if (!date) return "Nunca tocada";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  };

  const handleClick = () => {
    if (onSelect) {
      onSelect(song);
    }
  };

  return (
    <Card
      className={`group transition-all duration-200 hover:border-primary/50 hover:shadow-lg ${
        onSelect ? "cursor-pointer" : ""
      }`}
      onClick={onSelect ? handleClick : undefined}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Icon and main info */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/20">
              <Music className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              {showActions ? (
                <Link
                  href={`/musicas/${song.id}`}
                  className="block truncate font-display text-lg font-semibold text-foreground hover:text-primary transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {song.name}
                </Link>
              ) : (
                <span className="block truncate font-display text-lg font-semibold text-foreground">
                  {song.name}
                </span>
              )}
              <p className="truncate text-sm text-muted-foreground">{song.artist}</p>
            </div>
          </div>

          {/* Key badge */}
          <Badge variant="secondary" className="shrink-0 font-mono text-sm">
            {song.defaultKey}
          </Badge>
        </div>

        {/* Tags */}
        {song.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {song.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {song.tags.length > 3 && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                +{song.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Stats and actions */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {song.timesPlayed}x tocada
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(song.lastPlayedAt)}
            </span>
          </div>

          {showActions && song.chordLink && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs text-primary hover:text-primary hover:bg-primary/10"
              asChild
              onClick={(e) => e.stopPropagation()}
            >
              <a href={song.chordLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                Cifra
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for lists
interface SongCardCompactProps {
  song: Song;
  selected?: boolean;
  onSelect?: (song: Song) => void;
  onRemove?: (song: Song) => void;
  keyOverride?: string;
}

export function SongCardCompact({
  song,
  selected,
  onSelect,
  onRemove,
  keyOverride,
}: SongCardCompactProps) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
        selected
          ? "border-primary bg-primary/10"
          : "border-border hover:border-primary/30"
      } ${onSelect ? "cursor-pointer" : ""}`}
      onClick={() => onSelect?.(song)}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-secondary">
        <Music className="h-4 w-4 text-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{song.name}</p>
        <p className="truncate text-xs text-muted-foreground">{song.artist}</p>
      </div>
      <Badge variant="secondary" className="shrink-0 font-mono text-xs">
        {keyOverride || song.defaultKey}
      </Badge>
      {onRemove && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(song);
          }}
        >
          <span className="sr-only">Remover</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </Button>
      )}
    </div>
  );
}

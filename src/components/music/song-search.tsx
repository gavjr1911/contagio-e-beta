"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Music, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSongSearch } from "@/hooks/use-songs";
import type { Song } from "@/types/music";

interface SongSearchProps {
  onSelect: (song: Song) => void;
  placeholder?: string;
  excludeIds?: string[];
  autoFocus?: boolean;
}

export function SongSearch({
  onSelect,
  placeholder = "Buscar musica por nome ou artista...",
  excludeIds = [],
  autoFocus = false,
}: SongSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: results, isLoading } = useSongSearch(query);

  const filteredResults = results?.filter((song) => !excludeIds.includes(song.id)) || [];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset highlight when results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredResults.length]);

  const handleSelect = useCallback(
    (song: Song) => {
      onSelect(song);
      setQuery("");
      setIsOpen(false);
      inputRef.current?.focus();
    },
    [onSelect]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredResults.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredResults.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredResults[highlightedIndex]) {
          handleSelect(filteredResults[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(e.target.value.length >= 2);
          }}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10 pr-10"
          autoFocus={autoFocus}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full rounded-lg border border-border bg-background shadow-lg">
          {filteredResults.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {isLoading ? "Buscando..." : "Nenhuma musica encontrada"}
            </div>
          ) : (
            <ul className="max-h-64 overflow-auto py-2">
              {filteredResults.map((song, index) => (
                <li key={song.id}>
                  <button
                    type="button"
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors ${
                      index === highlightedIndex
                        ? "bg-primary/20 text-foreground"
                        : "hover:bg-muted"
                    }`}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleSelect(song)}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-secondary">
                      <Music className="h-4 w-4 text-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{song.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {song.artist} - Tom: {song.defaultKey}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// Version with filters for the main page
interface SongSearchWithFiltersProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SongSearchInput({
  value,
  onChange,
  placeholder = "Buscar musica por nome ou artista...",
}: SongSearchWithFiltersProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-10"
      />
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, RotateCcw, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MUSICAL_KEYS, type MusicalKey } from "@/types/music";

interface LyricsViewerProps {
  lyrics: string;
  originalKey: string;
  className?: string;
}

// Chromatic scale for transposition
const CHROMATIC_SCALE = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_TO_SHARP: Record<string, string> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
};

function normalizeKey(key: string): string {
  // Handle flats
  if (FLAT_TO_SHARP[key]) return FLAT_TO_SHARP[key];
  // Handle minor keys (just take the root)
  if (key.endsWith("m")) return key.slice(0, -1);
  return key;
}

function getKeyIndex(key: string): number {
  const normalized = normalizeKey(key);
  return CHROMATIC_SCALE.indexOf(normalized);
}

function transposeChord(chord: string, semitones: number): string {
  if (semitones === 0) return chord;

  // Extract root note (handles sharps and flats)
  const match = chord.match(/^([A-G][#b]?)(.*)/);
  if (!match) return chord;

  const [, root, suffix] = match;
  const normalizedRoot = normalizeKey(root);
  const rootIndex = CHROMATIC_SCALE.indexOf(normalizedRoot);

  if (rootIndex === -1) return chord;

  const newIndex = (rootIndex + semitones + 12) % 12;
  const newRoot = CHROMATIC_SCALE[newIndex];

  return newRoot + suffix;
}

function transposeLine(line: string, semitones: number): string {
  // Match chord patterns (in brackets or standalone)
  const chordPattern = /\[([A-G][#b]?[^[\]]*)\]|(?<![a-z])([A-G][#b]?(?:m|maj|min|dim|aug|sus|add|7|9|11|13|6)?(?:\d+)?(?:\/[A-G][#b]?)?)(?![a-z])/g;

  return line.replace(chordPattern, (match, bracketChord, standaloneChord) => {
    const chord = bracketChord || standaloneChord;
    if (!chord) return match;

    // Handle slash chords
    if (chord.includes("/")) {
      const [mainChord, bassNote] = chord.split("/");
      const transposedMain = transposeChord(mainChord, semitones);
      const transposedBass = transposeChord(bassNote, semitones);
      const result = `${transposedMain}/${transposedBass}`;
      return bracketChord ? `[${result}]` : result;
    }

    const transposed = transposeChord(chord, semitones);
    return bracketChord ? `[${transposed}]` : transposed;
  });
}

export function LyricsViewer({ lyrics, originalKey, className = "" }: LyricsViewerProps) {
  const [currentKey, setCurrentKey] = useState(originalKey);
  const [copied, setCopied] = useState(false);

  const semitones = useMemo(() => {
    const originalIndex = getKeyIndex(originalKey);
    const currentIndex = getKeyIndex(currentKey);
    return (currentIndex - originalIndex + 12) % 12;
  }, [originalKey, currentKey]);

  const transposedLyrics = useMemo(() => {
    if (semitones === 0) return lyrics;
    return lyrics
      .split("\n")
      .map((line) => transposeLine(line, semitones))
      .join("\n");
  }, [lyrics, semitones]);

  const transposeUp = () => {
    const currentIndex = MUSICAL_KEYS.indexOf(currentKey as MusicalKey);
    const newIndex = (currentIndex + 1) % MUSICAL_KEYS.length;
    setCurrentKey(MUSICAL_KEYS[newIndex]);
  };

  const transposeDown = () => {
    const currentIndex = MUSICAL_KEYS.indexOf(currentKey as MusicalKey);
    const newIndex = (currentIndex - 1 + MUSICAL_KEYS.length) % MUSICAL_KEYS.length;
    setCurrentKey(MUSICAL_KEYS[newIndex]);
  };

  const resetKey = () => {
    setCurrentKey(originalKey);
  };

  const copyLyrics = async () => {
    try {
      await navigator.clipboard.writeText(transposedLyrics);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy lyrics:", error);
    }
  };

  // Highlight chords in the lyrics
  const renderLyrics = (text: string) => {
    return text.split("\n").map((line, lineIndex) => {
      // Check if line is primarily chords (mostly uppercase letters and symbols)
      const isChordLine = line.trim().length > 0 &&
        line.replace(/\s+/g, "").match(/^[A-G#bm0-9/()suaddimaug]+$/i);

      if (isChordLine) {
        return (
          <div key={lineIndex} className="font-mono text-beta-terracotta font-medium">
            {line}
          </div>
        );
      }

      // Regular lyric line - highlight inline chords
      const parts = line.split(/(\[[^\]]+\])/g);
      return (
        <div key={lineIndex}>
          {parts.map((part, partIndex) => {
            if (part.startsWith("[") && part.endsWith("]")) {
              return (
                <span key={partIndex} className="font-mono text-beta-terracotta font-medium">
                  {part.slice(1, -1)}
                </span>
              );
            }
            return <span key={partIndex}>{part}</span>;
          })}
        </div>
      );
    });
  };

  return (
    <div className={`rounded-lg border border-border bg-beta-navy/30 ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Tom:</span>
          <Badge variant="secondary" className="font-mono text-base px-3 py-1">
            {currentKey}
          </Badge>
          {currentKey !== originalKey && (
            <span className="text-xs text-muted-foreground">
              (original: {originalKey})
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={transposeDown}
            className="h-8 w-8 p-0"
            title="Transpor -1 semitom"
          >
            <ChevronDown className="h-4 w-4" />
            <span className="sr-only">Transpor para baixo</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={transposeUp}
            className="h-8 w-8 p-0"
            title="Transpor +1 semitom"
          >
            <ChevronUp className="h-4 w-4" />
            <span className="sr-only">Transpor para cima</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetKey}
            disabled={currentKey === originalKey}
            className="h-8 w-8 p-0"
            title="Voltar ao tom original"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="sr-only">Resetar tom</span>
          </Button>
          <div className="mx-2 h-4 w-px bg-border" />
          <Button
            variant="ghost"
            size="sm"
            onClick={copyLyrics}
            className="h-8 gap-1.5 px-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-xs">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span className="text-xs">Copiar</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Quick key selector */}
      <div className="flex flex-wrap gap-1 border-b border-border px-4 py-2">
        {["C", "D", "E", "F", "G", "A", "B"].map((key) => (
          <Button
            key={key}
            variant={currentKey === key ? "default" : "ghost"}
            size="sm"
            onClick={() => setCurrentKey(key)}
            className="h-7 w-7 p-0 font-mono text-xs"
          >
            {key}
          </Button>
        ))}
        <div className="mx-1 h-7 w-px bg-border" />
        {["C#", "D#", "F#", "G#", "A#"].map((key) => (
          <Button
            key={key}
            variant={currentKey === key ? "default" : "ghost"}
            size="sm"
            onClick={() => setCurrentKey(key)}
            className="h-7 px-1.5 font-mono text-xs"
          >
            {key}
          </Button>
        ))}
      </div>

      {/* Lyrics content */}
      <div className="max-h-[500px] overflow-auto p-4">
        <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-beta-cream">
          {renderLyrics(transposedLyrics)}
        </div>
      </div>
    </div>
  );
}

// Simple read-only version
interface LyricsDisplayProps {
  lyrics: string;
  className?: string;
}

export function LyricsDisplay({ lyrics, className = "" }: LyricsDisplayProps) {
  return (
    <div className={`rounded-lg border border-border bg-beta-navy/30 p-4 ${className}`}>
      <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-beta-cream">
        {lyrics}
      </div>
    </div>
  );
}

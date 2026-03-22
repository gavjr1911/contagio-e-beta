"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Music, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SongSearch } from "./song-search";
import { MUSICAL_KEYS, type Song, type SetlistItem } from "@/types/music";

interface SetlistEditorProps {
  eventId: string;
  eventName: string;
  initialItems?: SetlistItem[];
  onSave?: (items: SetlistItem[]) => void;
  onChange?: (items: SetlistItem[]) => void;
}

interface SortableItemProps {
  item: SetlistItem;
  onRemove: (id: string) => void;
  onKeyChange: (id: string, key: string) => void;
}

function SortableSetlistItem({ item, onRemove, onKeyChange }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 rounded-lg border bg-card p-3 transition-all ${
        isDragging ? "border-primary shadow-lg" : "border-border"
      }`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Order number */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-medium text-foreground">
        {item.order}
      </div>

      {/* Song info */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/20">
        <Music className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{item.song.name}</p>
        <p className="truncate text-xs text-muted-foreground">{item.song.artist}</p>
      </div>

      {/* Key selector */}
      <select
        value={item.key}
        onChange={(e) => onKeyChange(item.id, e.target.value)}
        className="h-8 rounded border border-border bg-input px-2 text-sm font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {MUSICAL_KEYS.map((key) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
      </select>

      {/* Chord link */}
      {item.song.chordLink && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
          asChild
        >
          <a href={item.song.chordLink} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            <span className="sr-only">Ver cifra</span>
          </a>
        </Button>
      )}

      {/* Remove button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(item.id)}
        className="h-8 w-8 p-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
      >
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">Remover</span>
      </Button>
    </div>
  );
}

export function SetlistEditor({
  eventId,
  eventName,
  initialItems = [],
  onSave,
  onChange,
}: SetlistEditorProps) {
  const [items, setItems] = useState<SetlistItem[]>(initialItems);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const updateItems = useCallback(
    (newItems: SetlistItem[]) => {
      // Update order numbers
      const orderedItems = newItems.map((item, index) => ({
        ...item,
        order: index + 1,
      }));
      setItems(orderedItems);
      onChange?.(orderedItems);
    },
    [onChange]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      updateItems(newItems);
    }
  };

  const handleAddSong = (song: Song) => {
    const newItem: SetlistItem = {
      id: `setlist-${Date.now()}-${song.id}`,
      songId: song.id,
      song,
      key: song.defaultKey,
      order: items.length + 1,
    };
    updateItems([...items, newItem]);
  };

  const handleRemoveSong = (id: string) => {
    updateItems(items.filter((item) => item.id !== id));
  };

  const handleKeyChange = (id: string, key: string) => {
    updateItems(
      items.map((item) => (item.id === id ? { ...item, key } : item))
    );
  };

  const handleSave = () => {
    onSave?.(items);
  };

  const excludeIds = items.map((item) => item.songId);

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-display text-xl">{eventName}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {items.length} {items.length === 1 ? "musica" : "musicas"} no setlist
            </p>
          </div>
          {onSave && (
            <Button onClick={handleSave} disabled={items.length === 0}>
              Salvar Setlist
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search to add songs */}
        <div>
          <label className="mb-2 block text-sm font-medium text-muted-foreground">
            Adicionar musica
          </label>
          <SongSearch
            onSelect={handleAddSong}
            excludeIds={excludeIds}
            placeholder="Buscar musica para adicionar..."
          />
        </div>

        {/* Setlist items */}
        {items.length > 0 ? (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-muted-foreground">
              Ordem das musicas (arraste para reordenar)
            </label>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={items.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {items.map((item) => (
                    <SortableSetlistItem
                      key={item.id}
                      item={item}
                      onRemove={handleRemoveSong}
                      onKeyChange={handleKeyChange}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
            <Music className="mb-3 h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground">
              Nenhuma musica no setlist
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Use a busca acima para adicionar musicas
            </p>
          </div>
        )}

        {/* Quick stats */}
        {items.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <span className="text-xs text-muted-foreground">Tons utilizados:</span>
            {[...new Set(items.map((item) => item.key))].map((key) => (
              <Badge key={key} variant="outline" className="font-mono text-xs">
                {key}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Read-only setlist display
interface SetlistDisplayProps {
  items: SetlistItem[];
  showChordLinks?: boolean;
}

export function SetlistDisplay({ items, showChordLinks = true }: SetlistDisplayProps) {
  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Nenhuma musica no setlist
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-medium text-foreground">
            {item.order}
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/20">
            <Music className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{item.song.name}</p>
            <p className="truncate text-xs text-muted-foreground">{item.song.artist}</p>
          </div>
          <Badge variant="secondary" className="font-mono">
            {item.key}
          </Badge>
          {showChordLinks && item.song.chordLink && (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
              <a href={item.song.chordLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                <span className="sr-only">Ver cifra</span>
              </a>
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

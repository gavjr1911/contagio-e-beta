"use client"

import * as React from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  Music,
  Plus,
  GripVertical,
  Trash2,
  ExternalLink,
  Loader2,
  Check,
  Search,
  User,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import {
  useEventItems,
  useAddSongsToItem,
  useRemoveSongFromItem,
  eventItemTypeConfig,
  eventItemKeys,
  type EventItem,
  type SetlistItem,
} from "@/hooks/use-event-items"
import { eventKeys } from "@/hooks/use-events"
import { useSongs, type Song } from "@/hooks/use-songs"
import { useQueryClient } from "@tanstack/react-query"

interface SetlistBlocksProps {
  eventId: string
  readOnly?: boolean
}

// Sortable song in block
const SortableSong = React.memo(function SortableSong({
  setlistItem,
  index,
  onRemove,
  isRemoving,
  readOnly,
}: {
  setlistItem: SetlistItem
  index: number
  onRemove: (songId: string) => void
  isRemoving: boolean
  readOnly: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: setlistItem.id, disabled: readOnly })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-3 rounded-lg border bg-card transition-all",
        isDragging && "z-50 opacity-90 shadow-lg ring-2 ring-primary",
        isRemoving && "opacity-50"
      )}
    >
      {!readOnly && (
        <button
          {...attributes}
          {...listeners}
          className="touch-none cursor-grab p-0.5 text-muted-foreground hover:text-foreground active:cursor-grabbing"
          type="button"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary text-sm font-medium shrink-0">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{setlistItem.song.name}</p>
        {setlistItem.song.artist && (
          <p className="text-xs text-muted-foreground truncate">
            {setlistItem.song.artist}
          </p>
        )}
      </div>
      {setlistItem.key && (
        <Badge variant="secondary" className="text-xs shrink-0">
          {setlistItem.key}
        </Badge>
      )}
      {setlistItem.song.chordLink && (
        <a
          href={setlistItem.song.chordLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary/80 shrink-0"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
      {!readOnly && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(setlistItem.songId)}
          disabled={isRemoving}
        >
          {isRemoving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Trash2 className="h-3 w-3" />
          )}
        </Button>
      )}
    </div>
  )
})

// Empty slot placeholder
function EmptySlot({ slotNumber, onClick, disabled }: {
  slotNumber: number
  onClick: () => void
  disabled: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2 p-3 rounded-lg border-2 border-dashed transition-all w-full text-left",
        disabled
          ? "border-muted cursor-not-allowed opacity-50"
          : "border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5"
      )}
    >
      <div className="flex items-center justify-center h-7 w-7 rounded-full bg-muted text-muted-foreground text-sm shrink-0">
        {slotNumber}
      </div>
      <div className="flex-1 flex items-center gap-2 text-muted-foreground">
        <Plus className="h-4 w-4" />
        <span className="text-sm">Adicionar musica</span>
      </div>
    </button>
  )
}

// Song search popover
function SongSearchPopover({
  open,
  onOpenChange,
  onSelect,
  excludeIds,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (song: Song) => void
  excludeIds: string[]
}) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const { data: songsData, isLoading } = useSongs(
    open ? { search: searchQuery } : null
  )

  const songs: Song[] = Array.isArray(songsData?.songs) ? songsData.songs : []
  const excludeSet = new Set(excludeIds)
  const availableSongs = songs.filter((s) => !excludeSet.has(s.id))

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <span />
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Buscar musica..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Carregando..." : "Nenhuma musica encontrada."}
            </CommandEmpty>
            <CommandGroup heading="Musicas">
              {availableSongs.map((song) => (
                <CommandItem
                  key={song.id}
                  value={song.name}
                  onSelect={() => {
                    onSelect(song)
                    onOpenChange(false)
                    setSearchQuery("")
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{song.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {song.artist || "Artista desconhecido"}
                      {song.defaultKey && ` - Tom: ${song.defaultKey}`}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// Block component
function WorshipBlock({
  item,
  eventId,
  readOnly,
}: {
  item: EventItem
  eventId: string
  readOnly: boolean
}) {
  const queryClient = useQueryClient()
  const addSongs = useAddSongsToItem()
  const removeSong = useRemoveSongFromItem()

  const [searchOpen, setSearchOpen] = React.useState(false)
  const [removingId, setRemovingId] = React.useState<string | null>(null)
  const [localSetlistItems, setLocalSetlistItems] = React.useState(item.setlistItems || [])

  // Sync local state with props
  React.useEffect(() => {
    setLocalSetlistItems(item.setlistItems || [])
  }, [item.setlistItems])

  const expectedCount = item.expectedSongCount || 0
  const currentCount = localSetlistItems.length
  const emptySlots = Math.max(0, expectedCount - currentCount)
  const isComplete = expectedCount > 0 && currentCount >= expectedCount
  const existingSongIds = localSetlistItems.map((s) => s.songId)

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleAddSong = async (song: Song) => {
    try {
      await addSongs.mutateAsync({
        eventId,
        itemId: item.id,
        songIds: [song.id],
      })
      toast({ title: "Musica adicionada" })
    } catch (error) {
      toast({
        title: "Erro ao adicionar musica",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      })
    }
  }

  const handleRemoveSong = async (songId: string) => {
    setRemovingId(songId)
    try {
      await removeSong.mutateAsync({
        eventId,
        itemId: item.id,
        songId,
      })
      toast({ title: "Musica removida" })
    } catch (error) {
      toast({
        title: "Erro ao remover musica",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      })
    } finally {
      setRemovingId(null)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = localSetlistItems.findIndex((s) => s.id === active.id)
      const newIndex = localSetlistItems.findIndex((s) => s.id === over.id)
      const newItems = arrayMove(localSetlistItems, oldIndex, newIndex)
      setLocalSetlistItems(newItems)

      // Persist reorder
      try {
        const response = await fetch(`/api/events/${eventId}/items/${item.id}/songs`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ songIds: newItems.map((s) => s.songId) }),
        })

        if (!response.ok) {
          throw new Error("Erro ao reordenar")
        }

        // Invalidar queries para atualizar tanto a aba Setlist quanto Ordem do Culto
        queryClient.invalidateQueries({ queryKey: eventItemKeys.list(eventId) })
        queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) })
      } catch (error) {
        // Revert on error
        setLocalSetlistItems(item.setlistItems || [])
        toast({
          title: "Erro ao reordenar",
          variant: "destructive",
        })
      }
    }
  }

  const config = eventItemTypeConfig[item.type]

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl",
                config.color,
                "bg-opacity-20"
              )}
            >
              {config.emoji}
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{item.title}</CardTitle>
              {item.responsible && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <User className="h-3 w-3" />
                  {item.responsible.name || item.responsible.email}
                </p>
              )}
            </div>
          </div>
          <Badge
            variant={isComplete ? "default" : "secondary"}
            className={cn(
              expectedCount > 0 && !isComplete && "bg-amber-500/20 text-amber-600 border-amber-500/30"
            )}
          >
            <Music className="h-3 w-3 mr-1" />
            {expectedCount > 0 ? `${currentCount}/${expectedCount}` : currentCount}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        {/* Songs with DnD */}
        {localSetlistItems.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localSetlistItems.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {localSetlistItems.map((setlistItem, index) => (
                  <SortableSong
                    key={setlistItem.id}
                    setlistItem={setlistItem}
                    index={index}
                    onRemove={handleRemoveSong}
                    isRemoving={removingId === setlistItem.songId}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Empty slots */}
        {!readOnly && emptySlots > 0 && (
          <div className="space-y-2">
            {Array.from({ length: emptySlots }).map((_, i) => (
              <EmptySlot
                key={`empty-${i}`}
                slotNumber={currentCount + i + 1}
                onClick={() => setSearchOpen(true)}
                disabled={addSongs.isPending}
              />
            ))}
          </div>
        )}

        {/* Add more button (only if no expected count - free mode) */}
        {!readOnly && expectedCount === 0 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setSearchOpen(true)}
            disabled={addSongs.isPending}
          >
            {addSongs.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Adicionar musica
          </Button>
        )}

        {/* Empty state */}
        {localSetlistItems.length === 0 && emptySlots === 0 && expectedCount === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma musica neste bloco</p>
          </div>
        )}

        {/* Song search popover */}
        <SongSearchPopover
          open={searchOpen}
          onOpenChange={setSearchOpen}
          onSelect={handleAddSong}
          excludeIds={existingSongIds}
        />
      </CardContent>
    </Card>
  )
}

// Main component
export function SetlistBlocks({ eventId, readOnly = false }: SetlistBlocksProps) {
  const { data: items, isLoading } = useEventItems(eventId)

  // Filter only WORSHIP items
  const worshipItems = React.useMemo(() => {
    if (!items) return []
    return items.filter((item) => item.type === "WORSHIP")
  }, [items])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (worshipItems.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <Music className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-foreground font-medium text-lg mb-2">
            Nenhum bloco de louvor
          </p>
          <p className="text-muted-foreground">
            Adicione atividades de louvor na ordem do culto para associar musicas.
          </p>
        </div>
      </Card>
    )
  }

  // Calculate totals
  const totalExpected = worshipItems.reduce((sum, item) => sum + (item.expectedSongCount || 0), 0)
  const totalCurrent = worshipItems.reduce((sum, item) => sum + (item.setlistItems?.length || 0), 0)

  return (
    <div className="space-y-6">
      {/* Summary */}
      {totalExpected > 0 && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            Total: <strong className="text-foreground">{totalCurrent}/{totalExpected}</strong> musicas
          </span>
          {totalCurrent >= totalExpected ? (
            <Badge variant="default" className="text-xs">
              <Check className="h-3 w-3 mr-1" />
              Completo
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-600">
              {totalExpected - totalCurrent} restantes
            </Badge>
          )}
        </div>
      )}

      {/* Blocks */}
      <div className="grid gap-6 md:grid-cols-2">
        {worshipItems.map((item) => (
          <WorshipBlock
            key={item.id}
            item={item}
            eventId={eventId}
            readOnly={readOnly}
          />
        ))}
      </div>
    </div>
  )
}

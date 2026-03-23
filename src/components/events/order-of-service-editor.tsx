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
  GripVertical,
  Plus,
  Pencil,
  Trash2,
  Clock,
  User,
  BookOpen,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Music,
  X,
  Check,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import {
  useEventItems,
  useCreateEventItem,
  useUpdateEventItem,
  useDeleteEventItem,
  useReorderEventItems,
  eventItemTypeConfig,
  calculateStartTimes,
  calculateTotalDuration,
  formatDuration,
  type EventItem,
  type EventItemType,
  type CreateEventItemInput,
  type SetlistItem,
} from "@/hooks/use-event-items"
import { useUsers, type User as UserType } from "@/hooks/use-users"

interface OrderOfServiceEditorProps {
  eventId: string
  eventStartTime: string
  readOnly?: boolean
}

// Sortable Setlist Song (for inline reordering)
const SortableSetlistSong = React.memo(function SortableSetlistSong({
  setlistItem,
  index,
}: {
  setlistItem: SetlistItem
  index: number
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: setlistItem.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 rounded bg-background border border-border",
        isDragging && "z-50 opacity-90 shadow-lg ring-2 ring-primary"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="touch-none cursor-grab p-0.5 text-muted-foreground hover:text-foreground active:cursor-grabbing"
        type="button"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-xs text-muted-foreground w-5">{index + 1}.</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{setlistItem.song.name}</p>
        {setlistItem.song.artist && (
          <p className="text-xs text-muted-foreground truncate">
            {setlistItem.song.artist}
          </p>
        )}
      </div>
      {setlistItem.key && (
        <Badge variant="secondary" className="text-xs">
          Tom: {setlistItem.key}
        </Badge>
      )}
      {setlistItem.song.chordLink && (
        <a
          href={setlistItem.song.chordLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary/80"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  )
})

// Sortable Item Component
const SortableItem = React.memo(function SortableItem({
  item,
  startTime,
  onEdit,
  onDelete,
  readOnly,
  isExpanded,
  onToggleExpand,
  onReorderSongs,
}: {
  item: EventItem
  startTime: string
  onEdit: () => void
  onDelete: () => void
  readOnly: boolean
  isExpanded: boolean
  onToggleExpand: () => void
  onReorderSongs?: (itemId: string, songIds: string[]) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: readOnly })

  // Local state for setlist items (to enable drag and drop reordering)
  const [localSetlistItems, setLocalSetlistItems] = React.useState(item.setlistItems || [])

  // Sync with parent data
  React.useEffect(() => {
    setLocalSetlistItems(item.setlistItems || [])
  }, [item.setlistItems])

  // Sensors for song drag and drop
  const songSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handle song reorder
  const handleSongDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = localSetlistItems.findIndex((s) => s.id === active.id)
      const newIndex = localSetlistItems.findIndex((s) => s.id === over.id)
      const newItems = arrayMove(localSetlistItems, oldIndex, newIndex)
      setLocalSetlistItems(newItems)

      // Call parent to persist the reorder
      if (onReorderSongs) {
        onReorderSongs(item.id, newItems.map((s) => s.songId))
      }
    }
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const config = eventItemTypeConfig[item.type]
  const hasDetails = item.description || item.bibleReference || item.notes || item.mediaUrl
  const hasSongs = item.type === "WORSHIP" && item.setlistItems && item.setlistItems.length > 0
  const hasExpectedSongs = item.type === "WORSHIP" && item.expectedSongCount && item.expectedSongCount > 0
  const currentSongCount = item.setlistItems?.length || 0
  const expectedSongCount = item.expectedSongCount || 0
  const isSongCountComplete = hasExpectedSongs && currentSongCount >= expectedSongCount

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative",
        isDragging && "z-50 opacity-90"
      )}
    >
      <Card
        className={cn(
          "bg-secondary border-border transition-all",
          isDragging && "shadow-lg ring-2 ring-primary"
        )}
      >
        <CardContent className="p-0">
          {/* Main Row */}
          <div className="flex items-center gap-3 p-3">
            {/* Drag Handle */}
            {!readOnly && (
              <button
                {...attributes}
                {...listeners}
                className="touch-none cursor-grab p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
              >
                <GripVertical className="h-5 w-5" />
              </button>
            )}

            {/* Time */}
            <div className="w-14 shrink-0 text-center">
              <span className="text-sm font-medium text-primary">{startTime}</span>
            </div>

            {/* Type Badge */}
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg",
                config.color,
                "bg-opacity-20"
              )}
              title={config.label}
            >
              {config.emoji}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-foreground truncate">
                  {item.title}
                </h4>
                {item.durationMinutes && (
                  <Badge variant="outline" className="shrink-0 text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {item.durationMinutes}min
                  </Badge>
                )}
                {/* Badge de músicas para blocos WORSHIP */}
                {item.type === "WORSHIP" && (hasExpectedSongs || hasSongs) && (
                  <Badge
                    variant={isSongCountComplete ? "default" : "secondary"}
                    className={cn(
                      "shrink-0 text-xs",
                      hasExpectedSongs && !isSongCountComplete && "bg-amber-500/20 text-amber-600 border-amber-500/30"
                    )}
                  >
                    <Music className="h-3 w-3 mr-1" />
                    {hasExpectedSongs
                      ? `${currentSongCount}/${expectedSongCount} musicas`
                      : `${currentSongCount} ${currentSongCount === 1 ? "musica" : "musicas"}`
                    }
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                <span className="truncate">{config.label}</span>
                {item.responsible && (
                  <span className="flex items-center gap-1 shrink-0">
                    <User className="h-3 w-3" />
                    {item.responsible.name || item.responsible.email}
                  </span>
                )}
                {item.bibleReference && (
                  <span className="flex items-center gap-1 shrink-0">
                    <BookOpen className="h-3 w-3" />
                    {item.bibleReference}
                  </span>
                )}
              </div>
              {/* Songs preview for WORSHIP type */}
              {hasSongs && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {item.setlistItems.slice(0, 3).map((setlistItem) => (
                    <Badge
                      key={setlistItem.id}
                      variant="outline"
                      className="text-xs bg-primary/5 border-primary/20"
                    >
                      {setlistItem.song.name}
                      {setlistItem.key && ` (${setlistItem.key})`}
                    </Badge>
                  ))}
                  {item.setlistItems.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{item.setlistItems.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {(hasDetails || hasSongs) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={onToggleExpand}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              )}
              {!readOnly && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={onEdit}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={onDelete}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Expanded Details */}
          {isExpanded && (hasDetails || hasSongs) && (
            <div className="border-t border-border p-3 bg-background/50 space-y-3 text-sm">
              {item.description && (
                <p className="text-muted-foreground">{item.description}</p>
              )}
              {item.bibleReference && (
                <p className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span className="font-medium">{item.bibleReference}</span>
                </p>
              )}
              {item.mediaUrl && (
                <a
                  href={item.mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir midia
                </a>
              )}
              {/* Songs list for WORSHIP type - with drag and drop if not readOnly */}
              {hasSongs && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Music className="h-3 w-3" />
                    Musicas deste bloco:
                    {!readOnly && (
                      <span className="text-xs text-muted-foreground ml-1">
                        (arraste para reordenar)
                      </span>
                    )}
                  </p>
                  {!readOnly && onReorderSongs ? (
                    <DndContext
                      sensors={songSensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleSongDragEnd}
                    >
                      <SortableContext
                        items={localSetlistItems.map((s) => s.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-1">
                          {localSetlistItems.map((setlistItem, index) => (
                            <SortableSetlistSong
                              key={setlistItem.id}
                              setlistItem={setlistItem}
                              index={index}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <div className="space-y-1">
                      {item.setlistItems.map((setlistItem, index) => (
                        <div
                          key={setlistItem.id}
                          className="flex items-center gap-2 p-2 rounded bg-background border border-border"
                        >
                          <span className="text-xs text-muted-foreground w-5">{index + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{setlistItem.song.name}</p>
                            {setlistItem.song.artist && (
                              <p className="text-xs text-muted-foreground truncate">
                                {setlistItem.song.artist}
                              </p>
                            )}
                          </div>
                          {setlistItem.key && (
                            <Badge variant="secondary" className="text-xs">
                              Tom: {setlistItem.key}
                            </Badge>
                          )}
                          {setlistItem.song.chordLink && (
                            <a
                              href={setlistItem.song.chordLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary/80"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {item.notes && !item.isPublic && (
                <div className="p-2 bg-amber-500/10 rounded border border-amber-500/20">
                  <p className="text-xs font-medium text-amber-500 mb-1">
                    Notas internas:
                  </p>
                  <p className="text-muted-foreground">{item.notes}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
})

// User Selector Component
function UserSelector({
  value,
  onChange,
}: {
  value: string | undefined
  onChange: (userId: string | undefined) => void
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [cachedUser, setCachedUser] = React.useState<UserType | null>(null)

  // Only fetch when popover is open
  const { data: usersData, isLoading } = useUsers(
    isOpen ? { search: searchQuery } : null
  )

  // Garantir que users seja sempre um array
  const users: UserType[] = Array.isArray(usersData?.data) ? usersData.data : []
  const selectedUser = (users.length > 0 ? users.find((u) => u.id === value) : null) || cachedUser

  // Cache the selected user when found
  React.useEffect(() => {
    if (value && users.length > 0) {
      const found = users.find((u) => u.id === value)
      if (found) {
        setCachedUser(found)
      }
    } else if (!value) {
      setCachedUser(null)
    }
  }, [value, users])

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <User className="h-4 w-4" />
        Responsavel
      </Label>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start"
            type="button"
          >
            {selectedUser ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={selectedUser.image || undefined} />
                  <AvatarFallback className="text-xs">
                    {(selectedUser.name || selectedUser.email)[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{selectedUser.name || selectedUser.email}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">Selecionar responsavel...</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Buscar usuario..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>
                {isLoading ? "Carregando..." : "Nenhum usuario encontrado."}
              </CommandEmpty>
              <CommandGroup heading="Usuarios">
                {value && (
                  <CommandItem
                    onSelect={() => {
                      onChange(undefined)
                      setIsOpen(false)
                    }}
                    className="text-muted-foreground"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remover responsavel
                  </CommandItem>
                )}
                {users.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.name || user.email}
                    onSelect={() => {
                      onChange(user.id)
                      setIsOpen(false)
                    }}
                  >
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarImage src={user.image || undefined} />
                      <AvatarFallback className="text-xs">
                        {(user.name || user.email)[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{user.name || user.email}</p>
                      {user.name && (
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      )}
                    </div>
                    {user.id === value && (
                      <Check className="h-4 w-4 text-primary shrink-0 ml-2" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

// Item Form Modal
function ItemFormModal({
  open,
  onClose,
  item,
  onSave,
  isLoading,
}: {
  open: boolean
  onClose: () => void
  item: EventItem | null
  onSave: (data: CreateEventItemInput) => Promise<void>
  isLoading: boolean
}) {
  const [formData, setFormData] = React.useState<CreateEventItemInput>({
    type: "OTHER",
    title: "",
    description: "",
    durationMinutes: undefined,
    responsibleId: undefined,
    bibleReference: "",
    mediaUrl: "",
    notes: "",
    isPublic: true,
    expectedSongCount: undefined,
    requiresMedia: false,
  })
  const [isSaving, setIsSaving] = React.useState(false)

  // Reset form when item changes
  React.useEffect(() => {
    if (item) {
      setFormData({
        type: item.type,
        title: item.title,
        description: item.description || "",
        durationMinutes: item.durationMinutes || undefined,
        responsibleId: item.responsibleId || undefined,
        bibleReference: item.bibleReference || "",
        mediaUrl: item.mediaUrl || "",
        notes: item.notes || "",
        isPublic: item.isPublic,
        expectedSongCount: item.expectedSongCount || undefined,
        requiresMedia: item.requiresMedia || false,
      })
    } else {
      setFormData({
        type: "OTHER",
        title: "",
        description: "",
        durationMinutes: undefined,
        responsibleId: undefined,
        bibleReference: "",
        mediaUrl: "",
        notes: "",
        isPublic: true,
        expectedSongCount: undefined,
        requiresMedia: false,
      })
    }
  }, [item, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      toast({
        title: "Erro",
        description: "Titulo e obrigatorio",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      await onSave(formData)
    } finally {
      setIsSaving(false)
    }
  }

  const itemTypes = Object.entries(eventItemTypeConfig) as [
    EventItemType,
    { label: string; emoji: string }
  ][]

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[550px] bg-card max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {item ? "Editar Item" : "Adicionar Item"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type */}
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData({ ...formData, type: value as EventItemType })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {itemTypes.map(([type, config]) => (
                  <SelectItem key={type} value={type}>
                    <span className="flex items-center gap-2">
                      <span>{config.emoji}</span>
                      <span>{config.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Titulo *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Ex: Louvor de Abertura"
            />
          </div>

          {/* Responsible */}
          <UserSelector
            value={formData.responsibleId}
            onChange={(userId) =>
              setFormData({ ...formData, responsibleId: userId })
            }
          />

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duracao (minutos)</Label>
            <Input
              id="duration"
              type="number"
              min={1}
              max={180}
              value={formData.durationMinutes || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  durationMinutes: e.target.value
                    ? parseInt(e.target.value)
                    : undefined,
                })
              }
              placeholder="Ex: 15"
            />
          </div>

          {/* Expected song count for WORSHIP type */}
          {formData.type === "WORSHIP" && (
            <div className="space-y-2">
              <Label htmlFor="expectedSongCount" className="flex items-center gap-2">
                <Music className="h-4 w-4" />
                Quantidade de Musicas
              </Label>
              <Input
                id="expectedSongCount"
                type="number"
                min={1}
                max={20}
                value={formData.expectedSongCount || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    expectedSongCount: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  })
                }
                placeholder="Ex: 3"
              />
              <p className="text-xs text-muted-foreground">
                Defina quantas musicas este bloco de louvor deve ter.
                A equipe de louvor ira associar as musicas especificas na aba Setlist.
              </p>
            </div>
          )}

          {/* Bible Reference (only for READING type) */}
          {(formData.type === "READING" || formData.type === "PREACHING") && (
            <div className="space-y-2">
              <Label htmlFor="bibleRef">Referencia Biblica</Label>
              <Input
                id="bibleRef"
                value={formData.bibleReference || ""}
                onChange={(e) =>
                  setFormData({ ...formData, bibleReference: e.target.value })
                }
                placeholder="Ex: Joao 3:16-21"
              />
            </div>
          )}

          {/* Media URL (only for VIDEO type) */}
          {formData.type === "VIDEO" && (
            <div className="space-y-2">
              <Label htmlFor="mediaUrl">Link do Video</Label>
              <Input
                id="mediaUrl"
                type="url"
                value={formData.mediaUrl || ""}
                onChange={(e) =>
                  setFormData({ ...formData, mediaUrl: e.target.value })
                }
                placeholder="https://..."
              />
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descricao</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Detalhes sobre este momento..."
              rows={2}
            />
          </div>

          {/* Internal Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas Internas (so equipe)</Label>
            <Textarea
              id="notes"
              value={formData.notes || ""}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Informacoes apenas para a equipe..."
              rows={2}
            />
          </div>

          {/* Requires Media */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="requiresMedia">Requer Midia</Label>
              <p className="text-xs text-muted-foreground">
                A equipe de midia vera que precisa adicionar arquivos
              </p>
            </div>
            <Switch
              id="requiresMedia"
              checked={formData.requiresMedia || false}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, requiresMedia: checked })
              }
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || isSaving}>
              {(isLoading || isSaving) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {item ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// API function to reorder setlist songs
async function reorderSetlistSongs(
  eventId: string,
  itemId: string,
  songIds: string[]
): Promise<void> {
  const response = await fetch(`/api/events/${eventId}/items/${itemId}/songs`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ songIds }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Erro ao reordenar musicas")
  }
}

// Main Editor Component
export function OrderOfServiceEditor({
  eventId,
  eventStartTime,
  readOnly = false,
}: OrderOfServiceEditorProps) {
  const { data: items, isLoading } = useEventItems(eventId)
  const createItem = useCreateEventItem()
  const updateItem = useUpdateEventItem()
  const deleteItem = useDeleteEventItem()
  const reorderItems = useReorderEventItems()
  const queryClient = useQueryClient()

  const [localItems, setLocalItems] = React.useState<EventItem[]>([])
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set())
  const [editingItem, setEditingItem] = React.useState<EventItem | null>(null)
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [deleteConfirmItem, setDeleteConfirmItem] = React.useState<EventItem | null>(null)

  // Sync with server data
  React.useEffect(() => {
    if (items) {
      setLocalItems(items)
    }
  }, [items])

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Calculate start times for each item
  const startTimes = React.useMemo(() => {
    return calculateStartTimes(localItems, eventStartTime)
  }, [localItems, eventStartTime])

  // Total duration
  const totalDuration = React.useMemo(() => {
    return calculateTotalDuration(localItems)
  }, [localItems])

  // Handle reorder setlist songs
  const handleReorderSetlistSongs = async (itemId: string, songIds: string[]) => {
    try {
      await reorderSetlistSongs(eventId, itemId, songIds)
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["eventItems", eventId] })
    } catch (error) {
      console.error("Error reordering songs:", error)
      toast({
        title: "Erro",
        description: "Erro ao reordenar musicas",
        variant: "destructive",
      })
    }
  }

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = localItems.findIndex((i) => i.id === active.id)
      const newIndex = localItems.findIndex((i) => i.id === over.id)

      const newItems = arrayMove(localItems, oldIndex, newIndex)
      setLocalItems(newItems)

      try {
        await reorderItems.mutateAsync({
          eventId,
          itemIds: newItems.map((i) => i.id),
        })
      } catch {
        // Revert on error
        setLocalItems(localItems)
        toast({
          title: "Erro",
          description: "Erro ao reordenar itens",
          variant: "destructive",
        })
      }
    }
  }

  // Handle add/edit item
  const handleSaveItem = async (data: CreateEventItemInput) => {
    try {
      if (editingItem) {
        // Update existing item
        await updateItem.mutateAsync({
          eventId,
          itemId: editingItem.id,
          data,
        })
        toast({ title: "Sucesso", description: "Item atualizado" })
      } else {
        // Create new item
        await createItem.mutateAsync({ eventId, data })
        toast({ title: "Sucesso", description: "Item adicionado" })
      }

      setIsFormOpen(false)
      setEditingItem(null)
    } catch (error) {
      console.error("Error saving item:", error)
      toast({
        title: "Erro",
        description: "Erro ao salvar item",
        variant: "destructive",
      })
    }
  }

  // Handle delete item
  const handleDeleteItem = async () => {
    if (!deleteConfirmItem) return

    try {
      await deleteItem.mutateAsync({
        eventId,
        itemId: deleteConfirmItem.id,
      })
      toast({ title: "Sucesso", description: "Item removido" })
      setDeleteConfirmItem(null)
    } catch {
      toast({
        title: "Erro",
        description: "Erro ao remover item",
        variant: "destructive",
      })
    }
  }

  // Toggle item expansion
  const toggleExpand = (itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  if (isLoading) {
    return <OrderOfServiceEditorSkeleton />
  }

  return (
    <div className="space-y-4">
      {/* Header with summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Inicio: {eventStartTime}
          </span>
          {totalDuration > 0 && (
            <span>Duracao total: {formatDuration(totalDuration)}</span>
          )}
        </div>
        {!readOnly && (
          <Button
            size="sm"
            onClick={() => {
              setEditingItem(null)
              setIsFormOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar Item
          </Button>
        )}
      </div>

      {/* Items List */}
      {localItems.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">
            Nenhum item na ordem de culto ainda.
          </p>
          {!readOnly && (
            <Button
              variant="outline"
              onClick={() => {
                setEditingItem(null)
                setIsFormOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar primeiro item
            </Button>
          )}
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={localItems.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {localItems.map((item) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  startTime={startTimes.get(item.id) || "--:--"}
                  onEdit={() => {
                    setEditingItem(item)
                    setIsFormOpen(true)
                  }}
                  onDelete={() => setDeleteConfirmItem(item)}
                  readOnly={readOnly}
                  isExpanded={expandedItems.has(item.id)}
                  onToggleExpand={() => toggleExpand(item.id)}
                  onReorderSongs={handleReorderSetlistSongs}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Item Form Modal */}
      <ItemFormModal
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingItem(null)
        }}
        item={editingItem}
        onSave={handleSaveItem}
        isLoading={createItem.isPending || updateItem.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteConfirmItem}
        onOpenChange={(o) => !o && setDeleteConfirmItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover item?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover &quot;{deleteConfirmItem?.title}&quot;?
              Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteItem.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Loading Skeleton
export function OrderOfServiceEditorSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-5 w-14" />
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

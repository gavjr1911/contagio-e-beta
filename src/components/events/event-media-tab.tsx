"use client"

import { useState } from "react"
import {
  FileIcon,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  Loader2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MediaUpload } from "@/components/media/media-upload"
import { MediaList } from "@/components/media/media-list"
import { useEventMedia } from "@/hooks/use-media"
import type { EventItemMediaStatus } from "@/lib/validations/media"
import { cn } from "@/lib/utils"

interface EventMediaTabProps {
  eventId: string
  readOnly?: boolean
}

export function EventMediaTab({ eventId, readOnly = false }: EventMediaTabProps) {
  const { data, isLoading, error, refetch } = useEventMedia(eventId)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [uploadDialogItem, setUploadDialogItem] = useState<EventItemMediaStatus | null>(null)
  const [showLooseUpload, setShowLooseUpload] = useState(false)

  const toggleItem = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="mt-2 text-sm text-muted-foreground">
          Erro ao carregar midia
        </p>
        <Button variant="outline" onClick={() => refetch()} className="mt-4">
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (!data) return null

  const { items, looseMedia, stats } = data
  const itemsRequiringMedia = items.filter((i) => i.requiresMedia)
  const allMedia = [...items.flatMap((i) => i.mediaFiles), ...looseMedia]

  return (
    <div className="space-y-6">
      {/* Estatisticas */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalFiles}</div>
            <p className="text-sm text-muted-foreground">Total de arquivos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.itemsRequiringMedia}</div>
            <p className="text-sm text-muted-foreground">Itens que requerem midia</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.itemsWithMedia}</div>
            <p className="text-sm text-muted-foreground">Itens com midia</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className={cn("text-2xl font-bold", stats.pendingItems > 0 && "text-amber-600")}>
              {stats.pendingItems}
            </div>
            <p className="text-sm text-muted-foreground">Itens pendentes</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="items" className="w-full">
        <TabsList>
          <TabsTrigger value="items">Por Item</TabsTrigger>
          <TabsTrigger value="all">Todos os Arquivos</TabsTrigger>
        </TabsList>

        {/* Por Item */}
        <TabsContent value="items" className="space-y-4 mt-4">
          {/* Itens que requerem midia */}
          {itemsRequiringMedia.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Itens que requerem midia
              </h3>
              {itemsRequiringMedia.map((item) => (
                <ItemMediaCard
                  key={item.id}
                  item={item}
                  eventId={eventId}
                  readOnly={readOnly}
                  isExpanded={expandedItems.has(item.id)}
                  onToggle={() => toggleItem(item.id)}
                  onAddMedia={() => setUploadDialogItem(item)}
                />
              ))}
            </div>
          )}

          {/* Outros itens com midia */}
          {items.filter((i) => !i.requiresMedia && i.mediaCount > 0).length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Outros itens com arquivos
              </h3>
              {items
                .filter((i) => !i.requiresMedia && i.mediaCount > 0)
                .map((item) => (
                  <ItemMediaCard
                    key={item.id}
                    item={item}
                    eventId={eventId}
                    readOnly={readOnly}
                    isExpanded={expandedItems.has(item.id)}
                    onToggle={() => toggleItem(item.id)}
                    onAddMedia={() => setUploadDialogItem(item)}
                  />
                ))}
            </div>
          )}

          {/* Arquivos avulsos */}
          {looseMedia.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Arquivos avulsos
              </h3>
              <MediaList
                media={looseMedia}
                eventId={eventId}
                readOnly={readOnly}
                emptyMessage="Nenhum arquivo avulso"
              />
            </div>
          )}

          {/* Botao para adicionar arquivo avulso */}
          {!readOnly && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowLooseUpload(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar arquivo avulso
            </Button>
          )}

          {itemsRequiringMedia.length === 0 && looseMedia.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <FileIcon className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">Nenhum item requer midia</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Marque itens na ordem do culto como "Requer Midia" para que aparecam aqui
              </p>
            </div>
          )}
        </TabsContent>

        {/* Todos os arquivos */}
        <TabsContent value="all" className="mt-4">
          <MediaList
            media={allMedia}
            eventId={eventId}
            readOnly={readOnly}
            emptyMessage="Nenhum arquivo encontrado neste evento"
          />
        </TabsContent>
      </Tabs>

      {/* Dialog de upload para item especifico */}
      <Dialog
        open={!!uploadDialogItem}
        onOpenChange={(open) => !open && setUploadDialogItem(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Adicionar midia: {uploadDialogItem?.title}
            </DialogTitle>
          </DialogHeader>
          <MediaUpload
            eventId={eventId}
            eventItemId={uploadDialogItem?.id}
            onUploadComplete={() => {
              refetch()
              setUploadDialogItem(null)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog de upload para arquivo avulso */}
      <Dialog open={showLooseUpload} onOpenChange={setShowLooseUpload}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar arquivo avulso</DialogTitle>
          </DialogHeader>
          <MediaUpload
            eventId={eventId}
            onUploadComplete={() => {
              refetch()
              setShowLooseUpload(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Componente interno para card de item
interface ItemMediaCardProps {
  item: EventItemMediaStatus
  eventId: string
  readOnly: boolean
  isExpanded: boolean
  onToggle: () => void
  onAddMedia: () => void
}

function ItemMediaCard({
  item,
  eventId,
  readOnly,
  isExpanded,
  onToggle,
  onAddMedia,
}: ItemMediaCardProps) {
  const hasMedia = item.mediaCount > 0
  const isPending = item.requiresMedia && !hasMedia

  return (
    <Card className={cn(isPending && "border-amber-500/50")}>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer py-3 hover:bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {item.order}
                </span>
                <div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">{item.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {item.requiresMedia && (
                  <Badge variant={hasMedia ? "default" : "outline"} className={cn(
                    hasMedia && "bg-green-500 text-white",
                    !hasMedia && "border-amber-500 text-amber-500"
                  )}>
                    {hasMedia ? (
                      <>
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        {item.mediaCount} arquivo{item.mediaCount > 1 ? "s" : ""}
                      </>
                    ) : (
                      <>
                        <AlertCircle className="mr-1 h-3 w-3" />
                        Pendente
                      </>
                    )}
                  </Badge>
                )}
                {!item.requiresMedia && item.mediaCount > 0 && (
                  <Badge variant="secondary">
                    {item.mediaCount} arquivo{item.mediaCount > 1 ? "s" : ""}
                  </Badge>
                )}
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {item.mediaFiles.length > 0 && (
                <MediaList
                  media={item.mediaFiles}
                  eventId={eventId}
                  readOnly={readOnly}
                />
              )}

              {!readOnly && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onAddMedia()
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar arquivo
                </Button>
              )}

              {readOnly && item.mediaFiles.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum arquivo adicionado
                </p>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

"use client"

import { useState } from "react"
import Image from "next/image"
import {
  ExternalLink,
  Download,
  Trash2,
  FileIcon,
  FileTextIcon,
  VideoIcon,
  PresentationIcon,
  MoreVertical,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  useDeleteMedia,
  formatFileSize,
  isImageType,
  isVideoType,
} from "@/hooks/use-media"
import type { MediaResponse } from "@/lib/validations/media"

interface MediaListProps {
  media: MediaResponse[]
  eventId: string
  readOnly?: boolean
  emptyMessage?: string
}

export function MediaList({
  media,
  eventId,
  readOnly = false,
  emptyMessage = "Nenhum arquivo encontrado",
}: MediaListProps) {
  const [deleteMediaId, setDeleteMediaId] = useState<string | null>(null)
  const deleteMutation = useDeleteMedia()

  const handleDelete = async () => {
    if (!deleteMediaId) return

    await deleteMutation.mutateAsync({
      id: deleteMediaId,
      eventId,
    })

    setDeleteMediaId(null)
  }

  const getMediaIcon = (type: string) => {
    switch (type) {
      case "IMAGE":
        return null // Imagens mostram thumbnail
      case "VIDEO":
        return <VideoIcon className="h-12 w-12 text-purple-500" />
      case "PDF":
        return <FileTextIcon className="h-12 w-12 text-red-500" />
      case "PRESENTATION":
        return <PresentationIcon className="h-12 w-12 text-orange-500" />
      default:
        return <FileIcon className="h-12 w-12 text-gray-500" />
    }
  }

  if (media.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <FileIcon className="h-10 w-10 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {media.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            {/* Preview */}
            <div className="relative aspect-video bg-muted">
              {isImageType(item.mimeType) ? (
                <Image
                  src={item.url}
                  alt={item.originalName || "Imagem"}
                  fill
                  className="object-cover"
                />
              ) : isVideoType(item.mimeType) ? (
                <video
                  src={item.url}
                  className="h-full w-full object-cover"
                  muted
                  preload="metadata"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  {getMediaIcon(item.type)}
                </div>
              )}
            </div>

            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={item.originalName || undefined}>
                    {item.originalName || item.filename || "Arquivo"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(item.fileSize)}
                  </p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Abrir
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href={item.url} download={item.originalName || undefined}>
                        <Download className="mr-2 h-4 w-4" />
                        Baixar
                      </a>
                    </DropdownMenuItem>
                    {!readOnly && (
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteMediaId(item.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remover
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {item.uploadedBy && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Por {item.uploadedBy.name}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de confirmacao de exclusao */}
      <AlertDialog
        open={!!deleteMediaId}
        onOpenChange={(open) => !open && setDeleteMediaId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover arquivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. O arquivo sera removido
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

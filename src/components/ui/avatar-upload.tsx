"use client"

import * as React from "react"
import { Camera, Loader2, X } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

interface AvatarUploadProps {
  currentImage?: string | null
  name?: string
  onUpload: (url: string) => void
  onRemove?: () => void
  size?: "sm" | "md" | "lg"
  className?: string
  disabled?: boolean
}

const sizeClasses = {
  sm: "h-16 w-16",
  md: "h-24 w-24",
  lg: "h-32 w-32",
}

const iconSizeClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
}

export function AvatarUpload({
  currentImage,
  name,
  onUpload,
  onRemove,
  size = "md",
  className,
  disabled = false,
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = React.useState(false)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const initials = name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U"

  const displayImage = previewUrl || currentImage

  const handleClick = () => {
    if (!disabled && !isUploading) {
      inputRef.current?.click()
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Erro",
        description: "Apenas imagens sao permitidas",
        variant: "destructive",
      })
      return
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "Arquivo muito grande (max 5MB)",
        variant: "destructive",
      })
      return
    }

    // Preview local
    const localPreview = URL.createObjectURL(file)
    setPreviewUrl(localPreview)

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Erro ao fazer upload")
      }

      onUpload(result.data.url)
      toast({
        title: "Sucesso",
        description: "Foto atualizada com sucesso",
      })
    } catch (error) {
      console.error("Erro no upload:", error)
      setPreviewUrl(null)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao fazer upload",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      // Limpar preview URL
      if (localPreview) {
        URL.revokeObjectURL(localPreview)
      }
      // Limpar input
      if (inputRef.current) {
        inputRef.current.value = ""
      }
    }
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    setPreviewUrl(null)
    onRemove?.()
  }

  return (
    <div className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isUploading}
        className={cn(
          "relative group rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <Avatar className={cn(sizeClasses[size], "border-2 border-muted")}>
          <AvatarImage src={displayImage || undefined} alt={name || "Avatar"} />
          <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Overlay com icone de camera */}
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity",
            !disabled && !isUploading && "group-hover:opacity-100"
          )}
        >
          {isUploading ? (
            <Loader2 className={cn(iconSizeClasses[size], "text-white animate-spin")} />
          ) : (
            <Camera className={cn(iconSizeClasses[size], "text-white")} />
          )}
        </div>

        {/* Indicador de loading */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
            <Loader2 className={cn(iconSizeClasses[size], "text-white animate-spin")} />
          </div>
        )}
      </button>

      {/* Botao de remover */}
      {displayImage && onRemove && !isUploading && !disabled && (
        <button
          type="button"
          onClick={handleRemove}
          className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md hover:bg-destructive-hover transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {/* Input hidden */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
      />
    </div>
  )
}

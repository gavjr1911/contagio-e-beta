"use client"

import * as React from "react"
import * as LucideIcons from "lucide-react"
import {
  positionIcons,
  iconCategories,
  defaultPositionIcon,
  type PositionIconCategory,
} from "@/lib/constants/position-icons"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface IconPickerProps {
  value?: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function IconPicker({ value, onChange, disabled }: IconPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState<PositionIconCategory | "all">("all")

  // Filtrar ícones
  const filteredIcons = React.useMemo(() => {
    return positionIcons.filter((icon) => {
      const matchesSearch =
        search === "" ||
        icon.name.toLowerCase().includes(search.toLowerCase()) ||
        icon.label.toLowerCase().includes(search.toLowerCase())
      const matchesCategory =
        selectedCategory === "all" || icon.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [search, selectedCategory])

  // Renderizar ícone por nome
  const renderIcon = (iconName: string, className?: string) => {
    const IconComponent = LucideIcons[iconName as keyof typeof LucideIcons] as React.FC<{ className?: string }>
    if (!IconComponent) {
      const FallbackIcon = LucideIcons.Briefcase
      return <FallbackIcon className={className} />
    }
    return <IconComponent className={className} />
  }

  const currentIcon = value || defaultPositionIcon

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-start gap-2"
        >
          {renderIcon(currentIcon, "h-4 w-4")}
          <span className="text-muted-foreground text-sm">
            {positionIcons.find((i) => i.name === currentIcon)?.label || "Selecionar ícone"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <Input
            placeholder="Buscar ícone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="p-2 border-b">
          <div className="flex flex-wrap gap-1">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => setSelectedCategory("all")}
            >
              Todos
            </Button>
            {iconCategories.map((cat) => (
              <Button
                key={cat.value}
                variant={selectedCategory === cat.value ? "default" : "outline"}
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => setSelectedCategory(cat.value)}
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </div>
        <ScrollArea className="h-64">
          <div className="grid grid-cols-6 gap-1 p-2">
            {filteredIcons.map((icon) => (
              <button
                key={icon.name}
                type="button"
                className={cn(
                  "flex items-center justify-center p-2 rounded-md hover:bg-accent transition-colors",
                  currentIcon === icon.name && "bg-primary text-primary-foreground"
                )}
                onClick={() => {
                  onChange(icon.name)
                  setOpen(false)
                }}
                title={icon.label}
              >
                {renderIcon(icon.name, "h-5 w-5")}
              </button>
            ))}
          </div>
          {filteredIcons.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhum ícone encontrado
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

// Componente auxiliar para renderizar ícone por nome (exportado para uso em outros componentes)
export function PositionIcon({
  name,
  className,
  fallback = "Briefcase",
}: {
  name?: string | null
  className?: string
  fallback?: string
}) {
  const iconName = name || fallback
  const IconComponent = LucideIcons[iconName as keyof typeof LucideIcons] as React.FC<{ className?: string }>
  if (!IconComponent) {
    const FallbackIcon = LucideIcons[fallback as keyof typeof LucideIcons] as React.FC<{ className?: string }>
    return <FallbackIcon className={className} />
  }
  return <IconComponent className={className} />
}

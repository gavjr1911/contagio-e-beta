"use client"

import * as React from "react"
import { Check, ChevronDown, ClipboardCheck, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useChecklistTemplates } from "@/hooks/use-checklist-templates"
import { cn } from "@/lib/utils"

interface ChecklistTemplateSelectProps {
  value: string | null
  onChange: (templateId: string | null) => void
  disabled?: boolean
}

export function ChecklistTemplateSelect({
  value,
  onChange,
  disabled = false,
}: ChecklistTemplateSelectProps) {
  const { data, isLoading } = useChecklistTemplates()

  const templates = data?.items || []
  const selectedTemplate = templates.find((t) => t.id === value)

  if (isLoading) {
    return (
      <Button variant="outline" disabled className="justify-between min-w-[200px]">
        Carregando...
        <ChevronDown className="h-4 w-4 ml-2" />
      </Button>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Nenhum template de checklist disponível.
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="justify-between min-w-[200px]"
            disabled={disabled}
          >
            {selectedTemplate ? (
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                {selectedTemplate.name}
              </span>
            ) : (
              "Selecionar checklist..."
            )}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[280px]">
          {templates.map((template) => (
            <DropdownMenuItem
              key={template.id}
              onClick={() => onChange(template.id)}
              className={cn(
                "flex items-center justify-between",
                value === template.id && "bg-primary/10"
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{template.name}</p>
                <p className="text-xs text-muted-foreground">
                  {template.items.length} {template.items.length === 1 ? "item" : "itens"}
                </p>
              </div>
              {value === template.id && (
                <Check className="h-4 w-4 text-primary flex-shrink-0" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {selectedTemplate && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(null)}
          disabled={disabled}
        >
          <X className="h-4 w-4 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  )
}

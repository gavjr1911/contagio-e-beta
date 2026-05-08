import * as React from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: React.ReactNode
  description?: React.ReactNode
  backHref?: string
  backLabel?: string
  icon?: React.ComponentType<{ className?: string }>
  iconClassName?: string
  actions?: React.ReactNode
  /** Linha extra abaixo da descrição (ex.: data/hora, badges, meta info). */
  meta?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  backHref,
  backLabel,
  icon: Icon,
  iconClassName,
  actions,
  meta,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {backHref && (
            <Link href={backHref}>
              <Button
                variant="ghost"
                size="icon"
                aria-label={backLabel || "Voltar"}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
          )}

          {Icon && (
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15",
                iconClassName,
              )}
            >
              <Icon className="h-6 w-6 text-primary" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground font-display tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="text-muted-foreground text-sm mt-1">{description}</p>
            )}
            {meta && <div className="mt-2">{meta}</div>}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

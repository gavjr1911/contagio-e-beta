"use client";

import * as React from "react";
import Link from "next/link";
import {
  Plus,
  FileText,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Loader2,
  ChevronDown,
  Clock,
  Users,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useTemplates,
  useDeleteTemplate,
  EventTemplate,
  getEventTypeLabel,
  TemplateFilters,
  TemplateItem,
  TemplateSchedule,
} from "@/hooks/use-templates";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export default function TemplatesPage() {
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState<TemplateFilters>({});
  const [showFilters, setShowFilters] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [templateToDelete, setTemplateToDelete] = React.useState<EventTemplate | null>(null);

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const effectiveFilters = React.useMemo(() => ({
    ...filters,
    search: debouncedSearch || undefined,
  }), [filters, debouncedSearch]);

  const { data: templates, isLoading, error } = useTemplates(effectiveFilters);
  const deleteTemplate = useDeleteTemplate();

  const handleDeleteClick = (template: EventTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;

    try {
      await deleteTemplate.mutateAsync(templateToDelete.id);
      toast({
        title: "Sucesso",
        description: "Template excluído com sucesso!",
      });
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (error) {
      toast({
        title: "Erro ao excluir template",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const clearFilters = () => {
    setSearch("");
    setFilters({});
  };

  const hasActiveFilters = !!filters.eventType || !!debouncedSearch;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Templates de Eventos"
        description="Gerencie modelos reutilizáveis para criar eventos rapidamente"
        actions={
          <Link href="/templates/novo">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Template
            </Button>
          </Link>
        }
      />

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Button */}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={cn("w-full sm:w-auto", hasActiveFilters && "border-primary")}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
            {filters.eventType && (
              <Badge className="ml-2 bg-primary text-white">1</Badge>
            )}
          </Button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex flex-wrap items-center gap-4">
              {/* Type Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {filters.eventType ? getEventTypeLabel(filters.eventType) : "Tipo de Evento"}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setFilters({ ...filters, eventType: undefined })}>
                    Todos os tipos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilters({ ...filters, eventType: "CULTO" })}>
                    Culto
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilters({ ...filters, eventType: "SPECIAL" })}>
                    Evento Especial
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <p className="text-destructive">Erro ao carregar templates</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Tentar novamente
          </Button>
        </Card>
      ) : templates && templates.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-lg font-medium mb-2">
            {hasActiveFilters
              ? "Nenhum template encontrado"
              : "Nenhum template cadastrado"}
          </p>
          <p className="text-muted-foreground mb-4">
            {hasActiveFilters
              ? "Tente ajustar os filtros ou busca"
              : "Crie seu primeiro template para agilizar a criação de eventos"}
          </p>
          {hasActiveFilters ? (
            <Button variant="outline" onClick={clearFilters}>
              Limpar filtros
            </Button>
          ) : (
            <Link href="/templates/novo">
              <Button className="bg-primary hover:bg-primary-hover">
                <Plus className="h-4 w-4 mr-2" />
                Criar Template
              </Button>
            </Link>
          )}
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Template</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o template &quot;{templateToDelete?.name}&quot;?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteTemplate.isPending}
            >
              {deleteTemplate.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplateCard({
  template,
  onDelete,
}: {
  template: EventTemplate;
  onDelete: (template: EventTemplate) => void;
}) {
  const defaultItems = (template.defaultItems as TemplateItem[] | null) || [];
  const defaultSchedules = (template.defaultSchedules as TemplateSchedule[] | null) || [];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{template.name}</CardTitle>
            {template.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {template.description}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2" aria-label="Ações do template">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/templates/${template.id}/editar`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(template)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Type Badge */}
        <Badge variant="outline" className="mb-3">
          {getEventTypeLabel(template.eventType)}
        </Badge>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>{defaultItems.length} itens</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{defaultSchedules.length} vagas</span>
          </div>
          {template.duration && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{template.duration} min</span>
            </div>
          )}
        </div>

        {/* Usage count */}
        {template._count && template._count.events > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>Usado em {template._count.events} evento{template._count.events !== 1 ? "s" : ""}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Music, SlidersHorizontal, X, Download } from "lucide-react";
import { useCanEdit } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { SongCard } from "@/components/music/song-card";
import { SongSearchInput } from "@/components/music/song-search";
import { ProPresenterSyncDialog } from "@/components/propresenter/sync-dialog";
import { ProPresenterStatusBadge } from "@/components/propresenter/connection-status";
import { useSongs, useAllTags } from "@/hooks/use-songs";
import { useQueryClient } from "@tanstack/react-query";
import { songKeys } from "@/hooks/use-songs";
import type { SongSortOption } from "@/types/music";

const SORT_OPTIONS: { value: SongSortOption; label: string }[] = [
  { value: "name", label: "Nome (A-Z)" },
  { value: "most_played", label: "Mais tocadas" },
  { value: "last_played", label: "Última vez tocada" },
];

export default function MusicasPage() {
  const canEditSongs = useCanEdit("songs");
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SongSortOption>("name");
  const [showFilters, setShowFilters] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useSongs({
    search,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    sortBy,
  });

  const allTags = useAllTags();

  const handleSyncComplete = () => {
    // Recarrega a lista de músicas após sincronização
    queryClient.invalidateQueries({ queryKey: songKeys.lists() });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedTags([]);
    setSortBy("name");
  };

  const hasActiveFilters = search || selectedTags.length > 0 || sortBy !== "name";

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            Biblioteca de Músicas
            <ProPresenterStatusBadge />
          </span>
        }
        description={`${data?.total || 0} ${data?.total === 1 ? "música" : "músicas"} cadastradas`}
        actions={
          <>
            <ProPresenterSyncDialog
              trigger={
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  <span className="sm:hidden">Sincronizar</span>
                  <span className="hidden sm:inline">Sincronizar ProPresenter</span>
                </Button>
              }
              onSyncComplete={handleSyncComplete}
            />
            {canEditSongs && (
              <Button asChild>
                <Link href="/musicas/nova">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Música
                </Link>
              </Button>
            )}
          </>
        }
      />

      {/* Search and filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <SongSearchInput
                value={search}
                onChange={setSearch}
                placeholder="Buscar por nome ou artista..."
              />
            </div>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SongSortOption)}
                className="h-11 md:h-10 rounded-lg border border-input bg-background px-3 text-base md:text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Ordenar por"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Button
                variant={showFilters ? "default" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2 shrink-0"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filtros
                {selectedTags.length > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5">
                    {selectedTags.length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Tag filters */}
          {showFilters && (
            <div className="mt-4 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-muted-foreground">
                  Filtrar por tags
                </label>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-8 gap-1 text-xs"
                  >
                    <X className="h-3 w-3" />
                    Limpar filtros
                  </Button>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer transition-colors hover:bg-primary/80"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
                {allTags.length === 0 && (
                  <span className="text-sm text-muted-foreground">
                    Nenhuma tag encontrada
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Songs grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-3/4 rounded bg-muted" />
                    <div className="h-4 w-1/2 rounded bg-muted" />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <div className="h-5 w-16 rounded-full bg-muted" />
                  <div className="h-5 w-20 rounded-full bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-destructive">Erro ao carregar músicas</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tente novamente mais tarde
            </p>
          </CardContent>
        </Card>
      ) : data?.songs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Music className="mb-4 h-16 w-16 text-muted-foreground/50" />
            {hasActiveFilters ? (
              <>
                <p className="text-lg font-medium text-muted-foreground">
                  Nenhuma música encontrada
                </p>
                <p className="mt-1 text-sm text-muted-foreground/70">
                  Tente ajustar os filtros ou busca
                </p>
                <Button variant="outline" onClick={clearFilters} className="mt-4">
                  Limpar filtros
                </Button>
              </>
            ) : (
              <>
                <p className="text-lg font-medium text-muted-foreground">
                  Nenhuma música cadastrada
                </p>
                <p className="mt-1 text-sm text-muted-foreground/70">
                  Comece adicionando sua primeira música
                </p>
                {canEditSongs && <Button asChild className="mt-4">
                  <Link href="/musicas/nova">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Música
                  </Link>
                </Button>}
              </>
            )}
          </CardContent>
        </Card>
      ) : data?.songs ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.songs.map((song) => (
            <SongCard key={song.id} song={song} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

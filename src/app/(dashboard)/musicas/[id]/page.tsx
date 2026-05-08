"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Music,
  ExternalLink,
  Calendar,
  Clock,
  Edit,
  Trash2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LyricsViewer, LyricsDisplay } from "@/components/music/lyrics-viewer";
import { useSong, useDeleteSong } from "@/hooks/use-songs";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function MusicaDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: song, isLoading, error } = useSong(id);
  const deleteMutation = useDeleteSong();

  const formatDate = (date?: Date) => {
    if (!date) return "Nunca";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(date));
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(id);
    router.push("/musicas");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
          <div className="space-y-2">
            <div className="h-8 w-64 animate-pulse rounded bg-muted" />
            <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="h-96 animate-pulse rounded-lg bg-muted" />
          </div>
          <div className="h-64 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  if (error || !song) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Music className="mb-4 h-16 w-16 text-muted-foreground/50" />
        <h2 className="text-lg font-medium text-muted-foreground">
          Música não encontrada
        </h2>
        <Button asChild className="mt-4">
          <Link href="/musicas">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para biblioteca
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        backHref="/musicas"
        backLabel="Voltar"
        icon={Music}
        iconClassName="bg-primary/20"
        title={song.name}
        description={<span className="text-lg text-muted-foreground">{song.artist}</span>}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-mono text-base px-3">
              Tom: {song.defaultKey}
            </Badge>
            {song.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        }
        actions={
          <>
            {song.chordLink && (
              <Button variant="outline" asChild>
                <a href={song.chordLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Abrir Cifra
                </a>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href={`/musicas/${id}/editar`}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Link>
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Excluir música</DialogTitle>
                  <DialogDescription>
                    Tem certeza que deseja excluir &quot;{song.name}&quot;? Esta ação não
                    pode ser desfeita.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                  <Button variant="outline">Cancelar</Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content - Lyrics */}
        <div className="lg:col-span-2 space-y-6">
          {song.lyrics ? (
            <div>
              <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold">
                <FileText className="h-5 w-5 text-primary" />
                Letra e Cifra
              </h2>
              <LyricsViewer
                lyrics={song.lyrics}
                originalKey={song.defaultKey}
              />
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  Nenhuma letra cadastrada
                </p>
                {song.chordLink && (
                  <Button variant="outline" className="mt-4" asChild>
                    <a
                      href={song.chordLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Ver cifra externa
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Stats and History */}
        <div className="space-y-6">
          {/* Streaming Links */}
          {(song.spotifyUrl || song.youtubeUrl) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Music className="h-5 w-5 text-primary" />
                  Ouvir Música
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {song.spotifyUrl && (
                  <a
                    href={song.spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1DB954]/10">
                      <svg className="h-5 w-5 text-[#1DB954]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Spotify</p>
                      <p className="text-xs text-muted-foreground">Abrir no Spotify</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>
                )}
                {song.youtubeUrl && (
                  <a
                    href={song.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF0000]/10">
                      <svg className="h-5 w-5 text-[#FF0000]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">YouTube</p>
                      <p className="text-xs text-muted-foreground">Assistir no YouTube</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-primary" />
                Estatísticas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Vezes tocada</span>
                <span className="text-2xl font-bold text-foreground">
                  {song.timesPlayed}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Última vez</span>
                <span className="text-sm font-medium text-foreground">
                  {formatDate(song.lastPlayedAt)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Cadastrada em</span>
                <span className="text-sm font-medium text-foreground">
                  {formatDate(song.createdAt)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Event History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-primary" />
                Histórico de Eventos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {song.eventHistory && song.eventHistory.length > 0 ? (
                <div className="space-y-3">
                  {song.eventHistory.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {event.eventName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(event.eventDate)}
                        </p>
                      </div>
                      <Badge variant="secondary" className="font-mono">
                        {event.keyPlayed}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-4">
                  Nenhum evento registrado
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

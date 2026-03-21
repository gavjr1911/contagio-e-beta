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
    }).format(new Date(date));
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(id);
    router.push("/musicas");
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
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
          Musica nao encontrada
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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/musicas">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Voltar</span>
            </Link>
          </Button>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-beta-terracotta/20">
            <Music className="h-7 w-7 text-beta-terracotta" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-beta-cream sm:text-3xl">
              {song.name}
            </h1>
            <p className="text-lg text-muted-foreground">{song.artist}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="font-mono text-base px-3">
                Tom: {song.defaultKey}
              </Badge>
              {song.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 sm:flex-row">
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
                <DialogTitle>Excluir musica</DialogTitle>
                <DialogDescription>
                  Tem certeza que deseja excluir &quot;{song.name}&quot;? Esta acao nao
                  pode ser desfeita.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
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
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content - Lyrics */}
        <div className="lg:col-span-2 space-y-6">
          {song.lyrics ? (
            <div>
              <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold">
                <FileText className="h-5 w-5 text-beta-terracotta" />
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
          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-beta-terracotta" />
                Estatisticas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Vezes tocada</span>
                <span className="text-2xl font-bold text-beta-cream">
                  {song.timesPlayed}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ultima vez</span>
                <span className="text-sm font-medium text-beta-cream">
                  {formatDate(song.lastPlayedAt)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Cadastrada em</span>
                <span className="text-sm font-medium text-beta-cream">
                  {formatDate(song.createdAt)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Event History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-beta-terracotta" />
                Historico de Eventos
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
                        <p className="text-sm font-medium text-beta-cream">
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

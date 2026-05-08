"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Music, Plus, X, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { useSong, useUpdateSong } from "@/hooks/use-songs";
import { MUSICAL_KEYS, COMMON_SONG_TAGS, type UpdateSongInput } from "@/types/music";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditarMusicaPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: song, isLoading: songLoading } = useSong(id);
  const updateMutation = useUpdateSong();

  const [formData, setFormData] = useState({
    name: "",
    artist: "",
    defaultKey: "C",
    lyrics: "",
    chordLink: "",
    spotifyUrl: "",
    youtubeUrl: "",
    tags: [] as string[],
  });

  const [customTag, setCustomTag] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  // Inicializar form com dados da música
  useEffect(() => {
    if (song && !initialized) {
      setFormData({
        name: song.name || "",
        artist: song.artist || "",
        defaultKey: song.defaultKey || "C",
        lyrics: song.lyrics || "",
        chordLink: song.chordLink || "",
        spotifyUrl: song.spotifyUrl || "",
        youtubeUrl: song.youtubeUrl || "",
        tags: song.tags || [],
      });
      setInitialized(true);
    }
  }, [song, initialized]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome da música é obrigatório";
    }

    if (!formData.artist.trim()) {
      newErrors.artist = "Artista é obrigatório";
    }

    if (formData.chordLink && !isValidUrl(formData.chordLink)) {
      newErrors.chordLink = "URL inválida";
    }

    if (formData.spotifyUrl && !isValidUrl(formData.spotifyUrl)) {
      newErrors.spotifyUrl = "URL inválida";
    }

    if (formData.youtubeUrl && !isValidUrl(formData.youtubeUrl)) {
      newErrors.youtubeUrl = "URL inválida";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const updateData: UpdateSongInput = {
        id,
        name: formData.name,
        artist: formData.artist,
        defaultKey: formData.defaultKey,
        lyrics: formData.lyrics || undefined,
        chordLink: formData.chordLink || undefined,
        spotifyUrl: formData.spotifyUrl || undefined,
        youtubeUrl: formData.youtubeUrl || undefined,
        tags: formData.tags,
      };

      await updateMutation.mutateAsync(updateData);
      router.push(`/musicas/${id}`);
    } catch (error) {
      console.error("Error updating song:", error);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const toggleTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const addCustomTag = () => {
    const tag = customTag.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
      setCustomTag("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  if (songLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
          <div className="space-y-2">
            <div className="h-8 w-64 animate-pulse rounded bg-muted" />
            <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="h-96 animate-pulse rounded-lg bg-muted max-w-3xl" />
      </div>
    );
  }

  if (!song) {
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
        backHref={`/musicas/${id}`}
        backLabel="Voltar"
        icon={Music}
        iconClassName="bg-primary/20"
        title="Editar Música"
        description={`${song.name} - ${song.artist}`}
      />

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Informações da Música</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Nome da Música <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ex: Quão Grande É O Meu Deus"
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            {/* Artist */}
            <div className="space-y-2">
              <Label htmlFor="artist">
                Artista <span className="text-destructive">*</span>
              </Label>
              <Input
                id="artist"
                name="artist"
                value={formData.artist}
                onChange={handleInputChange}
                placeholder="Ex: Soraya Moraes"
                className={errors.artist ? "border-destructive" : ""}
              />
              {errors.artist && (
                <p className="text-sm text-destructive">{errors.artist}</p>
              )}
            </div>

            {/* Default Key */}
            <div className="space-y-2">
              <Label htmlFor="defaultKey">Tom Padrão</Label>
              <select
                id="defaultKey"
                name="defaultKey"
                value={formData.defaultKey}
                onChange={handleInputChange}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:w-32"
              >
                {MUSICAL_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </div>

            {/* Chord Link */}
            <div className="space-y-2">
              <Label htmlFor="chordLink">Link da Cifra</Label>
              <Input
                id="chordLink"
                name="chordLink"
                type="url"
                value={formData.chordLink}
                onChange={handleInputChange}
                placeholder="https://www.cifraclub.com.br/..."
                className={errors.chordLink ? "border-destructive" : ""}
              />
              {errors.chordLink && (
                <p className="text-sm text-destructive">{errors.chordLink}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Cole o link do CifraClub, Cifras.com ou similar
              </p>
            </div>

            {/* Streaming Links */}
            <div className="space-y-4 rounded-lg border border-border p-4">
              <Label className="text-base font-medium">Links de Streaming</Label>

              {/* Spotify */}
              <div className="space-y-2">
                <Label htmlFor="spotifyUrl" className="flex items-center gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                  Spotify
                </Label>
                <Input
                  id="spotifyUrl"
                  name="spotifyUrl"
                  type="url"
                  value={formData.spotifyUrl}
                  onChange={handleInputChange}
                  placeholder="https://open.spotify.com/track/..."
                  className={errors.spotifyUrl ? "border-destructive" : ""}
                />
                {errors.spotifyUrl && (
                  <p className="text-sm text-destructive">{errors.spotifyUrl}</p>
                )}
              </div>

              {/* YouTube */}
              <div className="space-y-2">
                <Label htmlFor="youtubeUrl" className="flex items-center gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  YouTube
                </Label>
                <Input
                  id="youtubeUrl"
                  name="youtubeUrl"
                  type="url"
                  value={formData.youtubeUrl}
                  onChange={handleInputChange}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className={errors.youtubeUrl ? "border-destructive" : ""}
                />
                {errors.youtubeUrl && (
                  <p className="text-sm text-destructive">{errors.youtubeUrl}</p>
                )}
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-3">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {COMMON_SONG_TAGS.map((tag) => (
                  <Badge
                    key={tag}
                    variant={formData.tags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer transition-colors hover:bg-primary/80"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Selected tags */}
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                  <span className="text-sm text-muted-foreground">
                    Selecionadas:
                  </span>
                  {formData.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 rounded-full p-0.5 hover:bg-foreground/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Custom tag */}
              <div className="flex gap-2">
                <Input
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  placeholder="Adicionar tag personalizada"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomTag();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addCustomTag}
                  disabled={!customTag.trim()}
                  aria-label="Adicionar tag"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Lyrics */}
            <div className="space-y-2">
              <Label htmlFor="lyrics">Letra (opcional)</Label>
              <textarea
                id="lyrics"
                name="lyrics"
                value={formData.lyrics}
                onChange={handleInputChange}
                placeholder="Cole a letra da música aqui...&#10;&#10;Dica: Você pode incluir acordes entre colchetes [G] ou em linhas separadas"
                rows={12}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono leading-relaxed placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground">
                Inclua acordes entre colchetes [Am] ou em linhas separadas acima das
                estrofes. O sistema irá destacá-los e permitir transposição.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Submit buttons */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="outline" type="button" asChild className="w-full sm:w-auto">
            <Link href={`/musicas/${id}`}>Cancelar</Link>
          </Button>
          <Button type="submit" disabled={updateMutation.isPending} className="w-full sm:w-auto">
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

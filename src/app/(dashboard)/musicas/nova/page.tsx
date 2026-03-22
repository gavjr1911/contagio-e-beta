"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Music, Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateSong } from "@/hooks/use-songs";
import { MUSICAL_KEYS, COMMON_SONG_TAGS, type CreateSongInput } from "@/types/music";

export default function NovaMusicaPage() {
  const router = useRouter();
  const createMutation = useCreateSong();

  const [formData, setFormData] = useState<CreateSongInput>({
    name: "",
    artist: "",
    defaultKey: "C",
    lyrics: "",
    chordLink: "",
    tags: [],
  });

  const [customTag, setCustomTag] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome da musica e obrigatorio";
    }

    if (!formData.artist.trim()) {
      newErrors.artist = "Artista e obrigatorio";
    }

    if (formData.chordLink && !isValidUrl(formData.chordLink)) {
      newErrors.chordLink = "URL invalida";
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
      await createMutation.mutateAsync(formData);
      router.push("/musicas");
    } catch (error) {
      console.error("Error creating song:", error);
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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/musicas">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Voltar</span>
          </Link>
        </Button>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20">
          <Music className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Nova Musica
          </h1>
          <p className="text-muted-foreground">
            Adicione uma nova musica a biblioteca
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Informacoes da Musica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Nome da Musica <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ex: Quao Grande E O Meu Deus"
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
              <Label htmlFor="defaultKey">Tom Padrao</Label>
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
                placeholder="Cole a letra da musica aqui...&#10;&#10;Dica: Voce pode incluir acordes entre colchetes [G] ou em linhas separadas"
                rows={12}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono leading-relaxed placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground">
                Inclua acordes entre colchetes [Am] ou em linhas separadas acima das
                estrofes. O sistema ira destaca-los e permitir transposicao.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Submit buttons */}
        <div className="mt-6 flex gap-3">
          <Button variant="outline" type="button" asChild>
            <Link href="/musicas">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Criar Musica
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

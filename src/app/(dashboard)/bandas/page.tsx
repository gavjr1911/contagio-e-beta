"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Users, Music2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { useBands, useMembers, useCreateBand } from "@/hooks/use-bands";
import type { Band, BandMember } from "@/types/music";

interface BandCardProps {
  band: Band;
}

function BandCard({ band }: BandCardProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(date));
  };

  // Get unique instruments
  const instruments = [...new Set(band.members.flatMap((m) => m.instruments))];

  return (
    <Link href={`/bandas/${band.id}`}>
      <Card className="group transition-all duration-200 hover:border-primary/50 hover:shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display text-xl text-foreground group-hover:text-primary transition-colors">
                  {band.name}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {band.members.length} {band.members.length === 1 ? "membro" : "membros"}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Description */}
          {band.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {band.description}
            </p>
          )}

          {/* Members preview */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Membros
            </label>
            <div className="flex flex-wrap gap-2">
              {band.members.slice(0, 4).map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-medium text-foreground">
                    {member.name.charAt(0)}
                  </div>
                  <span className="text-sm text-foreground">{member.name.split(" ")[0]}</span>
                </div>
              ))}
              {band.members.length > 4 && (
                <div className="flex items-center rounded-full bg-secondary px-3 py-1">
                  <span className="text-sm text-muted-foreground">
                    +{band.members.length - 4}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Instruments */}
          <div className="flex flex-wrap gap-1.5">
            {instruments.slice(0, 5).map((instrument) => (
              <Badge key={instrument} variant="outline" className="text-xs">
                <Music2 className="mr-1 h-3 w-3" />
                {instrument}
              </Badge>
            ))}
            {instruments.length > 5 && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                +{instruments.length - 5}
              </Badge>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border pt-3">
            <Calendar className="h-3.5 w-3.5" />
            <span>Atualizada em {formatDate(band.updatedAt)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function CreateBandDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const { data: members } = useMembers();
  const createMutation = useCreateBand();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await createMutation.mutateAsync({
      name,
      description,
      memberIds: selectedMembers,
    });

    setOpen(false);
    setName("");
    setDescription("");
    setSelectedMembers([]);
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nova Banda
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nova Banda</DialogTitle>
            <DialogDescription>
              Crie uma nova banda e adicione membros
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bandName">Nome da Banda</Label>
              <Input
                id="bandName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Banda Principal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bandDescription">Descrição (opcional)</Label>
              <Input
                id="bandDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Banda do culto de domingo"
              />
            </div>

            <div className="space-y-2">
              <Label>Membros</Label>
              <div className="max-h-48 overflow-auto rounded-lg border border-border p-2">
                {members?.map((member) => (
                  <label
                    key={member.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member.id)}
                      onChange={() => toggleMember(member.id)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.instruments.join(", ")}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
              {selectedMembers.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedMembers.length} membro(s) selecionado(s)
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim() || createMutation.isPending}>
              {createMutation.isPending ? "Criando..." : "Criar Banda"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function BandasPage() {
  const { data, isLoading, error } = useBands();

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Bandas"
        description={`${data?.total || 0} ${data?.total === 1 ? "banda cadastrada" : "bandas cadastradas"}`}
        actions={<CreateBandDialog />}
      />

      {/* Bands grid */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-muted" />
                  <div className="space-y-2">
                    <div className="h-6 w-32 rounded bg-muted" />
                    <div className="h-4 w-20 rounded bg-muted" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 w-full rounded bg-muted" />
                  <div className="flex gap-2">
                    <div className="h-8 w-24 rounded-full bg-muted" />
                    <div className="h-8 w-24 rounded-full bg-muted" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-destructive">Erro ao carregar bandas</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tente novamente mais tarde
            </p>
          </CardContent>
        </Card>
      ) : data?.bands.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="mb-4 h-16 w-16 text-muted-foreground/50" />
            <p className="text-lg font-medium text-muted-foreground">
              Nenhuma banda cadastrada
            </p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Crie sua primeira banda para começar
            </p>
            <div className="mt-4">
              <CreateBandDialog />
            </div>
          </CardContent>
        </Card>
      ) : data?.bands ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.bands.map((band) => (
            <BandCard key={band.id} band={band} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

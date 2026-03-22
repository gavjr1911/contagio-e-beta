"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Music2,
  Calendar,
  Plus,
  Trash2,
  UserPlus,
  UserMinus,
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
import {
  useBand,
  useMembers,
  useDeleteBand,
  useAddMemberToBand,
  useRemoveMemberFromBand,
} from "@/hooks/use-bands";
import type { BandMember } from "@/types/music";

interface PageProps {
  params: Promise<{ id: string }>;
}

function MemberCard({
  member,
  onRemove,
  canRemove,
}: {
  member: BandMember;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30">
      {/* Avatar */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-lg font-semibold text-foreground">
        {member.name.charAt(0)}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{member.name}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {member.instruments.map((instrument) => (
            <Badge key={instrument} variant="secondary" className="text-xs">
              <Music2 className="mr-1 h-3 w-3" />
              {instrument}
            </Badge>
          ))}
        </div>
      </div>

      {/* Remove button */}
      {canRemove && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-8 w-8 p-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
        >
          <UserMinus className="h-4 w-4" />
          <span className="sr-only">Remover membro</span>
        </Button>
      )}
    </div>
  );
}

function AddMemberDialog({
  bandId,
  currentMemberIds,
}: {
  bandId: string;
  currentMemberIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const { data: allMembers } = useMembers();
  const addMutation = useAddMemberToBand();

  const availableMembers = allMembers?.filter(
    (m) => !currentMemberIds.includes(m.id)
  );

  const handleAdd = async (memberId: string) => {
    await addMutation.mutateAsync({ bandId, memberId });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="mr-2 h-4 w-4" />
          Adicionar Membro
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Membro</DialogTitle>
          <DialogDescription>
            Selecione um membro para adicionar a banda
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-64 overflow-auto py-4">
          {availableMembers?.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              Todos os membros ja fazem parte desta banda
            </p>
          ) : (
            <div className="space-y-2">
              {availableMembers?.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleAdd(member.id)}
                  disabled={addMutation.isPending}
                  className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-all hover:border-primary/50 hover:bg-muted disabled:opacity-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-medium text-foreground">
                    {member.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{member.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.instruments.join(", ")}
                    </p>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function BandaDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: band, isLoading, error } = useBand(id);
  const deleteMutation = useDeleteBand();
  const removeMemberMutation = useRemoveMemberFromBand();

  const formatDate = (date?: Date) => {
    if (!date) return "N/A";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(date));
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(id);
    router.push("/bandas");
  };

  const handleRemoveMember = async (memberId: string) => {
    await removeMemberMutation.mutateAsync({ bandId: id, memberId });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
          <div className="space-y-2">
            <div className="h-8 w-48 animate-pulse rounded bg-muted" />
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="h-64 animate-pulse rounded-lg bg-muted" />
          </div>
          <div className="h-48 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  if (error || !band) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Users className="mb-4 h-16 w-16 text-muted-foreground/50" />
        <h2 className="text-lg font-medium text-muted-foreground">
          Banda nao encontrada
        </h2>
        <Button asChild className="mt-4">
          <Link href="/bandas">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para bandas
          </Link>
        </Button>
      </div>
    );
  }

  const uniqueInstruments = [...new Set(band.members.flatMap((m) => m.instruments))];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/bandas">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Voltar</span>
            </Link>
          </Button>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/20">
            <Users className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              {band.name}
            </h1>
            <p className="text-muted-foreground">
              {band.members.length} {band.members.length === 1 ? "membro" : "membros"}
            </p>
            {band.description && (
              <p className="mt-2 text-sm text-muted-foreground">{band.description}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <AddMemberDialog
            bandId={id}
            currentMemberIds={band.members.map((m) => m.id)}
          />
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Excluir banda</DialogTitle>
                <DialogDescription>
                  Tem certeza que deseja excluir &quot;{band.name}&quot;? Esta acao nao
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
        {/* Members list */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Membros da Banda
              </CardTitle>
            </CardHeader>
            <CardContent>
              {band.members.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Users className="mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum membro na banda
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Adicione membros usando o botao acima
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {band.members.map((member) => (
                    <MemberCard
                      key={member.id}
                      member={member}
                      onRemove={() => handleRemoveMember(member.id)}
                      canRemove={band.members.length > 1}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instruments summary */}
          {uniqueInstruments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Music2 className="h-5 w-5 text-primary" />
                  Instrumentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {uniqueInstruments.map((instrument) => {
                    const count = band.members.filter((m) =>
                      m.instruments.includes(instrument)
                    ).length;
                    return (
                      <Badge key={instrument} variant="secondary" className="gap-1">
                        <Music2 className="h-3 w-3" />
                        {instrument}
                        {count > 1 && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            x{count}
                          </span>
                        )}
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Event History */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-primary" />
                Historico de Eventos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {band.eventHistory && band.eventHistory.length > 0 ? (
                <div className="space-y-3">
                  {band.eventHistory.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 rounded-lg border border-border p-3"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/50">
                        <Calendar className="h-5 w-5 text-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {event.eventName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(event.eventDate)}
                        </p>
                      </div>
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

          {/* Band info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informacoes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Criada em</span>
                <span className="text-sm font-medium">{formatDate(band.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Atualizada em</span>
                <span className="text-sm font-medium">{formatDate(band.updatedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total de eventos</span>
                <span className="text-sm font-medium">
                  {band.eventHistory?.length || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

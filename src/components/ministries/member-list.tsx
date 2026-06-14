"use client";

import { useState, useEffect } from "react";
import { MoreHorizontal, Pencil, Trash2, UserMinus, UserCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  MinistryMember,
  MinistryPosition,
  useUpdateMember,
  useRemoveMember,
  useMinistryPositions,
} from "@/hooks/use-ministries";
import { PositionIcon } from "@/components/ui/icon-picker";

interface MemberListProps {
  members: MinistryMember[];
  canEdit: boolean;
  ministryId?: string;
  leaderId?: string;
}

export function MemberList({ members, canEdit, ministryId, leaderId }: MemberListProps) {
  const [editingMember, setEditingMember] = useState<MinistryMember | null>(null);
  const [deletingMember, setDeletingMember] = useState<MinistryMember | null>(null);
  const [selectedPositionIds, setSelectedPositionIds] = useState<string[]>([]);

  const { data: positions } = useMinistryPositions(ministryId || "");
  const updateMember = useUpdateMember();
  const removeMember = useRemoveMember();

  // Atualiza os IDs selecionados quando o membro sendo editado muda
  useEffect(() => {
    if (editingMember) {
      const currentIds = editingMember.positions?.map((p) => p.positionId) || [];
      setSelectedPositionIds(currentIds);
    }
  }, [editingMember]);

  const handleEdit = (member: MinistryMember) => {
    setEditingMember(member);
  };

  const togglePosition = (positionId: string) => {
    setSelectedPositionIds((prev) =>
      prev.includes(positionId)
        ? prev.filter((id) => id !== positionId)
        : [...prev, positionId]
    );
  };

  const handleSaveEdit = async () => {
    if (!editingMember) return;

    await updateMember.mutateAsync({
      id: editingMember.id,
      positionIds: selectedPositionIds,
    });
    setEditingMember(null);
    setSelectedPositionIds([]);
  };

  const handleToggleActive = async (member: MinistryMember) => {
    await updateMember.mutateAsync({
      id: member.id,
      active: !member.active,
    });
  };

  const handleDelete = async () => {
    if (!deletingMember) return;

    await removeMember.mutateAsync(deletingMember.id);
    setDeletingMember(null);
  };

  // Helper para obter posições de um membro
  const getMemberPositions = (member: MinistryMember): { name: string; icon: string | null }[] => {
    return member.positions?.map((p) => ({
      name: p.position?.name || "",
      icon: p.position?.icon || null,
    })).filter((p) => p.name) || [];
  };

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
          <UserMinus className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-medium text-foreground">
          Nenhum membro
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Este ministério ainda não possui membros cadastrados.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-border">
        {members.map((member) => {
          const memberPositions = getMemberPositions(member);

          return (
            <div
              key={member.id}
              className="flex items-center justify-between gap-4 py-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={member.user.image || undefined} />
                  <AvatarFallback className="bg-primary text-white">
                    {member.user.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-foreground">
                      {member.user.name || member.user.email}
                    </p>
                    {leaderId && member.user.id === leaderId && (
                      <Badge className="shrink-0 text-xs">Líder</Badge>
                    )}
                  </div>
                  {memberPositions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {memberPositions.map((pos, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-xs font-normal flex items-center gap-1"
                        >
                          <PositionIcon name={pos.icon} className="h-3 w-3" />
                          {pos.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant={member.active ? "default" : "secondary"}
                  className={
                    member.active
                      ? "bg-green-500/10 text-green-700 hover:bg-green-500/20"
                      : "bg-secondary text-muted-foreground"
                  }
                >
                  {member.active ? "Ativo" : "Inativo"}
                </Badge>
                {canEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Ações</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(member)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar funções
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleActive(member)}>
                        {member.active ? (
                          <>
                            <UserMinus className="mr-2 h-4 w-4" />
                            Desativar
                          </>
                        ) : (
                          <>
                            <UserCheck className="mr-2 h-4 w-4" />
                            Ativar
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => setDeletingMember(member)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar funções</DialogTitle>
            <DialogDescription>
              Selecione as funções de {editingMember?.user.name} no ministério.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Funções</Label>
              {!positions || positions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma função cadastrada para este ministério.
                </p>
              ) : (
                <div className="grid gap-2">
                  {positions.map((pos) => (
                    <div
                      key={pos.id}
                      className="flex items-center space-x-3 rounded-lg border border-border p-3 hover:bg-muted/50 cursor-pointer"
                      onClick={() => togglePosition(pos.id)}
                    >
                      <Checkbox
                        id={`edit-pos-${pos.id}`}
                        checked={selectedPositionIds.includes(pos.id)}
                        onCheckedChange={() => togglePosition(pos.id)}
                      />
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
                        <PositionIcon name={pos.icon} className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <label
                          htmlFor={`edit-pos-${pos.id}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {pos.name}
                        </label>
                        {pos.description && (
                          <p className="text-xs text-muted-foreground">{pos.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selectedPositionIds.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedPositionIds.length} função(ões) selecionada(s)
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingMember(null)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateMember.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {updateMember.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingMember} onOpenChange={() => setDeletingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover membro</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover {deletingMember?.user.name} deste
              ministério? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingMember(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={removeMember.isPending}
            >
              {removeMember.isPending ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function MemberListSkeleton() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-14" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      ))}
    </div>
  );
}

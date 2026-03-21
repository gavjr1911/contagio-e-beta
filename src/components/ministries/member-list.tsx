"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2, UserMinus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MinistryMember,
  useUpdateMember,
  useRemoveMember,
} from "@/hooks/use-ministries";

interface MemberListProps {
  members: MinistryMember[];
  canEdit: boolean;
}

export function MemberList({ members, canEdit }: MemberListProps) {
  const [editingMember, setEditingMember] = useState<MinistryMember | null>(null);
  const [deletingMember, setDeletingMember] = useState<MinistryMember | null>(null);
  const [editPosition, setEditPosition] = useState("");

  const updateMember = useUpdateMember();
  const removeMember = useRemoveMember();

  const handleEdit = (member: MinistryMember) => {
    setEditingMember(member);
    setEditPosition(member.position || "");
  };

  const handleSaveEdit = async () => {
    if (!editingMember) return;

    await updateMember.mutateAsync({
      id: editingMember.id,
      position: editPosition || undefined,
    });
    setEditingMember(null);
    setEditPosition("");
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

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-beta-navy/10">
          <UserMinus className="h-8 w-8 text-beta-navy/50" />
        </div>
        <h3 className="mt-4 text-lg font-medium text-beta-black">
          Nenhum membro
        </h3>
        <p className="mt-1 text-sm text-beta-navy/60">
          Este ministerio ainda nao possui membros cadastrados.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-beta-navy/10">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between gap-4 py-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={member.user.image || undefined} />
                <AvatarFallback className="bg-beta-terracotta text-white">
                  {member.user.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-beta-black">
                  {member.user.name || member.user.email}
                </p>
                <div className="flex items-center gap-2 text-sm text-beta-navy/60">
                  {member.position && (
                    <span className="truncate">{member.position}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge
                variant={member.active ? "default" : "secondary"}
                className={
                  member.active
                    ? "bg-green-500/10 text-green-700 hover:bg-green-500/20"
                    : "bg-beta-navy/10 text-beta-navy/60"
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
                      className="h-8 w-8 text-beta-navy/60 hover:text-beta-black"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Acoes</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(member)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar posicao
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleActive(member)}>
                      {member.active ? (
                        <>
                          <UserMinus className="mr-2 h-4 w-4" />
                          Desativar
                        </>
                      ) : (
                        <>
                          <UserMinus className="mr-2 h-4 w-4" />
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
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar posicao</DialogTitle>
            <DialogDescription>
              Atualize a posicao de {editingMember?.user.name} no ministerio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="position">Posicao</Label>
              <Input
                id="position"
                value={editPosition}
                onChange={(e) => setEditPosition(e.target.value)}
                placeholder="Ex: Mesa de Som, Guitarra, Recepcionista..."
              />
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
              className="bg-beta-terracotta hover:bg-beta-terracotta/90"
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
              ministerio? Esta acao nao pode ser desfeita.
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
    <div className="divide-y divide-beta-navy/10">
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

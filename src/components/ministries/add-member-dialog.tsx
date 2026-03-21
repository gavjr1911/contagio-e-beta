"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAddMember,
  useUsers,
  MinistryMember,
} from "@/hooks/use-ministries";

interface AddMemberDialogProps {
  ministryId: string;
  existingMembers: MinistryMember[];
}

export function AddMemberDialog({
  ministryId,
  existingMembers,
}: AddMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [position, setPosition] = useState("");

  const { data: users, isLoading: isLoadingUsers } = useUsers();
  const addMember = useAddMember();

  // Filter out users who are already members
  const existingMemberIds = existingMembers.map((m) => m.userId);
  const availableUsers = users?.filter(
    (user) => !existingMemberIds.includes(user.id)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUserId) return;

    await addMember.mutateAsync({
      ministryId,
      userId: selectedUserId,
      position: position || undefined,
    });

    setOpen(false);
    setSelectedUserId("");
    setPosition("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSelectedUserId("");
      setPosition("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-beta-terracotta hover:bg-beta-terracotta/90">
          <UserPlus className="mr-2 h-4 w-4" />
          Adicionar Membro
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Adicionar membro</DialogTitle>
            <DialogDescription>
              Selecione um usuario para adicionar a este ministerio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user">Usuario</Label>
              {isLoadingUsers ? (
                <Skeleton className="h-10 w-full" />
              ) : availableUsers && availableUsers.length > 0 ? (
                <Select
                  value={selectedUserId}
                  onValueChange={setSelectedUserId}
                >
                  <SelectTrigger id="user">
                    <SelectValue placeholder="Selecione um usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-beta-navy/60 py-2">
                  Todos os usuarios ja sao membros deste ministerio.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Posicao (opcional)</Label>
              <Input
                id="position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Ex: Mesa de Som, Guitarra, Recepcionista..."
                disabled={!selectedUserId}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                !selectedUserId ||
                addMember.isPending ||
                !availableUsers?.length
              }
              className="bg-beta-terracotta hover:bg-beta-terracotta/90"
            >
              {addMember.isPending ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
